using System.Drawing;

namespace Kasir;

public class CariForm : Form
{
    readonly TextBox e;
    readonly ListBox lb;
    readonly ComboBox cbKat;
    List<Produk> hasil = new();
    public Produk? Terpilih { get; private set; }

    public CariForm(string kata)
    {
        Ui.Dpi(this);
        Text = "Cari Barang";
        ClientSize = new Size(580, 450);
        StartPosition = FormStartPosition.CenterParent;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = MinimizeBox = false;
        ShowInTaskbar = false;
        Font = new Font("Segoe UI", 11f);

        e = new TextBox { Dock = DockStyle.Top, Text = kata };
        lb = new ListBox { Dock = DockStyle.Fill, IntegralHeight = false };
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
        pad.Controls.Add(lb);
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
            else if (a.KeyCode == Keys.Down) { a.Handled = true; lb.Focus(); }
        };
        lb.KeyDown += (s, a) =>
        {
            if (a.KeyCode == Keys.Enter) { a.SuppressKeyPress = true; Pilih(); }
        };
        lb.DoubleClick += (s, a) => Pilih();
        Shown += (s, a) => { e.Focus(); e.SelectionStart = e.TextLength; };
        Cari();
    }

    void Cari()
    {
        hasil = Db.Cari(e.Text, cbKat.SelectedItem as string);
        lb.Items.Clear();
        foreach (var r in hasil)
            lb.Items.Add($"{r.Nama}  |  {r.Kategori}  |  {Db.Rp(r.Harga)}  |  stok {r.Stok}");
        if (lb.Items.Count > 0) lb.SelectedIndex = 0;
    }

    void Pilih()
    {
        if (lb.SelectedIndex < 0) return;
        Terpilih = hasil[lb.SelectedIndex];
        DialogResult = DialogResult.OK;
    }
}
