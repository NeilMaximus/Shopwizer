/* Growth Lab contact form endpoint: a Vercel Node.js function served at /api/contact.

   GET  /api/contact  tells the contact page whether sending is connected and gives it the public
                      reCAPTCHA site key. It never returns secrets.
   POST /api/contact  validates the enquiry, verifies the Google reCAPTCHA v2 token with Google,
                      then sends one plain text email to hello@growthlab.co.za through Resend.

   Configuration comes only from environment variables (see DEPLOY.md):
     RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET_KEY, RESEND_API_KEY, CONTACT_FROM_EMAIL
     and, optionally, CONTACT_ALLOWED_HOSTNAMES (comma separated).
   It fails closed: if a required variable is missing, the token does not verify, or the provider
   refuses the message, nothing is sent and the response says so. The recipient is fixed here and
   can never come from the request. Logs carry outcome codes only, never the visitor's details.
   An ES module (.mjs) on purpose: Node and Vercel then load it the same way whatever package.json
   sits above it. No dependencies; needs Node 18 or later for fetch. */

const RECIPIENT = 'hello@growthlab.co.za';
const REQUIRED = ['RECAPTCHA_SITE_KEY', 'RECAPTCHA_SECRET_KEY', 'RESEND_API_KEY', 'CONTACT_FROM_EMAIL'];
const LIMITS = { name: 120, company: 160, email: 254, phone: 40, message: 5000, token: 4000 };
const MAX_BODY_BYTES = 32 * 1024;
const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const SEND_URL = 'https://api.resend.com/emails';
// Google answers in well under a second and Resend in about one. These limits keep the worst case
// under 10 seconds, the shortest default time Vercel gives a function, so it always answers itself.
const VERIFY_TIMEOUT_MS = 4000;
const SEND_TIMEOUT_MS = 5000;

// The same rules run in assets/js/contact.js so visitors see the same messages before sending
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const PHONE_RE = /^\+?[0-9 ().-]{7,40}$/;
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const MESSAGES = {
  name: ['Enter your full name.', 'Enter your name on one line, up to 120 characters.'],
  company: ['Enter your company name.', 'Enter your company name on one line, up to 160 characters.'],
  email: ['Enter your work email address.', 'Enter a valid email address, like name@company.co.za.'],
  phone: [null, 'Enter a valid contact number, or leave it blank.'],
  message: ['Tell us a little about your requirements.', 'Keep your message under 5,000 characters.'],
};

function readConfig(env) {
  const get = (k) => String(env[k] || '').trim();
  const missing = REQUIRED.filter((k) => !get(k));
  return {
    ready: missing.length === 0,
    missing,
    siteKey: get('RECAPTCHA_SITE_KEY'),
    secret: get('RECAPTCHA_SECRET_KEY'),
    resendKey: get('RESEND_API_KEY'),
    from: get('CONTACT_FROM_EMAIL'),
    hostnames: get('CONTACT_ALLOWED_HOSTNAMES').toLowerCase().split(',').map((h) => h.trim()).filter(Boolean),
  };
}

function clean(value) {
  return typeof value === 'string' ? value.normalize('NFC').replace(/\r\n?/g, '\n').trim() : '';
}

function validate(input) {
  const f = {};
  for (const k of ['name', 'company', 'email', 'phone', 'message']) f[k] = clean(input[k]);
  const errors = {};
  const singleLineOk = (v, max) => v.length <= max && !/\n/.test(v) && !CONTROL_RE.test(v);
  if (!f.name) errors.name = MESSAGES.name[0];
  else if (!singleLineOk(f.name, LIMITS.name)) errors.name = MESSAGES.name[1];
  if (!f.company) errors.company = MESSAGES.company[0];
  else if (!singleLineOk(f.company, LIMITS.company)) errors.company = MESSAGES.company[1];
  if (!f.email) errors.email = MESSAGES.email[0];
  else if (f.email.length > LIMITS.email || !EMAIL_RE.test(f.email)) errors.email = MESSAGES.email[1];
  if (f.phone && (f.phone.length > LIMITS.phone || !PHONE_RE.test(f.phone) || f.phone.replace(/\D/g, '').length < 7)) {
    errors.phone = MESSAGES.phone[1];
  }
  if (!f.message) errors.message = MESSAGES.message[0];
  else if (f.message.length > LIMITS.message || CONTROL_RE.test(f.message)) errors.message = MESSAGES.message[1];
  return { fields: f, errors };
}

function buildEmail(from, f, hostname, date) {
  const oneLine = (s) => s.replace(/\s+/g, ' ').trim();
  return {
    from,
    to: [RECIPIENT],
    reply_to: f.email,
    subject: oneLine(`Website enquiry: ${f.name}, ${f.company}`).slice(0, 180),
    text: [
      'New enquiry from the Growth Lab website contact page.',
      '',
      `Full name: ${f.name}`,
      `Company: ${f.company}`,
      `Work email: ${f.email}`,
      `Contact number: ${f.phone || 'Not given'}`,
      '',
      'Message:',
      f.message,
      '',
      `reCAPTCHA verified${hostname ? ` for ${oneLine(String(hostname))}` : ''} on ${date.toISOString()}.`,
    ].join('\n'),
  };
}

function httpError(status, code) {
  const e = new Error(code);
  e.status = status;
  e.code = code;
  return e;
}

async function readJson(req) {
  if (Number(req.headers['content-length'] || 0) > MAX_BODY_BYTES) throw httpError(413, 'too_large');
  let pre;
  try { pre = req.body; } catch (e) { throw httpError(400, 'bad_json'); } // Vercel parses lazily and throws on bad JSON
  let raw;
  if (pre !== undefined && pre !== null && pre !== '') {
    if (typeof pre === 'object' && !Buffer.isBuffer(pre)) return pre; // already parsed by the platform
    raw = Buffer.isBuffer(pre) ? pre.toString('utf8') : String(pre);
  } else {
    raw = await new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) { reject(httpError(413, 'too_large')); if (req.destroy) req.destroy(); } else chunks.push(chunk);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', () => reject(httpError(400, 'bad_request')));
    });
  }
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) throw httpError(413, 'too_large');
  try { return JSON.parse(raw); } catch (e) { throw httpError(400, 'bad_json'); }
}

async function withTimeout(fetchImpl, url, options, ms) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
  try {
    return await fetchImpl(url, controller ? { ...options, signal: controller.signal } : options);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function send(res, status, payload, headOnly) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(headOnly ? undefined : JSON.stringify(payload));
}

function createContactHandler(deps = {}) {
  const env = deps.env || process.env;
  const fetchImpl = deps.fetch || ((...args) => globalThis.fetch(...args));
  const now = deps.now || (() => new Date());
  // Outcome codes only: never names, addresses, numbers, messages or tokens
  const log = deps.log || ((level, code, detail) => (level === 'info' ? console.log : console.error)(`contact: ${code}${detail ? ` (${detail})` : ''}`));

  return async function contactHandler(req, res) {
    const cfg = readConfig(env);
    if (req.method === 'GET' || req.method === 'HEAD') {
      return send(res, 200, { ready: cfg.ready, siteKey: cfg.ready ? cfg.siteKey : null }, req.method === 'HEAD');
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return send(res, 405, { ok: false, code: 'method_not_allowed' });
    }
    if (!cfg.ready) {
      log('error', 'not_configured', `missing ${cfg.missing.join(', ')}`);
      return send(res, 503, { ok: false, code: 'not_configured' });
    }
    if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) {
      return send(res, 415, { ok: false, code: 'unsupported_type' });
    }
    let body;
    try {
      body = await readJson(req);
    } catch (e) {
      return send(res, e.status || 400, { ok: false, code: e.code || 'bad_request' });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return send(res, 400, { ok: false, code: 'bad_request' });
    if (clean(body.website)) {
      log('error', 'rejected', 'honeypot');
      return send(res, 400, { ok: false, code: 'rejected' });
    }
    const { fields, errors } = validate(body);
    if (Object.keys(errors).length) return send(res, 400, { ok: false, code: 'invalid', errors });
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!token || token.length > LIMITS.token) return send(res, 400, { ok: false, code: 'captcha_missing' });

    // 1. Google reCAPTCHA v2: the token must verify, and match an allowed hostname when one is set
    let verdict;
    try {
      const r = await withTimeout(fetchImpl, VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: cfg.secret, response: token }).toString(),
      }, VERIFY_TIMEOUT_MS);
      if (!r.ok) throw new Error(`status ${r.status}`);
      verdict = await r.json();
    } catch (e) {
      log('error', 'captcha_unavailable');
      return send(res, 503, { ok: false, code: 'captcha_unavailable' });
    }
    if (!verdict || verdict.success !== true) {
      const codes = verdict && Array.isArray(verdict['error-codes']) ? verdict['error-codes'].join(',') : '';
      log('error', 'captcha_failed', codes);
      return send(res, 403, { ok: false, code: 'captcha_failed' });
    }
    if (cfg.hostnames.length && !cfg.hostnames.includes(String(verdict.hostname || '').toLowerCase())) {
      log('error', 'captcha_failed', 'hostname not allowed');
      return send(res, 403, { ok: false, code: 'captcha_failed' });
    }

    // 2. Resend: one email to the fixed recipient, with the visitor's address as reply to
    try {
      const r = await withTimeout(fetchImpl, SEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildEmail(cfg.from, fields, verdict.hostname, now())),
      }, SEND_TIMEOUT_MS);
      if (!r.ok) {
        log('error', 'send_failed', `provider status ${r.status}`);
        return send(res, 502, { ok: false, code: 'send_failed' });
      }
    } catch (e) {
      log('error', 'send_failed', 'provider unreachable');
      return send(res, 502, { ok: false, code: 'send_failed' });
    }
    log('info', 'sent');
    return send(res, 200, { ok: true });
  };
}

export default createContactHandler();
export { createContactHandler, validate, RECIPIENT, REQUIRED };
