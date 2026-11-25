using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace VbClock
{
    internal static class Program
    {
        [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
        private static extern int SetCurrentProcessExplicitAppUserModelID(string appId);

        [STAThread]
        private static void Main()
        {
            try
            {
                SetCurrentProcessExplicitAppUserModelID("VbClock.Desktop.1");
            }
            catch
            {
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }
}
