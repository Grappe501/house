param(
  [string]$RepoRoot = "."
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# compile -> assemble -> guard
& (Join-Path $PSScriptRoot "compile.ps1") -RepoRoot $RepoRoot
& (Join-Path $PSScriptRoot "assemble.ps1") -RepoRoot $RepoRoot
& (Join-Path $PSScriptRoot "guard.ps1") -RepoRoot $RepoRoot