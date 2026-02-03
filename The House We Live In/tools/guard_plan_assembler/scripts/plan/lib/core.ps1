Set-StrictMode -Version Latest

function Read-TextUtf8 {
  param([Parameter(Mandatory=$true)][string]$Path)
  return Get-Content -LiteralPath $Path -Raw -Encoding UTF8
}

function Get-RepoRoot {
  return (Resolve-Path ".").Path
}

function Normalize-PathForBundle {
  param([string]$Path)
  return ($Path -replace "\\","/").TrimStart("./")
}

function GlobToRegex {
  param([Parameter(Mandatory=$true)][string]$Glob)
  # Convert basic glob patterns to regex:
  # ** => .*
  # *  => [^/]* (within a segment)
  # ?  => .
  $g = Normalize-PathForBundle $Glob
  $escaped = [Regex]::Escape($g)
  $escaped = $escaped -replace "\\\*\\\*",".*"
  $escaped = $escaped -replace "\\\*","[^/]*"
  $escaped = $escaped -replace "\\\?","."
  return "^$escaped$"
}

function Test-Glob {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)][string]$Glob
  )
  $p = Normalize-PathForBundle $Path
  $rx = GlobToRegex $Glob
  return [Regex]::IsMatch($p, $rx)
}

function Any-GlobMatch {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)][string[]]$Globs
  )
  foreach ($g in $Globs) { if (Test-Glob -Path $Path -Glob $g) { return $true } }
  return $false
}

function Extract-ManifestBlock {
  param(
    [Parameter(Mandatory=$true)][string]$Text,
    [Parameter(Mandatory=$true)][string]$StartMarker,
    [Parameter(Mandatory=$true)][string]$EndMarker
  )
  $pattern = [Regex]::Escape($StartMarker) + "\s*(?<body>[\s\S]*?)\s*" + [Regex]::Escape($EndMarker)
  $m = [Regex]::Match($Text, $pattern)
  if (-not $m.Success) { return $null }
  return $m.Groups["body"].Value.Trim()
}

function Read-ManifestJsonFromMarkdown {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)][string]$StartMarker,
    [Parameter(Mandatory=$true)][string]$EndMarker
  )
  $txt = Read-TextUtf8 $Path
  $body = Extract-ManifestBlock -Text $txt -StartMarker $StartMarker -EndMarker $EndMarker
  if ($null -eq $body -or $body.Length -eq 0) { return $null }
  try { return ($body | ConvertFrom-Json -Depth 50) }
  catch { throw "Manifest JSON parse failed in $Path. Error: $($_.Exception.Message)" }
}

function Write-JsonFile {
  param([Parameter(Mandatory=$true)][string]$Path, [Parameter(Mandatory=$true)]$Object)
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $json = $Object | ConvertTo-Json -Depth 50
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $json, $utf8NoBom)
}

function Write-TextFile {
  param([Parameter(Mandatory=$true)][string]$Path, [Parameter(Mandatory=$true)][string]$Text)
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Text, $utf8NoBom)
}