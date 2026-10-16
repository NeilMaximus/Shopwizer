"""Build steps for the Growth Lab website. Standard library only.

  python3 scripts/build.py            sync tokens, render the draft legal pages, the contact phone line and the
                                      client logo strip into site/
  python3 scripts/build.py preview    also write dist/preview/ (pages for the private Claude artifact)
                                      and dist/browser/ (the same pages to open straight from a folder)
  python3 scripts/build.py package    also write dist/growth-lab-site.zip (the Vercel ready folder, with api/)

site/ stays deployable as it is, with no build step on Vercel. Run this after editing
tokens/tokens.css, anything in legal/, config/contact.json, config/client-logos.json or the
files in site/assets/clients/.
"""
import base64
import html
import json
import pathlib
import re
import shutil
import struct
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
DIST = ROOT / "dist"
CLIENTS = SITE / "assets" / "clients"
PLATFORMS = SITE / "assets" / "platforms"


def sync_tokens():
    """Copies tokens.css into the site and regenerates tokens.json from it."""
    src = ROOT / "tokens" / "tokens.css"
    shutil.copy(src, SITE / "assets" / "css" / "tokens.css")
    groups = {"colour": {}, "type": {}, "layout": {}, "motion": {}}
    for name, value in re.findall(r"--(gl-[\w-]+):\s*([^;]+);", src.read_text(encoding="utf8")):
        value = value.strip()
        if value.startswith("#"):
            groups["colour"][name] = value
        elif any(s in name for s in ("font", "weight", "text", "track")):
            groups["type"][name] = value
        elif any(s in name for s in ("ease", "cycle")):
            groups["motion"][name] = value
        else:
            groups["layout"][name] = value
    doc = {"$description": "Growth Lab website tokens. Generated from tokens/tokens.css. Rules: DESIGN_SYSTEM.md", **groups}
    (ROOT / "tokens" / "tokens.json").write_text(json.dumps(doc, indent=2) + "\n", encoding="utf8")


def font_data_uri():
    data = (SITE / "assets" / "fonts" / "geist" / "Geist-Variable-Latin.woff2").read_bytes()
    return "data:font/woff2;base64," + base64.b64encode(data).decode()


def inline_assets(page_html):
    """Turns a site page into one self contained file: CSS, font and script inlined."""
    css = (SITE / "assets" / "css" / "tokens.css").read_text(encoding="utf8")
    css += "\n" + (SITE / "assets" / "css" / "site.css").read_text(encoding="utf8")
    css = css.replace('url("../fonts/geist/Geist-Variable-Latin.woff2")', f'url("{font_data_uri()}")')
    page_html = re.sub(r'\s*<link rel="preload"[^>]*>', "", page_html)
    page_html = re.sub(r'\s*<link rel="icon"[^>]*>', "", page_html)
    page_html = re.sub(r'\s*<link rel="stylesheet" href="assets/css/tokens.css">', "", page_html)
    page_html = page_html.replace('<link rel="stylesheet" href="assets/css/site.css">', f"<style>\n{css}\n</style>")
    def script(match):
        return "<script>\n" + (SITE / "assets" / "js" / match.group(1)).read_text(encoding="utf8") + "\n</script>"
    page_html = re.sub(r'<script src="assets/js/([\w.-]+\.js)" defer></script>', script, page_html)
    return page_html


def render_contact_phone():
    """Writes Neil's phone line into site/contact.html from config/contact.json. While the number is
    pending the line is left out: never a placeholder, never another company's number."""
    cfg = json.loads((ROOT / "config" / "contact.json").read_text(encoding="utf8"))
    display, tel = cfg.get("phone_display", "").strip(), cfg.get("phone_tel", "").strip()
    if bool(display) != bool(tel):
        sys.exit("config/contact.json: set both phone_display and phone_tel, or neither")
    if tel and not re.fullmatch(r"\+[1-9][0-9]{7,14}", tel):
        sys.exit("config/contact.json: phone_tel must be digits with the country code, like +27820000000")
    if display and not re.fullmatch(r"[+0-9 ()]{7,24}", display):
        sys.exit("config/contact.json: phone_display may only hold digits, spaces, brackets and a leading +")
    if tel:
        block = (f'        <div>\n          <dt>Phone</dt>\n'
                 f'          <dd><a href="tel:{tel}">{html.escape(display)}</a></dd>\n        </div>\n')
    else:
        block = "        <!-- Phone pending: set phone_display and phone_tel in config/contact.json -->\n"
    path = SITE / "contact.html"
    page = path.read_text(encoding="utf8")
    page, n = re.subn(r"(        <!-- contact-phone:start -->\n).*?(        <!-- contact-phone:end -->)",
                      lambda m: m.group(1) + block + m.group(2), page, flags=re.S)
    assert n == 1, "contact.html lost its contact-phone markers"
    path.write_text(page, encoding="utf8")
    return bool(tel)


def logo_ratio(path):
    """Width to height of a client logo: an SVG's viewBox (or width and height), or a PNG's header.
    SVGs with scripts or external references are refused."""
    if path.suffix == ".png":
        data = path.read_bytes()
        assert data[:8] == b"\x89PNG\r\n\x1a\n", f"{path.name} is not a PNG"
        w, h = struct.unpack(">II", data[16:24])
        return w / h
    text = path.read_text(encoding="utf8")
    assert not re.search(r"<script|<foreignObject|\son\w+=|(?:xlink:)?href=\"(?!#|data:)", text, re.I), \
        f"{path.name}: scripts, event handlers or external references are not allowed"
    m = re.search(r'viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)', text)
    if m:
        return float(m.group(1)) / float(m.group(2))
    w = re.search(r'<svg[^>]*\swidth="([\d.]+)', text)
    h = re.search(r'<svg[^>]*\sheight="([\d.]+)', text)
    assert w and h, f"{path.name}: needs a viewBox, or width and height"
    return float(w.group(1)) / float(h.group(1))


def client_strip(manifest=ROOT / "config" / "client-logos.json", folder=CLIENTS, prefix="assets/clients/"):
    """Markup for the client logo strip from the manifest and the genuine files present, in manifest
    order. Returns (markup, missing names). With no files it returns a comment naming every brand, so
    the page never shows an empty, partial placeholder or invented logo."""
    cfg = json.loads(manifest.read_text(encoding="utf8"))
    items, missing = [], []
    for logo in cfg["logos"]:
        name, stem = logo["name"].strip(), logo["file"]
        assert name and re.fullmatch(r"[a-z0-9-]+", stem), f"client-logos.json: bad entry {logo}"
        found = next((folder / f"{stem}{ext}" for ext in (".svg", ".png") if (folder / f"{stem}{ext}").is_file()), None)
        if not found:
            missing.append(name)
            continue
        scale = float(logo.get("scale", 1))
        assert 0.5 <= scale <= 1.6, f"client-logos.json: scale for {name} must be between 0.5 and 1.6"
        style = f' style="--logo-scale: {scale:g}"' if scale != 1 else ""
        items.append(f'            <li><img src="{prefix}{found.name}" width="{round(1000 * logo_ratio(found))}" height="1000" '
                     f'alt="{html.escape(name)}"{style} decoding="async"></li>\n')
    if not items:
        return (f"    <!-- Client logos pending: no genuine files in site/assets/clients yet. Missing: "
                f"{', '.join(missing)}. See config/client-logos.json -->\n"), missing
    note = f"    <!-- Still missing: {', '.join(missing)} -->\n" if missing else ""
    speed = cfg.get("speed", {})
    markup = (note +
        f'    <div class="wrap clients" data-speed="{float(speed.get("wide", 20)):g}" data-speed-narrow="{float(speed.get("narrow", 18)):g}">\n'
        '      <div class="clients-viewport">\n'
        '        <div class="clients-track">\n'
        '          <ul class="clients-set" role="list" aria-label="Clients">\n'
        + "".join(items) +
        '          </ul>\n'
        '        </div>\n'
        '      </div>\n'
        '    </div>\n'
        # The strip takes its single moving row before the first paint, so nothing below it jumps when
        # site.js starts the loop; without the script, or with reduced motion, the logos wrap and stand still
        "    <script>(function () { var s = document.currentScript.previousElementSibling; if (s && s.animate && "
        "!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) { s.classList.add('is-moving'); } })();</script>\n")
    return markup, missing


def render_client_logos():
    """Writes the client logo strip into site/index.html between its markers."""
    markup, missing = client_strip()
    path = SITE / "index.html"
    page = path.read_text(encoding="utf8")
    page, n = re.subn(r"(    <!-- client-logos:start -->\n).*?(    <!-- client-logos:end -->)",
                      lambda m: m.group(1) + markup + m.group(2), page, flags=re.S)
    assert n == 1, "index.html lost its client-logos markers"
    path.write_text(page, encoding="utf8")
    return missing


def platform_row(source=ROOT / "config" / "platform-logos.json"):
    """Markup for the leading solutions row: each platform's own logo in ink, in the configured order,
    at its optical height. Only logos present in site/assets/platforms/ appear; the rest are named."""
    cfg = json.loads(source.read_text(encoding="utf8"))
    items, missing = [], []
    for logo in cfg["logos"]:
        f = PLATFORMS / f'{logo["file"]}.png'
        if not f.exists():
            missing.append(logo["name"])
            continue
        # Width and height from the file, so the row keeps its shape while the lazy logos load
        w, h = struct.unpack(">II", f.read_bytes()[16:24])
        width = round(logo["height"] * w / h)
        items.append(f'            <li style="--logo-h: {logo["height"]}px"><img src="assets/platforms/{f.name}" alt="{html.escape(logo["name"])}" '
                     f'width="{width}" height="{logo["height"]}" loading="lazy" decoding="async"></li>\n')
    markup = ('          <ul class="platforms-list" role="list" aria-labelledby="platforms-title">\n' + "".join(items) + '          </ul>\n')
    return markup, missing, len(cfg["logos"])


def render_platform_row():
    """Writes the leading solutions row into site/index.html between its markers."""
    markup, missing, total = platform_row()
    path = SITE / "index.html"
    page = path.read_text(encoding="utf8")
    page, n = re.subn(r"(          <!-- platform-logos:start -->\n).*?(          <!-- platform-logos:end -->)",
                      lambda m: m.group(1) + markup + m.group(2), page, flags=re.S)
    assert n == 1, "index.html lost its platform-logos markers"
    path.write_text(page, encoding="utf8")
    return missing, total


QUADRANTS = {"powerhouse": "Powerhouse", "overbuilt": "Overbuilt", "precision": "Precision", "underbuilt": "Underbuilt"}


def apex_matrix(source=ROOT / "config" / "apex-retail-example.json"):
    """Markup for the Apex Martech Matrix retail example in the research carousel, drawn from the
    measured data in config/apex-retail-example.json: every retailer's dot in its quadrant colour at
    its measured position, and the highlighted examples (retailers known in South Africa) as larger
    dots whose name labels sit in clear space, joined to the dot by a thin leader. Nothing is invented
    or moved: the label position is chosen in the data, the dot stays where MartechTribe put it."""
    cfg = json.loads(source.read_text(encoding="utf8"))
    named = {e["name"]: e for e in cfg["examples"]}
    found = {r["name"] for r in cfg["retailers"]} & set(named)
    assert found == set(named), f"examples missing from the chart: {sorted(set(named) - found)}"
    dots, leaders, labels = [], [], []
    for r in sorted(cfg["retailers"], key=lambda r: r["name"] in named):
        q = r["quadrant"]
        assert q in QUADRANTS and 0 <= r["x"] <= 100 and 0 <= r["y"] <= 100, f"bad retailer {r}"
        pos = f'style="--x: {r["x"]}%; --y: {r["y"]}%"'
        if r["name"] in named:
            ex = named[r["name"]]
            assert ex["quadrant"] == q, f"{r['name']}: example quadrant differs from the chart"
            lx, ly = ex["callout"]
            assert 0 < lx < 100 and 0 < ly < 100, f"bad callout for {r['name']}"
            name = html.escape(r["name"])
            dots.append(f'              <span class="mx-dot q-{q} is-named" data-name="{name}" {pos}></span>\n')
            leaders.append(f'<line x1="{r["x"]}" y1="{r["y"]}" x2="{lx}" y2="{ly}"/>')
            labels.append(f'              <span class="mx-name" style="--x: {lx}%; --y: {ly}%">{name}</span>\n')
        else:
            dots.append(f'              <span class="mx-dot q-{q}" {pos}></span>\n')
    d = cfg["dividers"]
    return (f'            <div class="mx-plot" style="--mx-x: {d["x"]}%; --mx-y: {d["y"]}%" aria-hidden="true">\n'
            '              <span class="mx-goal"></span><span class="mx-line mx-v"></span><span class="mx-line mx-h"></span>\n'
            + "".join(f'              <span class="mx-tag mx-tag-{q}"><i class="q-{q}"></i>{label}</span>\n' for q, label in QUADRANTS.items())
            + '              <svg class="mx-leaders" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">' + "".join(leaders) + '</svg>\n'
            + "".join(dots) + "".join(labels) +
            '            </div>\n')


def render_apex_matrix():
    """Writes the Apex Martech Matrix example into site/index.html between its markers."""
    path = SITE / "index.html"
    page = path.read_text(encoding="utf8")
    page, n = re.subn(r"(            <!-- apex-matrix:start -->\n).*?(            <!-- apex-matrix:end -->)",
                      lambda m: m.group(1) + apex_matrix() + m.group(2), page, flags=re.S)
    assert n == 1, "index.html lost its apex-matrix markers"
    path.write_text(page, encoding="utf8")


def offline_contact(page_html):
    """The Claude preview and the browser files have no server behind them, so their contact form
    runs in preview mode: it validates but never sends, and says so on the page."""
    assert page_html.count('data-mode="live"') == 1, "contact form mode marker missing"
    return page_html.replace('data-mode="live"', 'data-mode="preview"')


# Search and link preview tags point at growthlab.co.za, so only the real site carries them
SEARCH_TAGS = re.compile(r'\s*(?:<link rel="canonical"[^>]*>|<meta (?:property="og:|name="twitter:)[^>]*>|<script type="application/ld\+json">.*?</script>)', re.S)


def build_preview():
    """Pages for the private Claude artifact. Its viewer cannot follow email or phone links reliably
    and can show a blank page after one, so the preview shows addresses and numbers as plain
    selectable text. The contact form runs in preview mode. The site keeps its working links."""
    out = DIST / "preview"
    out.mkdir(parents=True, exist_ok=True)
    # Main page: the artifact host supplies doctype, head and body, so keep only what sits inside them
    page = inline_assets((SITE / "index.html").read_text(encoding="utf8"))
    head = re.search(r"<head>(.*?)</head>", page, re.S).group(1)
    body = re.search(r"<body>(.*?)</body>", page, re.S).group(1)
    head = re.sub(r'\s*<meta (charset|name="viewport")[^>]*>', "", head)
    head = SEARCH_TAGS.sub("", head)
    (out / "index.html").write_text(head.strip() + "\n" + body.strip() + "\n", encoding="utf8")
    for name in ("contact.html", "privacy.html", "terms.html"):
        other = SEARCH_TAGS.sub("", inline_assets((SITE / name).read_text(encoding="utf8")))
        if name == "contact.html":
            other = offline_contact(other)
        other = re.sub(r'<a href="(?:mailto|tel):[^"]+">([^<]+)</a>', r"\1", other)
        other = other.replace('href="./"', 'href="index.html"')  # the artifact serves the page as index.html
        (out / name).write_text(other, encoding="utf8")
    # Images stay separate files, published beside the page with the artifact
    shutil.rmtree(out / "assets", ignore_errors=True)
    shutil.copytree(SITE / "assets" / "media", out / "assets" / "media")
    if any(CLIENTS.glob("*.*")):
        shutil.copytree(CLIENTS, out / "assets" / "clients")
    shutil.copytree(SITE / "assets" / "brands", out / "assets" / "brands")
    shutil.copytree(PLATFORMS, out / "assets" / "platforms")
    for f in out.glob("*.html"):
        text = f.read_text(encoding="utf8")
        assert "mailto:" not in text and "tel:" not in text, f"email or phone link left in preview {f.name}"
    return out


BROWSER_NAMES = {"index.html": "growth-lab-martech.html", "contact.html": "growth-lab-contact.html",
                 "privacy.html": "growth-lab-privacy.html", "terms.html": "growth-lab-terms.html"}


def inline_images(page_html):
    """Embeds the page images as data URIs for the browser files, each from its own file, so srcset goes."""
    def data_uri(match):
        data = (SITE / "assets" / "media" / match.group(1)).read_bytes()
        return 'src="data:image/jpeg;base64,' + base64.b64encode(data).decode() + '"'
    def client_uri(match):
        f = CLIENTS / match.group(1)
        kind = "image/svg+xml" if f.suffix == ".svg" else "image/png"
        return f'src="data:{kind};base64,' + base64.b64encode(f.read_bytes()).decode() + '"'
    page_html = re.sub(r'\s(srcset|sizes)="[^"]*"', "", page_html)
    page_html = re.sub(r'src="assets/clients/([\w.-]+\.(?:svg|png))"', client_uri, page_html)
    for folder in ("brands", "platforms"):
        page_html = re.sub(rf'src="assets/{folder}/([\w.-]+\.png)"', lambda m, d=folder: 'src="data:image/png;base64,' +
                           base64.b64encode((SITE / "assets" / d / m.group(1)).read_bytes()).decode() + '"', page_html)
    return re.sub(r'src="assets/media/([\w.-]+\.jpg)"', data_uri, page_html)


def build_browser():
    """The same pages as complete, self contained files that open straight from a folder in any
    browser (font, styles, scripts and images inlined, so no server is needed). Email links work
    here; the contact form runs in preview mode because there is no server to send through."""
    out = DIST / "browser"
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir(parents=True)
    icon = base64.b64encode((SITE / "favicon.svg").read_bytes()).decode()
    for name, target in BROWSER_NAMES.items():
        page = inline_images(inline_assets((SITE / name).read_text(encoding="utf8")))
        if name == "contact.html":
            page = offline_contact(page)
        page = page.replace("</title>", f'</title>\n<link rel="icon" href="data:image/svg+xml;base64,{icon}">', 1)
        page = page.replace('href="./"', f'href="{BROWSER_NAMES["index.html"]}"')
        for src, dst in BROWSER_NAMES.items():
            page = page.replace(f'href="{src}"', f'href="{dst}"')
        assert not re.search(r'(src|href|srcset)="assets/', page), f"unresolved asset path in browser file {target}"
        (out / target).write_text(page, encoding="utf8")
    return out


LEGAL_PAGES = ("privacy.html", "terms.html")


def check_legal_pages():
    """The privacy notice and website terms were approved and published on 14 October 2026 (legal/*.md
    holds their text). site/privacy.html and site/terms.html are those published pages, kept as they are
    live: change the Markdown and the page together, and only with Neil's approval."""
    for name in LEGAL_PAGES:
        page = (SITE / name).read_text(encoding="utf8")
        assert "Effective date" in page and not re.search(r"Draft for review|CONFIRM", page), f"{name} is not the approved page"
        assert "mailto:" not in page and "tel:" not in page, f"email or phone link in {name}"


def build_production():
    """The site as it goes live: site/ unchanged, with the approved privacy notice and website terms."""
    out = DIST / "production"
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(SITE, out)
    for name in ("index.html", "contact.html"):
        page = (out / name).read_text(encoding="utf8")
        assert 'href="privacy.html"' in page and 'href="terms.html"' in page, f"legal links missing in {name}"
    return out


def build_repo_layout(site):
    """The production site laid out for the Growth-Lab-2026 repository, which Vercel deploys from main
    with Framework Other, an empty Root Directory and outputDirectory public: the static files in
    public/, the function in api/ at the repository root (Vercel only builds functions from there, never
    from the output directory) and vercel.json at the root with outputDirectory added. Replacing
    public/, api/ and vercel.json in one commit swaps the site and leaves the rest of that repository."""
    out = DIST / "growth-lab-2026"
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(site, out / "public", ignore=lambda d, names: ["api", "vercel.json"] if pathlib.Path(d) == site else [])
    shutil.copytree(site / "api", out / "api")
    cfg = json.loads((site / "vercel.json").read_text(encoding="utf8"))
    layout = {"$schema": cfg.pop("$schema"), "outputDirectory": "public", **cfg}
    (out / "vercel.json").write_text(json.dumps(layout, indent=2) + "\n", encoding="utf8")
    zpath = DIST / "growth-lab-2026-release.zip"
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(out.rglob("*")):
            if f.is_file():
                z.write(f, pathlib.Path("growth-lab-2026-release") / f.relative_to(out))
    return zpath


def build_package():
    """Zip layout: docs at the top, the deployable production site in site/ so the docs are never served."""
    site = build_production()
    DIST.mkdir(exist_ok=True)
    zpath = DIST / "growth-lab-site.zip"
    top = pathlib.Path("growth-lab-site")
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(ROOT / "DEPLOY.md", top / "README.md")
        z.write(ROOT / "PRELAUNCH.md", top / "PRELAUNCH.md")
        z.write(ROOT / "DESIGN_SYSTEM.md", top / "DESIGN_SYSTEM.md")
        z.write(ROOT / "SOURCES.md", top / "SOURCES.md")
        z.write(ROOT / ".env.example", top / ".env.example")
        for f in sorted(site.rglob("*")):
            if f.is_file():
                z.write(f, top / "site" / f.relative_to(site))
    return zpath


def main(args):
    if args[:1] == ["client-strip"]:  # used by tests/verify.cjs to render the strip from test files
        print(client_strip(pathlib.Path(args[1]), pathlib.Path(args[2]))[0], end="")
        return
    sync_tokens()
    print("contact phone:", "set" if render_contact_phone() else "pending (config/contact.json)")
    missing = render_client_logos()
    render_apex_matrix()
    p_missing, p_total = render_platform_row()
    print(f"platform logos: {p_total - len(p_missing)} of {p_total} present" + (f"; MISSING: {', '.join(p_missing)}" if p_missing else ""))
    total = len(json.loads((ROOT / "config" / "client-logos.json").read_text(encoding="utf8"))["logos"])
    print(f"client logos: {total - len(missing)} of {total} present" + (f"; MISSING: {', '.join(missing)}" if missing else ""))
    check_legal_pages()
    print("site/ updated")
    if "preview" in args or "package" in args:
        print("preview:", build_preview())
        print("browser:", build_browser())
    if "package" in args:
        print("package:", build_package())
        print("Growth-Lab-2026 layout:", build_repo_layout(DIST / "production"))


if __name__ == "__main__":
    main(sys.argv[1:])
