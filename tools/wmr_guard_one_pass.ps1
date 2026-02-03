param(
  [string]$RepoRoot = "."
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Say([string]$msg) { Write-Host $msg }

$repo = (Resolve-Path -Path $RepoRoot).Path

$genAbs   = Join-Path $repo "tools\generate_wmr_master_build.ps1"
$planRel  = "plans\wmr\master_build.generated.md"
$planAbs  = Join-Path $repo $planRel
$guardAbs = Join-Path $repo "guard_plan_assembler\scripts\plan_guard_wmr.js"

Say "RepoRoot : $repo"
Say "Gen      : $genAbs"
Say "Plan     : $planAbs"
Say "Guard    : $guardAbs"
Say ""

if (!(Test-Path -Path $genAbs))   { throw "Missing generator: $genAbs" }
if (!(Test-Path -Path $guardAbs)) { throw "Missing guard script: $guardAbs" }

Say "=== Step 1: Generate allowlist ==="
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $genAbs -RepoRoot "." -PlanOut (".\" + $planRel)

if (!(Test-Path -Path $planAbs)) { throw "Generated plan missing: $planAbs" }

Say ""
Say "=== Step 2: Run Plan Guard ==="
# IMPORTANT: node must receive the JS file path FIRST, then args
& node $guardAbs --repo "." --plan (".\" + $planRel) --report

Say ""
Say "=== DONE ==="
exit 0
