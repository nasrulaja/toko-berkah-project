/* ==========================================================================
   TOKO BERKAH — glass-rail.js
   Rail kaca mengapung: salinan menu sidebar yang bisa digeser dengan mouse
   atau jari, dengan efek pegas (spring) seperti kaca basah.
   --------------------------------------------------------------------------
   PETA FILE — cari teks "BAGIAN n":
     BAGIAN 1  KONFIGURASI & PEMBANTU   CONFIG, navsNow(), activeIndex()
     BAGIAN 2  MEMBANGUN RAIL           build(), applyExpanded()
     BAGIAN 3  FISIKA PEGAS & RENDER    tick(), springTo(), snapTo(), render()
     BAGIAN 4  GESER (DRAG)             onDown(), onMove(), onUp()
     BAGIAN 5  SINKRON & PENGAWASAN     sync(), polling build()
   ========================================================================== */

/* GX RAIL v4 — floating glass rail, semua ukuran layar */
(function () {
  'use strict';

  /* ========================================================================
     BAGIAN 1 — KONFIGURASI & PEMBANTU
     Semua angka geser/pegas ada di CONFIG. SLOT = jarak antar ikon (px),
     DETACH = jarak tarik sebelum rail "lepas" dari menu, SPRING = kekakuan (k)
     dan redaman (z) untuk tiap animasi.
     ======================================================================== */

  /* TUNING KNOBS - ubah angka di sini saja */
  var CONFIG = {
    SLOT: 52,
    DETACH: 32,
    SPRING: {
      pos: { k: 260, z: 0.55 },
      pull: { k: 340, z: 0.3 },
      rubber: { k: 300, z: 0.55 }
    },
    STRETCH_MAX: 1.5,
    SCALE_X: 0.55,
    SCALE_Y: 0.22
  };

  var SLOT = CONFIG.SLOT,
    DETACH = CONFIG.DETACH;

  function navsNow() {
    return Array.prototype.slice.call(document.querySelectorAll('.side .nav'));
  }
  function activeIndex() {
    var ns = navsNow(),
      on = -1;
    for (var i = 0; i < ns.length; i++) if (ns[i].classList.contains('on')) on = i;
    return on;
  }

  /* ========================================================================
     BAGIAN 2 — MEMBANGUN RAIL
     Membuat elemen #gxRail (salinan ikon dari .side .nav), menempelkannya ke
     body, lalu menyiapkan tombol buka/tutup tulisan menu.
     ======================================================================== */

  /* Bangun / hapus rail sesuai keberadaan menu.
     Dipanggil berulang (polling) agar sidebar langsung muncul saat login
     dan hilang saat logout TANPA perlu refresh. */
  function build() {
    var existing = document.getElementById('gxRail');
    var ns = navsNow();

    if (!ns.length) {
      if (existing) existing.remove();
      document.documentElement.classList.remove('gx-rail-expanded');
      return;
    }
    if (existing) {
      if (existing.querySelectorAll('.gx-rail-item').length === ns.length) return;
      existing.remove();
    }

    var rail = document.createElement('div');
    rail.className = 'gx-rail';
    rail.id = 'gxRail'; // dipakai build() untuk mendeteksi rail yang sudah ada

    /* Tombol buka/tutup tulisan menu. Wajib ada karena applyExpanded() dan
       listener klik di bawahnya memakai variabel toggle. */
    var toggle = document.createElement('button');
    toggle.className = 'gx-rail-toggle';
    toggle.type = 'button';
    rail.appendChild(toggle);

    /* Indikator bulat yang bergerak mengikuti ikon aktif (dipakai render()). */
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

    function applyExpanded(exp) {
      rail.classList.toggle('collapsed', !exp);
      document.documentElement.classList.toggle('gx-rail-expanded', exp);
      toggle.title = exp ? 'Sembunyikan tulisan menu' : 'Tampilkan tulisan menu';
      toggle.querySelector('.tgl-label').textContent = exp ? 'Sembunyikan' : 'Menu';
      toggle.querySelector('.chev').textContent = exp ? '\u00ab' : '\u00bb';
    }
    toggle.innerHTML = '<span class="chev"></span><span class="tgl-label"></span>';
    applyExpanded(window.innerWidth >= 992);
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      applyExpanded(rail.classList.contains('collapsed'));
    });

    /* ======================================================================
       BAGIAN 3 — FISIKA PEGAS & RENDER
       pos    : posisi rail antar ikon, pull : tarikan samping saat digeser,
       rubber : pantulan naik-turun rail. tiap objek punya raf sendiri.
       ====================================================================== */

    var pos = { x: 0, v: 0, t: 0, k: CONFIG.SPRING.pos.k, z: CONFIG.SPRING.pos.z, raf: null },
      pull = { x: 0, v: 0, t: 0, k: CONFIG.SPRING.pull.k, z: CONFIG.SPRING.pull.z, raf: null },
      rubber = { x: 0, v: 0, t: 0, k: CONFIG.SPRING.rubber.k, z: CONFIG.SPRING.rubber.z, raf: null };

    function tick(s, cb) {
      s.raf = requestAnimationFrame(function () {
        var f = -s.k * (s.x - s.t) - 2 * s.z * Math.sqrt(s.k) * s.v;
        s.v += f / 60;
        s.x += s.v / 60;
        cb(s.x);
        if (Math.abs(s.v) > 0.002 || Math.abs(s.x - s.t) > 0.002) tick(s, cb);
        else {
          s.x = s.t;
          cb(s.x);
          s.raf = null;
        }
      });
    }
    function springTo(s, target, k, z, cb) {
      s.t = target;
      s.k = k;
      s.z = z;
      if (!s.raf) tick(s, cb);
    }
    function snapTo(i, k, z) {
      springTo(pos, i * SLOT, k, z, render);
    }

    function render() {
      var p = pull.x,
        stretch = Math.min(Math.abs(p) / DETACH, CONFIG.STRETCH_MAX),
        scX = 1 + stretch * CONFIG.SCALE_X * (Math.abs(p) > 0 ? 1 : 0),
        scY = 1 - Math.min(Math.abs(p) / DETACH, 1) * CONFIG.SCALE_Y * (Math.abs(p) > 0 ? 1 : 0);
      ind.style.transform =
        'translate(0,' + pos.x + 'px) translateX(' + p + 'px) scale(' + scX.toFixed(3) + ',' + scY.toFixed(3) + ')';
      rail.style.transform = 'translateY(-50%) translateY(' + rubber.x + 'px)';
    }

    var COUNT = items.length,
      MAX = (COUNT - 1) * SLOT;
    /* ======================================================================
       BAGIAN 4 — GESER (DRAG)
       onDown/onMove/onUp menangani mouse & sentuh: tarik ke atas/bawah untuk
       pindah ikon, tarik ke samping untuk efek "lepas", lepas dekat ikon
       maka rail menempel lagi (snapTo).
       ====================================================================== */

    var dragging = false,
      detached = false,
      startY = 0,
      startX = 0,
      baseX = 0,
      moved = 0;

    function onDown(e) {
      if (e.target.closest('.gx-rail-toggle')) return;
      if (dragging) return;
      var pt = e.touches ? e.touches[0] : e;
      dragging = true;
      detached = false;
      moved = 0;
      startY = pt.clientY;
      startX = pt.clientX;
      baseX = pos.x;
      pos.v = 0;
      pull.v = 0;
      pull.x = 0;
      rubber.v = 0;
      rail.classList.add('grabbing');
      try {
        if (e.pointerId != null) rail.setPointerCapture(e.pointerId);
      } catch (_) {}
      if (e.preventDefault) e.preventDefault();
      render();
    }
    function onMove(e) {
      if (!dragging) return;
      var pt = e.touches ? e.touches[0] : e;
      var dy = pt.clientY - startY,
        dx = pt.clientX - startX;
      moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      var target = baseX + dy;
      if (target < 0) {
        rubber.t = -4 * Math.min(Math.abs(target) / 120, 1);
        target = 0;
      } else if (target > MAX) {
        rubber.t = 4 * Math.min((target - MAX) / 120, 1);
        target = MAX;
      } else rubber.t = 0;

      var side = dx;
      if (Math.abs(side) > DETACH) detached = true;
      if (detached) {
        pos.t = Math.max(0, Math.min(MAX, target));
        pos.x = pos.t;
        pull.t = side;
        pull.x = side;
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
        springTo(pull, 0, CONFIG.SPRING.pull.k, CONFIG.SPRING.pull.z, render);
        springTo(pos, Math.round(pos.t / SLOT) * SLOT, CONFIG.SPRING.pull.k, CONFIG.SPRING.pull.z, render);
        springTo(rubber, 0, CONFIG.SPRING.rubber.k, CONFIG.SPRING.rubber.z, render);
        setTimeout(function () {
          detached = false;
        }, 350);
      } else {
        var i = Math.round(pos.t / SLOT);
        springTo(pos, i * SLOT, CONFIG.SPRING.pos.k, CONFIG.SPRING.pos.z, render);
        springTo(pull, 0, CONFIG.SPRING.pos.k, CONFIG.SPRING.pos.z, render);
        springTo(rubber, 0, CONFIG.SPRING.rubber.k, CONFIG.SPRING.rubber.z, render);
        if (moved >= 6) {
          var n = navsNow()[i];
          if (n) n.click();
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

    /* ======================================================================
       BAGIAN 5 — SINKRON & PENGAWASAN
       sync() menyamakan posisi rail dengan menu yang sedang aktif; build()
       dipanggil berkala (polling) agar rail muncul/hilang tanpa refresh.
       ====================================================================== */

    var currentOn = -1;
    function sync() {
      var on = activeIndex();
      if (on >= 0 && on !== currentOn) {
        currentOn = on;
        items.forEach(function (t, j) {
          t.classList.toggle('active', j === on);
        });
        snapTo(on, CONFIG.SPRING.pos.k, CONFIG.SPRING.pos.z);
      }
    }
    sync();
  }

  // Polling berkelanjutan agar rail otomatis muncul/hilang saat login/logout TANPA refresh
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', function () {
      build();
      setInterval(build, 300);
    });
  else {
    build();
    setInterval(build, 300);
  }
})();
