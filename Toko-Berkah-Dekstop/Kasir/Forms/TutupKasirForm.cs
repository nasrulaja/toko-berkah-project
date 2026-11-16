using System.Drawing;

namespace Kasir;

// Muncul setiap kali kasir mau logout: hitung uang di laci, bandingkan dengan yang seharusnya ada
// (modal awal + total penjualan hari ini), lalu catat selisihnya.
public class TutupKasirForm : Form
{
    readonly TextBox eModal, eHitung;
    readonly Label lblSeharusnya, lblSelisih;
    readonly string kasir;
    readonly long transaksi, penjualan;

    public TutupKasirForm(string kasir)
    {
        this.kasir = kasir;
        var hariIni = DateTime.Now;
        var data = Db.LaporanData(hariIni.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture));
        transaksi = data.Jumlah;
        penjualan = data.Total;

        Ui.Dpi(this);
        Text = "Tutup Kasir";
        // Ukuran di-set dua kali: di sini sebagai nilai awal, lalu di Shown setelah form tampil.
        // Dengan HighDpiMode.PerMonitorV2, constructor bisa ditimpa proses scaling Windows
        // sehingga form mengecil dan baris tombol "Simpan & Keluar" terpotong.
        // Baris berukuran tetap (bukan AutoSize), jadi tinggi harus benar-benar cukup.
        ClientSize = new Size(560, 620);
        MinimumSize = new Size(560, 620);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = MinimizeBox = false;
        ShowInTaskbar = false;
        StartPosition = FormStartPosition.CenterParent;
        Font = new Font("Segoe UI", 10.5f);

        var t = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 2, Padding = new Padding(Ui.Px(this, 16)) };
        t.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, Ui.Px(this, 250)));
        t.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));

        int baris = 0;
        void Tambah(string judul, Control isi)
        {
            t.RowStyles.Add(new RowStyle(SizeType.Absolute, Ui.Px(this, 44)));
            t.Controls.Add(new Label { Text = judul, AutoSize = true, Anchor = AnchorStyles.Left }, 0, baris);
            t.Controls.Add(isi, 1, baris);
            baris++;
        }
        // Label nilai: jangan AutoSize supaya angka panjang (tanggal/Rupiah) tidak terpotong;
        // teks dibungkus ke baris berikutnya kalau kolomnya sempit.
        Label Nilai(string teks) => new Label
        {
            Text = teks,
            AutoSize = false,
            Dock = DockStyle.Fill,
            TextAlign = ContentAlignment.MiddleLeft,
            Font = new Font("Segoe UI", 10.5f, FontStyle.Bold),
        };

        eModal = new TextBox { Dock = DockStyle.Fill, TextAlign = HorizontalAlignment.Right };
        eHitung = new TextBox { Dock = DockStyle.Fill, TextAlign = HorizontalAlignment.Right };
        lblSeharusnya = Nilai("");
        lblSelisih = new Label { AutoSize = false, Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleLeft, Font = new Font("Segoe UI", 12f, FontStyle.Bold) };

        Tambah("Tanggal", Nilai(hariIni.ToString("dd/MM/yyyy")));
        Tambah("Kasir", Nilai(kasir));
        Tambah("Jumlah transaksi hari ini", Nilai(transaksi.ToString()));
        Tambah("Total penjualan hari ini", Nilai(Db.Rp(penjualan)));
        Tambah("Modal awal (uang di laci saat buka)", eModal);
        Tambah("Seharusnya ada di laci", lblSeharusnya);
        Tambah("Uang di laci (hasil hitung)", eHitung);
        Tambah("Selisih", lblSelisih);

        var simpan = new Button { Text = "Simpan && Keluar", Width = Ui.Px(this, 170), Height = Ui.Px(this, 38) };
        var batal = new Button { Text = "Batal", Width = Ui.Px(this, 90), Height = Ui.Px(this, 38), DialogResult = DialogResult.Cancel };
        var tombol = new FlowLayoutPanel { Dock = DockStyle.Fill, FlowDirection = FlowDirection.RightToLeft };
        tombol.Controls.Add(batal);
        tombol.Controls.Add(simpan);
        t.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        t.Controls.Add(tombol, 0, baris);
        t.SetColumnSpan(tombol, 2);
        Controls.Add(t);

        AcceptButton = simpan;
        CancelButton = batal;
        eModal.TextChanged += (s, e) => Hitung();
        eHitung.TextChanged += (s, e) => Hitung();
        simpan.Click += (s, e) => Simpan();
        Shown += (s, e) =>
        {
            // Pastikan ukuran final benar setelah Windows selesai melakukan scaling DPI.
            ClientSize = new Size(560, 620);
            eModal.Focus();
        };
        Hitung();
    }

    long Seharusnya() => Db.ToInt(eModal.Text) + penjualan;

    // Perbarui "seharusnya" dan "selisih" setiap kali angka diketik.
    void Hitung()
    {
        lblSeharusnya.Text = Db.Rp(Seharusnya());
        if (eHitung.Text.Trim().Length == 0)
        {
            lblSelisih.Text = "-";
            lblSelisih.ForeColor = SystemColors.GrayText;
            return;
        }
        long sel = Db.ToInt(eHitung.Text) - Seharusnya();
        if (sel == 0) { lblSelisih.Text = "Pas"; lblSelisih.ForeColor = Color.SeaGreen; }
        else if (sel > 0) { lblSelisih.Text = "Lebih " + Db.Rp(sel); lblSelisih.ForeColor = Color.SteelBlue; }
        else { lblSelisih.Text = "Kurang " + Db.Rp(-sel); lblSelisih.ForeColor = Color.Firebrick; }
    }

    void Simpan()
    {
        if (eHitung.Text.Trim().Length == 0)
        {
            MessageBox.Show("Isi dulu uang di laci hasil hitung.", "Belum lengkap",
                MessageBoxButtons.OK, MessageBoxIcon.Information);
            eHitung.Focus();
            return;
        }
        if (MessageBox.Show($"Selisih: {lblSelisih.Text}.\n\nSimpan dan keluar sekarang?", "Tutup Kasir",
                MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
            return;

        Db.SimpanTutupKasir(kasir, Db.ToInt(eModal.Text), transaksi, penjualan, Db.ToInt(eHitung.Text));
        DialogResult = DialogResult.OK;
        Close();
    }
}
