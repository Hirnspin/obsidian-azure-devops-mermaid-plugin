param(
  [Parameter(Mandatory = $true)]
  [string]$VaultPath,
  [string]$PluginId = "azure-devops-mermaid"
)

$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[info] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Warning $msg }
function Write-Err ($msg) { Write-Host "[error] $msg" -ForegroundColor Red }

$PluginsRoot = Join-Path $VaultPath ".obsidian\plugins"
$TargetDir   = Join-Path $PluginsRoot $PluginId

if (!(Test-Path $PluginsRoot)) { Write-Err "Plugins root not found: $PluginsRoot"; exit 1 }
if (!(Test-Path $TargetDir))   { Write-Info "Plugin path does not exist: $TargetDir"; exit 0 }

# Helper to check reparse point
function Is-ReparsePoint($path) {
  try {
    $item = Get-Item -LiteralPath $path -Force -ErrorAction Stop
    return ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)
  } catch { return $false }
}

# If the plugin path itself is a junction/symlink dir, just remove it
if (Is-ReparsePoint $TargetDir) {
  Write-Info "Removing junction/symlink directory: $TargetDir"
  Remove-Item -LiteralPath $TargetDir -Force
  Write-Host "Removed: $TargetDir" -ForegroundColor Green
  exit 0
}

# Otherwise remove file links inside the directory if present
$ManifestPath = Join-Path $TargetDir "manifest.json"
$MainPath     = Join-Path $TargetDir "main.js"

if (Test-Path $ManifestPath) {
  if (Is-ReparsePoint $ManifestPath) {
    Write-Info "Removing file symlink: $ManifestPath"
    Remove-Item -LiteralPath $ManifestPath -Force
  } else {
    Write-Warn "manifest.json is a regular file; leaving it in place"
  }
}

if (Test-Path $MainPath) {
  if (Is-ReparsePoint $MainPath) {
    Write-Info "Removing file symlink: $MainPath"
    Remove-Item -LiteralPath $MainPath -Force
  } else {
    Write-Warn "main.js is a regular file; leaving it in place"
  }
}

# Remove plugin directory if now empty
try {
  if ((Get-ChildItem -LiteralPath $TargetDir -Force | Measure-Object).Count -eq 0) {
    Write-Info "Removing empty plugin directory: $TargetDir"
    Remove-Item -LiteralPath $TargetDir -Force
  }
} catch {}

Write-Host "Unlink complete for $TargetDir" -ForegroundColor Green
