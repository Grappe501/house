param(
  [string]$RepoRoot = ".",
  [string]$Generator = ".\tools\generate_wmr_master_build.ps1",
  [string]$PlanOut = ".\plans\wmr\master_build.generated.md",
  [string]$GuardScript = ".\guard_plan_assembler\scripts\plan_guard_wmr.js"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---- hard lock (prevents ANY loop) ----
$repo = (Resolve-Path -LiteralPath $RepoRoot).Path
$lockDir = Join-Path $repo ".plan_guard"
New-Item -ItemType Directory -Force $lockDir | Out-Null
$lock = Join-Path $lockDir "wmr_guard_one_shot.lock"

if (Test-Path -LiteralPath $lock) {
  throw "LOCK EXISTS (loop prevention): $lock`nDelete it to run again."
}

# Create lock immediately
Set-Content -LiteralPath $lock -Value ("started " + (Get-Date).ToString("s")) -Encoding UTF8

try {
  $genAbs   = Join-Path $repo $Generator
  $planAbs  = Join-Path $repo $PlanOut
  $guardAbs = Join-Path $repo $GuardScript

  Write-Host ""
  Write-Host "=== WMR One-Shot Runner ==="
  Write-Host "RepoRoot : $repo"
  Write-Host "Gen      : $genAbs"
  Write-Host "PlanOut  : $planAbs"
  Write-Host "Guard    : $guardAbs"
  Write-Host ""

  if (!(Test-Path -LiteralPath $genAbs))   { throw "Generator not found: $genAbs" }
  if (!(Test-Path -LiteralPath $guardAbs)) { throw "Guard script not found: $guardAbs" }

  Write-Host "=== Step 1: Generate allowlist ==="
  # Call generator IN-PROCESS (no powershell.exe spawning)
  & $genAbs -RepoRoot "." -PlanOut $PlanOut

  if (!(Test-Path -LiteralPath $planAbs)) { throw "Generated plan not found: $planAbs" }

  Write-Host ""
  Write-Host "=== Step 2: Run Plan Guard ==="
  & node $guardAbs --repo "." --plan $PlanOut --report

  Write-Host ""
  Write-Host "=== DONE ==="
}
finally {
  # Remove lock so it can run again (comment this out if you want a “crash lock”)
  if (Test-Path -LiteralPath $lock) { Remove-Item -LiteralPath $lock -Force }
}
