# Builds vbClock.exe — no SDK or npm required.
# Uses the C# compiler shipped with Windows and the WebView2 SDK from NuGet.
$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$version = '1.0.4370.26'
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$libDir = Join-Path $root 'lib'
$icon = Join-Path $root 'assets\vbclock.ico'
$manifest = Join-Path $root 'src\app.manifest'
$exe = Join-Path $root 'vbClock.exe'

if (-not (Test-Path $csc)) {
    throw "C# compiler not found at $csc"
}
if (-not (Test-Path (Join-Path $root 'app\index.html'))) {
    throw "app\index.html is missing."
}
if (-not (Test-Path $icon)) {
    & (Join-Path $root 'tools\make-icon.ps1')
}

New-Item -ItemType Directory -Force -Path $libDir | Out-Null

$coreDll = Join-Path $libDir 'Microsoft.Web.WebView2.Core.dll'
$formsDll = Join-Path $libDir 'Microsoft.Web.WebView2.WinForms.dll'
$loaderDll = Join-Path $libDir 'WebView2Loader.dll'

if (-not (Test-Path $coreDll) -or -not (Test-Path $formsDll) -or -not (Test-Path $loaderDll)) {
    Write-Output 'Fetching the WebView2 SDK...'
    $buildDir = Join-Path $root '.build'
    $package = Join-Path $buildDir 'webview2.zip'
    $expanded = Join-Path $buildDir 'webview2'
    New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

    if (-not (Test-Path $package)) {
        $url = "https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/$version/microsoft.web.webview2.$version.nupkg"
        Invoke-WebRequest -Uri $url -OutFile $package -UseBasicParsing -TimeoutSec 180
    }
    if (-not (Test-Path $expanded)) {
        Expand-Archive -Path $package -DestinationPath $expanded -Force
    }

    Copy-Item (Join-Path $expanded 'lib\net462\Microsoft.Web.WebView2.Core.dll') $coreDll -Force
    Copy-Item (Join-Path $expanded 'lib\net462\Microsoft.Web.WebView2.WinForms.dll') $formsDll -Force
    Copy-Item (Join-Path $expanded 'runtimes\win-x64\native\WebView2Loader.dll') $loaderDll -Force
}

# Runtime DLLs must sit next to the exe.
Copy-Item $coreDll (Join-Path $root 'Microsoft.Web.WebView2.Core.dll') -Force
Copy-Item $formsDll (Join-Path $root 'Microsoft.Web.WebView2.WinForms.dll') -Force
Copy-Item $loaderDll (Join-Path $root 'WebView2Loader.dll') -Force

$sources = Get-ChildItem (Join-Path $root 'src\*.cs') | ForEach-Object { $_.FullName }
$framework = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'

$arguments = @(
    '/nologo',
    '/target:winexe',
    '/platform:x64',
    '/optimize+',
    '/nowarn:1701,1702',
    "/out:$exe",
    "/win32icon:$icon",
    "/win32manifest:$manifest",
    '/reference:System.dll',
    '/reference:System.Core.dll',
    '/reference:System.Drawing.dll',
    '/reference:System.Windows.Forms.dll',
    "/reference:$(Join-Path $framework 'System.Web.Extensions.dll')",
    "/reference:$(Join-Path $root 'Microsoft.Web.WebView2.Core.dll')",
    "/reference:$(Join-Path $root 'Microsoft.Web.WebView2.WinForms.dll')"
) + $sources

& $csc $arguments
if ($LASTEXITCODE -ne 0) {
    throw "Compilation failed with exit code $LASTEXITCODE"
}

Write-Output ''
Write-Output "Built $exe"
Write-Output "Run it with:  .\vbClock.exe"
