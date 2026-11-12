using System.Drawing;

namespace Kasir;

public class StrukForm : Form
{
    public StrukForm(long trxId, string waktu, List<ItemKeranjang> items, long total, long uang, long kembali)
    {
        const int w = 34;
        string Tengah(string s) => s.Length >= w ? s : new string(' ', (w - s.Length) / 2) + s;

        var baris = new List<string>
        {
            Tengah(Db.NamaToko), Tengah(Db.AlamatToko), new string('-', w),
            $"No : {trxId:000000}", $"Tgl: {waktu}", new string('-', w),
        };
        foreach (var i in items)
        {
            baris.Add(i.Nama.Length > w ? i.Nama[..w] : i.Nama);
            var kiri = $"  {i.Qty} x {Db.Rp(i.Harga)}";
            baris.Add(kiri + Db.Rp(i.Qty * i.Harga).PadLeft(Math.Max(0, w - kiri.Length)));
        }
        baris.Add(new string('-', w));
        baris.Add("TOTAL".PadRight(12) + Db.Rp(total).PadLeft(w - 12));
        baris.Add("BAYAR".PadRight(12) + Db.Rp(uang).PadLeft(w - 12));
        baris.Add("KEMBALI".PadRight(12) + Db.Rp(kembali).PadLeft(w - 12));
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

        var tutup = new Button { Text = "Tutup (Enter)", Dock = DockStyle.Bottom, Height = Ui.Px(this, 42) };
        tutup.Click += (s, a) => Close();

        Controls.Add(kotak);
        Controls.Add(tutup);
        AcceptButton = tutup;

        var pref = isi.PreferredSize;
        int tinggiMax = Ui.Px(this, 640);
        int tinggi = pref.Height + tutup.Height;
        bool scroll = tinggi > tinggiMax;
        ClientSize = new Size(
            pref.Width + (scroll ? SystemInformation.VerticalScrollBarWidth : 0),
            Math.Min(tinggi, tinggiMax));

        Shown += (s, a) => tutup.Focus();
    }
}
