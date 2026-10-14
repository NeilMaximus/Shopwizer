/* Growth Lab website behaviour. Motion rules: growth-lab/DESIGN_SYSTEM.md, section Motion.
   Everything here is an enhancement: without it the page shows the finished cube and a still
   rune. The contact form has its own script, contact.js. */
(function () {
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* Value cube. Grows from today's core along each axis in turn: customers up, lifetime to the
     left, revenue to the right. Constants match scripts/gen_cube_svg.py, which draws the resting
     state into the HTML. */
  function buildCube() {
    var dev = document.getElementById('device');
    if (!dev) { return; }
    if (reduce || !window.requestAnimationFrame) { dev.classList.remove('pre-build'); return; }
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
    var DELAY = 500, DUR = 720, STEP = 840, start = null;
    dev.classList.add('building');
    draw(K, K, K);
    dev.classList.remove('pre-build');
    function frame(now) {
      if (start === null) { start = now; }
      var t = now - start - DELAY, g = [];
      for (var i = 0; i < 3; i++) {
        var k = Math.min(1, Math.max(0, (t - i * STEP) / DUR));
        g.push(K + (1 - K) * ease(k));
        if (k > 0) { labels[i].classList.add('on'); arrows[i].classList.add('on'); }
      }
      draw(g[2], g[0], g[1]);
      if (t < 2 * STEP + DUR) { requestAnimationFrame(frame); } else { dev.classList.remove('building'); }
    }
    requestAnimationFrame(frame);
  }

  /* Rune. It breathes by default and pauses only while it is known to be off screen, so it
     still moves in viewers where the observer never reports. */
  function liveRune() {
    var stage = document.querySelector('.rune-stage');
    if (!stage || reduce || !('IntersectionObserver' in window)) { return; }
    new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) { stage.classList.toggle('rune-idle', !entries[i].isIntersecting); }
    }, { rootMargin: '160px 0px' }).observe(stage);
  }

  buildCube();
  liveRune();
})();
