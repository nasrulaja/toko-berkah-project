using System.Drawing;

namespace Kasir;

public class QtyForm : Form
{
    readonly TextBox e;
    public long Hasil { get; private set; }

    public QtyForm(string nama, long qty)
    {
        Ui.Dpi(this);
        Text = "Ubah Qty";
        ClientSize = new Size(340, 190);
        StartPosition = FormStartPosition.CenterParent;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = MinimizeBox = false;
        ShowInTaskbar = false;
        Font = new Font("Segoe UI", 10.5f);

        var lbl = new Label
        {
            Text = nama,
            AutoSize = false,
            UseMnemonic = false,
            TextAlign = ContentAlignment.MiddleCenter,
            Dock = DockStyle.Top,
            Height = 56,
            Padding = new Padding(10, 10, 10, 0),
        };
        e = new TextBox
        {
            Text = qty.ToString(),
            TextAlign = HorizontalAlignment.Center,
            Font = new Font("Segoe UI", 14f),
            Width = 130,
        };
        e.Location = new Point((ClientSize.Width - e.Width) / 2, 66);
        var ok = new Button { Text = "OK", Width = 100, Height = 36 };
        ok.Location = new Point((ClientSize.Width - ok.Width) / 2, 126);
        ok.Click += (s, a) => Simpan();
        e.KeyDown += (s, a) =>
        {
            if (a.KeyCode == Keys.Enter) { a.SuppressKeyPress = true; Simpan(); }
        };
        Controls.Add(lbl);
        Controls.Add(e);
        Controls.Add(ok);
        Shown += (s, a) => { e.Focus(); e.SelectAll(); };
    }

    void Simpan()
    {
        Hasil = Db.ToInt(e.Text);
        DialogResult = DialogResult.OK;
    }
}
