@'
param(
  [string]$RepoRoot = "."
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function WriteUtf8NoBom([string]$Path, [string]$Content) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

$repo = (Resolve-Path $RepoRoot).Path

$genAbs   = Join-Path $repo "tools\generate_wmr_master_build.ps1"
$planRel  = "plans\wmr\master_build.generated.md"
$planAbs  = Join-Path $repo $planRel
$guardAbs = Join-Path $repo "guard_plan_assembler\scripts\plan_guard_wmr.js"

if (!(Test-Path -Path $guardAbs)) { throw "Guard script not found: $guardAbs" }

Write-Host "=== Writing clean generator (NO New-Item -LiteralPath) ==="
$gen = @'
param(
  [string]$RepoRoot = ".",
  [string]$PlanOut  = ".\plans\wmr\master_build.generated.md"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Normalize-RelPath([string]$p) {
  return ($p -replace "\\", "/").TrimStart("./")
}

function Is-ReparsePoint([System.IO.FileSystemInfo]$item) {
  return (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)
}

$repo = (Resolve-Path $RepoRoot).Path

$outAbs = [System.IO.Path]::GetFullPath((Join-Path $repo $PlanOut))
$outDir = Split-Path -Parent $outAbs

Write-Host "RepoRoot : $repo"
Write-Host "PlanOut  : $PlanOut"
Write-Host "OutAbs   : $outAbs"
Write-Host "OutDir   : $outDir"

# IMPORTANT: Windows PowerShell New-Item has NO -LiteralPath
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$roots = @("assets","pages","data","docs","dives","netlify","tools",".plan_guard")

$ignoreDirs = @(
  ".git","node_modules",".netlify","dist","build","out",".next",".cache",
  "_site",".parcel-cache",".vscode",".idea"
)
$ignoreFiles = @(".DS_Store","Thumbs.db")

$paths = New-Object 'System.Collections.Generic.HashSet[string]'

$rootDocs = @("index.html","netlify.toml","package.json","package-lock.json","README.md")
foreach ($f in $rootDocs) {
  $full = Join-Path $repo $f
  if (Test-Path -Path $full) { [void]$paths.Add((Normalize-RelPath $f)) }
}

$guardArtifacts = @(
  ".plan_guard/manifest.json",
  ".plan_guard/wmr.config.json"
)
foreach ($g in $guardArtifacts) {
  $full = Join-Path $repo ($g -replace "/", "\")
  if (Test-Path -Path $full) { [void]$paths.Add((Normalize-RelPath $g)) }
}

foreach ($r in $roots) {
  $fullRoot = Join-Path $repo $r
  if (Test-Path -Path $fullRoot) { [void]$paths.Add((Normalize-RelPath $r) + "/") }
}

foreach ($r in $roots) {
  $fullRoot = Join-Path $repo $r
  if (!(Test-Path -Path $fullRoot)) { continue }

  Get-ChildItem -Path $fullRoot -Recurse -Force -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    if (Is-ReparsePoint $_) { return }
    $rel = Normalize-RelPath ($_.FullName.Substring($repo.Length + 1))
    $segments = $rel.Split("/")
    foreach ($seg in $segments) { if ($ignoreDirs -contains $seg) { return } }
    [void]$paths.Add($rel + "/")
  }

  Get-ChildItem -Path $fullRoot -Recurse -Force -File -ErrorAction SilentlyContinue | ForEach-Object {
    if (Is-ReparsePoint $_) { return }
    if ($ignoreFiles -contains $_.Name) { return }
    $rel = Normalize-RelPath ($_.FullName.Substring($repo.Length + 1))
    $segments = $rel.Split("/")
    foreach ($seg in $segments) { if ($ignoreDirs -contains $seg) { return } }
    [void]$paths.Add($rel)
  }
}

$sorted = @()
foreach ($p in $paths) { $sorted += $p }
$sorted = $sorted | Sort-Object

$now = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
$md = New-Object 'System.Collections.Generic.List[string]'
$md.Add("# WMR - Master Build (Generated Allowlist)")
$md.Add("")
$md.Add("> Generated: $now")
$md.Add("> RepoRoot: $(Normalize-RelPath $repo)")
$md.Add("")
$md.Add("## Watched roots")
foreach ($rr in $roots) { $md.Add("- ``$rr/``") }
$md.Add("")
$md.Add("## Allowlist paths (generated)")
foreach ($pp in $sorted) { $md.Add("- ``$pp``") }
$md.Add("")

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outAbs, ($md -join "`n"), $utf8NoBom)

if (!(Test-Path -Path $outAbs)) { throw "WRITE FAILED: $outAbs" }

Write-Host "OK Generated: $outAbs"
Write-Host ("Paths: " + $sorted.Count)
'@

WriteUtf8NoBom $genAbs $gen
Write-Host "OK: $genAbs"
Write-Host ""

Write-Host "=== Generate allowlist (one pass) ==="
& powershell -NoProfile -ExecutionPolicy Bypass -File $genAbs -RepoRoot "." -PlanOut ".\plans\wmr\master_build.generated.md"

if (!(Test-Path -Path $planAbs)) { throw "Generated plan missing: $planAbs" }

Write-Host ""
Write-Host "=== Run Plan Guard (one pass) ==="
& node $guardAbs "--repo" "." "--plan" (".\" + $planRel) "--report"
'@ | Set-Content -Path .\tools\apply_wmr_guard_fixes.ps1 -Encoding UTF8
