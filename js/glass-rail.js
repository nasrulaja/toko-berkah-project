/* ============================================================
   GX RAIL - logika floating glass rail untuk Toko Berkah
   - Membaca menu dari .side .nav yang sudah ada (TIDAK mengubah app.js)
   - Klik item rail = klik menu aslinya
   - Indikator bisa di-drag vertikal (spring), rubber band di ujung,
     easter egg: tarik ke samping >32px = tetesan air
   - Desktop only; di mobile sidebar asli tetap jalan
   ============================================================ */
(function () {
  'use strict';

  var SLOT = 52, DETACH = 32, MAX_WIDTH = 992;

  function build() {
    var navs = Array.prototype.slice.call(document.querySelectorAll('.side .nav'));
    if (!navs.length) return;

    var rail = document.createElement('div');
    rail.className = 'gx-rail';
    rail.id = 'gxRail';
    var ind = document.createElement('div');
    ind.className = 'gx-rail-ind';
    rail.appendChild(ind);

    var items = navs.map(function (nav, i) {
      var b = document.createElement('button');
      b.className = 'gx-rail-item';
      b.type = 'button';
      b.title = nav.textContent.trim();
      var svg = nav.querySelector('svg');
      b.appendChild(svg ? svg.cloneNode(true) : document.createTextNode('•'));
      b.addEventListener('click', function () {
        if (moved >= 6) return;
        nav.click();
      });
      rail.appendChild(b);
      return b;
    });

    document.body.appendChild(rail);
    rail.classList.add('built');

    function syncActive() {
      var on = -1;
      navs.forEach(function (n, i) { if (n.classList.contains('on')) on = i; });
      if (on < 0) on = 0;
      items.forEach(function (t, j) { t.classList.toggle('active', j === on); });
      snapTo(on, 260, 0.55);
    }

    var pos    = { x: 0, v: 0, t: 0, k: 260, z: 0.55, raf: null },
        pull   = { x: 0, v: 0, t: 0, k: 340, z: 0.30, raf: null },
        rubber = { x: 0, v: 0, t: 0, k: 300, z: 0.55, raf: null };

    function tick(s, cb) {
      s.raf = requestAnimationFrame(function () {
        var f = -s.k * (s.x - s.t) - 2 * s.z * Math.sqrt(s.k) * s.v;
        s.v += f / 60; s.x += s.v / 60;
        cb(s.x);
        if (Math.abs(s.v) > 0.002 || Math.abs(s.x - s.t) > 0.002) tick(s, cb);
        else { s.x = s.t; cb(s.x); s.raf = null; }
      });
    }
    function springTo(s, target, k, z, cb) {
      s.t = target; s.k = k; s.z = z;
      if (!s.raf) tick(s, cb);
    }
    function snapTo(i, k, z) { springTo(pos, i * SLOT, k, z, render); }

    function render() {
      var p = pull.x,
          stretch = Math.min(Math.abs(p) / DETACH, 1.5),
          scX = 1 + stretch * 0.55 * (Math.abs(p) > 0 ? 1 : 0),
          scY = 1 - Math.min(Math.abs(p) / DETACH, 1) * 0.22 * (Math.abs(p) > 0 ? 1 : 0);
      ind.style.transform = 'translate(0,' + pos.x + 'px) translateX(' + p + 'px) scale(' + scX.toFixed(3) + ',' + scY.toFixed(3) + ')';
      ind.style.boxShadow = '0 1px 0 0 rgba(255,255,255,.5) inset, 6px 0 18px rgba(0,0,0,.30), ' +
        (8 + Math.abs(p) * 0.3) + 'px 0 ' + (22 + Math.abs(p) * 0.6) + 'px rgba(0,0,0,' +
        Math.min(.32 + Math.abs(p) * .004, .6) + ')';
      rail.style.transform = 'translateY(-50%) translateY(' + rubber.x + 'px)';
    }

    var COUNT = items.length, MAX = (COUNT - 1) * SLOT;
    var dragging = false, detached = false, startY = 0, startX = 0, baseX = 0, moved = 0;

    function onDown(e) {
      if (dragging) return;
      var pt = e.touches ? e.touches[0] : e;
      dragging = true; detached = false; moved = 0;
      startY = pt.clientY; startX = pt.clientX; baseX = pos.x;
      pos.v = 0; pull.v = 0; pull.x = 0; rubber.v = 0;
      rail.classList.add('grabbing');
      try { if (e.pointerId != null) rail.setPointerCapture(e.pointerId); } catch (_) {}
      if (e.preventDefault) e.preventDefault();
      render();
    }
    function onMove(e) {
      if (!dragging) return;
      var pt = e.touches ? e.touches[0] : e;
      var dy = pt.clientY - startY, dx = pt.clientX - startX;
      moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      var target = baseX + dy;
      if (target < 0)      { rubber.t = -4 * Math.min(Math.abs(target) / 120, 1); target = 0; }
      else if (target > MAX) { rubber.t =  4 * Math.min((target - MAX) / 120, 1); target = MAX; }
      else rubber.t = 0;
      var side = dx;
      if (Math.abs(side) > DETACH) detached = true;
      if (detached) {
        pos.t = Math.max(0, Math.min(MAX, target)); pos.x = pos.t;
        pull.t = side; pull.x = side;
        rubber.t = 0;
      } else {
        springTo(pos, target, 380, 0.9, render);
        springTo(pull, 0, 340, 0.3, render);
      }
      if (!rubber.raf) tick(rubber, render);
      render();
      if (e.cancelable) e.preventDefault();
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      rail.classList.remove('grabbing');
      if (detached) {
        springTo(pull, 0, 340, 0.30, render);
        springTo(pos, Math.round(pos.t / SLOT) * SLOT, 340, 0.30, render);
        springTo(rubber, 0, 300, 0.55, render);
        setTimeout(function () { detached = false; }, 350);
      } else {
        var i = Math.round(pos.t / SLOT);
        springTo(pos, i * SLOT, 260, 0.55, render);
        springTo(pull, 0, 260, 0.55, render);
        springTo(rubber, 0, 300, 0.55, render);
        if (moved >= 6) navs[i].click();
      }
    }

    rail.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    rail.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    rail.addEventListener('touchstart', onDown, { passive: false });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);

    syncActive();
    var mo = new MutationObserver(function () {
      var on = -1;
      navs.forEach(function (n, i) { if (n.classList.contains('on')) on = i; });
      if (on >= 0) {
        items.forEach(function (t, j) { t.classList.toggle('active', j === on); });
        snapTo(on, 260, 0.55);
      }
    });
    var sideEl = document.querySelector('.side');
    if (sideEl) mo.observe(sideEl, { attributes: true, subtree: true, attributeFilter: ['class'] });
  }

  function boot() {
    if (window.innerWidth >= MAX_WIDTH) build();
    var last = window.innerWidth >= MAX_WIDTH;
    window.addEventListener('resize', function () {
      var now = window.innerWidth >= MAX_WIDTH;
      if (now !== last) location.reload();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
