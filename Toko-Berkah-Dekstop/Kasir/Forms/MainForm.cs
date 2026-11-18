using System.Drawing;

namespace Kasir;

public class MainForm : Form
{
    readonly Dictionary<string, ItemKeranjang> keranjang = new(); // urutan masuk dijaga manual
    readonly List<string> urutan = new();

    TextBox entKode, entQty, entBayar;
    ListView lv;
    Label lblTotal, lblKembali;
    Label lblStatus; // status sinkron Supabase di bagian bawah jendela

    LoginPanel login; // menutupi seluruh jendela selama belum login
    string pengguna = "";

    static readonly Color Biru = Color.FromArgb(0x3F, 0xB8, 0xFF);

    public MainForm()
    {
        Ui.Dpi(this);
        Text = "Kasir - " + Db.NamaToko;
        ClientSize = new Size(1000, 620);
        MinimumSize = new Size(880, 500); // cukup kecil agar muat di layar berskala 125%/150%
        StartPosition = FormStartPosition.CenterScreen;
        Font = new Font("Segoe UI", 10.5f);
        KeyPreview = true;

        BuildUi();
        BuatLogin();

        KeyDown += (s, e) =>
        {
            if (login.Visible) return; // belum login: pintasan F2/F3/F9/F12 tidak aktif
            switch (e.KeyCode)
            {
                case Keys.F2: e.Handled = true; KelolaProduk(); break;
                case Keys.F3: e.Handled = true; Laporan(); break;
                case Keys.F9: e.Handled = true; Batal(); break;
                case Keys.F12: e.Handled = true; Bayar(); break;
            }
        };
        Shown += (s, e) => { KecilkanKeLayar(); FitKolom(); login.Reset(); };

        // Wajib tutup buku sebelum aplikasi boleh ditutup (tombol X, Alt+F4, atau Close()).
        FormClosing += (s, e) => CegahTutup(e);
    }

    // ------------------------------------------------------------ kunci tutup aplikasi
    bool bolehTutup = false; // penanda: pembukuan baru saja disimpan, izinkan tutup
    bool sedangTanya = false; // penanda: dialog wajib tutup kasir sedang tampil

    // True kalau kasir sudah login (nama pengguna terisi).
    // Dipakai untuk membedakan sesi kasir dari layar login.
    bool SudahLogin => !string.IsNullOrEmpty(pengguna);

    // Dipanggil setiap jendela mau ditutup. Kalau pembukuan hari ini belum diisi,
    // penutupan dibatalkan dan kasir diarahkan mengisi Tutup Kasir lebih dulu.
    void CegahTutup(FormClosingEventArgs e)
    {
        if (bolehTutup) return;          // sudah diizinkan lewat tombol Tutup Kasir

        // Di layar login belum ada sesi kasir, jadi tidak ada transaksi hari ini
        // yang perlu dibukukan: X boleh langsung menutup aplikasi.
        if (!SudahLogin) return;

        if (Db.SudahTutupHariIni()) return;    // pembukuan hari ini sudah lengkap

        e.Cancel = true; // batalkan penutupan: X seolah tidak bereaksi
        if (sedangTanya) return;         // jangan buka dialog dobel kalau X ditekan berkali-kali

        sedangTanya = true;
        try
        {
            if (keranjang.Count > 0)
            {
                MessageBox.Show(
                    "Aplikasi tidak bisa ditutup karena pembukuan hari ini belum diisi.\n\n" +
                    "Keranjang masih berisi barang. Selesaikan pembayaran atau batalkan transaksi dulu,\n" +
                    "lalu isi Tutup Kasir lewat tombol \"Keluar\".",
                    "Wajib Tutup Kasir", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                entKode.Focus();
                return;
            }

            var jawab = MessageBox.Show(
                "Pembukuan hari ini belum diisi.\n\n" +
                "Aplikasi hanya bisa ditutup setelah Anda menghitung uang di laci dan menyimpan Tutup Kasir.\n\n" +
                "Isi pembukuan sekarang?",
                "Wajib Tutup Kasir", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);

            if (jawab == DialogResult.Yes) IsiTutupKasir(autoTutup: true);
            else entKode.Focus();
        }
        finally { sedangTanya = false; }
    }

    // Buka form Tutup Kasir. autoTutup = true kalau dipicu dari tombol X:
    // begitu pembukuan tersimpan, aplikasi langsung ditutup.
    void IsiTutupKasir(bool autoTutup)
    {
        if (keranjang.Count > 0)
        {
            MessageBox.Show("Keranjang masih berisi barang. Selesaikan pembayaran atau batalkan transaksi dulu.",
                "Belum bisa tutup kasir", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        using var tutup = new TutupKasirForm(string.IsNullOrEmpty(pengguna) ? "Kasir" : pengguna);
        if (tutup.ShowDialog(this) != DialogResult.OK) { entKode.Focus(); return; }

        // Rekap harian sudah tersimpan lokal; kirim ke Supabase sebelum keluar
        // supaya dashboard web langsung memuat angka hari ini.
        var (okSinkron, pesanSinkron) = Db.SinkronKeluar(pengguna);
        if (!okSinkron)
            MessageBox.Show(
                "Pembukuan tersimpan di komputer ini, tetapi belum terkirim ke server:\n\n" +
                pesanSinkron + "\n\nData tidak hilang — akan dikirim otomatis saat online.",
                "Belum tersinkron", MessageBoxButtons.OK, MessageBoxIcon.Information);

        if (!autoTutup)
        {
            // Dipicu tombol Keluar: setelah pembukuan, kembali ke layar login.
            pengguna = "";
            Text = "Kasir - " + Db.NamaToko;
            login.Visible = true;
            login.BringToFront();
            return;
        }

        // Dipicu tombol X: pembukuan tersimpan, jadi izinkan jendela ditutup.
        bolehTutup = true;
        Close();
    }

    // ------------------------------------------------------------ login / logout (satu jendela)
    void BuatLogin()
    {
        login = new LoginPanel(this) { Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right };
        login.Bounds = ClientRectangle;
        login.Berhasil += nama =>
        {
            pengguna = nama;
            Text = "Kasir - " + Db.NamaToko + "  |  Pengguna: " + pengguna;
            login.Visible = false;
            entKode.Focus();

            // Setelah login, kirim data yang tertunda dari sesi sebelumnya.
            SinkronLatar();
        };
        Controls.Add(login);
        login.BringToFront();
    }

    void Logout()
    {
        if (keranjang.Count > 0)
        {
            MessageBox.Show("Keranjang masih berisi barang. Selesaikan pembayaran atau batalkan transaksi dulu.",
                "Belum bisa logout", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        // Pembukuan: setiap mau keluar, kasir harus menghitung uang di laci dulu (Batal = tetap login).
        IsiTutupKasir(autoTutup: false);
    }

    // ------------------------------------------------------------ tampilan
    void BuildUi()
    {
        // ---- bilah status sinkron (paling bawah)
        lblStatus = new Label
        {
            Dock = DockStyle.Bottom,
            Height = 26,
            TextAlign = ContentAlignment.MiddleLeft,
            Padding = new Padding(10, 0, 0, 0),
            Text = "Belum tersinkron.",
            ForeColor = Color.DimGray,
            BackColor = Color.FromArgb(0xF7, 0xF7, 0xF7)
        };

        // ---- panel kanan
        var kanan = new Panel { Dock = DockStyle.Right, Width = 350, Padding = new Padding(10) };
        var kiri = new Panel { Dock = DockStyle.Fill, Padding = new Padding(10) };
        Controls.Add(kiri);
        Controls.Add(kanan);
        Controls.Add(lblStatus); // ditambahkan terakhir agar bilah status tetap di bawah

        // ---- input barang (atas)
        var atas = new FlowLayoutPanel { Dock = DockStyle.Top, AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, WrapContents = false };
        atas.Controls.Add(new Label { Text = "Kode / Barcode / Nama:", AutoSize = true, Margin = new Padding(0, 10, 4, 0) });
        entKode = new TextBox { Font = new Font("Segoe UI", 14f), Width = 170 };
        entKode.KeyDown += (s, e) =>
        {
            if (e.KeyCode == Keys.Enter) { e.SuppressKeyPress = true; Tambah(); }
        };
        atas.Controls.Add(entKode);
        atas.Controls.Add(new Label { Text = "Qty:", AutoSize = true, Margin = new Padding(8, 10, 4, 0) });
        entQty = new TextBox { Font = new Font("Segoe UI", 14f), Width = 55, Text = "1" };
        atas.Controls.Add(entQty);

        // tombol kurang / tambah jumlah (minimal 1); panah atas/bawah di kolom Qty juga bisa
        var btnKurang = new Button { Text = "-", Width = 32, Height = 34, Font = new Font("Segoe UI", 12f, FontStyle.Bold), Margin = new Padding(4, 2, 0, 0) };
        var btnPlus = new Button { Text = "+", Width = 32, Height = 34, Font = new Font("Segoe UI", 12f, FontStyle.Bold), Margin = new Padding(2, 2, 0, 0) };
        btnKurang.Click += (s, e) => { GeserQty(-1); entKode.Focus(); };
        btnPlus.Click += (s, e) => { GeserQty(1); entKode.Focus(); };
        entQty.KeyDown += (s, e) =>
        {
            if (e.KeyCode == Keys.Up) { e.Handled = true; e.SuppressKeyPress = true; GeserQty(1); }
            else if (e.KeyCode == Keys.Down) { e.Handled = true; e.SuppressKeyPress = true; GeserQty(-1); }
        };
        atas.Controls.Add(btnKurang);
        atas.Controls.Add(btnPlus);
        var btnTambah = new Button { Text = "Tambah", AutoSize = true, Margin = new Padding(8, 4, 0, 0) };
        btnTambah.Click += (s, e) => Tambah();
        atas.Controls.Add(btnTambah);

        // ---- tombol bawah
        var bawah = new FlowLayoutPanel { Dock = DockStyle.Bottom, AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, Padding = new Padding(0, 6, 0, 0) };
        var btnQty = new Button { Text = "Ubah Jumlah (dobel klik)", AutoSize = true };
        btnQty.Click += (s, e) => UbahQty();
        var btnHapus = new Button { Text = "Hapus Item (Del)", AutoSize = true };
        btnHapus.Click += (s, e) => HapusItem();
        var btnCari = new Button { Text = "Cari Barang", AutoSize = true };
        btnCari.Click += (s, e) => CariDialog("");
        bawah.Controls.AddRange(new Control[] { btnQty, btnHapus, btnCari });

        // ---- keranjang
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
        // lebar kolom mengikuti DPI layar; kolom Nama otomatis mengisi sisa lebar
        lv.Columns.Add("Kode", Ui.Px(this, 130));
        lv.Columns.Add("Nama Barang", Ui.Px(this, 280));
        lv.Columns.Add("Harga", Ui.Px(this, 130), HorizontalAlignment.Right);
        lv.Columns.Add("Jumlah", Ui.Px(this, 70), HorizontalAlignment.Center);
        lv.Columns.Add("Subtotal", Ui.Px(this, 160), HorizontalAlignment.Right);
        Ui.RowHeight(lv, Ui.Px(this, 32)); // baris lebih tinggi/lega seperti versi Python
        lv.Resize += (s, e) => FitKolom();
        lv.DoubleClick += (s, e) => UbahQty();
        lv.KeyDown += (s, e) =>
        {
            if (e.KeyCode == Keys.Delete) { e.Handled = true; HapusItem(); }
        };

        // urutan Add penting untuk docking: Fill harus terakhir ditambahkan
        kiri.Controls.Add(lv);
        kiri.Controls.Add(bawah);
        kiri.Controls.Add(atas);

        // ---- panel total (kanan), disusun dari bawah ke atas lewat Dock=Top
        var stack = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            FlowDirection = FlowDirection.TopDown,
            WrapContents = false,
            AutoScroll = true, // layar pendek: panel kanan bisa digulir, tombol tidak terpotong
        };
        kanan.Controls.Add(stack);
        int w = 285;

        stack.Controls.Add(new Label { Text = "TOTAL", AutoSize = true, Font = new Font("Segoe UI", 12f) });
        lblTotal = new Label
        {
            Text = "Rp0",
            Font = new Font("Segoe UI", 26f, FontStyle.Bold),
            ForeColor = Color.White,
            BackColor = Biru,
            TextAlign = ContentAlignment.MiddleRight,
            Width = w,
            Height = 70,
            Margin = new Padding(3, 0, 3, 14),
        };
        stack.Controls.Add(lblTotal);

        stack.Controls.Add(new Label { Text = "Uang Diterima", AutoSize = true, Font = new Font("Segoe UI", 12f) });
        entBayar = new TextBox
        {
            Font = new Font("Segoe UI", 20f),
            TextAlign = HorizontalAlignment.Right,
            Width = w,
            Margin = new Padding(3, 0, 3, 6),
        };
        entBayar.TextChanged += (s, e) => HitungKembali();
        entBayar.KeyDown += (s, e) =>
        {
            if (e.KeyCode == Keys.Enter) { e.SuppressKeyPress = true; Bayar(); }
        };
        stack.Controls.Add(entBayar);

        // tombol uang cepat
        var cepat = new TableLayoutPanel { Width = w, Height = 38, ColumnCount = 3, RowCount = 1, Margin = new Padding(3, 0, 3, 10) };
        for (int i = 0; i < 3; i++) cepat.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33.33f));
        var btnPas = new Button { Text = "Uang Pas", Dock = DockStyle.Fill };
        btnPas.Click += (s, e) => SetBayar(Total());
        var b50 = new Button { Text = "50rb", Dock = DockStyle.Fill };
        b50.Click += (s, e) => SetBayar(50000);
        var b100 = new Button { Text = "100rb", Dock = DockStyle.Fill };
        b100.Click += (s, e) => SetBayar(100000);
        cepat.Controls.Add(btnPas, 0, 0);
        cepat.Controls.Add(b50, 1, 0);
        cepat.Controls.Add(b100, 2, 0);
        stack.Controls.Add(cepat);

        stack.Controls.Add(new Label { Text = "Kembalian", AutoSize = true, Font = new Font("Segoe UI", 12f) });
        lblKembali = new Label
        {
            Text = "Rp0",
            Font = new Font("Segoe UI", 20f, FontStyle.Bold),
            ForeColor = Color.FromArgb(0xB7, 0x1C, 0x1C),
            TextAlign = ContentAlignment.MiddleRight,
            Width = w,
            Height = 46,
            Margin = new Padding(3, 0, 3, 14),
        };
        stack.Controls.Add(lblKembali);

        var btnBayar = BtnBiru("BAYAR (F12)", 14f, 48, w);
        btnBayar.Click += (s, e) => Bayar();
        stack.Controls.Add(btnBayar);
        var btnBatal = BtnBiru("Batal (F9)", 11f, 38, w);
        btnBatal.Click += (s, e) => Batal();
        stack.Controls.Add(btnBatal);

        stack.Controls.Add(new Label { BorderStyle = BorderStyle.Fixed3D, Height = 2, Width = w, Margin = new Padding(3, 10, 3, 10) });

        var btnProduk = new Button { Text = "Kelola Produk (F2)", Width = w, Height = 36 };
        btnProduk.Click += (s, e) => KelolaProduk();
        stack.Controls.Add(btnProduk);
        var btnLap = new Button { Text = "Laporan Penjualan (F3)", Width = w, Height = 36 };
        btnLap.Click += (s, e) => Laporan();
        stack.Controls.Add(btnLap);
        var btnSinkron = new Button { Text = "Sinkron ke Web Sekarang", Width = w, Height = 36 };
        btnSinkron.Click += (s, e) => SinkronLatar(tampilkanHasil: true);
        stack.Controls.Add(btnSinkron);
        var btnKeluar = new Button { Text = "Keluar (Logout)", Width = w, Height = 36 };
        btnKeluar.Click += (s, e) => Logout();
        stack.Controls.Add(btnKeluar);
    }

    static Button BtnBiru(string teks, float ukuran, int tinggi, int lebar) => new()
    {
        Text = teks,
        Font = new Font("Segoe UI", ukuran, FontStyle.Bold),
        BackColor = Biru,
        ForeColor = Color.White,
        FlatStyle = FlatStyle.Flat,
        Width = lebar,
        Height = tinggi,
        UseVisualStyleBackColor = false,
    };

    // ------------------------------------------------------------ penyesuaian layar
    // Kalau jendela lebih besar dari area kerja layar (mis. laptop berskala 150%),
    // kecilkan supaya bagian bawah tidak tertutup taskbar.
    void KecilkanKeLayar()
    {
        var area = Screen.FromControl(this).WorkingArea;
        int w = Math.Min(Width, area.Width), h = Math.Min(Height, area.Height);
        if (w == Width && h == Height) return;
        Size = new Size(w, h);
        Location = new Point(area.Left + (area.Width - w) / 2, area.Top + (area.Height - h) / 2);
    }

    // Lebar kolom keranjang dibagi menurut persen lebar daftar, jadi tidak meluber
    // di skala layar mana pun. Kolom Nama Barang mendapat sisanya.
    void FitKolom()
    {
        if (lv == null || lv.Columns.Count < 5) return;
        int total = lv.ClientSize.Width - SystemInformation.VerticalScrollBarWidth;
        if (total < 300) return;
        int kode = total * 15 / 100, harga = total * 17 / 100, jumlah = total * 12 / 100, sub = total * 20 / 100;
        lv.Columns[0].Width = kode;
        lv.Columns[2].Width = harga;
        lv.Columns[3].Width = jumlah;
        lv.Columns[4].Width = sub;
        lv.Columns[1].Width = total - kode - harga - jumlah - sub;
    }

    // ------------------------------------------------------------ logika keranjang
    long Total() => keranjang.Values.Sum(i => i.Harga * i.Qty);

    void Refresh2()
    {
        lv.BeginUpdate();
        lv.Items.Clear();
        foreach (var kode in urutan)
        {
            var i = keranjang[kode];
            var it = new ListViewItem(new[]
            {
                kode, i.Nama, Db.Rp(i.Harga), i.Qty.ToString(), Db.Rp(i.Harga * i.Qty)
            })
            { Name = kode };
            lv.Items.Add(it);
        }
        lv.EndUpdate();
        lblTotal.Text = Db.Rp(Total());
        HitungKembali();
    }

    // Tambah/kurangi jumlah pada kolom Qty di atas (minimal 1).
    void GeserQty(int delta)
    {
        long q = Math.Max(1, Db.ToInt(entQty.Text)) + delta;
        entQty.Text = Math.Max(1, q).ToString();
    }

    void SetBayar(long n)
    {
        entBayar.Text = n.ToString();
        HitungKembali();
    }

    void HitungKembali()
    {
        long k = Db.ToInt(entBayar.Text) - Total();
        lblKembali.Text = k >= 0 ? Db.Rp(k) : "-";
    }

    void Tambah()
    {
        var teks = entKode.Text.Trim();
        if (teks.Length == 0) return;
        long qty = Math.Max(1, Db.ToInt(entQty.Text));
        var p = Db.CariKode(teks);
        if (p == null) { CariDialog(teks); return; } // tidak ketemu kode -> cari berdasarkan nama
        Masukkan(p, qty);
    }

    void Masukkan(Produk p, long qty)
    {
        long sudah = keranjang.TryGetValue(p.Kode, out var ada) ? ada.Qty : 0;
        if (sudah + qty > p.Stok)
        {
            MessageBox.Show($"Stok {p.Nama} tinggal {p.Stok}.", "Stok kurang",
                MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }
        if (ada != null) ada.Qty += qty;
        else
        {
            keranjang[p.Kode] = new ItemKeranjang { Kode = p.Kode, Nama = p.Nama, Harga = p.Harga, Qty = qty };
            urutan.Add(p.Kode);
        }
        entKode.Clear();
        entQty.Text = "1";
        Refresh2();
        entKode.Focus();
    }

    void CariDialog(string kata)
    {
        using var dlg = new CariForm(kata);
        if (dlg.ShowDialog(this) == DialogResult.OK && dlg.Terpilih != null)
            Masukkan(dlg.Terpilih, Math.Max(1, Db.ToInt(entQty.Text)));
        else
            entKode.Focus();
    }

    string? PilihItem() => lv.SelectedItems.Count > 0 ? lv.SelectedItems[0].Name : null;

    void UbahQty()
    {
        var kode = PilihItem();
        if (kode == null) return;
        using var dlg = new QtyForm(keranjang[kode].Nama, keranjang[kode].Qty);
        if (dlg.ShowDialog(this) != DialogResult.OK) return;

        long q = dlg.Hasil;
        if (q <= 0)
        {
            keranjang.Remove(kode);
            urutan.Remove(kode);
        }
        else
        {
            long stok = Db.StokDari(kode);
            if (q > stok)
            {
                MessageBox.Show($"Stok tinggal {stok}.", "Stok kurang",
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            keranjang[kode].Qty = q;
        }
        Refresh2();
    }

    void HapusItem()
    {
        var kode = PilihItem();
        if (kode == null) return;
        keranjang.Remove(kode);
        urutan.Remove(kode);
        Refresh2();
    }

    void Batal()
    {
        if (keranjang.Count > 0 &&
            MessageBox.Show("Batalkan transaksi ini?", "Batal",
                MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
            return;
        keranjang.Clear();
        urutan.Clear();
        entBayar.Clear();
        Refresh2();
        entKode.Focus();
    }

    // ------------------------------------------------------------ pembayaran
    void Bayar()
    {
        if (keranjang.Count == 0)
        {
            MessageBox.Show("Keranjang masih kosong.", "Kosong",
                MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }
        long total = Total();
        long uang = Db.ToInt(entBayar.Text);
        if (uang < total)
        {
            MessageBox.Show("Uang diterima kurang dari total.", "Uang kurang",
                MessageBoxButtons.OK, MessageBoxIcon.Warning);
            entBayar.Focus();
            return;
        }
        long kembali = uang - total;
        var items = urutan.Select(k => keranjang[k]).ToList();
        var (trxId, waktu) = Db.SimpanTransaksi(items, total, uang, kembali);

        using (var struk = new StrukForm(trxId, waktu, items, total, uang, kembali))
            struk.ShowDialog(this);

        keranjang.Clear();
        urutan.Clear();
        entBayar.Clear();
        Refresh2();
        entKode.Focus();

        // Kirim transaksi ke Supabase di latar belakang supaya kasir tidak
        // menunggu internet. Kalau offline, data tetap di antrian lokal.
        SinkronLatar();
    }

    // ------------------------------------------------------------ sinkron Supabase
    bool sedangSinkron = false;

    // Jalankan sinkron tanpa mengunci layar kasir.
    async void SinkronLatar(bool tampilkanHasil = false)
    {
        if (sedangSinkron || !SudahLogin) return;
        sedangSinkron = true;
        SetStatus("Menyinkronkan ke Supabase…", Color.DimGray);
        try
        {
            // Tarik dulu produk & kategori terbaru dari web, baru kirim data lokal.
            // Tanpa langkah ini daftar produk desktop tetap kosong walau online.
            var (okMasuk, pesanMasuk) = await Task.Run(() => Db.SinkronMasuk());

            var (ok, pesan) = await Task.Run(() => Db.SinkronKeluar(pengguna));
            if (ok) SetStatus(pesan, Color.SeaGreen);
            else SetStatus(pesan, Color.DarkOrange);

            if (tampilkanHasil)
                MessageBox.Show(okMasuk ? pesan : pesanMasuk + "\n\n" + pesan,
                    ok ? "Sinkron berhasil" : "Sinkron gagal",
                    MessageBoxButtons.OK, ok ? MessageBoxIcon.Information : MessageBoxIcon.Warning);

            if (okMasuk) Refresh2();
        }
        finally { sedangSinkron = false; }
    }

    void SetStatus(string teks, Color warna)
    {
        if (lblStatus == null) return;
        if (InvokeRequired) { BeginInvoke(new Action(() => SetStatus(teks, warna))); return; }
        lblStatus.Text = teks;
        lblStatus.ForeColor = warna;
    }

    void KelolaProduk()
    {
        using var dlg = new ProdukForm();
        dlg.ShowDialog(this);
        entKode.Focus();
    }

    void Laporan()
    {
        using var dlg = new LaporanForm(); // jendela laporan harian/bulanan
        dlg.ShowDialog(this);
        entKode.Focus();
    }
}
