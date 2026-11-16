using System.Drawing;
using ClosedXML.Excel;

namespace Kasir;

// Jendela biasa (bukan struk). Bisa pilih Harian atau Bulanan, lalu pilih tanggal/bulannya.
public class LaporanForm : Form
{
    readonly ComboBox cbJenis;
    readonly DateTimePicker dtp;
    readonly Label lblJumlah, lblTotal, lblRata;
    readonly ListView lvTop, lvStok, lvHari;
    readonly TableLayoutPanel body;
    readonly GroupBox gbHari;
    DataLaporan dataKini; // data yang sedang tampil (dipakai untuk Download Excel)
    bool bulananKini;

    public LaporanForm()
    {
        Ui.Dpi(this);
        Text = "Laporan Penjualan";
        ClientSize = new Size(820, 600);
        MinimumSize = new Size(700, 520);
        StartPosition = FormStartPosition.CenterParent;
        ShowInTaskbar = false;
        Font = new Font("Segoe UI", 10.5f);

        // ---- baris pilihan: jenis laporan + tanggal/bulan
        cbJenis = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList, Width = Ui.Px(this, 120), Margin = new Padding(3, 3, 12, 3) };
        cbJenis.Items.Add("Harian");
        cbJenis.Items.Add("Bulanan");
        cbJenis.SelectedIndex = 0;

        dtp = new DateTimePicker { Width = Ui.Px(this, 210), Format = DateTimePickerFormat.Custom, CustomFormat = "dd MMMM yyyy", Margin = new Padding(3, 3, 12, 3) };
        var btnSekarang = new Button { Text = "Hari ini", AutoSize = true, Margin = new Padding(3, 1, 3, 3) };

        var filter = new FlowLayoutPanel { Dock = DockStyle.Top, AutoSize = true, Padding = new Padding(12, 12, 12, 0), WrapContents = false };
        filter.Controls.Add(new Label { Text = "Laporan:", AutoSize = true, Margin = new Padding(3, 7, 6, 3) });
        filter.Controls.Add(cbJenis);
        filter.Controls.Add(dtp);
        filter.Controls.Add(btnSekarang);
        var btnExcel = new Button { Text = "Unduh Excel (.xlsx)", AutoSize = true, Margin = new Padding(Ui.Px(this, 24), 1, 3, 3) };
        filter.Controls.Add(btnExcel);

        // ---- ringkasan: tiga kotak angka
        var ringkas = new TableLayoutPanel { Dock = DockStyle.Top, Height = Ui.Px(this, 92), ColumnCount = 3, RowCount = 1, Padding = new Padding(12, 10, 12, 12) };
        for (int i = 0; i < 3; i++) ringkas.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100f / 3));
        ringkas.Controls.Add(Kartu("Jumlah transaksi", out lblJumlah), 0, 0);
        ringkas.Controls.Add(Kartu("Total penjualan", out lblTotal), 1, 0);
        ringkas.Controls.Add(Kartu("Rata-rata per transaksi", out lblRata), 2, 0);

        // ---- daftar-daftar
        lvTop = Daftar();
        lvTop.Columns.Add("Barang terlaris", Ui.Px(this, 200));
        lvTop.Columns.Add("Terjual", Ui.Px(this, 70), HorizontalAlignment.Right);
        lvTop.Columns.Add("Pendapatan", Ui.Px(this, 110), HorizontalAlignment.Right);

        lvStok = Daftar();
        lvStok.Columns.Add("Stok menipis (<=5)", Ui.Px(this, 200));
        lvStok.Columns.Add("Stok", Ui.Px(this, 60), HorizontalAlignment.Right);

        lvHari = Daftar();
        lvHari.Columns.Add("Tanggal", Ui.Px(this, 200));
        lvHari.Columns.Add("Transaksi", Ui.Px(this, 100), HorizontalAlignment.Right);
        lvHari.Columns.Add("Total penjualan", Ui.Px(this, 160), HorizontalAlignment.Right);

        var gbTop = Kotak("Barang terlaris", lvTop);
        var gbStok = Kotak("Stok menipis", lvStok);
        gbHari = Kotak("Penjualan per hari", lvHari);

        body = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 2, RowCount = 2, Padding = new Padding(12, 6, 12, 6) };
        body.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 55));
        body.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 45));
        body.RowStyles.Add(new RowStyle(SizeType.Percent, 55));
        body.RowStyles.Add(new RowStyle(SizeType.Absolute, 0));
        body.Controls.Add(gbTop, 0, 0);
        body.Controls.Add(gbStok, 1, 0);
        body.Controls.Add(gbHari, 0, 1);
        body.SetColumnSpan(gbHari, 2);

        var tutup = new Button { Text = "Tutup", Dock = DockStyle.Bottom, Height = Ui.Px(this, 40) };
        tutup.Click += (s, a) => Close();

        // Add terakhir = di-dock paling dulu: isi dulu, lalu tombol bawah, lalu ringkasan, lalu pilihan (paling atas).
        Controls.Add(body);
        Controls.Add(tutup);
        Controls.Add(ringkas);
        Controls.Add(filter);
        CancelButton = tutup;

        // ---- hubungkan kejadian (setelah semua kontrol dibuat)
        cbJenis.SelectedIndexChanged += (s, a) =>
        {
            bool bln = cbJenis.SelectedIndex == 1;
            dtp.CustomFormat = bln ? "MMMM yyyy" : "dd MMMM yyyy";
            dtp.ShowUpDown = bln; // bulanan: pilih bulan dengan panah atas/bawah
            btnSekarang.Text = bln ? "Bulan ini" : "Hari ini";
            Muat();
        };
        dtp.ValueChanged += (s, a) => Muat();
        btnSekarang.Click += (s, a) => { dtp.Value = DateTime.Now; Muat(); };
        btnExcel.Click += (s, a) => Unduh();

        foreach (var l in new[] { lvTop, lvStok, lvHari })
        {
            var lv = l;
            lv.Resize += (s, a) => Ui.FitColumn(lv, 0);
        }
        Shown += (s, a) => { foreach (var lv in new[] { lvTop, lvStok, lvHari }) Ui.FitColumn(lv, 0); };

        Muat();
    }

    // Kotak ringkasan: judul kecil di atas, angka besar di bawah.
    Panel Kartu(string judul, out Label nilai)
    {
        nilai = new Label { Dock = DockStyle.Fill, Font = new Font("Segoe UI", 16f, FontStyle.Bold), TextAlign = ContentAlignment.TopLeft };
        var cap = new Label { Text = judul, Dock = DockStyle.Top, Height = Ui.Px(this, 24), ForeColor = SystemColors.GrayText };
        var p = new Panel { Dock = DockStyle.Fill, Margin = new Padding(0, 0, 8, 0) };
        p.Controls.Add(nilai);
        p.Controls.Add(cap);
        return p;
    }

    ListView Daftar()
    {
        var lv = new ListView
        {
            Dock = DockStyle.Fill,
            View = View.Details,
            FullRowSelect = true,
            GridLines = true,
            MultiSelect = false,
            HideSelection = false,
        };
        Ui.RowHeight(lv, Ui.Px(this, 28));
        return lv;
    }

    GroupBox Kotak(string judul, Control isi)
    {
        var g = new GroupBox { Text = judul, Dock = DockStyle.Fill, Padding = new Padding(8, 4, 8, 8), Margin = new Padding(0, 0, 8, 6) };
        g.Controls.Add(isi);
        return g;
    }

    // ------------------------------------------------------------ Unduh Excel
    void Unduh()
    {
        var d = dataKini;
        bool bln = bulananKini;
        using var dlg = new SaveFileDialog
        {
            Title = "Simpan laporan",
            Filter = "File Excel (*.xlsx)|*.xlsx",
            DefaultExt = "xlsx",
            FileName = (bln ? "Laporan_Bulanan_" : "Laporan_Harian_") + d.Periode + ".xlsx",
            OverwritePrompt = true,
        };
        if (dlg.ShowDialog(this) != DialogResult.OK) return;

        try
        {
            BuatExcel(dlg.FileName, d, bln);
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

    static void BuatExcel(string path, DataLaporan d, bool bln)
    {
        var inv = System.Globalization.CultureInfo.InvariantCulture;
        var id = new System.Globalization.CultureInfo("id-ID");
        const string formatRp = "\"Rp\" #,##0";
        var warnaHeader = XLColor.FromHtml("#007BC4");

        string periode = bln
            ? DateTime.ParseExact(d.Periode, "yyyy-MM", inv).ToString("MMMM yyyy", id)
            : DateTime.ParseExact(d.Periode, "yyyy-MM-dd", inv).ToString("dddd, dd MMMM yyyy", id);

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add(bln ? "Laporan Bulanan" : "Laporan Harian");
        int r = 1;

        // judul
        ws.Cell(r, 1).Value = Db.NamaToko;
        ws.Cell(r, 1).Style.Font.Bold = true;
        ws.Cell(r, 1).Style.Font.FontSize = 14;
        r++;
        ws.Cell(r, 1).Value = bln ? "Laporan Penjualan Bulanan" : "Laporan Penjualan Harian";
        r++;
        ws.Cell(r, 1).Value = "Periode";
        ws.Cell(r, 2).Value = periode;
        r++;
        ws.Cell(r, 1).Value = "Dicetak";
        ws.Cell(r, 2).Value = DateTime.Now.ToString("dd/MM/yyyy HH:mm");
        r += 2;

        // ringkasan
        ws.Cell(r, 1).Value = "Jumlah transaksi";
        ws.Cell(r, 2).Value = d.Jumlah;
        r++;
        ws.Cell(r, 1).Value = "Total penjualan";
        ws.Cell(r, 2).Value = d.Total;
        ws.Cell(r, 2).Style.NumberFormat.Format = formatRp;
        r++;
        ws.Cell(r, 1).Value = "Rata-rata per transaksi";
        ws.Cell(r, 2).Value = d.Jumlah > 0 ? d.Total / d.Jumlah : 0;
        ws.Cell(r, 2).Style.NumberFormat.Format = formatRp;
        ws.Range(r - 2, 1, r, 1).Style.Font.Bold = true;
        r += 2;

        // baris judul tabel (biru, tulisan putih)
        void Header(params string[] judul)
        {
            for (int c = 0; c < judul.Length; c++)
            {
                var sel = ws.Cell(r, c + 1);
                sel.Value = judul[c];
                sel.Style.Font.Bold = true;
                sel.Style.Font.FontColor = XLColor.White;
                sel.Style.Fill.BackgroundColor = warnaHeader;
                if (c > 0) sel.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
            }
            r++;
        }

        // barang terlaris
        Header("Barang terlaris", "Terjual", "Pendapatan");
        if (d.Terlaris.Count == 0) { ws.Cell(r, 1).Value = "(belum ada penjualan)"; r++; }
        for (int i = 0; i < d.Terlaris.Count; i++)
        {
            ws.Cell(r, 1).Value = $"{i + 1}. {d.Terlaris[i].Nama}";
            ws.Cell(r, 2).Value = d.Terlaris[i].Qty;
            ws.Cell(r, 3).Value = d.Terlaris[i].Omzet;
            ws.Cell(r, 3).Style.NumberFormat.Format = formatRp;
            r++;
        }
        r++;

        // penjualan per hari (hanya laporan bulanan)
        if (bln)
        {
            Header("Penjualan per hari", "Transaksi", "Total penjualan");
            if (d.PerHari.Count == 0) { ws.Cell(r, 1).Value = "(belum ada penjualan)"; r++; }
            foreach (var h in d.PerHari)
            {
                var tgl = DateTime.ParseExact(h.Tanggal, "yyyy-MM-dd", inv);
                ws.Cell(r, 1).Value = tgl.ToString("dddd, dd MMM yyyy", id);
                ws.Cell(r, 2).Value = h.Jumlah;
                ws.Cell(r, 3).Value = h.Total;
                ws.Cell(r, 3).Style.NumberFormat.Format = formatRp;
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

        for (int c = 1; c <= 3; c++)
        {
            ws.Column(c).AdjustToContents();
            if (ws.Column(c).Width < 18) ws.Column(c).Width = 18;
        }
        ws.Column(1).Width = Math.Max(ws.Column(1).Width, 30);
        ws.Range(1, 2, r, 3).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

        wb.SaveAs(path);
    }

    void Muat()
    {
        bool bln = cbJenis.SelectedIndex == 1;
        // Harian = "2026-11-13", bulanan = "2026-11" (dicocokkan dengan awal kolom waktu).
        string kunci = dtp.Value.ToString(bln ? "yyyy-MM" : "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        var d = Db.LaporanData(kunci);
        dataKini = d;
        bulananKini = bln;

        lblJumlah.Text = d.Jumlah.ToString();
        lblTotal.Text = Db.Rp(d.Total);
        lblRata.Text = Db.Rp(d.Jumlah > 0 ? d.Total / d.Jumlah : 0);

        lvTop.BeginUpdate();
        lvTop.Items.Clear();
        if (d.Terlaris.Count == 0) lvTop.Items.Add(new ListViewItem(new[] { "(belum ada penjualan)", "", "" }));
        for (int i = 0; i < d.Terlaris.Count; i++)
        {
            var t = d.Terlaris[i];
            lvTop.Items.Add(new ListViewItem(new[] { $"{i + 1}. {t.Nama}", t.Qty.ToString(), Db.Rp(t.Omzet) }));
        }
        lvTop.EndUpdate();

        lvStok.BeginUpdate();
        lvStok.Items.Clear();
        if (d.Menipis.Count == 0) lvStok.Items.Add(new ListViewItem(new[] { "(tidak ada)", "" }));
        foreach (var m in d.Menipis)
            lvStok.Items.Add(new ListViewItem(new[] { m.Nama, m.Stok.ToString() }));
        lvStok.EndUpdate();

        // Rincian per hari hanya muncul di laporan bulanan.
        lvHari.BeginUpdate();
        lvHari.Items.Clear();
        foreach (var h in d.PerHari)
        {
            var tgl = DateTime.ParseExact(h.Tanggal, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
            lvHari.Items.Add(new ListViewItem(new[] { tgl.ToString("dddd, dd MMM yyyy", new System.Globalization.CultureInfo("id-ID")), h.Jumlah.ToString(), Db.Rp(h.Total) }));
        }
        if (d.PerHari.Count == 0) lvHari.Items.Add(new ListViewItem(new[] { "(belum ada penjualan)", "", "" }));
        lvHari.EndUpdate();

        gbHari.Visible = bln;
        body.RowStyles[1] = bln ? new RowStyle(SizeType.Percent, 45) : new RowStyle(SizeType.Absolute, 0);
        foreach (var lv in new[] { lvTop, lvStok, lvHari }) Ui.FitColumn(lv, 0);
    }
}
