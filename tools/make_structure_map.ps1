param(
  [string]$Root = (Resolve-Path ".").Path,
  [string]$OutDir = (Join-Path (Resolve-Path ".").Path "maps")
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$treeFile = Join-Path $OutDir "tree_$timestamp.txt"
$manifestCsv = Join-Path $OutDir "manifest_$timestamp.csv"
$manifestJson = Join-Path $OutDir "manifest_$timestamp.json"
$topHtml = Join-Path $OutDir "top_html_candidates_$timestamp.csv"

Write-Host "Root: $Root"
Write-Host "Out:  $OutDir"

# 1) Folder tree (clean, readable)
# Exclude heavy folders if you have them (adjust as needed)
$excludeDirs = @("\node_modules\", "\.git\", "\dist\", "\build\", "\.cache\")
function ShouldExclude([string]$fullPath) {
  foreach ($ex in $excludeDirs) { if ($fullPath -like "*$ex*") { return $true } }
  return $false
}

# Tree generator
$items = Get-ChildItem -LiteralPath $Root -Recurse -Force |
  Where-Object { -not (ShouldExclude $_.FullName) }

$dirs = $items | Where-Object { $_.PSIsContainer } | Sort-Object FullName
$files = $items | Where-Object { -not $_.PSIsContainer } | Sort-Object FullName

"== DIRECTORY TREE ==" | Out-File -FilePath $treeFile -Encoding UTF8
$dirs | ForEach-Object {
  $rel = $_.FullName.Substring($Root.Length).TrimStart('\','/')
  $depth = ($rel -split '[\\/]').Count
  ('  ' * ($depth-1)) + "+ " + $rel
} | Out-File -FilePath $treeFile -Append -Encoding UTF8

"`n== FILES ==" | Out-File -FilePath $treeFile -Append -Encoding UTF8
$files | ForEach-Object {
  $rel = $_.FullName.Substring($Root.Length).TrimStart('\','/')
  $depth = ($rel -split '[\\/]').Count
  ('  ' * ($depth-1)) + "- " + $rel
} | Out-File -FilePath $treeFile -Append -Encoding UTF8

# 2) Manifest CSV (paths + sizes + modified times)
$manifest = $files | ForEach-Object {
  [PSCustomObject]@{
    relative_path = $_.FullName.Substring($Root.Length).TrimStart('\','/')
    size_bytes    = $_.Length
    last_write    = $_.LastWriteTimeUtc.ToString("o")
    extension     = $_.Extension.ToLowerInvariant()
  }
}

$manifest | Export-Csv -NoTypeInformation -Encoding UTF8 -Path $manifestCsv

# 3) Manifest JSON (handy for programmatic reasoning)
$manifest | ConvertTo-Json -Depth 4 | Out-File -FilePath $manifestJson -Encoding UTF8

# 4) Identify likely "global layout" hook points
# This helps us find the right place to inject a reader shell
$layoutCandidates = $files | Where-Object {
  $_.Extension -match '\.html?$' -or $_.Name -match 'layout|base|index|app|shell|template' -or $_.FullName -match 'layouts|templates|src'
} | ForEach-Object {
  [PSCustomObject]@{
    relative_path = $_.FullName.Substring($Root.Length).TrimStart('\','/')
    name          = $_.Name
    size_bytes    = $_.Length
    last_write    = $_.LastWriteTimeUtc.ToString("o")
  }
} | Sort-Object size_bytes -Descending

$layoutCandidates | Select-Object -First 200 | Export-Csv -NoTypeInformation -Encoding UTF8 -Path $topHtml

Write-Host "Wrote:"
Write-Host " - $treeFile"
Write-Host " - $manifestCsv"
Write-Host " - $manifestJson"
Write-Host " - $topHtml"
