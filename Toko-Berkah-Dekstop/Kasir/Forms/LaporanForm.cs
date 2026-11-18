using System.Drawing;
using ClosedXML.Excel;

namespace Kasir;

// Laporan penjualan + laba rugi. Pilih Harian, Bulanan, atau Rentang tanggal (mis. 1-10, 12-20).
public class LaporanForm : Form
{
    static readonly System.Globalization.CultureInfo Id = new("id-ID");
    static readonly System.Globalization.CultureInfo Inv = System.Globalization.CultureInfo.InvariantCulture;

    readonly ComboBox cbJenis;
    readonly DateTimePicker dtp, dtp2;
    readonly Label lblSd, lblJumlah, lblTotal, lblModal, lblLaba, lblCapLaba, lblPeringatan;
    readonly ListView lvTop, lvStok, lvHari;
    readonly TableLayoutPanel body;
    readonly GroupBox gbHari;
    DataLaba dataKini;            // data yang sedang tampil (dipakai untuk Download Excel)
    DateTime dariKini, sampaiKini;
    int jenisKini;                // 0 = harian, 1 = bulanan, 2 = rentang tanggal
    bool sibuk;                   // true saat tanggal diubah lewat kode

    static string Rp(long n) => n < 0 ? "-" + Db.Rp(-n) : Db.Rp(n);

    public LaporanForm()
    {
        Ui.Dpi(this);
        Text = "Laporan Penjualan";
        ClientSize = new Size(960, 640);
        MinimumSize = new Size(800, 540);
        StartPosition = FormStartPosition.CenterParent;
        ShowInTaskbar = false;
        Font = new Font("Segoe UI", 10.5f);

        // ---- baris pilihan: jenis laporan + tanggal
        cbJenis = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList, Width = Ui.Px(this, 150), Margin = new Padding(3, 3, 12, 3) };
        cbJenis.Items.Add("Harian");
        cbJenis.Items.Add("Bulanan");
        cbJenis.Items.Add("Rentang tanggal");
        cbJenis.SelectedIndex = 0;

        dtp = new DateTimePicker { Width = Ui.Px(this, 170), Format = DateTimePickerFormat.Custom, CustomFormat = "dd MMM yyyy", Margin = new Padding(3, 3, 6, 3) };
        dtp2 = new DateTimePicker { Width = Ui.Px(this, 170), Format = DateTimePickerFormat.Custom, CustomFormat = "dd MMM yyyy", Margin = new Padding(3, 3, 12, 3), Visible = false };
        lblSd = new Label { Text = "s/d", AutoSize = true, Margin = new Padding(3, 7, 3, 3), Visible = false };

        var filter = new FlowLayoutPanel { Dock = DockStyle.Top, AutoSize = true, Padding = new Padding(12, 12, 12, 0), WrapContents = true };
        filter.Controls.Add(new Label { Text = "Laporan:", AutoSize = true, Margin = new Padding(3, 7, 6, 3) });
        filter.Controls.Add(cbJenis);
        filter.Controls.Add(dtp);
        filter.Controls.Add(lblSd);
        filter.Controls.Add(dtp2);

        Button Tombol(string teks, Action aksi, bool tampil = true)
        {
            var b = new Button { Text = teks, AutoSize = true, Margin = new Padding(3, 1, 3, 3), Visible = tampil };
            b.Click += (s, a) => aksi();
            filter.Controls.Add(b);
            return b;
        }
        var btnExcel = Tombol("Download Excel", Unduh);
        btnExcel.Margin = new Padding(Ui.Px(this, 24), 1, 3, 3);

        // ---- ringkasan: empat kotak angka
        var ringkas = new TableLayoutPanel { Dock = DockStyle.Top, Height = Ui.Px(this, 92), ColumnCount = 4, RowCount = 1, Padding = new Padding(12, 10, 12, 12) };
        for (int i = 0; i < 4; i++) ringkas.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 25));
        ringkas.Controls.Add(Kartu("Jumlah transaksi", out lblJumlah, out _), 0, 0);
        ringkas.Controls.Add(Kartu("Total penjualan", out lblTotal, out _), 1, 0);
        ringkas.Controls.Add(Kartu("Modal barang terjual", out lblModal, out _), 2, 0);
        ringkas.Controls.Add(Kartu("Laba / Rugi", out lblLaba, out lblCapLaba), 3, 0);

        // ---- peringatan: ada barang terjual yang harga belinya belum diisi
        lblPeringatan = new Label
        {
            Dock = DockStyle.Top,
            Height = Ui.Px(this, 36),
            TextAlign = ContentAlignment.MiddleLeft,
            BackColor = Color.FromArgb(0xFF, 0xF4, 0xD6),
            ForeColor = Color.FromArgb(0x7A, 0x4F, 0x00),
            Padding = new Padding(12, 0, 12, 0),
            Visible = false,
        };

        // ---- daftar-daftar
        lvTop = Daftar();
        lvTop.Columns.Add("Barang terlaris", Ui.Px(this, 200));
        lvTop.Columns.Add("Terjual", Ui.Px(this, 65), HorizontalAlignment.Right);
        lvTop.Columns.Add("Pendapatan", Ui.Px(this, 105), HorizontalAlignment.Right);
        lvTop.Columns.Add("Laba", Ui.Px(this, 100), HorizontalAlignment.Right);

        lvStok = Daftar();
        lvStok.Columns.Add("Stok menipis (<=5)", Ui.Px(this, 200));
        lvStok.Columns.Add("Stok", Ui.Px(this, 60), HorizontalAlignment.Right);

        lvHari = Daftar();
        lvHari.Columns.Add("Tanggal", Ui.Px(this, 200));
        lvHari.Columns.Add("Transaksi", Ui.Px(this, 90), HorizontalAlignment.Right);
        lvHari.Columns.Add("Penjualan", Ui.Px(this, 120), HorizontalAlignment.Right);
        lvHari.Columns.Add("Modal", Ui.Px(this, 120), HorizontalAlignment.Right);
        lvHari.Columns.Add("Laba", Ui.Px(this, 120), HorizontalAlignment.Right);

        gbHari = Kotak("Penjualan per hari", lvHari);

        body = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 2, RowCount = 2, Padding = new Padding(12, 6, 12, 6) };
        body.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 58));
        body.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 42));
        body.RowStyles.Add(new RowStyle(SizeType.Percent, 55));
        body.RowStyles.Add(new RowStyle(SizeType.Absolute, 0));
        body.Controls.Add(Kotak("Barang terlaris", lvTop), 0, 0);
        body.Controls.Add(Kotak("Stok menipis", lvStok), 1, 0);
        body.Controls.Add(gbHari, 0, 1);
        body.SetColumnSpan(gbHari, 2);

        // ---- tombol bawah
        var btnTutup = new Button { Text = "Tutup", Width = Ui.Px(this, 100), Height = Ui.Px(this, 38) };
        btnTutup.Click += (s, a) => Close();
        var bawah = new FlowLayoutPanel { Dock = DockStyle.Bottom, AutoSize = true, FlowDirection = FlowDirection.RightToLeft, Padding = new Padding(12, 6, 12, 10) };
        bawah.Controls.Add(btnTutup);

        // Add terakhir = di-dock paling dulu: isi dulu, lalu bawah, lalu yang di atas.
        Controls.Add(body);
        Controls.Add(bawah);
        Controls.Add(lblPeringatan);
        Controls.Add(ringkas);
        Controls.Add(filter);
        CancelButton = btnTutup;

        // ---- hubungkan kejadian (setelah semua kontrol dibuat)
        cbJenis.SelectedIndexChanged += (s, a) => GantiJenis();
        dtp.ValueChanged += (s, a) => Berubah(dtp);
        dtp2.ValueChanged += (s, a) => Berubah(dtp2);

        foreach (var l in new[] { lvTop, lvStok, lvHari })
        {
            var lv = l;
            lv.Resize += (s, a) => Ui.FitColumn(lv, 0);
        }
        Shown += (s, a) => { foreach (var lv in new[] { lvTop, lvStok, lvHari }) Ui.FitColumn(lv, 0); };

        Muat();
    }

    // Kotak ringkasan: judul kecil di atas, angka besar di bawah.
    Panel Kartu(string judul, out Label nilai, out Label caption)
    {
        nilai = new Label { Dock = DockStyle.Fill, Font = new Font("Segoe UI", 16f, FontStyle.Bold), TextAlign = ContentAlignment.TopLeft };
        caption = new Label { Text = judul, Dock = DockStyle.Top, Height = Ui.Px(this, 24), ForeColor = SystemColors.GrayText };
        var p = new Panel { Dock = DockStyle.Fill, Margin = new Padding(0, 0, 8, 0) };
        p.Controls.Add(nilai);
        p.Controls.Add(caption);
        return p;
    }

    ListView Daftar()
    {
        var lv = new ListView { Dock = DockStyle.Fill, View = View.Details, FullRowSelect = true, GridLines = true, MultiSelect = false, HideSelection = false };
        Ui.RowHeight(lv, Ui.Px(this, 28));
        return lv;
    }

    GroupBox Kotak(string judul, Control isi)
    {
        var g = new GroupBox { Text = judul, Dock = DockStyle.Fill, Padding = new Padding(8, 4, 8, 8), Margin = new Padding(0, 0, 8, 6) };
        g.Controls.Add(isi);
        return g;
    }

    // ------------------------------------------------------------ pilihan tanggal
    // Ganti jenis laporan: atur tampilan kotak tanggal, lalu hitung ulang.
    void GantiJenis()
    {
        sibuk = true;
        int j = cbJenis.SelectedIndex;
        if (j == 2)
        {
            // mulai dari tanggal 1 bulan yang sedang dipilih sampai hari ini (atau akhir bulan)
            var awal = new DateTime(dtp.Value.Year, dtp.Value.Month, 1);
            dtp.Value = awal;
            dtp2.Value = (awal.Year == DateTime.Today.Year && awal.Month == DateTime.Today.Month)
                ? DateTime.Today : awal.AddMonths(1).AddDays(-1);
        }
        dtp.CustomFormat = j == 1 ? "MMMM yyyy" : "dd MMM yyyy";
        dtp.ShowUpDown = j == 1; // bulanan: pilih bulan dengan panah atas/bawah
        lblSd.Visible = dtp2.Visible = j == 2;
        sibuk = false;
        Muat();
    }

    // Di mode rentang, tanggal awal tidak boleh melewati tanggal akhir (dan sebaliknya).
    void Berubah(DateTimePicker yangBerubah)
    {
        if (sibuk) return;
        if (cbJenis.SelectedIndex == 2 && dtp.Value.Date > dtp2.Value.Date)
        {
            sibuk = true;
            if (yangBerubah == dtp) dtp2.Value = dtp.Value; else dtp.Value = dtp2.Value;
            sibuk = false;
        }
        Muat();
    }

    // ------------------------------------------------------------ isi laporan
    void Muat()
    {
        int j = cbJenis.SelectedIndex;
        DateTime dari, sampai;
        if (j == 0) { dari = sampai = dtp.Value.Date; }
        else if (j == 1)
        {
            dari = new DateTime(dtp.Value.Year, dtp.Value.Month, 1);
            sampai = dari.AddMonths(1).AddDays(-1);
        }
        else { dari = dtp.Value.Date; sampai = dtp2.Value.Date; }

        var d = LabaDb.Hitung(dari, sampai);
        dataKini = d;
        dariKini = dari;
        sampaiKini = sampai;
        jenisKini = j;

        long laba = d.Laba;
        lblJumlah.Text = d.Transaksi.ToString();
        lblTotal.Text = Rp(d.Penjualan);
        lblModal.Text = Rp(d.Modal);
        lblLaba.Text = Rp(laba);
        if (d.Penjualan == 0)
        {
            lblCapLaba.Text = "Laba / Rugi";
            lblLaba.ForeColor = SystemColors.GrayText;
        }
        else if (laba >= 0)
        {
            lblCapLaba.Text = "Laba (UNTUNG)";
            lblLaba.ForeColor = Color.SeaGreen;
        }
        else
        {
            lblCapLaba.Text = "Rugi (RUGI)";
            lblLaba.ForeColor = Color.Firebrick;
        }

        lblPeringatan.Visible = d.TanpaModal > 0;
        lblPeringatan.Text = $"Perhatian: {d.TanpaModal} barang yang terjual belum punya harga beli di database, jadi laba belum akurat. Minta admin mengisinya.";

        // barang terlaris: urut menurut jumlah terjual
        lvTop.BeginUpdate();
        lvTop.Items.Clear();
        int no = 1;
        foreach (var b in d.PerBarang.OrderByDescending(x => x.Terjual).Take(10))
        {
            var it = new ListViewItem(new[] { $"{no++}. {b.Nama}", b.Terjual.ToString(), Rp(b.Penjualan), Rp(b.Laba) });
            if (b.Laba < 0) it.ForeColor = Color.Firebrick;
            lvTop.Items.Add(it);
        }
        if (d.PerBarang.Count == 0) lvTop.Items.Add(new ListViewItem(new[] { "(belum ada penjualan)", "", "", "" }));
        lvTop.EndUpdate();

        lvStok.BeginUpdate();
        lvStok.Items.Clear();
        foreach (var m in d.Menipis)
            lvStok.Items.Add(new ListViewItem(new[] { m.Nama, m.Stok.ToString() }));
        if (d.Menipis.Count == 0) lvStok.Items.Add(new ListViewItem(new[] { "(tidak ada)", "" }));
        lvStok.EndUpdate();

        // rincian per hari: muncul di laporan Bulanan dan Rentang tanggal
        lvHari.BeginUpdate();
        lvHari.Items.Clear();
        foreach (var h in d.PerHari)
        {
            var tgl = DateTime.ParseExact(h.Tanggal, "yyyy-MM-dd", Inv);
            var it = new ListViewItem(new[] { tgl.ToString("dddd, dd MMM yyyy", Id), h.Transaksi.ToString(), Rp(h.Penjualan), Rp(h.Modal), Rp(h.Laba) });
            if (h.Laba < 0) it.ForeColor = Color.Firebrick;
            lvHari.Items.Add(it);
        }
        if (d.PerHari.Count == 0)
            lvHari.Items.Add(new ListViewItem(new[] { "(belum ada penjualan)", "", "", "", "" }));
        else
            lvHari.Items.Add(new ListViewItem(new[] { "TOTAL", d.Transaksi.ToString(), Rp(d.Penjualan), Rp(d.Modal), Rp(d.Laba) })
            {
                Font = new Font(lvHari.Font, FontStyle.Bold),
            });
        lvHari.EndUpdate();

        gbHari.Visible = j != 0;
        gbHari.Text = j == 1 ? "Penjualan per hari (satu bulan)" : "Penjualan per hari (rentang tanggal)";
        body.RowStyles[1] = j != 0 ? new RowStyle(SizeType.Percent, 45) : new RowStyle(SizeType.Absolute, 0);
        foreach (var lv in new[] { lvTop, lvStok, lvHari }) Ui.FitColumn(lv, 0);
    }

    // ------------------------------------------------------------ Download Excel
    void Unduh()
    {
        var d = dataKini;
        string kunci, judul, periode;
        if (jenisKini == 0)
        {
            kunci = "Harian_" + dariKini.ToString("yyyy-MM-dd", Inv);
            judul = "Laporan Penjualan Harian";
            periode = dariKini.ToString("dddd, dd MMMM yyyy", Id);
        }
        else if (jenisKini == 1)
        {
            kunci = "Bulanan_" + dariKini.ToString("yyyy-MM", Inv);
            judul = "Laporan Penjualan Bulanan";
            periode = dariKini.ToString("MMMM yyyy", Id);
        }
        else
        {
            kunci = dariKini.ToString("yyyy-MM-dd", Inv) + "_sd_" + sampaiKini.ToString("yyyy-MM-dd", Inv);
            judul = "Laporan Penjualan (Rentang Tanggal)";
            periode = dariKini.ToString("dd MMM yyyy", Id) + " s/d " + sampaiKini.ToString("dd MMM yyyy", Id);
        }

        using var dlg = new SaveFileDialog
        {
            Title = "Simpan laporan",
            Filter = "File Excel (*.xlsx)|*.xlsx",
            DefaultExt = "xlsx",
            FileName = "Laporan_" + kunci + ".xlsx",
            OverwritePrompt = true,
        };
        if (dlg.ShowDialog(this) != DialogResult.OK) return;

        try
        {
            BuatExcel(dlg.FileName, d, judul, periode, jenisKini != 0);
        }
        catch (IOException)
        {
            MessageBox.Show("File itu sedang terbuka di Excel. Tutup dulu, lalu coba lagi.", "Gagal menyimpan",
                MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }
        catch (Exception ex)
        {
            MessageBox.Show("Gagal menyimpan laporan:\n" + ex.Message, "Gagal menyimpan",
                MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        if (MessageBox.Show("Laporan tersimpan. Buka sekarang?", "Berhasil",
                MessageBoxButtons.YesNo, MessageBoxIcon.Information) == DialogResult.Yes)
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(dlg.FileName) { UseShellExecute = true });
    }

    static void BuatExcel(string path, DataLaba d, string judul, string periode, bool denganPerHari)
    {
        const string formatRp = "\"Rp\" #,##0;-\"Rp\" #,##0";
        var warnaHeader = XLColor.FromHtml("#007BC4");

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Laporan");
        int r = 1;

        ws.Cell(r, 1).Value = Db.NamaToko;
        ws.Cell(r, 1).Style.Font.Bold = true;
        ws.Cell(r, 1).Style.Font.FontSize = 14;
        r++;
        ws.Cell(r, 1).Value = judul;
        r++;
        ws.Cell(r, 1).Value = "Periode";
        ws.Cell(r, 2).Value = periode;
        r++;
        ws.Cell(r, 1).Value = "Dicetak";
        ws.Cell(r, 2).Value = DateTime.Now.ToString("dd/MM/yyyy HH:mm");
        r += 2;

        // ringkasan
        void Ringkas(string nama, XLCellValue nilai, bool uang)
        {
            ws.Cell(r, 1).Value = nama;
            ws.Cell(r, 1).Style.Font.Bold = true;
            ws.Cell(r, 2).Value = nilai;
            if (uang) ws.Cell(r, 2).Style.NumberFormat.Format = formatRp;
            r++;
        }
        Ringkas("Jumlah transaksi", d.Transaksi, false);
        Ringkas("Total penjualan", d.Penjualan, true);
        Ringkas("Modal barang terjual", d.Modal, true);
        Ringkas(d.Laba >= 0 ? "Laba (untung)" : "Rugi", d.Laba, true);
        Ringkas("Rata-rata per transaksi", d.Transaksi > 0 ? d.Penjualan / d.Transaksi : 0, true);
        if (d.TanpaModal > 0)
        {
            ws.Cell(r, 1).Value = $"Catatan: {d.TanpaModal} barang terjual belum punya harga beli di database, laba belum akurat.";
            ws.Cell(r, 1).Style.Font.FontColor = XLColor.DarkOrange;
            r++;
        }
        r++;

        void Header(params string[] judulKolom)
        {
            for (int c = 0; c < judulKolom.Length; c++)
            {
                var sel = ws.Cell(r, c + 1);
                sel.Value = judulKolom[c];
                sel.Style.Font.Bold = true;
                sel.Style.Font.FontColor = XLColor.White;
                sel.Style.Fill.BackgroundColor = warnaHeader;
                if (c > 0) sel.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
            }
            r++;
        }

        // barang terlaris
        Header("Barang terlaris", "Terjual", "Pendapatan", "Laba");
        if (d.PerBarang.Count == 0) { ws.Cell(r, 1).Value = "(belum ada penjualan)"; r++; }
        int no = 1;
        foreach (var b in d.PerBarang.OrderByDescending(x => x.Terjual).Take(10))
        {
            ws.Cell(r, 1).Value = $"{no++}. {b.Nama}";
            ws.Cell(r, 2).Value = b.Terjual;
            ws.Cell(r, 3).Value = b.Penjualan;
            ws.Cell(r, 3).Style.NumberFormat.Format = formatRp;
            ws.Cell(r, 4).Value = b.Laba;
            ws.Cell(r, 4).Style.NumberFormat.Format = formatRp;
            r++;
        }
        r++;

        // penjualan per hari (bulanan dan rentang tanggal)
        if (denganPerHari)
        {
            var id = new System.Globalization.CultureInfo("id-ID");
            Header("Penjualan per hari", "Transaksi", "Penjualan", "Modal", "Laba");
            if (d.PerHari.Count == 0) { ws.Cell(r, 1).Value = "(belum ada penjualan)"; r++; }
            foreach (var h in d.PerHari)
            {
                var tgl = DateTime.ParseExact(h.Tanggal, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
                ws.Cell(r, 1).Value = tgl.ToString("dddd, dd MMM yyyy", id);
                ws.Cell(r, 2).Value = h.Transaksi;
                ws.Cell(r, 3).Value = h.Penjualan;
                ws.Cell(r, 4).Value = h.Modal;
                ws.Cell(r, 5).Value = h.Laba;
                ws.Range(r, 3, r, 5).Style.NumberFormat.Format = formatRp;
                r++;
            }
            if (d.PerHari.Count > 0)
            {
                ws.Cell(r, 1).Value = "TOTAL";
                ws.Cell(r, 2).Value = d.Transaksi;
                ws.Cell(r, 3).Value = d.Penjualan;
                ws.Cell(r, 4).Value = d.Modal;
                ws.Cell(r, 5).Value = d.Laba;
                ws.Range(r, 3, r, 5).Style.NumberFormat.Format = formatRp;
                ws.Range(r, 1, r, 5).Style.Font.Bold = true;
                r++;
            }
            r++;
        }

        // stok menipis
        Header("Stok menipis (<=5)", "Stok");
        if (d.Menipis.Count == 0) { ws.Cell(r, 1).Value = "(tidak ada)"; r++; }
        foreach (var m in d.Menipis)
        {
            ws.Cell(r, 1).Value = m.Nama;
            ws.Cell(r, 2).Value = m.Stok;
            r++;
        }

        for (int c = 1; c <= 5; c++)
        {
            ws.Column(c).AdjustToContents();
            if (ws.Column(c).Width < 16) ws.Column(c).Width = 16;
        }
        ws.Column(1).Width = Math.Max(ws.Column(1).Width, 32);
        ws.Range(1, 2, r, 5).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

        wb.SaveAs(path);
    }
}