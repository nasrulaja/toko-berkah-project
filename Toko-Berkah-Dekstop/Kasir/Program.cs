namespace Kasir;

static class Program
{
    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();
        Db.Init();
        Application.Run(new MainForm());
    }
}
