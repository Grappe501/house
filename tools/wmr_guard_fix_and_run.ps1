param(
  [string]$RepoRoot = ".",
  [string]$PlanOut  = ".\plans\wmr\master_build.generated.md",
  [string]$GeneratorRel = ".\tools\generate_wmr_master_build.ps1",
  [string]$GuardRel     = ".\guard_plan_assembler\scripts\plan_guard_wmr.js"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function WriteUtf8NoBom([string]$Path, [string]$Content) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

$repo = (Resolve-Path -Path $RepoRoot).Path
$genAbs   = Join-Path $repo $GeneratorRel
$planAbs  = Join-Path $repo $PlanOut
$guardAbs = Join-Path $repo $GuardRel

Write-Host "RepoRoot : $repo"
Write-Host "Gen      : $genAbs"
Write-Host "Plan     : $planAbs"
Write-Host "Guard    : $guardAbs"
Write-Host ""

if (!(Test-Path -Path $genAbs))   { throw "Generator not found: $genAbs" }
if (!(Test-Path -Path $guardAbs)) { throw "Guard script not found: $guardAbs" }

# --- Patch generator in-place (idempotent) ---
Write-Host "=== Patching generator for Windows PowerShell + no .plan_guard watch ==="

$genTxt = Get-Content -Path $genAbs -Raw -Encoding UTF8

# 1) Ensure New-Item uses -Path (Windows PowerShell doesn't support -LiteralPath on New-Item)
$genTxt = $genTxt -replace '(?m)^\s*New-Item\s+-ItemType\s+Directory\s+-Force\s+-LiteralPath\s+\$outDir\s*\|\s*Out-Null\s*$', 'New-Item -ItemType Directory -Force -Path $outDir | Out-Null'

# 2) Ensure Resolve-Path uses -Path (safe for Windows PowerShell)
$genTxt = $genTxt -replace '(?m)\(Resolve-Path\s+-LiteralPath\s+\$RepoRoot\)\.Path', '(Resolve-Path -Path $RepoRoot).Path'
$genTxt = $genTxt -replace '(?m)\(Resolve-Path\s+\$RepoRoot\)\.Path', '(Resolve-Path -Path $RepoRoot).Path'

# 3) CRITICAL: remove ".plan_guard" from watched roots to eliminate drift from manifest/config
# Supports either single-line or multi-line array formatting.
$genTxt = [regex]::Replace(
  $genTxt,
  '(?ms)\$roots\s*=\s*@\((.*?)\)',
  {
    param($m)
    $inner = $m.Groups[1].Value
    # Remove ".plan_guard" entries with surrounding quotes/comma/space
    $inner2 = $inner `
      -replace '(?i)\s*,?\s*["'']\.plan_guard["'']\s*,?\s*', { param($x) 
        # If we removed a middle element, leave a comma when needed; easiest is normalize later
        " "
      }

    # Normalize commas/spaces inside @(...)
    $inner2 = ($inner2 -replace '\s+', ' ').Trim()
    $inner2 = $inner2 -replace '\s*,\s*', ', '
    $inner2 = $inner2.Trim(',',' ')

    return '$roots = @(' + $inner2 + ')'
  },
  1
)

# 4) If generator had the "watched roots" array as @("a","b",...) keep it too
$genTxt = [regex]::Replace(
  $genTxt,
  '(?ms)\$roots\s*=\s*@\[(.*?)\]',
  { param($m) return $m.Value }, # no-op (rare)
  1
)

# 5) Ensure generator isn't adding .plan_guard/ as a root directory entry anywhere else
# If your script manually adds roots to $paths, that loop stays fine; it won't include .plan_guard now.
# Also ensure any hard-coded watched root list doesn't include .plan_guard
$genTxt = $genTxt -replace '(?i)"\.plan_guard"\s*,\s*', ''
$genTxt = $genTxt -replace '(?i),\s*"\.plan_guard"\s*', ''
$genTxt = $genTxt -replace '(?i)"\.plan_guard"\s*', ''

WriteUtf8NoBom $genAbs $genTxt
Write-Host "OK patched generator."
Write-Host ""

# --- Step 1: Generate allowlist once ---
Write-Host "=== Step 1: Generate allowlist ==="
& powershell -NoProfile -ExecutionPolicy Bypass -File $genAbs -RepoRoot "." -PlanOut $PlanOut

if (!(Test-Path -Path $planAbs)) { throw "Generated plan missing: $planAbs" }

Write-Host ""
Write-Host "=== Step 2: Run Plan Guard ==="

# IMPORTANT: call node with arguments as separate tokens (avoids 'bad option --repo' issues)
& node $guardAbs "--repo" "." "--plan" $PlanOut "--report"

Write-Host ""
Write-Host "=== DONE ==="
