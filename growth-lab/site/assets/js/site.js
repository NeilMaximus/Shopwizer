/* Growth Lab website behaviour. Motion rules: growth-lab/DESIGN_SYSTEM.md, section Motion.
   Everything here is an enhancement: without it the page shows the finished cube, a still rune and
   the client logos standing still. Each looping animation has a pause control and rests off screen. The contact form has its own script, contact.js. */
(function () {
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* Value cube. Grows from today's core along each axis in turn (customers up, lifetime to the
     left, revenue to the right), rests on the full cube, folds back to the core and grows again,
     slowly and endlessly (Neil, version 2.12). A button pauses it on the full cube, and it rests
     while off screen. With reduced motion, or without this script, it shows the full cube.
     Constants match scripts/gen_cube_svg.py, which draws the resting state into the HTML. */
  function liveCube() {
    var dev = document.getElementById('device');
    if (!dev) { return; }
    var card = dev.parentNode;
    var toggle = card.querySelector('.cube-toggle');
    var text = toggle && toggle.querySelector('.cube-toggle-text');
    var query = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var C = 0.8660254, U = 132, K = 0.6, CX = 260, CY = 196;
    var top = dev.querySelector('.f-top'), left = dev.querySelector('.f-left'), right = dev.querySelector('.f-right');
    var labels = dev.querySelectorAll('.out'), arrows = dev.querySelectorAll('.arrow');
    function p(x, y, z) { return (CX + (x - z) * C * U).toFixed(2) + ',' + (CY + (x + z) * 0.5 * U - y * U).toFixed(2); }
    function draw(x, y, z) {
      top.setAttribute('points', [p(0, y, 0), p(x, y, 0), p(x, y, z), p(0, y, z)].join(' '));
      left.setAttribute('points', [p(0, 0, z), p(x, 0, z), p(x, y, z), p(0, y, z)].join(' '));
      right.setAttribute('points', [p(x, 0, 0), p(x, 0, z), p(x, y, z), p(x, y, 0)].join(' '));
    }
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function light(i, on) { labels[i].classList.toggle('on', on); arrows[i].classList.toggle('on', on); }
    // One cycle: each axis grows in turn, the full cube rests, then folds back to the core and holds
    var DELAY = 500, DUR = 720, STEP = 840, BUILT = 2 * STEP + DUR, REST = 3000, FOLD = 900, CORE = 600;
    var CYCLE = BUILT + REST + FOLD + CORE;
    var elapsed = -DELAY, last = null, raf = 0, live = false;
    var held = { user: false, away: false };

    function full() {
      draw(1, 1, 1);
      for (var i = 0; i < 3; i++) { light(i, true); }
      dev.classList.remove('building');
    }
    function render() {
      var t = elapsed < 0 ? elapsed : elapsed % CYCLE, i;
      if (t < BUILT) {
        var g = [];
        for (i = 0; i < 3; i++) {
          var k = Math.min(1, Math.max(0, (t - i * STEP) / DUR));
          g.push(K + (1 - K) * ease(k));
          light(i, k > 0);
        }
        dev.classList.add('building');
        draw(g[2], g[0], g[1]);
      } else if (t < BUILT + REST) {
        full();
      } else {
        var s = 1 - (1 - K) * ease(Math.min(1, (t - BUILT - REST) / FOLD));
        for (i = 0; i < 3; i++) { light(i, false); }
        dev.classList.add('building');
        draw(s, s, s);
      }
    }
    // Time only moves while frames run, and a long gap (a background tab) counts as one frame
    function frame(now) {
      raf = 0;
      if (last !== null) { elapsed += Math.min(now - last, 64); }
      last = now;
      render();
      update();
    }
    function halt() { if (raf) { cancelAnimationFrame(raf); raf = 0; } last = null; }
    function update() {
      if (!live || held.user || held.away) { halt(); return; }
      if (!raf) { raf = requestAnimationFrame(frame); }
    }
    function start() {
      if (live) { return; }
      live = true;
      if (held.user) { full(); } else { render(); }
      dev.classList.remove('pre-build');
      if (toggle) { toggle.hidden = false; }
      update();
    }
    function stop() {
      live = false;
      halt();
      full();
      dev.classList.remove('pre-build');
      if (toggle) { toggle.hidden = true; }
    }
    function apply() { if (!window.requestAnimationFrame || (query && query.matches)) { stop(); } else { start(); } }

    if (toggle) {
      toggle.addEventListener('click', function () {
        held.user = !held.user;
        card.classList.toggle('is-paused', held.user);
        if (text) { text.textContent = held.user ? 'Play' : 'Pause'; }
        toggle.setAttribute('aria-label', (held.user ? 'Play' : 'Pause') + ' the cube animation');
        // Paused, it rests on the full cube; played again, it folds back soon after
        if (held.user) { halt(); full(); elapsed = BUILT + REST - 800; }
        update();
      });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        held.away = !entries[entries.length - 1].isIntersecting;
        update();
      }).observe(card);
    }
    if (query) {
      if (query.addEventListener) { query.addEventListener('change', apply); } else if (query.addListener) { query.addListener(apply); }
    }
    apply();
  }

  /* Rune. It breathes by default and pauses only while it is known to be off screen, so it
     still moves in viewers where the observer never reports. It runs as soon as any part of the band
     is within 120 px of the viewport, keeps running while partly visible, and rests once it has
     fully left. */
  function liveRune() {
    var stage = document.querySelector('.rune-stage');
    if (!stage || reduce || !('IntersectionObserver' in window)) { return; }
    new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) { stage.classList.toggle('rune-idle', !entries[i].isIntersecting); }
    }, { rootMargin: '120px 0px', threshold: [0, 0.01] }).observe(stage);
  }

  /* Client logos. One slow, constant drift from left to right (DESIGN_SYSTEM.md, section 10). The
     duration comes from the measured width of one set of logos, so the speed holds whatever the
     logos are, and the loop is seamless: the track holds enough identical copies that moving it by
     exactly one set returns it to an identical picture. Copies are hidden from assistive technology.
     A button pauses it, and it holds still on hover, on focus and while off screen. With reduced
     motion, or without this script, the logos stand still and wrap. */
  function clientStrip() {
    var strip = document.querySelector('.clients');
    if (!strip || !strip.animate) { return; }
    var viewport = strip.querySelector('.clients-viewport');
    var track = strip.querySelector('.clients-track');
    var set = strip.querySelector('.clients-set');
    var toggle = strip.querySelector('.clients-toggle');
    var text = toggle.querySelector('.clients-toggle-text');
    var query = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var anim = null;
    var held = { user: false, hover: false, focus: false, away: false };

    function copies() { return track.querySelectorAll('.clients-set[aria-hidden="true"]'); }
    function update() {
      if (!anim) { return; }
      var hold = held.user || held.hover || held.focus || held.away;
      if (hold && anim.playState === 'running') { anim.pause(); }
      if (!hold && anim.playState === 'paused') { anim.play(); }
    }
    function still() {
      if (anim) { anim.cancel(); anim = null; }
      Array.prototype.forEach.call(copies(), function (c) { c.parentNode.removeChild(c); });
      strip.classList.remove('is-moving');
      toggle.hidden = true;
    }
    function move() {
      strip.classList.add('is-moving');
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      var period = set.getBoundingClientRect().width + gap;
      if (!period) { return; }
      // One set of travel must never show an edge, so the track spans the viewport plus one set
      var needed = Math.ceil(viewport.clientWidth / period) + 1;
      for (var have = copies().length + 1; have < needed; have++) {
        var copy = set.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        copy.setAttribute('inert', '');
        copy.removeAttribute('aria-label');
        copy.removeAttribute('role');
        Array.prototype.forEach.call(copy.querySelectorAll('img'), function (img) { img.alt = ''; });
        track.appendChild(copy);
      }
      var speed = parseFloat(strip.getAttribute(window.innerWidth < 640 ? 'data-speed-narrow' : 'data-speed')) || 20;
      var duration = period / speed * 1000;
      var fraction = 0;
      if (anim) {
        var old = anim.effect.getTiming().duration;
        fraction = ((anim.currentTime || 0) % old) / old;
        anim.cancel();
      }
      anim = track.animate(
        [{ transform: 'translate3d(' + (-period).toFixed(3) + 'px, 0, 0)' }, { transform: 'translate3d(0, 0, 0)' }],
        { duration: duration, iterations: Infinity, easing: 'linear' }
      );
      anim.currentTime = fraction * duration;
      toggle.hidden = false;
      update();
    }
    function apply() { if (query && query.matches) { still(); } else { move(); } }

    toggle.addEventListener('click', function () {
      held.user = !held.user;
      strip.classList.toggle('is-paused', held.user);
      text.textContent = held.user ? 'Play' : 'Pause';
      toggle.setAttribute('aria-label', (held.user ? 'Play' : 'Pause') + ' the client logos');
      update();
    });
    strip.addEventListener('pointerenter', function () { held.hover = true; update(); });
    strip.addEventListener('pointerleave', function () { held.hover = false; update(); });
    strip.addEventListener('focusin', function () { held.focus = true; update(); });
    strip.addEventListener('focusout', function () { held.focus = false; update(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        held.away = !entries[entries.length - 1].isIntersecting;
        update();
      }).observe(strip);
    }
    if ('ResizeObserver' in window) {
      var pending = false;
      var ro = new ResizeObserver(function () {
        if (pending || !anim) { return; }
        pending = true;
        requestAnimationFrame(function () { pending = false; if (anim) { move(); } });
      });
      ro.observe(viewport);
      ro.observe(set);
    }
    if (query) {
      if (query.addEventListener) { query.addEventListener('change', apply); } else if (query.addListener) { query.addListener(apply); }
    }
    apply();
  }

  liveCube();
  liveRune();
  clientStrip();
})();
