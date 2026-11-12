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

// Data laporan harian, dipakai untuk menampilkan struk laporan.
public class DataLaporan
{
    public string Hari = "";
    public long Jumlah;
    public long Total;
    public List<(string Nama, long Qty)> Terlaris = new();
    public List<(string Nama, long Stok)> Menipis = new();
}
