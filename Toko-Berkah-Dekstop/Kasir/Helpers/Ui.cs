using System.Drawing;

namespace Kasir;

public static class Ui
{
    // Skala ukuran piksel mengikuti DPI layar (125%, 150%, dst.),
    // supaya tata letak tidak dempet di layar beresolusi tinggi.
    public static void Dpi(Form f)
    {
        f.AutoScaleDimensions = new SizeF(96F, 96F);
        f.AutoScaleMode = AutoScaleMode.Dpi;
    }

    // Piksel logis (96 DPI) -> piksel perangkat.
    public static int Px(Control c, int v) => (int)Math.Round(v * c.DeviceDpi / 96.0);

    // Tinggi baris ListView (trik ImageList), setara rowheight Tkinter.
    public static void RowHeight(ListView lv, int px)
    {
        lv.SmallImageList = new ImageList { ImageSize = new Size(1, px) };
    }

    // Lebarkan satu kolom (biasanya "Nama") agar mengisi sisa lebar ListView.
    public static void FitColumn(ListView lv, int kolom)
    {
        int lain = 0;
        for (int i = 0; i < lv.Columns.Count; i++)
            if (i != kolom) lain += lv.Columns[i].Width;
        int sisa = lv.ClientSize.Width - lain - SystemInformation.VerticalScrollBarWidth;
        lv.Columns[kolom].Width = Math.Max(Px(lv, 150), sisa);
    }
}
