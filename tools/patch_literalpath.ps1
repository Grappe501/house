param([string]$RepoRoot = ".")

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repo = (Resolve-Path $RepoRoot).Path

$files = @(
  (Join-Path -Path $repo -ChildPath "tools\generate_wmr_master_build.ps1"),
  (Join-Path -Path $repo -ChildPath "tools\repair_wmr_and_run.ps1"),
  (Join-Path -Path $repo -ChildPath "tools\fix_wmr_guard_drift.ps1"),
  (Join-Path -Path $repo -ChildPath "tools\apply_wmr_guard_fixes.ps1")
)

foreach ($f in $files) {
  if (!(Test-Path -Path $f)) { continue }

  # Avoid -Raw for max compatibility
  $txt = (Get-Content -Path $f -Encoding UTF8) -join "`r`n"

  # Replace New-Item -LiteralPath with -Path
  $txt = $txt -replace '(?m)\bNew-Item\b([^\r\n]*?)\s\-LiteralPath\b', 'New-Item$1 -Path'

  # Replace Resolve-Path -LiteralPath with Resolve-Path
  $txt = $txt -replace '(?m)\bResolve-Path\s+\-LiteralPath\b', 'Resolve-Path'

  Set-Content -Path $f -Encoding UTF8 -Value $txt
  Write-Host ("Patched: " + $f)
}

Write-Host "OK. Now rerun:"
Write-Host "powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\repair_wmr_and_run.ps1"
