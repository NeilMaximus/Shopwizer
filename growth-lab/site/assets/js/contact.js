/* Growth Lab contact form. Rules: growth-lab/DESIGN_SYSTEM.md, section 12.
   Validates in the browser, renders the Google reCAPTCHA v2 checkbox with the site key that
   /api/contact provides, and posts the enquiry there. The server verifies the token and sends the
   email. The page only says a message was sent when the server confirms it.
   data-mode="preview" (the Claude preview and the browser files): nothing can be sent, and the
   page says so plainly. */
(function () {
  'use strict';
  var form = document.getElementById('contact-form');
  if (!form) { return; }

  var EMAIL = 'hello@growthlab.co.za';
  var mode = form.getAttribute('data-mode') || 'live';
  var notice = document.getElementById('form-notice');
  var status = document.getElementById('form-status');
  var slot = document.getElementById('recaptcha');
  var captchaError = document.getElementById('recaptcha-error');
  var submit = form.querySelector('button[type="submit"]');
  var label = submit.textContent;
  var state = { ready: false, widget: null };

  // The same rules and messages as api/contact.mjs
  var EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
  var PHONE_RE = /^\+?[0-9 ().-]{7,40}$/;
  var FIELDS = [
    { name: 'name', required: true, max: 120, single: true, empty: 'Enter your full name.', bad: 'Enter your name on one line, up to 120 characters.' },
    { name: 'company', required: true, max: 160, single: true, empty: 'Enter your company name.', bad: 'Enter your company name on one line, up to 160 characters.' },
    { name: 'email', required: true, max: 254, single: true, empty: 'Enter your work email address.', bad: 'Enter a valid email address, like name@company.co.za.',
      test: function (v) { return EMAIL_RE.test(v); } },
    { name: 'phone', required: false, max: 40, single: true, bad: 'Enter a valid contact number, or leave it blank.',
      test: function (v) { return PHONE_RE.test(v) && v.replace(/\D/g, '').length >= 7; } },
    { name: 'message', required: true, max: 5000, empty: 'Tell us a little about your requirements.', bad: 'Keep your message under 5,000 characters.' }
  ];

  function field(name) { return form.elements[name]; }
  function errorBox(name) { return document.getElementById('f-' + name + '-error'); }

  function writeError(box, message) {
    box.textContent = '';
    var prefix = document.createElement('span');
    prefix.className = 'sr-only';
    prefix.textContent = 'Error: ';
    box.appendChild(prefix);
    box.appendChild(document.createTextNode(message));
    box.hidden = false;
  }
  function showError(name, message) {
    var input = field(name), box = errorBox(name);
    if (!input || !box) { return false; }
    input.setAttribute('aria-invalid', 'true');
    writeError(box, message);
    return true;
  }
  function clearError(name) {
    var input = field(name), box = errorBox(name);
    if (input) { input.removeAttribute('aria-invalid'); }
    if (box) { box.hidden = true; box.textContent = ''; }
  }
  function showCaptchaError(message) { writeError(captchaError, message); }
  function hideCaptchaError() { captchaError.hidden = true; captchaError.textContent = ''; }
  function setStatus(message, isError) {
    status.textContent = message;
    status.className = 'form-status' + (isError ? ' is-error' : '');
  }
  function showNotice(message) {
    if (!notice) { return; }
    notice.textContent = message;
    notice.hidden = false;
  }

  function validate() {
    var values = {}, first = null;
    FIELDS.forEach(function (f) {
      var value = String(field(f.name).value || '').replace(/\r\n?/g, '\n').trim();
      values[f.name] = value;
      var message = null;
      if (!value) {
        if (f.required) { message = f.empty; }
      } else if (value.length > f.max || (f.single && /\n/.test(value)) || (f.test && !f.test(value))) {
        message = f.bad;
      }
      if (message) {
        showError(f.name, message);
        if (!first) { first = field(f.name); }
      } else {
        clearError(f.name);
      }
    });
    return { ok: !first, first: first, values: values };
  }

  FIELDS.forEach(function (f) {
    field(f.name).addEventListener('input', function () {
      if (field(f.name).getAttribute('aria-invalid') === 'true') { clearError(f.name); }
    });
  });

  function busy(on) {
    submit.disabled = on;
    submit.textContent = on ? 'Sending…' : label;
    form.setAttribute('aria-busy', on ? 'true' : 'false');
  }
  function resetCaptcha() {
    if (state.widget !== null && window.grecaptcha) {
      try { window.grecaptcha.reset(state.widget); } catch (e) { /* the widget may already be gone */ }
    }
  }
  function unavailable() {
    state.ready = false;
    showNotice('Online enquiries are not connected yet. Please email ' + EMAIL + '.');
    slot.hidden = true;
  }
  function success() {
    var done = document.createElement('div');
    done.className = 'form-success';
    done.tabIndex = -1;
    done.setAttribute('role', 'status');
    var heading = document.createElement('h2');
    heading.textContent = 'Thank you.';
    var text = document.createElement('p');
    text.textContent = 'Your message has been sent to Growth Lab. We will reply by email.';
    done.appendChild(heading);
    done.appendChild(text);
    if (notice) { notice.hidden = true; }
    form.hidden = true;
    form.parentNode.appendChild(done);
    done.focus();
  }

  function loadRecaptcha(siteKey) {
    window.glRecaptchaReady = function () {
      try {
        state.widget = window.grecaptcha.render(slot, {
          sitekey: siteKey,
          size: slot.clientWidth && slot.clientWidth < 304 ? 'compact' : 'normal',
          callback: hideCaptchaError,
          'expired-callback': function () { showCaptchaError('The check expired. Tick the box again.'); }
        });
        state.ready = true;
      } catch (e) {
        unavailable();
      }
    };
    var script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=glRecaptchaReady&render=explicit&hl=en-GB';
    script.async = true;
    script.defer = true;
    script.onerror = unavailable;
    document.head.appendChild(script);
  }

  function connect() {
    if (!window.fetch) { unavailable(); return; }
    fetch('/api/contact', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (cfg) {
        if (cfg && cfg.ready === true && typeof cfg.siteKey === 'string' && cfg.siteKey) { loadRecaptcha(cfg.siteKey); } else { unavailable(); }
      })
      .catch(unavailable);
  }

  if (mode === 'preview') {
    showNotice('Preview only. This copy of the page is not connected to email, so nothing you enter is sent.');
    slot.className = 'recaptcha-preview';
    slot.textContent = 'The Google reCAPTCHA check appears here on the live site.';
  } else {
    connect();
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    setStatus('');
    var result = validate();
    if (!result.ok) {
      setStatus('Please correct the highlighted fields.', true);
      result.first.focus();
      return;
    }
    if (mode === 'preview') {
      setStatus('Preview only: nothing was sent. On the live site this form sends your message to ' + EMAIL + '.');
      return;
    }
    if (!state.ready) {
      setStatus('This form cannot send yet. Please email ' + EMAIL + '.', true);
      return;
    }
    var token = window.grecaptcha.getResponse(state.widget);
    if (!token) {
      showCaptchaError('Tick the box to confirm you are not a robot.');
      setStatus('Please complete the reCAPTCHA check.', true);
      return;
    }
    hideCaptchaError();
    busy(true);
    var payload = result.values;
    payload.token = token;
    payload.website = form.elements.website ? form.elements.website.value : '';
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) { return { status: r.status, data: data || {} }; });
      })
      .then(function (res) {
        if (res.status === 200 && res.data.ok === true) { success(); return; }
        busy(false);
        var code = res.data.code;
        if (code === 'invalid' && res.data.errors) {
          var first = null;
          Object.keys(res.data.errors).forEach(function (name) {
            if (showError(name, String(res.data.errors[name])) && !first) { first = field(name); }
          });
          setStatus('Please correct the highlighted fields.', true);
          resetCaptcha();
          if (first) { first.focus(); }
        } else if (code === 'captcha_failed' || code === 'captcha_missing') {
          resetCaptcha();
          showCaptchaError('We could not confirm the reCAPTCHA check. Tick the box again.');
          setStatus('Your message was not sent.', true);
        } else if (code === 'not_configured') {
          unavailable();
          setStatus('Your message was not sent. Please email ' + EMAIL + '.', true);
        } else {
          resetCaptcha();
          setStatus('Your message was not sent. Please try again, or email ' + EMAIL + '.', true);
        }
      })
      .catch(function () {
        busy(false);
        resetCaptcha();
        setStatus('Your message was not sent. Check your connection and try again, or email ' + EMAIL + '.', true);
      });
  });
})();
