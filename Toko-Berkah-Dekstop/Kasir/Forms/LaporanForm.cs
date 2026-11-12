using System.Drawing;

namespace Kasir;

public class LaporanForm : Form
{
    public LaporanForm()
    {
        const int w = 34;
        string Tengah(string s) => s.Length >= w ? s : new string(' ', (w - s.Length) / 2) + s;
        string Potong(string s, int maks) => s.Length > maks ? s[..maks] : s;
        // teks kiri rata kiri, teks kanan rata kanan, total selebar struk
        string Baris(string kiri, string kanan) =>
            Potong(kiri, w - kanan.Length - 1).PadRight(w - kanan.Length) + kanan;

        var d = Db.LaporanData();
        var garis = new string('-', w);

        var baris = new List<string>
        {
            Tengah(Db.NamaToko), Tengah("LAPORAN PENJUALAN"), garis,
            "Tanggal: " + d.Hari,
            "Dicetak: " + DateTime.Now.ToString("HH:mm:ss"),
            garis,
            Baris("Jumlah transaksi", d.Jumlah.ToString()),
            Baris("Total penjualan", Db.Rp(d.Total)),
            garis,
            "BARANG TERLARIS",
        };
        if (d.Terlaris.Count == 0) baris.Add("  (belum ada penjualan)");
        for (int i = 0; i < d.Terlaris.Count; i++)
            baris.Add(Baris($"{i + 1}. {d.Terlaris[i].Nama}", "x" + d.Terlaris[i].Qty));
        baris.Add(garis);
        baris.Add("STOK MENIPIS (<=5)");
        if (d.Menipis.Count == 0) baris.Add("  (tidak ada)");
        foreach (var m in d.Menipis)
            baris.Add(Baris("  " + m.Nama, m.Stok.ToString()));
        baris.Add(garis);
        baris.Add(Tengah("*** Akhir laporan ***"));

        Text = "Struk Laporan";
        StartPosition = FormStartPosition.CenterParent;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = MinimizeBox = false;
        ShowInTaskbar = false;
        Font = new Font("Segoe UI", 10f);

        // Label monospace berukuran otomatis, sama seperti struk pembayaran.
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
