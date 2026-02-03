# run_wmr_plan_guard.ps1
$ErrorActionPreference = "Stop"

$RepoRoot = "C:\Users\User\Desktop\The House We Live In"
Set-Location $RepoRoot

# Install node deps if the kernel requires any (usually none, but safe)
# If this fails, it’s okay to comment out.
try {
  if (Test-Path ".\guard_plan_assembler\package.json") {
    Push-Location ".\guard_plan_assembler"
    if (-not (Test-Path ".\node_modules")) {
      npm install
    }
    Pop-Location
  }
} catch {
  Write-Warning "npm install step skipped or failed: $($_.Exception.Message)"
}

# Run the kernel with the WMR config
# We pass config via ENV so we don't have to modify kernel scripts.
$env:PLAN_GUARD_CONFIG = ".\.plan_guard\wmr.config.json"

node ".\guard_plan_assembler\scripts\plan_guard.js"
