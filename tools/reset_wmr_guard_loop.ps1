param(
  [string]$RepoRoot = ".",
  [switch]$Run
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function WriteFileUtf8NoBom([string]$path, [string]$content) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $enc)
}

$repo = (Resolve-Path -LiteralPath $RepoRoot).Path
$planRel  = ".\plans\wmr\master_build.generated.md"
$genRel   = ".\tools\generate_wmr_master_build.ps1"
$guardRel = ".\guard_plan_assembler\scripts\plan_guard_wmr.js"

$planAbs  = Join-Path $repo $planRel
$genAbs   = Join-Path $repo $genRel
$guardAbs = Join-Path $repo $guardRel

# --- HARD LOCK (prevents looping even if VS Code / watcher re-invokes) ---
$lockDir = Join-Path $repo ".plan_guard"
New-Item -ItemType Directory -Force $lockDir | Out-Null
$lock = Join-Path $lockDir "wmr_guard_run.lock"

if (Test-Path -LiteralPath $lock) {
  throw "LOOP PREVENTED: lock exists: $lock`nDelete it to run again."
}
Set-Content -LiteralPath $lock -Value ("started " + (Get-Date).ToString("s")) -Encoding UTF8

try {
  # 1) OVERWRITE/NEUTER the scripts that have been looping for you
  $fixScriptRel = ".\tools\fix_wmr_guard_drift.ps1"
  $applyScriptRel = ".\tools\apply_wmr_guard_fixes.ps1"

  $fixAbs = Join-Path $repo $fixScriptRel
  $applyAbs = Join-Path $repo $applyScriptRel

  $safeRunner = @"
param(
  [string]`$RepoRoot = ".",
  [string]`$PlanOut  = ".\plans\wmr\master_build.generated.md",
  [string]`$Generator = ".\tools\generate_wmr_master_build.ps1",
  [string]`$GuardScript = ".\guard_plan_assembler\scripts\plan_guard_wmr.js"
)
Set-StrictMode -Version Latest
`$ErrorActionPreference = "Stop"

`$repo = (Resolve-Path -LiteralPath `$RepoRoot).Path
`$planAbs  = Join-Path `$repo `$PlanOut
`$genAbs   = Join-Path `$repo `$Generator
`$guardAbs = Join-Path `$repo `$GuardScript

Write-Host ""
Write-Host "=== WMR Guard Safe Runner (one pass) ==="
Write-Host "RepoRoot : `$repo"
Write-Host "Gen      : `$genAbs"
Write-Host "PlanOut  : `$planAbs"
Write-Host "Guard    : `$guardAbs"
Write-Host ""

if (!(Test-Path -LiteralPath `$genAbs))   { throw "Generator not found: `$genAbs" }
if (!(Test-Path -LiteralPath `$guardAbs)) { throw "Guard script not found: `$guardAbs" }

Write-Host "=== Step 1: Generate allowlist ==="
& `$genAbs -RepoRoot "." -PlanOut `$PlanOut

if (!(Test-Path -LiteralPath `$planAbs)) { throw "Generated plan not found: `$planAbs" }

Write-Host ""
Write-Host "=== Step 2: Run Plan Guard ==="
& node `$guardAbs --repo "." --plan `$PlanOut --report

Write-Host ""
Write-Host "=== DONE ==="
"@

  WriteFileUtf8NoBom $fixAbs   $safeRunner
  WriteFileUtf8NoBom $applyAbs $safeRunner

  Write-Host "✅ Overwrote:"
  Write-Host "   - $fixScriptRel"
  Write-Host "   - $applyScriptRel"
  Write-Host ""

  # 2) Optional run now
  if ($Run) {
    Write-Host "=== Running safe runner now ==="
    & powershell -NoProfile -ExecutionPolicy Bypass -File $fixAbs -RepoRoot "."
  } else {
    Write-Host "Next run (manual):"
    Write-Host "powershell -NoProfile -ExecutionPolicy Bypass -File $fixScriptRel"
  }
}
finally {
  # IMPORTANT: If you want to prevent *any* re-run until you manually delete the lock, comment this out.
  if (Test-Path -LiteralPath $lock) { Remove-Item -LiteralPath $lock -Force }
}
