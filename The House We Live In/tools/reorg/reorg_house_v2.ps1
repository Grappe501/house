param(
  [Parameter(Mandatory = $true)]
  [string]$Root,
  [switch]$Apply
)

$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$Root = (Resolve-Path $Root).Path

$Reports   = Join-Path $Root "_reports"
$Archive   = Join-Path $Root "_archive"
$Conflicts = Join-Path $Root "_conflicts"

function Ensure-Dir($p) {
  if (!(Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null }
}

function Safe-Move($src, $dst) {
  if (!(Test-Path $src)) { return $null }

  if (Test-Path $dst) {
    Ensure-Dir $Conflicts
    $leaf = Split-Path $src -Leaf
    $conf = Join-Path $Conflicts ("$ts" + "__" + $leaf)
    if ($Apply) { Move-Item $src $conf }
    return @{ action="CONFLICT"; from=$src; to=$conf }
  } else {
    Ensure-Dir (Split-Path $dst)
    if ($Apply) { Move-Item $src $dst }
    return @{ action="MOVE"; from=$src; to=$dst }
  }
}

Ensure-Dir $Reports
Ensure-Dir $Archive

Write-Host "=== HOUSE REORG V2 ==="
Write-Host "Root: $Root"
Write-Host ("Mode: " + ($(if ($Apply) { "APPLY" } else { "DRY RUN" })))
Write-Host ""

$actions = @()

# Canon move: master build doc -> docs/spine
$wmr = Join-Path $Root "WMR_MASTER_BUILD.md"
if (Test-Path $wmr) {
  $dst = Join-Path $Root "docs\spine\WMR_MASTER_BUILD.md"
  $res = Safe-Move $wmr $dst
  if ($null -ne $res) { $actions += $res }
}

# Archive: overlay readme -> _archive/overlays
$overlay = Join-Path $Root "README_OVERLAY.md"
if (Test-Path $overlay) {
  $dst = Join-Path $Root "_archive\overlays\README_OVERLAY.md"
  $res = Safe-Move $overlay $dst
  if ($null -ne $res) { $actions += $res }
}

# Optional: move scripts into tools (keeps root clean)
$toolsReorg = Join-Path $Root "tools\reorg"
Ensure-Dir $toolsReorg

$maybeScripts = @(
  "inventory_only.ps1",
  "reorg_house.ps1",
  "reorg_house_v2.ps1"
)

foreach ($s in $maybeScripts) {
  $src = Join-Path $Root $s
  if (Test-Path $src) {
    $dst = Join-Path $toolsReorg $s
    $res = Safe-Move $src $dst
    if ($null -ne $res) { $actions += $res }
  }
}

# Report actions
$reportPath = Join-Path $Reports ("reorg_v2_actions_$ts.json")
($actions | ConvertTo-Json -Depth 5) | Out-File $reportPath -Encoding UTF8

Write-Host ""
Write-Host ("Planned actions: " + $actions.Count)
Write-Host "Report:"
Write-Host (" - " + $reportPath)

if (-not $Apply) { Write-Host "DRY RUN complete. Re-run with -Apply to execute moves." }
