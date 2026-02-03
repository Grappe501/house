param(
  [string]$RepoRoot = "."
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib/core.ps1")

$cfg = (Get-Content -LiteralPath (Join-Path $RepoRoot ".plan_guard/config.json") -Raw -Encoding UTF8) | ConvertFrom-Json -Depth 50
$bundlePath = Join-Path $RepoRoot $cfg.bundle_path
if (-not (Test-Path $bundlePath)) { throw "Missing bundle. Run compile first." }
$bundle = (Get-Content -LiteralPath $bundlePath -Raw -Encoding UTF8) | ConvertFrom-Json -Depth 80

$active = ($bundle.phases | Where-Object { $_.id -eq $bundle.active_phase_id })
if ($null -eq $active) { throw "Active phase not found: $($bundle.active_phase_id)" }

$exclude = @($bundle.policy.exclusions.exclude)
$zones = $bundle.policy.zones.zones
$protectedGlobs = @($zones.PROTECTED)

$baselinePath = Join-Path (Join-Path $RepoRoot $cfg.baseline_dir) ("{0}.json" -f $bundle.active_phase_id)
if (-not (Test-Path $baselinePath)) { throw "Missing baseline for active phase. Run assemble first." }
$baseline = (Get-Content -LiteralPath $baselinePath -Raw -Encoding UTF8) | ConvertFrom-Json -Depth 80

# Build current file index (not excluded)
$currentIndex = @{}
Get-ChildItem -LiteralPath $RepoRoot -Recurse -File | ForEach-Object {
  $rel = Normalize-PathForBundle ($_.FullName.Substring((Resolve-Path $RepoRoot).Path.Length).TrimStart("\","/"))
  if ($rel -eq "" -or $rel.StartsWith(".git/")) { return }
  if (Any-GlobMatch -Path $rel -Globs $exclude) { return }
  $currentIndex[$rel] = [ordered]@{
    path = $rel
    length = $_.Length
    sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash
  }
}

# Baseline index
$baseIndex = @{}
foreach ($f in $baseline.files) { $baseIndex[$f.path] = $f }

# Compute changed/new/deleted relative to baseline
$changed = @()
$newFiles = @()
$deleted = @()

foreach ($k in $currentIndex.Keys) {
  if (-not $baseIndex.ContainsKey($k)) { $newFiles += $k; continue }
  if ($currentIndex[$k].sha256 -ne $baseIndex[$k].sha256) { $changed += $k }
}
foreach ($k in $baseIndex.Keys) {
  if (-not $currentIndex.ContainsKey($k)) { $deleted += $k }
}

# Helper: classify violations
$violations = @()

# 1) must_exist
foreach ($p in $active.inventory.must_exist) {
  $abs = Join-Path $RepoRoot ($p -replace "/","\")
  if (-not (Test-Path $abs)) {
    $violations += [ordered]@{ code="MISSING_REQUIRED"; path=$p; message="Required by inventory.must_exist but not found." }
  }
}

# 2) PROTECTED changes (changed OR deleted OR new inside protected)
$touches = @($changed + $deleted + $newFiles) | Select-Object -Unique
foreach ($p in $touches) {
  if (Any-GlobMatch -Path $p -Globs $protectedGlobs) {
    $violations += [ordered]@{ code="PROTECTED_TOUCHED"; path=$p; message="Touched a PROTECTED zone since baseline." }
  }
}

# 3) Allowed roots for any touched file (ignore GENERATED/build by exclusions already; build/** excluded)
$allowedRoots = @($active.guard.allowed_roots)
foreach ($p in $touches) {
  $ok = $false
  foreach ($r in $allowedRoots) {
    $root = Normalize-PathForBundle $r
    if ($p.StartsWith($root)) { $ok = $true; break }
  }
  if (-not $ok) {
    $violations += [ordered]@{ code="OUTSIDE_ALLOWED_ROOTS"; path=$p; message="Touched file outside active guard.allowed_roots." }
  }
}

# 4) Forbidden patterns touched
$forbidden = @($active.guard.forbidden_patterns)
foreach ($p in $touches) {
  if (Any-GlobMatch -Path $p -Globs $forbidden) {
    $violations += [ordered]@{ code="FORBIDDEN_TOUCHED"; path=$p; message="Touched file matching forbidden_patterns." }
  }
}

# Compose report
$pass = ($violations.Count -eq 0)
$report = [ordered]@{
  build_id = $bundle.build_id
  active_phase_id = $bundle.active_phase_id
  baseline = Normalize-PathForBundle $baselinePath.Substring((Resolve-Path $RepoRoot).Path.Length).TrimStart("\","/")
  generated_at_utc = (Get-Date).ToUniversalTime().ToString("o")
  summary = [ordered]@{
    pass = $pass
    changed = $changed.Count
    new = $newFiles.Count
    deleted = $deleted.Count
    violations = $violations.Count
  }
  details = [ordered]@{
    changed = $changed
    new = $newFiles
    deleted = $deleted
    violations = $violations
  }
}

# Write reports always
Write-JsonFile -Path (Join-Path $RepoRoot $cfg.reports.json) -Object $report

$md = @()
$md += "# Plan Guard Report"
$md += ""
$md += ("- Build: **{0}**" -f $report.build_id)
$md += ("- Active Phase: **{0}**" -f $report.active_phase_id)
$md += ("- Pass: **{0}**" -f $report.summary.pass)
$md += ("- Changed: {0}, New: {1}, Deleted: {2}" -f $report.summary.changed, $report.summary.new, $report.summary.deleted)
$md += ("- Violations: {0}" -f $report.summary.violations)
$md += ""

if ($violations.Count -gt 0) {
  $md += "## Violations"
  foreach ($v in $violations) {
    $c = $v["code"]
    $p = $v["path"]
    $m = $v["message"]
    $md += ("- **{0}** — {1} — {2}" -f $c, $p, $m)
  }
  $md += ""
  $md += "## Resolution Path"
  $md += "If the file is acceptable but off-plan: add a matching pattern to policy/exclusions.md (or update allowed_roots / inventory)."
  $md += "If the file should not exist/change: revert it to baseline state."
  $md += "If the guard is wrong: update the plan/policy and re-run compile → assemble → guard."
} else {
  $md += "## Status"
  $md += "No violations detected."
}

Write-TextFile -Path (Join-Path $RepoRoot $cfg.reports.md) -Text ($md -join "`n")

if ($pass) {
  Write-Host "PASS: plan guard"
  exit 0
} else {
  Write-Host "BLOCKED: plan guard (see reports)"
  exit 1
}