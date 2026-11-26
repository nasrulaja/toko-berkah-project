/* ==========================================================================
   TOKO BERKAH — core/excel.js
   Unduh data tabel sebagai berkas Excel (.xls).
   --------------------------------------------------------------------------
   KENAPA BUKAN XLSX: pustaka xlsx (SheetJS) ukurannya ratusan KB dan dulu
   punya celah keamanan; menambah dependensi CDN juga membuat aplikasi butuh
   internet. Berkas di sini memakai SpreadsheetML 2003 — format XML resmi
   Microsoft yang dibuka Excel, LibreOffice, dan Google Sheets tanpa peringatan
   "format tidak cocok" seperti yang muncul pada CSV yang diubah namanya.

   Catatan penting: nilai uang dan angka dikirim sebagai NUMBER, bukan teks.
   Kalau dikirim sebagai teks ("Rp56.500"), Excel tidak bisa menjumlahkannya
   dan pengguna harus membersihkan datanya sendiri. Karena itu rp() TIDAK
   dipakai di sini — hanya angka mentah.
   ========================================================================== */

/** Buang karakter yang tidak sah dalam XML (mis. 0x00–0x08 dari data impor). */
const xmlBersih = (s) =>
  String(s ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

/** Escape untuk isi & atribut XML. */
const xmlEsc = (s) =>
  xmlBersih(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

/** Nama sheet Excel tidak boleh >31 karakter atau memuat : \ / ? * [ ] */
function namaSheet(n) {
  return (String(n || 'Data').replace(/[:\\/?*[\]]/g, '-').slice(0, 31) || 'Data');
}

/** Bikin satu sel SpreadsheetML. | param: v (nilai), tipe ('Number'|'String'|'DateTime') */
function sel(v, tipe) {
  if (v === null || v === undefined || v === '') return '<Cell/>';
  if (tipe === 'Number' && Number.isFinite(v)) return `<Cell><Data ss:Type="Number">${v}</Data></Cell>`;
  return `<Cell><Data ss:Type="String">${xmlEsc(v)}</Data></Cell>`;
}

/**
 * Susun isi berkas SpreadsheetML.
 * @param {string} judul  nama sheet
 * @param {Array<{label:string, tipe?:string, lebar?:number}>} kolom
 * @param {Array<Array<any>>} baris  array of array, urut sesuai kolom
 * @return {string} XML siap unduh
 */
export function bikinXls(judul, kolom, baris) {
  const lebar = kolom
    .map((k, i) => `<Column ss:Index="${i + 1}" ss:AutoFitWidth="0" ss:Width="${k.lebar || 110}"/>`)
    .join('');
  const kepala = `<Row ss:StyleID="sJudul">${kolom.map((k) => sel(k.label, 'String')).join('')}</Row>`;
  const isi = baris
    .map((r) => `<Row>${r.map((v, i) => sel(v, kolom[i]?.tipe || 'String')).join('')}</Row>`)
    .join('');
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="sJudul"><Font ss:Bold="1"/><Interior ss:Color="#EAF2FB" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="${xmlEsc(namaSheet(judul))}">
  <Table>${lebar}${kepala}${isi}</Table>
 </Worksheet>
</Workbook>`;
}

/** Ubah "Laporan Penjualan" + tanggal jadi nama berkas aman: laporan-penjualan-2026-11-27.xls */
function namaBerkas(judul) {
  const tgl = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const dasar = String(judul || 'data')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${dasar || 'data'}-${tgl.getFullYear()}-${p(tgl.getMonth() + 1)}-${p(tgl.getDate())}.xls`;
}

/**
 * Unduh tabel sebagai berkas Excel.
 * @param {string} judul   dipakai untuk nama sheet & nama berkas
 * @param {Array<{label:string, tipe?:string, lebar?:number}>} kolom
 * @param {Array<Array<any>>} baris
 * @return {boolean} true bila berhasil memicu unduhan
 */
export function unduhXls(judul, kolom, baris) {
  if (!baris || !baris.length) return false;
  try {
    const xml = bikinXls(judul, kolom, baris);
    // \uFEFF (BOM) supaya Excel di Windows membaca UTF-8 dengan benar;
    // tanpa ini "Rp" dan nama produk beraksen bisa jadi karakter aneh.
    const blob = new Blob(['\uFEFF' + xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = namaBerkas(judul);
    a.style.display = 'none';
    document.body.append(a);
    a.click();
    a.remove();
    // Beri jeda sebelum dilepas: browser butuh URL tetap hidup saat unduhan mulai.
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch (e) {
    return false;
  }
}
