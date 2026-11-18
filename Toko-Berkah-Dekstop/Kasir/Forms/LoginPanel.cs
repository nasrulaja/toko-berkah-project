using System.Drawing;

namespace Kasir;

// Bukan jendela sendiri: panel ini menutupi seluruh jendela kasir, jadi login dan logout
// terjadi di dalam satu frame yang sama.
public class LoginPanel : Panel
{
    public event Action<string> Berhasil; // dipanggil dengan nama pengguna

    readonly TextBox eUser, eSandi;
    readonly Label lblSalah;
    readonly CheckBox chkLihat;

    public LoginPanel(Control tuan)
    {
        BackColor = Color.White;
        var biru = Color.FromArgb(0x00, 0x7B, 0xC4);

        // ---- logo toko (gambar ditanam di program); kalau tidak ditemukan, pakai lingkaran biru
        Control logo;
        var gambar = LogoToko.Muat();
        if (gambar != null)
        {
            logo = new PictureBox
            {
                Image = gambar,
                SizeMode = PictureBoxSizeMode.Zoom,
                Size = new Size(Ui.Px(tuan, 240), Ui.Px(tuan, 89)),
                Anchor = AnchorStyles.None,
                Margin = new Padding(0, 0, 0, Ui.Px(tuan, 10)),
            };
        }
        else
        {
            var lingkaran = new Panel { Size = new Size(Ui.Px(tuan, 64), Ui.Px(tuan, 64)), Anchor = AnchorStyles.None, Margin = new Padding(0, 0, 0, Ui.Px(tuan, 8)) };
            lingkaran.Paint += (s, e) =>
            {
                e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                int t = Ui.Px(tuan, 7);
                using var pena = new Pen(biru, t);
                e.Graphics.DrawEllipse(pena, t / 2, t / 2, lingkaran.Width - t - 1, lingkaran.Height - t - 1);
            };
            logo = lingkaran;
        }

        var judul = new Label { Text = "MASUK KASIR", Dock = DockStyle.Fill, AutoSize = true, TextAlign = ContentAlignment.MiddleCenter, Font = new Font("Segoe UI", 18f, FontStyle.Bold), ForeColor = Color.FromArgb(0x22, 0x22, 0x22) };
        var toko = new Label { Text = Db.NamaToko, Dock = DockStyle.Fill, AutoSize = true, TextAlign = ContentAlignment.MiddleCenter, ForeColor = Color.Gray, Margin = new Padding(3, 0, 3, Ui.Px(tuan, 16)) };

        // label + isian dibuat berpasangan supaya jelas kolom mana yang diisi
        var lblUser = new Label { Text = "Surel", AutoSize = true, ForeColor = Color.FromArgb(0x44, 0x44, 0x44), Margin = new Padding(3, 2, 3, 2) };
        eUser = new TextBox { Dock = DockStyle.Fill, Font = new Font("Segoe UI", 12f), PlaceholderText = "nama@contoh.com", Margin = new Padding(3, 0, 3, Ui.Px(tuan, 8)) };
        var lblSandi = new Label { Text = "Kata Sandi", AutoSize = true, ForeColor = Color.FromArgb(0x44, 0x44, 0x44), Margin = new Padding(3, 2, 3, 2) };
        eSandi = new TextBox { Dock = DockStyle.Fill, Font = new Font("Segoe UI", 12f), PlaceholderText = "Masukkan kata sandi", UseSystemPasswordChar = true, Margin = new Padding(3, 0, 3, Ui.Px(tuan, 6)) };
        lblSalah = new Label { Dock = DockStyle.Fill, AutoSize = true, ForeColor = Color.Firebrick, Visible = false, Text = "Surel atau kata sandi salah.", Margin = new Padding(3, 0, 3, Ui.Px(tuan, 6)) };

        // tampilkan / sembunyikan isi kata sandi
        chkLihat = new CheckBox { Text = "Tampilkan kata sandi", AutoSize = true, ForeColor = Color.Gray, Margin = new Padding(3, 0, 3, Ui.Px(tuan, 6)) };
        chkLihat.CheckedChanged += (s, e) => eSandi.UseSystemPasswordChar = !chkLihat.Checked;


        var btn = new Button
        {
            Text = "MASUK",
            Dock = DockStyle.Fill,
            Height = Ui.Px(tuan, 44),
            Font = new Font("Segoe UI", 11f, FontStyle.Bold),
            BackColor = biru,
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            UseVisualStyleBackColor = false,
            Margin = new Padding(3, Ui.Px(tuan, 6), 3, 3),
        };
        btn.FlatAppearance.BorderSize = 0;
        btn.Click += (s, e) => Masuk();

        // Enter = login (panel tidak punya AcceptButton, jadi ditangani sendiri)
        KeyEventHandler enter = (s, e) =>
        {
            if (e.KeyCode != Keys.Enter) return;
            e.SuppressKeyPress = true;
            if (s == eUser && eSandi.Text.Length == 0) eSandi.Focus(); else Masuk();
        };
        eUser.KeyDown += enter;
        eSandi.KeyDown += enter;

        // ---- kartu putih di tengah
        var kartu = new TableLayoutPanel
        {
            AutoSize = true,
            AutoSizeMode = AutoSizeMode.GrowAndShrink,
            ColumnCount = 1,
            BackColor = Color.White,
            Padding = new Padding(Ui.Px(tuan, 32)),
            Anchor = AnchorStyles.None,
            MinimumSize = new Size(Ui.Px(tuan, 400), 0),
        };
        kartu.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        // latar putih: beri garis tipis di tepi kartu supaya kartunya tetap terlihat
        kartu.Paint += (s, e) =>
        {
            using var garis = new Pen(Color.FromArgb(0xD5, 0xD9, 0xDE));
            e.Graphics.DrawRectangle(garis, 0, 0, kartu.Width - 1, kartu.Height - 1);
        };
        foreach (Control c in new Control[] { logo, judul, toko, lblUser, eUser, lblSandi, eSandi, chkLihat, lblSalah, btn })
            kartu.Controls.Add(c);

        // satu sel penuh: kartu (Anchor None) otomatis berada di tengah
        var tengah = new PanelHalus { Dock = DockStyle.Fill, ColumnCount = 1, RowCount = 1 };
        tengah.Controls.Add(kartu, 0, 0);

        // bayangan lembut di belakang kartu: lapisan hitam transparan yang makin besar
        tengah.Paint += (s, e) =>
        {
            var r = kartu.Bounds;
            int lebar = Ui.Px(tuan, 14), turun = Ui.Px(tuan, 6);
            using var kuas = new SolidBrush(Color.FromArgb(6, 0, 0, 0));
            for (int i = lebar; i >= 1; i--)
                e.Graphics.FillRectangle(kuas, r.X - i, r.Y - i + turun, r.Width + 2 * i, r.Height + 2 * i);
        };
        kartu.Resize += (s, e) => tengah.Invalidate();
        kartu.Move += (s, e) => tengah.Invalidate();
        tengah.Resize += (s, e) => tengah.Invalidate();
        Controls.Add(tengah);

        // setiap kali panel ditampilkan: kosongkan isian dan mulai dari username
        VisibleChanged += (s, e) => { if (Visible) Reset(); };
    }

    public void Reset()
    {
        eUser.Clear();
        eSandi.Clear();
        chkLihat.Checked = false;
        lblSalah.Visible = false;
        eUser.Focus();
    }

    void Masuk()
    {
        var nama = Db.Login(eUser.Text, eSandi.Text);
        if (nama == null)
        {
            lblSalah.Visible = true;
            eSandi.Clear();
            eSandi.Focus();
            return;
        }
        Berhasil?.Invoke(nama);
    }
}

// Panel tanpa kedip saat digambar ulang (dipakai untuk bayangan kartu login).
public class PanelHalus : TableLayoutPanel
{
    public PanelHalus() { DoubleBuffered = true; ResizeRedraw = true; }
}