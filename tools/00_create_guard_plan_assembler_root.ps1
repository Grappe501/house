# 00_create_guard_plan_assembler_root.ps1
# Builds a standalone guard plan assembler module at repo root.
# Copies ONLY reusable tooling from "guard plan assembler.zip".
# Prevents bleed by quarantining plan prose and excluding build artifacts + app build outputs.

$ErrorActionPreference = "Stop"

# --- Paths ---
$RepoRoot = "C:\Users\User\Desktop\The House We Live In"
$ToolsDir = Join-Path $RepoRoot "tools"

$ZipPath  = Join-Path $ToolsDir "_incoming_zips\guard plan assembler.zip"
if (-not (Test-Path $ZipPath)) {
  # fallback: if user left it in Downloads or tools root, adjust here:
  $ZipPath = Join-Path $ToolsDir "guard plan assembler.zip"
}
if (-not (Test-Path $ZipPath)) {
  throw "Could not find guard plan assembler.zip. Place it in: $ToolsDir\_incoming_zips\ (recommended) or $ToolsDir\"
}

# Target standalone module at repo root
$TargetRoot = Join-Path $RepoRoot "guard_plan_assembler"

# Quarantine extraction
$ExtractRoot = Join-Path $ToolsDir "_extract_guard_plan_assembler_tmp"

function Ensure-Dir($p) { if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null } }

function Copy-Tree($from, $to) {
  if (Test-Path $from) {
    Ensure-Dir $to
    Copy-Item -Path (Join-Path $from "*") -Destination $to -Recurse -Force
    Write-Host "Copied: $from -> $to"
  } else {
    Write-Warning "Missing: $from"
  }
}

# Clean old runs
if (Test-Path $ExtractRoot) { Remove-Item $ExtractRoot -Recurse -Force }
if (Test-Path $TargetRoot)  { Remove-Item $TargetRoot -Recurse -Force }

Ensure-Dir $ExtractRoot
Ensure-Dir $TargetRoot

# Extract zip
Expand-Archive -Path $ZipPath -DestinationPath $ExtractRoot -Force
Write-Host "Extracted: $ZipPath -> $ExtractRoot"

# The zip has a top folder named: "guard plan assembler"
$SourceRoot = Join-Path $ExtractRoot "guard plan assembler"
if (-not (Test-Path $SourceRoot)) {
  # sometimes zip flattens differently
  $guess = Get-ChildItem $ExtractRoot | Where-Object { $_.PSIsContainer } | Select-Object -First 1
  if ($guess) { $SourceRoot = $guess.FullName }
}
if (-not (Test-Path $SourceRoot)) {
  throw "Could not locate source root folder inside extracted zip."
}

# --- Create clean module structure ---
$Dirs = @(
  "scripts",
  "contracts",
  "templates",
  "prompts",
  ".plan_guard",
  "_examples",
  "_archive"
)
foreach ($d in $Dirs) { Ensure-Dir (Join-Path $TargetRoot $d) }

# --- Copy ONLY safe tooling ---
Copy-Tree (Join-Path $SourceRoot "scripts")    (Join-Path $TargetRoot "scripts")
Copy-Tree (Join-Path $SourceRoot "contracts")  (Join-Path $TargetRoot "contracts")
Copy-Tree (Join-Path $SourceRoot "templates")  (Join-Path $TargetRoot "templates")
Copy-Tree (Join-Path $SourceRoot "prompts")    (Join-Path $TargetRoot "prompts")

# plan guard config (two possible locations)
$pg1 = Join-Path $SourceRoot ".plan_guard\config.json"
$pg2 = Join-Path $SourceRoot "plan_guard\config.json"
$pgDest = Join-Path $TargetRoot ".plan_guard\config.json"

if (Test-Path $pg1) {
  Copy-Item $pg1 $pgDest -Force
  Write-Host "Copied Plan Guard config: $pg1 -> $pgDest"
} elseif (Test-Path $pg2) {
  Copy-Item $pg2 $pgDest -Force
  Write-Host "Copied Plan Guard config: $pg2 -> $pgDest"
} else {
  Write-Warning "No plan_guard config.json found in source."
}

# --- Quarantine plan prose as examples ONLY (prevent bleed) ---
# We keep these as templates/reference but never wire them into WMR by default.
$plansSrc = Join-Path $SourceRoot "plans"
if (Test-Path $plansSrc) {
  Copy-Tree $plansSrc (Join-Path $TargetRoot "_examples\plans_reference_only")
  Write-Host "NOTE: plans copied to _examples only (reference), NOT wired."
}

# Archive anything heavy if present (apps/web, build, services, tests)
$heavy = @("apps", "build", "services", "tests")
foreach ($h in $heavy) {
  $hp = Join-Path $SourceRoot $h
  if (Test-Path $hp) {
    Copy-Tree $hp (Join-Path $TargetRoot "_archive\$h")
    Write-Host "Archived heavy folder to _archive\$h (not used by kernel)."
  }
}

# --- Add module README + gitignore to enforce no-bleed ---
$readme = @"
# Guard Plan Assembler (Standalone Kernel)

This folder is a **reusable build kernel** for assembling and validating large markdown plans.

## Zero-bleed rule
- Tooling lives here (scripts/contracts/templates/prompts/config)
- **WMR plan content does NOT live here**
- `_examples/` contains reference-only plan templates; do not wire into WMR directly.

## How to use in a project
1. Copy this folder into the project root (or keep as subtree/submodule)
2. Point `.plan_guard/config.json` to the project's plan path and output paths
3. Run the guard scripts to generate:
   - bundle JSON
   - markdown + json reports

## Safety
- Never commit generated `build/` outputs inside this module
- Never import `_examples/` prose into WMR without rewriting
"@
$readme | Out-File -FilePath (Join-Path $TargetRoot "README.md") -Encoding utf8

$gitignore = @"
# Generated outputs (always generated, never source)
build/
dist/
out/

# Node/Next artifacts (not part of kernel)
node_modules/
.next/
"@
$gitignore | Out-File -FilePath (Join-Path $TargetRoot ".gitignore") -Encoding utf8

# Optional: create a minimal package.json for running scripts (node-based)
$pkg = @"
{
  "name": "guard-plan-assembler-kernel",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "plan:guard": "node scripts/plan_guard.js",
    "plan:assemble": "node scripts/assemble.js",
    "manifest": "node scripts/generate_manifest.js"
  }
}
"@
$pkg | Out-File -FilePath (Join-Path $TargetRoot "package.json") -Encoding utf8

Write-Host ""
Write-Host "== DONE =="
Write-Host "Standalone module created at:"
Write-Host "  $TargetRoot"
Write-Host ""
Write-Host "Next step: we will wire this kernel into WMR by creating a WMR-specific config"
Write-Host "that points to /plans/wmr/... and outputs to /build/..."
