using System.Drawing;

namespace Kasir;

public class StrukForm : Form
{
    public StrukForm(long trxId, string waktu, List<ItemKeranjang> items, long total, long uang, long kembali)
    {
        const int w = 34;
        string Tengah(string s) => s.Length >= w ? s : new string(' ', (w - s.Length) / 2) + s;
        // "Rp" selalu di kolom yang sama, digit rata kanan di belakangnya (lebar 11 = sampai 999.999.999).
        string Uang(long v) => "Rp" + v.ToString("#,##0", System.Globalization.CultureInfo.InvariantCulture).Replace(',', '.').PadLeft(11);
        // Teks kiri + angka rata kanan: angka selalu berakhir di kolom ke-w, berapa pun digitnya.
        // Kalau tidak muat satu baris, angka pindah ke baris bawah (tetap rata kanan).
        string Kanan(string kiri, string kanan)
        {
            int spasi = w - kiri.Length - kanan.Length;
            return spasi >= 1
                ? kiri + new string(' ', spasi) + kanan
                : kiri + "\n" + kanan.PadLeft(w);
        }

        // waktu di database "2026-11-13 13:35:12" -> tampil "13/11/2026" + jam
        var wkt = DateTime.ParseExact(waktu, "yyyy-MM-dd HH:mm:ss", System.Globalization.CultureInfo.InvariantCulture);

        var baris = new List<string>
        {
            Tengah(Db.NamaToko), Tengah(Db.AlamatToko), new string('-', w),
            $"No : {trxId:000000}",
            "Tgl: " + wkt.ToString("dd/MM/yyyy"),
            "Jam: " + wkt.ToString("HH:mm:ss"),
            new string('-', w),
        };
        foreach (var i in items)
        {
            baris.Add(i.Nama.Length > w ? i.Nama[..w] : i.Nama);
            baris.Add(Kanan($"  {i.Qty} x {Db.Rp(i.Harga)}", Uang(i.Qty * i.Harga)));
        }
        baris.Add(new string('-', w));
        baris.Add(Kanan("TOTAL", Uang(total)));
        baris.Add(Kanan("BAYAR", Uang(uang)));
        baris.Add(Kanan("KEMBALI", Uang(kembali)));
        baris.Add(new string('-', w));
        baris.Add(Tengah("Terima kasih"));
        baris.Add(Tengah("Selamat belanja lagi"));

        Text = "Struk";
        StartPosition = FormStartPosition.CenterParent;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = MinimizeBox = false;
        ShowInTaskbar = false;
        Font = new Font("Segoe UI", 10f);

        // Label monospace dengan ukuran otomatis: lebar & tinggi mengikuti isi struk,
        // jadi tidak terpotong dan tidak ada scrollbar kosong.
        var isi = new Label
        {
            Dock = DockStyle.Top,
            AutoSize = true,
            UseMnemonic = false,
            Font = new Font("Courier New", 10f),
            ForeColor = Color.Black,
            BackColor = Color.White,
            Text = string.Join("\n", baris),
            Padding = new Padding(Ui.Px(this, 14)),
        };
        var kotak = new Panel { Dock = DockStyle.Fill, BackColor = Color.White, AutoScroll = true };
        kotak.Controls.Add(isi);

        // logo toko di bagian paling atas struk (ditambah setelah isi, jadi di-dock paling atas)
        Panel logoPanel = null;
        var gambar = LogoToko.Muat();
        if (gambar != null)
        {
            logoPanel = new Panel
            {
                Dock = DockStyle.Top,
                Height = Ui.Px(this, 92),
                BackColor = Color.White,
                Padding = new Padding(Ui.Px(this, 14), Ui.Px(this, 14), Ui.Px(this, 14), 0),
            };
            logoPanel.Controls.Add(new PictureBox { Dock = DockStyle.Fill, Image = gambar, SizeMode = PictureBoxSizeMode.Zoom, BackColor = Color.White });
            kotak.Controls.Add(logoPanel);
        }

        var tutup = new Button { Text = "Tutup (Enter)", Dock = DockStyle.Bottom, Height = Ui.Px(this, 42) };
        tutup.Click += (s, a) => Close();

        Controls.Add(kotak);
        Controls.Add(tutup);
        AcceptButton = tutup;

        var pref = isi.PreferredSize;
        int tinggiMax = Ui.Px(this, 640);
        int tinggi = pref.Height + tutup.Height + (logoPanel != null ? logoPanel.Height : 0);
        bool scroll = tinggi > tinggiMax;
        ClientSize = new Size(
            pref.Width + (scroll ? SystemInformation.VerticalScrollBarWidth : 0),
            Math.Min(tinggi, tinggiMax));

        Shown += (s, a) => tutup.Focus();
    }
}