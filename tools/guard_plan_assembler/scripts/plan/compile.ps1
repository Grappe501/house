param(
  [string]$RepoRoot = "."
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib/core.ps1")

# Resolve repo root early (canonical absolute path)
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path

$cfgPath = Join-Path $RepoRoot ".plan_guard/config.json"
if (-not (Test-Path -LiteralPath $cfgPath)) { throw "Missing config: $cfgPath" }
$cfg = (Get-Content -LiteralPath $cfgPath -Raw -Encoding UTF8) | ConvertFrom-Json -Depth 50

$masterPath = Join-Path $RepoRoot "plans/master_plan.md"
if (-not (Test-Path -LiteralPath $masterPath)) { throw "Missing: plans/master_plan.md" }
$master = Read-ManifestJsonFromMarkdown -Path $masterPath -StartMarker "---master_manifest---" -EndMarker "---end_master_manifest---"
if ($null -eq $master) { throw "Missing master manifest in plans/master_plan.md" }

# Load phases
$plansDir = Join-Path $RepoRoot "plans"
$phaseFiles = Get-ChildItem -LiteralPath $plansDir -Filter "phase_*.md" | Sort-Object Name
$phases = @()
foreach ($f in $phaseFiles) {
  $m = Read-ManifestJsonFromMarkdown -Path $f.FullName -StartMarker "---phase_manifest---" -EndMarker "---end_phase_manifest---"
  if ($null -eq $m) { throw "Missing phase manifest in $($f.FullName)" }
  $phases += $m
}

# Validate: exactly one ACTIVE (force array semantics)
$active = @($phases | Where-Object { $_.status -eq "ACTIVE" })
if ($active.Count -ne 1) {
  $activeIds = @($active | ForEach-Object { $_.id }) -join ", "
  throw ("Compile failed: expected exactly one ACTIVE phase, found {0}. Active: [{1}]." -f $active.Count, $activeIds)
}

# Load policy manifests
$zonesPath = Join-Path $RepoRoot "policy/zones.md"
$exclPath  = Join-Path $RepoRoot "policy/exclusions.md"
$invPath   = Join-Path $RepoRoot "policy/invariants.md"
$tplPath   = Join-Path $RepoRoot "policy/templates.md"

$zones = Read-ManifestJsonFromMarkdown -Path $zonesPath -StartMarker "---zones_manifest---" -EndMarker "---end_zones_manifest---"
$excl  = Read-ManifestJsonFromMarkdown -Path $exclPath  -StartMarker "---exclusions_manifest---" -EndMarker "---end_exclusions_manifest---"
$inv   = Read-ManifestJsonFromMarkdown -Path $invPath   -StartMarker "---invariants_manifest---" -EndMarker "---end_invariants_manifest---"
$tpl   = Read-ManifestJsonFromMarkdown -Path $tplPath   -StartMarker "---templates_manifest---" -EndMarker "---end_templates_manifest---"

$bundle = [ordered]@{
  build_id = $master.build_id
  version  = $master.version
  phases_order = $master.phases
  master = $master
  phases = $phases
  active_phase_id = $active[0].id
  policy = @{
    zones = $zones
    exclusions = $excl
    invariants = $inv
    templates = $tpl
  }
  generated_at_utc = (Get-Date).ToUniversalTime().ToString("o")
}

$bundlePath = Join-Path $RepoRoot $cfg.bundle_path
Write-JsonFile -Path $bundlePath -Object $bundle

Write-Host "OK: compiled bundle -> $($cfg.bundle_path)"
Write-Host "Active phase: $($bundle.active_phase_id)"
