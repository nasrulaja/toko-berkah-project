using System.Drawing;

namespace Kasir;

// Hanya untuk melihat dan mencari daftar produk (hanya baca).
// Menambah, mengubah, atau menghapus produk dan stok tidak tersedia di sini, karena kasir
// tidak boleh mengubah data produk. Daftar selalu diambil dari database, jadi kalau sebuah
// produk dihapus dari database, produk itu otomatis hilang dari daftar ini.
public class ProdukForm : Form
{
    readonly ListView lv;
    readonly TextBox eCari;
    readonly Label lblJumlah;

    public ProdukForm()
    {
        Ui.Dpi(this);
        Text = "Kelola Produk";
        ClientSize = new Size(780, 520);
        MinimumSize = new Size(640, 420);
        StartPosition = FormStartPosition.CenterParent;
        ShowInTaskbar = false;
        Font = new Font("Segoe UI", 10.5f);

        // ---- daftar produk (mengisi sisa ruang)
        lv = new ListView
        {
            Dock = DockStyle.Fill,
            View = View.Details,
            FullRowSelect = true,
            GridLines = true,
            MultiSelect = false,
            HideSelection = false,
            Font = new Font("Segoe UI", 11f),
        };
        lv.Columns.Add("Kode", Ui.Px(this, 130));
        lv.Columns.Add("Nama", Ui.Px(this, 320));
        lv.Columns.Add("Harga", Ui.Px(this, 130), HorizontalAlignment.Right);
        lv.Columns.Add("Stok", Ui.Px(this, 90), HorizontalAlignment.Right);
        Ui.RowHeight(lv, Ui.Px(this, 30));
        lv.Resize += (s, a) => Ui.FitColumn(lv, 1);

        var daftar = new Panel { Dock = DockStyle.Fill, Padding = new Padding(12, 12, 12, 6) };
        daftar.Controls.Add(lv);

        // ---- kotak cari (paling atas): hanya menyaring daftar, tidak mengubah data
        eCari = new TextBox
        {
            Dock = DockStyle.Fill,
            PlaceholderText = "Cari kode atau nama produk...",
            Margin = new Padding(3, 3, 12, 3),
        };
        lblJumlah = new Label { AutoSize = true, Anchor = AnchorStyles.Left, Margin = new Padding(3) };
        eCari.TextChanged += (s, a) => Muat();

        var filter = new TableLayoutPanel
        {
            Dock = DockStyle.Top,
            AutoSize = true,
            ColumnCount = 3,
            RowCount = 1,
            Padding = new Padding(12, 12, 12, 0),
        };
        filter.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        filter.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        filter.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        filter.Controls.Add(new Label { Text = "Cari:", AutoSize = true, Anchor = AnchorStyles.Left, Margin = new Padding(3, 3, 6, 3) }, 0, 0);
        filter.Controls.Add(eCari, 1, 0);
        filter.Controls.Add(lblJumlah, 2, 0);

        // Add terakhir = di-dock paling dulu: daftar (isi), lalu kotak cari (atas).
        Controls.Add(daftar);
        Controls.Add(filter);

        Shown += (s, a) => Ui.FitColumn(lv, 1);
        Activated += (s, a) => Muat(); // selalu ambil data terbaru dari database
        Muat();
    }

    void Muat()
    {
        // Cari di database berdasarkan kode atau nama (kosong = tampilkan semua produk).
        var data = Db.Cari(eCari.Text, null, 1000);

        lv.BeginUpdate();
        lv.Items.Clear();
        foreach (var p in data)
            lv.Items.Add(new ListViewItem(new[] { p.Kode, p.Nama, p.Harga.ToString(), p.Stok.ToString() }) { Name = p.Kode });
        lv.EndUpdate();
        lblJumlah.Text = data.Count + " produk";
    }
}
