param(
  [Parameter(Mandatory = $true)]
  [string]$VaultPath = "C:\repos\frontend-workshop\.wiki\.obsidian\plugins",
  [string]$PluginId = "azure-devops-mermaid",
  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[info] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Warning $msg }
function Write-Err ($msg) { Write-Host "[error] $msg" -ForegroundColor Red }

# Resolve repo root assuming scripts/ sits under the repo
$RepoRoot = Split-Path -Parent $PSScriptRoot
$SourceManifest = Join-Path $RepoRoot "manifest.json"
$SourceMain     = Join-Path $RepoRoot "main.js"

if (!(Test-Path $SourceManifest)) { Write-Err "manifest.json not found at $SourceManifest"; exit 1 }
if (!(Test-Path $SourceMain))     { Write-Err "main.js not found at $SourceMain. Run 'npm run build' first."; exit 1 }

$PluginsRoot = Join-Path $VaultPath ".obsidian\plugins"
$TargetDir   = Join-Path $PluginsRoot $PluginId

# Ensure directories
if (!(Test-Path $PluginsRoot)) {
  Write-Info "Creating plugins root: $PluginsRoot"
  New-Item -ItemType Directory -Path $PluginsRoot -Force | Out-Null
}

if (Test-Path $TargetDir) {
  if ($Force) {
    Write-Info "Removing existing plugin directory: $TargetDir"
    Remove-Item -Path $TargetDir -Recurse -Force
  } else {
    Write-Info "Plugin directory already exists: $TargetDir"
  }
}

if (!(Test-Path $TargetDir)) {
  New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

function New-OrReplaceSymlink {
  param(
    [string]$LinkPath,
    [string]$TargetPath
  )
  if (Test-Path $LinkPath -PathType Any) {
    Remove-Item -Path $LinkPath -Force
  }
  New-Item -ItemType SymbolicLink -Path $LinkPath -Target $TargetPath -Force | Out-Null
}

$SymlinkSucceeded = $true
try {
  Write-Info "Creating file symlinks in $TargetDir"
  New-OrReplaceSymlink -LinkPath (Join-Path $TargetDir "manifest.json") -TargetPath $SourceManifest
  New-OrReplaceSymlink -LinkPath (Join-Path $TargetDir "main.js")       -TargetPath $SourceMain
}
catch {
  Write-Warn "Symlink creation failed (Dev Mode off or insufficient rights). Falling back to directory junction. Details: $($_.Exception.Message)"
  $SymlinkSucceeded = $false
}

if (-not $SymlinkSucceeded) {
  # Fallback: create a directory junction from plugin folder to repo root
  if (Test-Path $TargetDir) {
    Remove-Item -Path $TargetDir -Recurse -Force
  }
  Write-Info "Creating directory junction: $TargetDir -> $RepoRoot"
  cmd /c "mklink /J \"$TargetDir\" \"$RepoRoot\"" | Out-Null
}

Write-Host "\nAll set! In Obsidian:" -ForegroundColor Green
Write-Host "- Disable Safe mode, then enable the plugin: $PluginId" -ForegroundColor Green
Write-Host "- Toggle plugin off/on after rebuilds, or reload app to refresh" -ForegroundColor Green
