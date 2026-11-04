/* ============================================================
   GX RAIL v3 — floating glass rail untuk Toko Berkah
   - Baca menu dari .side .nav (TIDAK mengubah app.js)
   - Sync menu aktif via polling: kebal re-render #app
   - Klik item rail = klik menu aslinya (di-query fresh tiap kali)
   - Indikator drag vertikal (spring), rubber band
   - Tombol "Sembunyikan"/"Menu" di atas rail
   - Desktop only; mobile sidebar drawer asli tetap jalan
   ============================================================ */
(function () {
  'use strict';

  var SLOT = 52, DETACH = 32, MAX_WIDTH = 992;

  function navsNow() {
    return Array.prototype.slice.call(document.querySelectorAll('.side .nav'));
  }
  function activeIndex() {
    var ns = navsNow(), on = -1;
    for (var i = 0; i < ns.length; i++) if (ns[i].classList.contains('on')) on = i;
    return on;
  }

  function build() {
    var ns = navsNow();
    if (!ns.length) return;

    var rail = document.createElement('div');
    rail.className = 'gx-rail';
    rail.id = 'gxRail';

    var toggle = document.createElement('button');
    toggle.className = 'gx-rail-toggle';
    toggle.type = 'button';
    toggle.innerHTML = '<span class="chev">\u00ab</span><span class="tgl-label">Sembunyikan</span>';
    toggle.title = 'Sembunyikan tulisan menu';
    rail.appendChild(toggle);

    var ind = document.createElement('div');
    ind.className = 'gx-rail-ind';
    rail.appendChild(ind);

    var items = ns.map(function (nav, i) {
      var b = document.createElement('button');
      b.className = 'gx-rail-item';
      b.type = 'button';
      b.title = nav.textContent.trim();
      var svg = nav.querySelector('svg');
      b.appendChild(svg ? svg.cloneNode(true) : document.createTextNode('\u2022'));
      var lbl = document.createElement('span');
      lbl.className = 'gx-lbl';
      lbl.textContent = nav.textContent.trim();
      b.appendChild(lbl);
      b.addEventListener('click', function () {
        if (moved >= 6) return;
        var n = navsNow()[i];
        if (n) n.click();
      });
      rail.appendChild(b);
      return b;
    });

    document.body.appendChild(rail);
    rail.classList.add('built');

    document.documentElement.classList.add('gx-rail-expanded');
    function applyExpanded(exp) {
      rail.classList.toggle('collapsed', !exp);
      document.documentElement.classList.toggle('gx-rail-expanded', exp);
      toggle.querySelector('.chev').textContent = exp ? '\u00ab' : '\u00bb';
      toggle.querySelector('.tgl-label').textContent = exp ? 'Sembunyikan' : 'Menu';
      toggle.title = exp ? 'Sembunyikan tulisan menu' : 'Tampilkan tulisan menu';
    }
    applyExpanded(true);
    toggle.addEventListener('click', function () {
      applyExpanded(rail.classList.contains('collapsed'));
    });

    /* ---- fisika spring ---- */
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
      rail.style.transform = 'translateY(-50%) translateY(' + rubber.x + 'px)';
    }

    /* ---- drag ---- */
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
        if (moved >= 6) {
          var n = navsNow()[i];                  /* fresh query */
          if (n) n.click();                      /* drag berakhir di menu = pilih */
        }
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

    /* ---- sync menu aktif: polling, kebal re-render total #app ---- */
    var currentOn = -1;
    function sync() {
      var on = activeIndex();
      if (on >= 0 && on !== currentOn) {
        currentOn = on;
        items.forEach(function (t, j) { t.classList.toggle('active', j === on); });
        snapTo(on, 260, 0.55);
      }
    }
    sync();
    setInterval(sync, 250);
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