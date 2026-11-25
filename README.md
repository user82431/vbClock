# vbClock

**vbClock** is a lightweight and minimal clock app.Inspired by the simplicity of the Windows Clock, but built to let you make practically everything your own.

It runs in its own native window using Microsoft Edge WebView2 (included with Windows 10/11).

## Features

- **Analog clock** — clean, readable face with customizable hands, numerals, ticks, ring, size, and second-hand behavior.
- **Country / time zone clock** — follow local time, pick from curated world time zones, or set a custom UTC offset.
- **Digital time & date** — optional digital readout with 12/24-hour format and date display.
- **Alarms** — create alarms with labels, repeat days, per-alarm sounds, snooze, and a ringing overlay.
- **Timer** — countdown timer with presets, progress ring, pause/resume/reset, and completion alert.
- **Settings** — customize practically everything:
  - Appearance: light/dark theme, accent color, background, font, corner roundness, density, reduced motion
  - Clock face: time zone, custom UTC offset, clock size, hand style, numerals, ticks, outer ring, seconds/smooth sweep, 24-hour time, digital/date toggles, second-hand color, audible ticking
  - Alarms & sound: default alarm sound, volume, snooze length
  - Timer: default length, timer sound
  - Data: export/import backup, reset all
- **Light by default, dark optional** — light mode is the regular experience; dark mode is one click away.
- **Lexend by default** — the app uses the bundled Lexend font for a clean, modern look.

## Run the app

### Option 1: Run the built desktop app (Windows)

1. Make sure the following are in the same folder:
   - `vbClock.exe`
   - `Microsoft.Web.WebView2.Core.dll`
   - `Microsoft.Web.WebView2.WinForms.dll`
   - `WebView2Loader.dll`
   - `app/` (contains the app UI, scripts, styles, and fonts)
2. Double-click `vbClock.exe`.

> vbClock uses the Microsoft Edge WebView2 Runtime. It is already included with most Windows 10/11 systems. If needed, install it from [Microsoft Edge WebView2](https://developer.microsoft.com/microsoft-edge/webview2/).

### Option 2: Build from source (Windows)

No Node/npm/.NET SDK required. The build uses the Windows C# compiler already present on most Windows machines.

From PowerShell in the project folder:

```powershell
pwsh -NoProfile -File .\build.ps1
```

The script will:
- generate the app icon if needed
- download the WebView2 SDK NuGet package into `.build/` if missing
- compile `vbClock.exe`

Then run:

```powershell
.\vbClock.exe
```

## Project structure

```text
vbClock/
├── app/                    # App UI (loaded by the desktop shell)
│   ├── fonts/              # Bundled Lexend font files
│   ├── js/                 # App logic
│   │   ├── data.js         # Defaults, constants, helpers
│   │   ├── sounds.js       # Web Audio sound engine
│   │   ├── clock.js        # Clock, time zones, settings state
│   │   ├── alarms.js       # Alarms and ringing overlay
│   │   ├── timer.js        # Countdown timer
│   │   ├── settings.js     # Schema-driven settings UI
│   │   └── main.js         # Navigation/startup
│   ├── index.html          # App markup
│   └── styles.css          # App styling
├── assets/
│   └── vbclock.ico         # Desktop app icon
├── src/                    # Native Windows shell (C# / WebView2)
│   ├── AssemblyInfo.cs
│   ├── MainForm.cs
│   ├── Program.cs
│   └── app.manifest
├── tools/
│   └── make-icon.ps1       # Icon generator
├── build.ps1               # Desktop app build script
├── vbClock.exe             # Built desktop app (after build)
└── README.md
```

## Notes

- Settings and alarms are stored locally in the app’s WebView2 user data / browser storage.
- Alarm/timer sounds are generated with Web Audio (no external audio files).
- The desktop shell saves window size/position/theme locally in `%LOCALAPPDATA%\vbClock\`.
- Export/Import in Settings creates a JSON backup of your settings and alarms.

## License

MIT License.
