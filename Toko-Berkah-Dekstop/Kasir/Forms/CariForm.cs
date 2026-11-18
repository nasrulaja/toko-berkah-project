using System.Drawing;

namespace Kasir;

public class CariForm : Form
{
    readonly TextBox e;
    readonly ListView lv;
    readonly ComboBox cbKat;
    List<Produk> hasil = new();
    public Produk? Terpilih { get; private set; }

    public CariForm(string kata)
    {
        Ui.Dpi(this);
        Text = "Cari Barang";
        ClientSize = new Size(720, 500);
        StartPosition = FormStartPosition.CenterParent;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = MinimizeBox = false;
        ShowInTaskbar = false;
        Font = new Font("Segoe UI", 11f);

        e = new TextBox { Dock = DockStyle.Top, Text = kata };
        // daftar hasil dalam bentuk kolom: Kode | Nama | Kategori | Harga | Stok
        lv = new ListView
        {
            Dock = DockStyle.Fill,
            View = View.Details,
            FullRowSelect = true,
            GridLines = true,
            MultiSelect = false,
            HideSelection = false,
        };
        lv.Columns.Add("Kode", Ui.Px(this, 110));
        lv.Columns.Add("Nama Barang", Ui.Px(this, 240));
        lv.Columns.Add("Kategori", Ui.Px(this, 120));
        lv.Columns.Add("Harga", Ui.Px(this, 100), HorizontalAlignment.Right);
        lv.Columns.Add("Stok", Ui.Px(this, 70), HorizontalAlignment.Right);
        Ui.RowHeight(lv, Ui.Px(this, 30));
        lv.Resize += (s, a) => Ui.FitColumn(lv, 1);
        // pilihan kategori: "Semua" + kategori yang ada di database
        cbKat = new ComboBox { Dock = DockStyle.Fill, DropDownStyle = ComboBoxStyle.DropDownList };
        cbKat.Items.Add(Db.SemuaKategori);
        foreach (var k in Db.DaftarKategori()) cbKat.Items.Add(k);
        cbKat.SelectedIndex = 0;
        var barisKat = new TableLayoutPanel { Dock = DockStyle.Top, AutoSize = true, ColumnCount = 2, RowCount = 1 };
        barisKat.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        barisKat.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        barisKat.Controls.Add(new Label { Text = "Kategori:", AutoSize = true, Anchor = AnchorStyles.Left, Margin = new Padding(0, 0, 8, 0) }, 0, 0);
        barisKat.Controls.Add(cbKat, 1, 0);

        // Add terakhir = di-dock paling dulu: kategori paling atas, lalu kotak cari, lalu daftar
        var pad = new Panel { Dock = DockStyle.Fill, Padding = new Padding(12) };
        pad.Controls.Add(lv);
        pad.Controls.Add(new Panel { Dock = DockStyle.Top, Height = 10 });
        pad.Controls.Add(e);
        pad.Controls.Add(new Panel { Dock = DockStyle.Top, Height = 10 });
        pad.Controls.Add(barisKat);
        Controls.Add(pad);

        cbKat.SelectedIndexChanged += (s, a) => Cari();
        e.TextChanged += (s, a) => Cari();
        e.KeyDown += (s, a) =>
        {
            if (a.KeyCode == Keys.Enter) { a.SuppressKeyPress = true; Pilih(); }
            else if (a.KeyCode == Keys.Down) { a.Handled = true; lv.Focus(); }
        };
        lv.KeyDown += (s, a) =>
        {
            if (a.KeyCode == Keys.Enter) { a.SuppressKeyPress = true; Pilih(); }
        };
        lv.DoubleClick += (s, a) => Pilih();
        Shown += (s, a) => { Ui.FitColumn(lv, 1); e.Focus(); e.SelectionStart = e.TextLength; };
        Cari();
    }

    void Cari()
    {
        hasil = Db.Cari(e.Text, cbKat.SelectedItem as string);
        lv.BeginUpdate();
        lv.Items.Clear();
        foreach (var r in hasil)
        {
            var it = new ListViewItem(new[] { r.Kode, r.Nama, r.Kategori, Db.Rp(r.Harga), r.Stok.ToString() });
            if (r.Stok <= 0) it.ForeColor = Color.Firebrick; // stok habis ditandai merah
            lv.Items.Add(it);
        }
        lv.EndUpdate();
        if (lv.Items.Count > 0) { lv.Items[0].Selected = true; lv.Items[0].Focused = true; }
    }

    void Pilih()
    {
        if (lv.SelectedIndices.Count == 0) return;
        Terpilih = hasil[lv.SelectedIndices[0]];
        DialogResult = DialogResult.OK;
    }
}