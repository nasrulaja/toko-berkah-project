using System.Drawing;

namespace Kasir;

public class ProdukForm : Form
{
    readonly ListView lv;
    readonly TextBox eKode, eNama, eHarga, eStok;

    public ProdukForm()
    {
        Ui.Dpi(this);
        Text = "Kelola Produk";
        ClientSize = new Size(780, 520);
        MinimumSize = new Size(640, 420);
        StartPosition = FormStartPosition.CenterParent;
        ShowInTaskbar = false;
        Font = new Font("Segoe UI", 10.5f);

        // ---- daftar produk (atas, mengisi sisa ruang)
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
        lv.SelectedIndexChanged += (s, a) => IsiForm();
        lv.Resize += (s, a) => Ui.FitColumn(lv, 1);

        var daftar = new Panel { Dock = DockStyle.Fill, Padding = new Padding(12, 12, 12, 6) };
        daftar.Controls.Add(lv);

        // ---- isian (label di atas, kolom isian di bawahnya)
        var isian = new TableLayoutPanel
        {
            Dock = DockStyle.Bottom,
            AutoSize = true,
            ColumnCount = 4,
            RowCount = 2,
            Padding = new Padding(12, 4, 12, 4),
        };
        isian.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 22));
        isian.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 38));
        isian.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 22));
        isian.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 18));
        isian.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        isian.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        string[] lbls = { "Kode", "Nama", "Harga", "Stok" };
        for (int i = 0; i < 4; i++)
            isian.Controls.Add(new Label { Text = lbls[i], AutoSize = true, Margin = new Padding(3, 0, 3, 2) }, i, 0);
        eKode = new TextBox { Dock = DockStyle.Fill, Margin = new Padding(3, 0, 3, 6) };
        eNama = new TextBox { Dock = DockStyle.Fill, Margin = new Padding(3, 0, 3, 6) };
        eHarga = new TextBox { Dock = DockStyle.Fill, Margin = new Padding(3, 0, 3, 6) };
        eStok = new TextBox { Dock = DockStyle.Fill, Margin = new Padding(3, 0, 3, 6) };
        isian.Controls.Add(eKode, 0, 1);
        isian.Controls.Add(eNama, 1, 1);
        isian.Controls.Add(eHarga, 2, 1);
        isian.Controls.Add(eStok, 3, 1);

        // ---- tombol (di tengah, paling bawah)
        var bBaru = new Button { Text = "Baru", Width = 100, Height = 36, Margin = new Padding(6, 0, 6, 0) };
        var bSimpan = new Button { Text = "Simpan", Width = 100, Height = 36, Margin = new Padding(6, 0, 6, 0) };
        var bHapus = new Button { Text = "Hapus", Width = 100, Height = 36, Margin = new Padding(6, 0, 6, 0) };
        bBaru.Click += (s, a) => Baru();
        bSimpan.Click += (s, a) => Simpan();
        bHapus.Click += (s, a) => Hapus();
        var baris = new FlowLayoutPanel
        {
            AutoSize = true,
            WrapContents = false,
            Anchor = AnchorStyles.None,
            Margin = new Padding(0, 6, 0, 12),
        };
        baris.Controls.AddRange(new Control[] { bBaru, bSimpan, bHapus });
        var tombol = new TableLayoutPanel { Dock = DockStyle.Bottom, AutoSize = true, ColumnCount = 1, RowCount = 1 };
        tombol.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        tombol.Controls.Add(baris, 0, 0);

        // Add terakhir = di-dock paling dulu (paling bawah): daftar, lalu isian, lalu tombol.
        Controls.Add(daftar);
        Controls.Add(isian);
        Controls.Add(tombol);

        Shown += (s, a) => Ui.FitColumn(lv, 1);
        Muat();
    }

    void Muat()
    {
        lv.BeginUpdate();
        lv.Items.Clear();
        foreach (var p in Db.SemuaProduk())
            lv.Items.Add(new ListViewItem(new[] { p.Kode, p.Nama, p.Harga.ToString(), p.Stok.ToString() }) { Name = p.Kode });
        lv.EndUpdate();
    }

    void IsiForm()
    {
        if (lv.SelectedItems.Count == 0) return;
        var it = lv.SelectedItems[0];
        eKode.Text = it.SubItems[0].Text;
        eNama.Text = it.SubItems[1].Text;
        eHarga.Text = it.SubItems[2].Text;
        eStok.Text = it.SubItems[3].Text;
    }

    void Baru()
    {
        eKode.Clear(); eNama.Clear(); eHarga.Clear(); eStok.Clear();
        lv.SelectedItems.Clear();
        eKode.Focus();
    }

    void Simpan()
    {
        var kode = eKode.Text.Trim();
        var nama = eNama.Text.Trim();
        if (kode.Length == 0 || nama.Length == 0)
        {
            MessageBox.Show("Isi kode, nama, harga, dan stok.", "Data tidak valid",
                MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }
        Db.SimpanProduk(new Produk { Kode = kode, Nama = nama, Harga = Db.ToInt(eHarga.Text), Stok = Db.ToInt(eStok.Text) });
        Muat();
        Baru();
    }

    void Hapus()
    {
        if (lv.SelectedItems.Count == 0) return;
        if (MessageBox.Show("Hapus produk ini?", "Hapus",
                MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
        Db.HapusProduk(lv.SelectedItems[0].Name);
        Muat();
        Baru();
    }
}
