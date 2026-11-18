import { $, toast } from './ui.js?v=20261117m';

/* ==========================================================================
   PEMINDAI BARCODE KAMERA
   Dipakai di form Tambah produk: tombol "Scan kamera" mengisi kolom barcode.
   Mesin pembaca: BarcodeDetector bawaan browser bila ada, jika tidak memakai
   ZXing (js/vendor/zxing.min.js) yang dimuat saat dibutuhkan. Bila kamera
   tetap tidak bisa dibuka, pengguna masih dapat mengetik kode secara manual.
   ========================================================================== */

const FORMAT = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'];

/** Muat ZXing sekali saja, hanya ketika benar-benar dipakai. */
let zxingSiap = null;
function muatZXing() {
  if (window.ZXing) return Promise.resolve(window.ZXing);
  if (zxingSiap) return zxingSiap;
  zxingSiap = new Promise((ok, gagal) => {
    const s = document.createElement('script');
    // URL ikut folder halaman (mis. di subfolder) agar berkas tetap ketemu.
    s.src = new URL('js/vendor/zxing.min.js?v=20261118c', document.baseURI).href;
    s.onload = () => (window.ZXing ? ok(window.ZXing) : gagal(new Error('ZXing kosong')));
    s.onerror = () => gagal(new Error('gagal memuat zxing'));
    document.head.append(s);
  });
  return zxingSiap;
}

/**
 * Tampilkan jendela pemindai. Saat barcode terbaca, `saatDapat` dipanggil
 * dengan teks kode, lalu kamera dimatikan.
 * @param {(kode: string) => void} saatDapat
 */
export function pindaiBarcode(saatDapat) {
  if (!navigator.mediaDevices?.getUserMedia) {
    toast('Kamera butuh alamat https atau localhost. Ketik barcode secara manual.');
    return;
  }

  // Wadah sendiri (bukan #ov) supaya form produk yang sedang terbuka tidak tertimpa.
  const lapis = document.createElement('div');
  lapis.id = 'ovscan';
  lapis.innerHTML =
    `<div class="ov"><div class="md"><div class="ch"><h3>Scan barcode</h3><button type="button" class="btn sm" data-act="bctutup">Tutup</button></div><div class="cb">
      <div class="bcam"><video id="bcvid" playsinline muted></video><div class="bcbox"></div><div id="bcstat" class="bcstat">Menyalakan kamera…</div></div>
      <p class="note" style="margin:8px 0 0">Arahkan barcode ke dalam kotak. Terbaca otomatis.</p>
      <div class="fg" style="margin-top:8px"><label>Atau ketik kode</label><div class="bcw"><input id="bcmanual" autocomplete="off" inputmode="numeric" placeholder="Contoh: 8991001100223"><button type="button" class="btn bp sm" id="bcok">Pakai</button></div></div>
    </div></div></div>`;
  document.body.append(lapis);

  const video = $('#bcvid');
  const manual = $('#bcmanual');
  const stat = $('#bcstat');
  let aliran = null;
  let jalan = true;
  let sudah = false;
  let raf = 0;
  let pembacaAktif = null;

  const tutupKamera = () => {
    jalan = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    try {
      pembacaAktif?.stopContinuousDecode();
    } catch {}
    pembacaAktif = null;
    aliran?.getTracks().forEach((t) => t.stop());
    aliran = null;
  };

  const tutupLapis = () => {
    tutupKamera();
    lapis.remove();
    pengawas?.disconnect();
  };

  lapis.querySelector('[data-act="bctutup"]').onclick = tutupLapis;

  const selesai = (kode) => {
    if (sudah) return;
    sudah = true;
    tutupLapis();
    toast('Barcode terbaca: ' + kode);
    saatDapat(kode);
  };

  // Tombol "Pakai" pada input manual, dan Enter di dalamnya.
  $('#bcok').onclick = () => {
    const k = manual.value.trim();
    if (k) selesai(k);
  };
  manual.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      $('#bcok').click();
    }
  };

  // Kamera ikut mati bila lapis ditutup dengan cara lain.
  const pengawas = new MutationObserver(() => {
    if (!document.getElementById('ovscan')) {
      tutupKamera();
      pengawas.disconnect();
    }
  });
  pengawas.observe(document.body, { childList: true });

  // ---------- bagian 2: nyalakan kamera & mulai membaca ----------
  navigator.mediaDevices
    .getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    })
    .then((aliranKamera) => {
      if (!jalan) {
        aliranKamera.getTracks().forEach((t) => t.stop());
        return;
      }
      aliran = aliranKamera;
      video.srcObject = aliranKamera;
      return video.play();
    })
    .then(() => {
      if (!jalan) return;
      stat.textContent = 'Mencari barcode…';

      // Jalur cepat: BarcodeDetector (kalau browser punya).
      if ('BarcodeDetector' in window) {
        const detektor = new window.BarcodeDetector({ formats: FORMAT });
        const ulang = async () => {
          if (!jalan) return;
          try {
            const h = await detektor.detect(video);
            const kode = h?.[0]?.rawValue;
            if (kode) return selesai(kode);
          } catch {}
          if (jalan) raf = requestAnimationFrame(ulang);
        };
        raf = requestAnimationFrame(ulang);
        return;
      }

      // Jalur umum: ZXing membaca frame video terus-menerus.
      muatZXing()
        .then((Z) => {
          if (!jalan) return;
          const pembaca = new Z.BrowserMultiFormatReader();
          // Video sudah diputar di atas, jadi jangan panggil play() lagi
          // (kalau tidak, ZXing melempar "video that is already playing").
          pembaca.decodeContinuously(video, (hasil) => {
            if (!jalan) return;
            // Error "NotFoundException" berarti frame ini belum berisi
            // barcode — hal biasa, jadi diabaikan.
            if (hasil?.getText) selesai(hasil.getText());
          });
          // Ingat pembaca agar bisa dihentikan saat kamera ditutup.
          pembacaAktif = pembaca;
        })
        .catch(() => {
          stat.textContent = 'Pembaca barcode gagal dimuat. Ketik kode manual.';
        });
    })
    .catch((err) => {
      tutupKamera();
      const pesan =
        err?.name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Izinkan kamera lewat ikon di address bar.'
          : err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError'
            ? 'Kamera tidak terdeteksi di perangkat ini.'
            : 'Kamera gagal dibuka. Ketik barcode secara manual.';
      stat.textContent = pesan;
      toast(pesan);
      manual?.focus();
    });
}
