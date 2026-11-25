using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace VbClock
{
    public sealed class MainForm : Form
    {
        private const string AppTitle = "vbClock";
        private const string VirtualHost = "vbclock.local";

        private readonly WebView2 webView;
        private readonly Label loadingLabel;
        private readonly string stateFile;

        private string currentTheme = "light";
        private string currentAccent = "#0067c0";

        [DllImport("dwmapi.dll", PreserveSig = true)]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

        public MainForm()
        {
            Text = AppTitle;
            StartPosition = FormStartPosition.CenterScreen;
            ClientSize = new Size(1040, 760);
            MinimumSize = new Size(760, 560);
            BackColor = Color.FromArgb(243, 243, 243);
            AutoScaleMode = AutoScaleMode.Dpi;
            DoubleBuffered = true;
            try
            {
                Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            }
            catch
            {
            }

            string appData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "vbClock");
            Directory.CreateDirectory(appData);
            stateFile = Path.Combine(appData, "window.ini");
            LoadWindowState();

            webView = new WebView2();
            webView.Dock = DockStyle.Fill;
            webView.Visible = false;
            webView.DefaultBackgroundColor = BackgroundColorForTheme(currentTheme);
            webView.CreationProperties = new CoreWebView2CreationProperties
            {
                UserDataFolder = Path.Combine(appData, "WebView2")
            };
            webView.CoreWebView2InitializationCompleted += OnWebViewInitialized;
            webView.NavigationCompleted += OnNavigationCompleted;
            webView.WebMessageReceived += OnWebMessageReceived;

            loadingLabel = new Label();
            loadingLabel.Dock = DockStyle.Fill;
            loadingLabel.Text = AppTitle;
            loadingLabel.TextAlign = ContentAlignment.MiddleCenter;
            loadingLabel.Font = new Font("Segoe UI", 22F, FontStyle.Regular);
            loadingLabel.ForeColor = Color.FromArgb(90, 90, 90);
            loadingLabel.BackColor = BackgroundColorForTheme(currentTheme);

            Controls.Add(webView);
            Controls.Add(loadingLabel);
            loadingLabel.BringToFront();
        }

        private static Color BackgroundColorForTheme(string theme)
        {
            return theme == "dark" ? Color.FromArgb(27, 27, 27) : Color.FromArgb(243, 243, 243);
        }

        protected override void OnLoad(EventArgs e)
        {
            base.OnLoad(e);
            ApplyTheme(currentTheme);
            ApplyAccent(currentAccent);
            try
            {
                webView.EnsureCoreWebView2Async(null);
            }
            catch (Exception ex)
            {
                ShowFatal(ex);
            }
        }

        private void OnWebViewInitialized(object sender, CoreWebView2InitializationCompletedEventArgs e)
        {
            if (!e.IsSuccess)
            {
                ShowFatal(e.InitializationException != null
                    ? e.InitializationException
                    : new InvalidOperationException("WebView2 could not start."));
                return;
            }

            CoreWebView2 core = webView.CoreWebView2;
            CoreWebView2Settings settings = core.Settings;
            settings.AreDefaultContextMenusEnabled = false;
            settings.AreDevToolsEnabled = false;
            settings.IsStatusBarEnabled = false;
            settings.IsZoomControlEnabled = false;
            settings.AreBrowserAcceleratorKeysEnabled = false;
            settings.IsPasswordAutosaveEnabled = false;
            settings.IsGeneralAutofillEnabled = false;
            settings.IsSwipeNavigationEnabled = false;

            core.DocumentTitleChanged += OnDocumentTitleChanged;
            core.NewWindowRequested += OnNewWindowRequested;
            core.PermissionRequested += OnPermissionRequested;
            core.ProcessFailed += OnProcessFailed;

            string webRoot = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app");
            string indexPath = Path.Combine(webRoot, "index.html");
            if (!File.Exists(indexPath))
            {
                ShowFatal(new FileNotFoundException(
                    "The application files are missing. Keep the 'app' folder next to vbClock.exe.", indexPath));
                return;
            }

            try
            {
                core.SetVirtualHostNameToFolderMapping(
                    VirtualHost, webRoot, CoreWebView2HostResourceAccessKind.DenyCors);
                core.Navigate("https://" + VirtualHost + "/index.html");
            }
            catch (Exception ex)
            {
                ShowFatal(ex);
            }
        }

        private void OnNavigationCompleted(object sender, CoreWebView2NavigationCompletedEventArgs e)
        {
            if (!e.IsSuccess && e.WebErrorStatus != CoreWebView2WebErrorStatus.OperationCanceled)
            {
                ShowFatal(new InvalidOperationException("The interface could not be loaded (" + e.WebErrorStatus + ")."));
                return;
            }

            loadingLabel.Visible = false;
            webView.Visible = true;
            webView.BringToFront();
        }

        private void OnDocumentTitleChanged(object sender, object e)
        {
            try
            {
                string title = webView.CoreWebView2.DocumentTitle;
                if (!string.IsNullOrEmpty(title))
                {
                    Text = title;
                }
            }
            catch
            {
            }
        }

        private void OnNewWindowRequested(object sender, CoreWebView2NewWindowRequestedEventArgs e)
        {
            e.Handled = true;
            try
            {
                Process.Start(e.Uri);
            }
            catch
            {
            }
        }

        private void OnPermissionRequested(object sender, CoreWebView2PermissionRequestedEventArgs e)
        {
            e.State = CoreWebView2PermissionState.Deny;
        }

        private void OnProcessFailed(object sender, CoreWebView2ProcessFailedEventArgs e)
        {
            if (e.ProcessFailedKind == CoreWebView2ProcessFailedKind.BrowserProcessExited)
            {
                ShowFatal(new InvalidOperationException("The application process stopped unexpectedly."));
            }
        }

        private void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                JavaScriptSerializer serializer = new JavaScriptSerializer();
                Dictionary<string, object> message =
                    serializer.Deserialize<Dictionary<string, object>>(e.WebMessageAsJson);
                if (message == null)
                {
                    return;
                }

                object value;
                if (message.TryGetValue("theme", out value))
                {
                    ApplyTheme(Convert.ToString(value));
                }
                if (message.TryGetValue("accent", out value))
                {
                    ApplyAccent(Convert.ToString(value));
                }
            }
            catch
            {
            }
        }

        private void ApplyTheme(string theme)
        {
            currentTheme = theme == "dark" ? "dark" : "light";
            bool dark = currentTheme == "dark";
            int useDark = dark ? 1 : 0;

            try
            {
                DwmSetWindowAttribute(Handle, 20, ref useDark, sizeof(int));
                DwmSetWindowAttribute(Handle, 19, ref useDark, sizeof(int));
            }
            catch
            {
            }

            Color background = BackgroundColorForTheme(currentTheme);
            BackColor = background;
            if (webView != null)
            {
                webView.DefaultBackgroundColor = background;
            }
            if (loadingLabel != null)
            {
                loadingLabel.BackColor = background;
                loadingLabel.ForeColor = dark ? Color.FromArgb(210, 210, 210) : Color.FromArgb(90, 90, 90);
            }
        }

        private void ApplyAccent(string accent)
        {
            if (string.IsNullOrEmpty(accent) || accent.Length != 7 || accent[0] != '#')
            {
                return;
            }

            int red;
            int green;
            int blue;
            if (!int.TryParse(accent.Substring(1, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture, out red) ||
                !int.TryParse(accent.Substring(3, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture, out green) ||
                !int.TryParse(accent.Substring(5, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture, out blue))
            {
                return;
            }

            currentAccent = accent;
            int colorRef = red | (green << 8) | (blue << 16);
            try
            {
                // DWMWA_BORDER_COLOR — Windows 11 only, harmless elsewhere.
                DwmSetWindowAttribute(Handle, 34, ref colorRef, sizeof(int));
            }
            catch
            {
            }
        }

        private void LoadWindowState()
        {
            try
            {
                if (!File.Exists(stateFile))
                {
                    return;
                }

                Dictionary<string, string> values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                foreach (string line in File.ReadAllLines(stateFile))
                {
                    int split = line.IndexOf('=');
                    if (split > 0)
                    {
                        values[line.Substring(0, split).Trim()] = line.Substring(split + 1).Trim();
                    }
                }

                string raw;
                int x = 0;
                int y = 0;
                int width = 0;
                int height = 0;
                bool hasBounds =
                    values.TryGetValue("x", out raw) && int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out x) &&
                    values.TryGetValue("y", out raw) && int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out y) &&
                    values.TryGetValue("width", out raw) && int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out width) &&
                    values.TryGetValue("height", out raw) && int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out height);

                if (hasBounds && width >= MinimumSize.Width && height >= MinimumSize.Height)
                {
                    Rectangle bounds = new Rectangle(x, y, width, height);
                    if (IsVisibleOnScreen(bounds))
                    {
                        StartPosition = FormStartPosition.Manual;
                        Bounds = bounds;
                    }
                }

                if (values.TryGetValue("maximized", out raw) && raw == "1")
                {
                    WindowState = FormWindowState.Maximized;
                }
                if (values.TryGetValue("theme", out raw) && raw == "dark")
                {
                    currentTheme = "dark";
                }
                if (values.TryGetValue("accent", out raw) && raw.Length == 7 && raw[0] == '#')
                {
                    currentAccent = raw;
                }
            }
            catch
            {
            }
        }

        private static bool IsVisibleOnScreen(Rectangle bounds)
        {
            foreach (Screen screen in Screen.AllScreens)
            {
                Rectangle overlap = Rectangle.Intersect(screen.WorkingArea, bounds);
                if (overlap.Width >= 120 && overlap.Height >= 120)
                {
                    return true;
                }
            }
            return false;
        }

        private void SaveWindowState()
        {
            try
            {
                Rectangle bounds = WindowState == FormWindowState.Normal ? Bounds : RestoreBounds;
                StringBuilder text = new StringBuilder();
                text.AppendLine("x=" + bounds.X.ToString(CultureInfo.InvariantCulture));
                text.AppendLine("y=" + bounds.Y.ToString(CultureInfo.InvariantCulture));
                text.AppendLine("width=" + bounds.Width.ToString(CultureInfo.InvariantCulture));
                text.AppendLine("height=" + bounds.Height.ToString(CultureInfo.InvariantCulture));
                text.AppendLine("maximized=" + (WindowState == FormWindowState.Maximized ? "1" : "0"));
                text.AppendLine("theme=" + currentTheme);
                text.AppendLine("accent=" + currentAccent);
                File.WriteAllText(stateFile, text.ToString());
            }
            catch
            {
            }
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            SaveWindowState();
            base.OnFormClosing(e);
        }

        private void ShowFatal(Exception error)
        {
            string message = "vbClock could not start.\r\n\r\n" + error.Message +
                "\r\n\r\nvbClock uses the Microsoft Edge WebView2 Runtime included with Windows 10 and 11. " +
                "If it is missing, install it from https://developer.microsoft.com/microsoft-edge/webview2/";

            if (loadingLabel != null)
            {
                loadingLabel.Text = "vbClock could not start.\r\n\r\n" + error.Message;
                loadingLabel.Visible = true;
                loadingLabel.BringToFront();
            }
            MessageBox.Show(message, AppTitle, MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
