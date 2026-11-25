# Generates assets/vbclock.ico — a simple clock face on a Windows-blue tile.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outFile = Join-Path $root 'assets\vbclock.ico'
New-Item -ItemType Directory -Force -Path (Split-Path $outFile) | Out-Null

function New-ClockPng([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $s = $size / 256.0

    # Rounded blue tile
    $pad = 6 * $s
    $radius = 56 * $s
    $rect = New-Object System.Drawing.RectangleF $pad, $pad, ($size - 2 * $pad), ($size - 2 * $pad)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radius * 2
    $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
    $path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
    $path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(0, 103, 192))
    $g.FillPath($brush, $path)

    # White ring
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), (12 * $s)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawEllipse($pen, (54 * $s), (54 * $s), (148 * $s), (148 * $s))

    # Hands (12 and 3 o'clock)
    $center = New-Object System.Drawing.PointF (128 * $s), (128 * $s)
    $hourEnd = New-Object System.Drawing.PointF (128 * $s), (78 * $s)
    $minuteEnd = New-Object System.Drawing.PointF (174 * $s), (128 * $s)
    $hourPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), (13 * $s)
    $hourPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $hourPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $minutePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), (10 * $s)
    $minutePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $minutePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($hourPen, $center, $hourEnd)
    $g.DrawLine($minutePen, $center, $minuteEnd)

    # Centre pin
    $pinBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $g.FillEllipse($pinBrush, (118 * $s), (118 * $s), (20 * $s), (20 * $s))

    $g.Dispose()
    $stream = New-Object System.IO.MemoryStream
    $bmp.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    return ,$stream.ToArray()
}

$sizes = @(16, 24, 32, 48, 64, 128, 256)
$images = @()
foreach ($size in $sizes) {
    $images += ,(New-ClockPng $size)
}

$fs = New-Object System.IO.FileStream $outFile, ([System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
    $size = $sizes[$i]
    $bytes = $images[$i]
    $sizeByte = if ($size -ge 256) { 0 } else { $size }
    $bw.Write([byte]$sizeByte)
    $bw.Write([byte]$sizeByte)
    $bw.Write([byte]0)
    $bw.Write([byte]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]32)
    $bw.Write([uint32]$bytes.Length)
    $bw.Write([uint32]$offset)
    $offset += $bytes.Length
}
foreach ($bytes in $images) { $bw.Write($bytes) }
$bw.Flush()
$bw.Close()
$fs.Close()

Write-Output "Wrote $outFile"
