param(
  [string]$RepoRoot = ".",
  [string]$PlanOut  = ".\plans\wmr\master_build.generated.md",
  [string]$Generator = ".\tools\generate_wmr_master_build.ps1",
  [string]$GuardScript = ".\guard_plan_assembler\scripts\plan_guard_wmr.js"
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repo = (Resolve-Path -LiteralPath $RepoRoot).Path
$planAbs  = Join-Path $repo $PlanOut
$genAbs   = Join-Path $repo $Generator
$guardAbs = Join-Path $repo $GuardScript

Write-Host ""
Write-Host "=== WMR Guard Safe Runner (one pass) ==="
Write-Host "RepoRoot : $repo"
Write-Host "Gen      : $genAbs"
Write-Host "PlanOut  : $planAbs"
Write-Host "Guard    : $guardAbs"
Write-Host ""

if (!(Test-Path -LiteralPath $genAbs))   { throw "Generator not found: $genAbs" }
if (!(Test-Path -LiteralPath $guardAbs)) { throw "Guard script not found: $guardAbs" }

Write-Host "=== Step 1: Generate allowlist ==="
& $genAbs -RepoRoot "." -PlanOut $PlanOut

if (!(Test-Path -LiteralPath $planAbs)) { throw "Generated plan not found: $planAbs" }

Write-Host ""
Write-Host "=== Step 2: Run Plan Guard ==="
& node $guardAbs --repo "." --plan $PlanOut --report

Write-Host ""
Write-Host "=== DONE ==="