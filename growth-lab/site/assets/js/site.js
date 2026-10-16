/* Growth Lab website behaviour. Motion rules: growth-lab/DESIGN_SYSTEM.md, section Motion.
   Everything here is an enhancement: without it the page shows the finished cube, a still rune and
   the client logos standing still. Each looping animation rests off screen. The contact form has its own script, contact.js. */
(function () {
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* Value cube. Grows from today's core along each axis in turn (customers up, lifetime to the
     left, revenue to the right), rests on the full cube, folds back to the core and grows again,
     slowly and endlessly (Neil, version 2.12). It rests while off screen, and with reduced motion, or
     without this script, it shows the full cube. It has no pause button (Neil, 16 October 2026).
     Constants match scripts/gen_cube_svg.py, which draws the resting state into the HTML. */
  function liveCube() {
    var dev = document.getElementById('device');
    if (!dev) { return; }
    var card = dev.parentNode;
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
    var held = { away: false };

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
      if (!live || held.away) { halt(); return; }
      if (!raf) { raf = requestAnimationFrame(frame); }
    }
    function start() {
      if (live) { return; }
      live = true;
      render();
      dev.classList.remove('pre-build');
      update();
    }
    function stop() {
      live = false;
      halt();
      full();
      dev.classList.remove('pre-build');
    }
    function apply() { if (!window.requestAnimationFrame || (query && query.matches)) { stop(); } else { start(); } }

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
     It holds still on hover and while off screen; it has no pause button (Neil, 16 October 2026). With
     reduced motion, or without this script, the logos stand still and wrap. */
  function clientStrip() {
    var strip = document.querySelector('.clients');
    if (!strip || !strip.animate) { return; }
    var viewport = strip.querySelector('.clients-viewport');
    var track = strip.querySelector('.clients-track');
    var set = strip.querySelector('.clients-set');
    var query = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var anim = null;
    var held = { hover: false, away: false };

    function copies() { return track.querySelectorAll('.clients-set[aria-hidden="true"]'); }
    function update() {
      if (!anim) { return; }
      var hold = held.hover || held.away;
      if (hold && anim.playState === 'running') { anim.pause(); }
      if (!hold && anim.playState === 'paused') { anim.play(); }
    }
    function still() {
      if (anim) { anim.cancel(); anim = null; }
      Array.prototype.forEach.call(copies(), function (c) { c.parentNode.removeChild(c); });
      strip.classList.remove('is-moving');
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
      update();
    }
    function apply() { if (query && query.matches) { still(); } else { move(); } }

    strip.addEventListener('pointerenter', function () { held.hover = true; update(); });
    strip.addEventListener('pointerleave', function () { held.hover = false; update(); });
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

  /* Research explorer (version 2.13). Four named tabs at the top of the panel, one view at a time, and Previous
     and Next at its foot. Every view sits in the same grid cell, so the frame keeps the tallest view's height at
     any width and nothing below it moves; the views not shown are made invisible and inert, never given the
     hidden attribute. The tabs follow the ARIA tabs pattern (arrow keys, Home and End). Without this script every
     view shows in turn. It never moves on its own (DESIGN_SYSTEM.md, section 11). */
  function researchExplorer() {
    var rx = document.querySelector('.rx');
    if (!rx) { return; }
    var list = rx.querySelector('.rx-tabs'), tabs = rx.querySelectorAll('.rx-tab'), views = rx.querySelectorAll('.rx-view');
    var nav = rx.querySelector('.rx-nav'), prev = rx.querySelector('.rx-prev'), next = rx.querySelector('.rx-next');
    var count = rx.querySelector('.rx-count'), status = rx.querySelector('.rx-status');
    var last = tabs.length - 1, current = 0;
    function show(i, how) {
      i = Math.max(0, Math.min(last, i));
      var had = document.activeElement;
      for (var t = 0; t <= last; t++) {
        var on = t === i;
        tabs[t].setAttribute('aria-selected', on ? 'true' : 'false');
        tabs[t].tabIndex = on ? 0 : -1;
        views[t].setAttribute('data-active', on ? 'true' : 'false');
        if (on) { views[t].removeAttribute('inert'); } else { views[t].setAttribute('inert', ''); }
      }
      current = i;
      prev.disabled = i === 0;
      next.disabled = i === last;
      count.textContent = (i + 1) + ' of ' + tabs.length;
      if (how === 'tab') { tabs[i].focus(); }
      if (how === 'step') {
        status.textContent = tabs[i].textContent.trim() + ', ' + (i + 1) + ' of ' + tabs.length;
        // A button that has just become unavailable hands focus to the other one
        if (had && had.disabled) { (had === next ? prev : next).focus(); }
        // On a long phone screen, bring the start of the new view into sight
        if (rx.getBoundingClientRect().top < 0) { rx.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); }
      }
    }
    Array.prototype.forEach.call(tabs, function (tab, i) {
      views[i].setAttribute('role', 'tabpanel');
      views[i].setAttribute('aria-labelledby', tab.id);
      tab.addEventListener('click', function () { show(i); });
    });
    list.addEventListener('keydown', function (e) {
      var keys = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: last };
      if (!(e.key in keys)) { return; }
      e.preventDefault();
      show((keys[e.key] + tabs.length) % tabs.length, 'tab');
    });
    prev.addEventListener('click', function () { show(current - 1, 'step'); });
    next.addEventListener('click', function () { show(current + 1, 'step'); });
    rx.classList.add('is-tabbed');
    list.hidden = false;
    nav.hidden = false;
    show(0);
  }

  liveCube();
  researchExplorer();
  liveRune();
  clientStrip();
})();
