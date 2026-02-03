param(
  [string]$RepoRoot    = ".",
  [string]$Generator   = ".\tools\generate_wmr_master_build.ps1",
  [string]$PlanOut     = ".\plans\wmr\master_build.generated.md",
  [string]$GuardScript = ".\guard_plan_assembler\scripts\plan_guard_wmr.js"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repo     = (Resolve-Path -LiteralPath $RepoRoot).Path
$genAbs   = Join-Path $repo $Generator
$planAbs  = Join-Path $repo $PlanOut
$guardAbs = Join-Path $repo $GuardScript

if (!(Test-Path -LiteralPath $genAbs))   { throw "Generator not found: $genAbs" }
if (!(Test-Path -LiteralPath $guardAbs)) { throw "Guard script not found: $guardAbs" }

Write-Host ""
Write-Host "=== Regenerating allowlist plan ==="
Write-Host "RepoRoot  : $repo"
Write-Host "Generator : $genAbs"
Write-Host "PlanOut   : $planAbs"
Write-Host "Guard     : $guardAbs"
Write-Host ""

# IMPORTANT: call the generator script directly in-process (no recursion)
& $genAbs -RepoRoot "." -PlanOut $PlanOut

if (!(Test-Path -LiteralPath $planAbs)) {
  throw "Generated plan not found: $planAbs"
}

Write-Host ""
Write-Host "=== Running Plan Guard report ==="
Write-Host ""

# IMPORTANT: call node with explicit args
node $guardAbs --repo "." --plan $PlanOut --report
