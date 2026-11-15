namespace Kasir;


public class Produk
{
    public string Kode { get; set; } = "";
    public string Nama { get; set; } = "";
    public long Harga { get; set; }
    public long Stok { get; set; }
    public string Kategori { get; set; } = "Lainnya";
}

public class ItemKeranjang
{
    public string Kode { get; set; } = "";
    public string Nama { get; set; } = "";
    public long Harga { get; set; }
    public long Qty { get; set; }
}

// Data laporan (harian atau bulanan), dipakai untuk jendela Laporan Penjualan.
public class DataLaporan
{
    public string Periode = "";
    public long Jumlah;
    public long Total;
    public List<(string Nama, long Qty, long Omzet)> Terlaris = new();
    public List<(string Tanggal, long Jumlah, long Total)> PerHari = new();
    public List<(string Nama, long Stok)> Menipis = new();
}
