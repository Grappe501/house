param(
  [Parameter(Mandatory=$true)]
  [ValidateNotNullOrEmpty()]
  [string]$ZipPath,

  [switch]$StrictExtras,

  # If embedded build/reports/artifact_manifest.{json,txt} are present but NOT listed in manifest.files,
  # don't treat them as extras (default behavior). Use -DisallowEmbeddedManifests to make them extras.
  [switch]$DisallowEmbeddedManifests
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Normalize-ZipRel([string]$p) {
  if ($null -eq $p) { return "" }
  $p = $p.Trim()
  # unify separators
  $p = $p -replace '\\','/'
  # drop leading "./"
  if ($p.StartsWith("./")) { $p = $p.Substring(2) }
  # collapse accidental double slashes
  while ($p.Contains("//")) { $p = $p -replace "//","/" }
  return $p
}

# Resolve early (absolute, canonical)
try {
  $ZipPath = (Resolve-Path -LiteralPath $ZipPath).Path
} catch {
  throw "Missing zip (cannot resolve path): $ZipPath"
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-Sha256HexFromStream([System.IO.Stream]$stream) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $hashBytes = $sha.ComputeHash($stream)
    ($hashBytes | ForEach-Object { $_.ToString("x2") }) -join ""
  } finally {
    $sha.Dispose()
  }
}

$zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
try {
  # Find manifest entry in zip
  $manifestEntry = $zip.Entries | Where-Object { $_.FullName -eq "build/reports/artifact_manifest.json" } | Select-Object -First 1
  if ($null -eq $manifestEntry) {
    throw "Zip missing build/reports/artifact_manifest.json (required for verification)."
  }

  # Read manifest JSON from entry
  $ms = New-Object System.IO.MemoryStream
  try {
    $s = $manifestEntry.Open()
    try { $s.CopyTo($ms) } finally { $s.Dispose() }
    $ms.Position = 0
    $sr = New-Object System.IO.StreamReader($ms, [System.Text.Encoding]::UTF8, $true, 4096, $true)
    try { $manifestJson = $sr.ReadToEnd() } finally { $sr.Dispose() }
  } finally {
    $ms.Dispose()
  }

  $manifest = $manifestJson | ConvertFrom-Json -Depth 80
  if ($null -eq $manifest.files -or @($manifest.files).Count -lt 1) {
    throw "Manifest has no files list."
  }

  # Build lookup for zip entries (ignore directory entries)
  $zipEntries = @{}
  foreach ($e in $zip.Entries) {
    if ([string]::IsNullOrWhiteSpace($e.FullName)) { continue }
    if ($e.FullName.EndsWith("/")) { continue } # directory marker
    $k = Normalize-ZipRel $e.FullName
    # In case of duplicates (shouldn't happen), keep first
    if (-not $zipEntries.ContainsKey($k)) {
      $zipEntries[$k] = $e
    }
  }

  $expected = @($manifest.files)
  $errors = New-Object System.Collections.Generic.List[string]

  foreach ($item in $expected) {
    $relRaw = [string]$item.path
    if ([string]::IsNullOrWhiteSpace($relRaw)) { continue }

    $rel = Normalize-ZipRel $relRaw

    if (-not $zipEntries.ContainsKey($rel)) {
      $errors.Add("MISSING: $rel")
      continue
    }

    $entry = $zipEntries[$rel]

    $expBytes = [int64]$item.bytes
    $expSha   = (Normalize-ZipRel ([string]$item.sha256)).ToLowerInvariant()

    $gotBytes = [int64]$entry.Length
    if ($gotBytes -ne $expBytes) {
      $errors.Add("SIZE_MISMATCH: $rel expected=$expBytes got=$gotBytes")
    }

    $stream = $entry.Open()
    try {
      $gotSha = (Get-Sha256HexFromStream $stream).ToLowerInvariant()
      if ($gotSha -ne $expSha) {
        $errors.Add("HASH_MISMATCH: $rel expected=$expSha got=$gotSha")
      }
    } finally {
      $stream.Dispose()
    }
  }

  if ($StrictExtras) {
    $expectedSet = New-Object "System.Collections.Generic.HashSet[string]"
    foreach ($item in $expected) { [void]$expectedSet.Add((Normalize-ZipRel ([string]$item.path))) }

    foreach ($rel in $zipEntries.Keys) {
      if (-not $expectedSet.Contains($rel)) {
        if (-not $DisallowEmbeddedManifests -and (
          $rel -eq "build/reports/artifact_manifest.json" -or
          $rel -eq "build/reports/artifact_manifest.txt"
        )) {
          continue
        }
        $errors.Add("EXTRA_FILE: $rel")
      }
    }
  }

  if ($errors.Count -gt 0) {
    Write-Host "FAIL: zip verification"
    $errors | ForEach-Object { Write-Host ("  - " + $_) }

    # Debug hint: show whether the zip contains a close match for the first missing
    $firstMissing = ($errors | Where-Object { $_ -like "MISSING:*" } | Select-Object -First 1)
    if ($firstMissing) {
      $miss = ($firstMissing -replace "^MISSING:\s*","")
      $prefix = $miss.Split("/")[0..([Math]::Min(3, ($miss.Split("/").Count-1)))] -join "/"
      Write-Host ("  debug: showing first 10 zip entries matching prefix '{0}*'" -f $prefix)
      $zipEntries.Keys | Where-Object { $_ -like "$prefix*" } | Select-Object -First 10 | ForEach-Object { Write-Host ("    * " + $_) }
    }

    exit 1
  }

  Write-Host "PASS: zip verification"
  Write-Host ("  zip: {0}" -f $ZipPath)
  Write-Host ("  files verified: {0}" -f @($expected).Count)
  exit 0

} finally {
  $zip.Dispose()
}
