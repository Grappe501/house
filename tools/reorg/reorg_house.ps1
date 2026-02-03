param(
    [Parameter(Mandatory = $true)]
    [string]$Root,

    [switch]$Apply
)

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ReportDir = Join-Path $Root "_reports"
$ArchiveDir = Join-Path $Root "_archive"
$ConflictsDir = Join-Path $Root "_conflicts"
$Actions = @()

function Ensure-Dir($path) {
    if (!(Test-Path $path)) {
        New-Item -ItemType Directory -Path $path | Out-Null
    }
}

function Plan-Move($Source, $Destination) {
    if (!(Test-Path $Source)) { return }

    if (Test-Path $Destination) {
        $conflictTarget = Join-Path $ConflictsDir ("$Timestamp" + "__" + (Split-Path $Source -Leaf))
        $Actions += @{
            action = "CONFLICT"
            from   = $Source
            to     = $conflictTarget
        }
        if ($Apply) {
            Ensure-Dir $ConflictsDir
            Move-Item $Source $conflictTarget
        }
    } else {
        $Actions += @{
            action = "MOVE"
            from   = $Source
            to     = $Destination
        }
        if ($Apply) {
            Ensure-Dir (Split-Path $Destination)
            Move-Item $Source $Destination
        }
    }
}

Write-Host "=== HOUSE REORG SCRIPT ==="
Write-Host "Root: $Root"
Write-Host "Mode: " ($(if ($Apply) { "APPLY (CHANGES WILL BE MADE)" } else { "DRY RUN (NO CHANGES)" }))
Write-Host ""

Ensure-Dir $ReportDir
Ensure-Dir $ArchiveDir

# 1. Move root spine markdown docs
$SpineDir = Join-Path $Root "docs\spine"
Ensure-Dir $SpineDir

Get-ChildItem $Root -File -Filter "*.md" | ForEach-Object {
    if ($_.Name -match "^\d{2}_") {
        Plan-Move $_.FullName (Join-Path $SpineDir $_.Name)
    }
}

# 2. Move book planning folders into docs/book/planning
$PlanningDir = Join-Path $Root "docs\book\planning"
Ensure-Dir $PlanningDir

$PlanningFolders = @(
    "06_ACT_OUTLINES",
    "07_CHAPTER_ROOM_BEATS",
    "08_LEVEL2_PAGE_MAP",
    "12_DATA_PROOF_LAYER"
)

foreach ($folder in $PlanningFolders) {
    $src = Join-Path $Root $folder
    $dst = Join-Path $PlanningDir $folder
    Plan-Move $src $dst
}

# 3. Move guard_plan_assembler into tools
$ToolsDir = Join-Path $Root "tools"
Ensure-Dir $ToolsDir
Plan-Move (Join-Path $Root "guard_plan_assembler") (Join-Path $ToolsDir "guard_plan_assembler")

# 4. Archive zip files at root
$ZipArchive = Join-Path $ArchiveDir "zips"
Ensure-Dir $ZipArchive

Get-ChildItem $Root -File -Filter "*.zip" | ForEach-Object {
    Plan-Move $_.FullName (Join-Path $ZipArchive $_.Name)
}

# 5. Write report
$ReportPath = Join-Path $ReportDir ("reorg_actions_$Timestamp.json")
$Actions | ConvertTo-Json -Depth 5 | Out-File $ReportPath -Encoding UTF8

Write-Host ""
Write-Host "=== COMPLETE ==="
Write-Host "Planned actions: $($Actions.Count)"
Write-Host "Report written to:"
Write-Host $ReportPath
Write-Host ""

if (!$Apply) {
    Write-Host "This was a DRY RUN. Re-run with -Apply to make changes."
}
