param(
  [Parameter(Mandatory = $true)]
  [string]$Root
)

$Root = (Resolve-Path $Root).Path
$Reports = Join-Path $Root "_reports"
if (!(Test-Path $Reports)) { New-Item -ItemType Directory -Path $Reports | Out-Null }

$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$mdPath = Join-Path $Reports "ROOT_INVENTORY_REPORT_$ts.md"

$allFiles = Get-ChildItem $Root -Recurse -File -Force |
  Where-Object { $_.FullName -notmatch "\\\.git\\|\\node_modules\\|\\_reports\\|\\_archive\\|\\_conflicts" }

$topCounts = @{}
foreach ($f in $allFiles) {
  $rel = $f.FullName.Substring($Root.Length).TrimStart("\")
  $top = $rel.Split("\")[0]
  if (-not $topCounts.ContainsKey($top)) { $topCounts[$top] = 0 }
  $topCounts[$top]++
}

function Count-TODO($base, $pattern) {
  if (!(Test-Path $base)) { return 0 }
  $count = 0
  $files = Get-ChildItem $base -Recurse -File -Filter $pattern -ErrorAction SilentlyContinue
  foreach ($fi in $files) {
    try {
      $txt = Get-Content $fi.FullName -Raw -ErrorAction Stop
      $count += ([regex]::Matches($txt, "TODO", "IgnoreCase")).Count
    } catch {}
  }
  return $count
}

$todoRooms = Count-TODO (Join-Path $Root "data\rooms") "*.html"
$todoDocs  = Count-TODO (Join-Path $Root "docs") "*.md"
$todoPages = Count-TODO (Join-Path $Root "pages") "*.html"

$roomCount = 0
if (Test-Path (Join-Path $Root "data\rooms")) {
  $roomCount = (Get-ChildItem (Join-Path $Root "data\rooms") -Filter "room*.html" -File -ErrorAction SilentlyContinue).Count
}

$pageCount = 0
if (Test-Path (Join-Path $Root "pages")) {
  $pageCount = (Get-ChildItem (Join-Path $Root "pages") -Recurse -Filter "*.html" -File -ErrorAction SilentlyContinue).Count
}

$manifestPresent = Test-Path (Join-Path $Root "data\rooms\manifest.json")

$md = @()
$md += "# Root Inventory Report"
$md += ""
$md += "Generated: $(Get-Date)"
$md += ""
$md += "## Top-level file counts"
foreach ($k in ($topCounts.Keys | Sort-Object)) {
  $md += "- **$k**: $($topCounts[$k])"
}
$md += ""
$md += "## Totals"
$md += "- Files scanned: **$($allFiles.Count)**"
$md += "- Pages (*.html in /pages): **$pageCount**"
$md += "- Rooms (room*.html in /data/rooms): **$roomCount**"
$md += "- Rooms manifest present: **$manifestPresent**"
$md += "- TODO count — rooms: **$todoRooms**, docs: **$todoDocs**, pages: **$todoPages**"
$md += ""
$md += "## Notes"
$md += "- This report is inventory-only (no reorganization applied)."

$md -join "`r`n" | Out-File $mdPath -Encoding UTF8

Write-Host "Inventory report written to:"
Write-Host $mdPath
