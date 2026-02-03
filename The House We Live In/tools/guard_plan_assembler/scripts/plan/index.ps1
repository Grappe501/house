param(
  [Parameter(Mandatory=$true)][ValidateSet("init","compile","assemble","guard","run")] [string]$Command,
  [string]$RepoRoot="."
)

Set-StrictMode -Version Latest
$ErrorActionPreference="Stop"

$cmdPath = Join-Path $PSScriptRoot ("{0}.ps1" -f $Command)
& $cmdPath -RepoRoot $RepoRoot