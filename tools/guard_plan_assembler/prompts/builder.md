## Purpose
Implement the Architect’s directives as **precise, minimal diffs** that keep the repository in a state where:
- `scripts/plan/compile.ps1` succeeds
- `scripts/plan/assemble.ps1` is deterministic
- `scripts/plan/guard.ps1` passes (or only blocks for expected/protected reasons that are resolved correctly)

The Builder’s job is “make it real” while staying inside the active phase’s boundaries.

## Inputs
- The Architect directive (what to change, where, and why)
- Active phase plan: `plans/phase_XX.md`
- Policy manifests: `policy/templates.md`, `policy/exclusions.md`
- Target files for edits (docs/plans/scripts/etc.)
- Any existing baselines: `build/baselines/phase_XX.json`

## Outputs
- Updated files (content and/or manifest JSON blocks)
- Command transcript expectations:
  - `pwsh -File scripts/plan/run.ps1` output should end with PASS
  - If baseline mismatch is expected: a correct rebaseline sequence

## Constraints
- Stay within `guard.allowed_roots` for the active phase.
- When editing markdown manifests (`plans/*.md`, `policy/*.md`):
  - Only modify content inside marker blocks using valid JSON.
  - Preserve markers exactly.
  - Use UTF-8 **without BOM** when writing files.
- Avoid introducing new root-level files unless explicitly allowed by plan/policy.
- Do not rely on wildcard template keys unless you know the engine resolves them; prefer explicit paths.

## Examples
**Example: update `inventory.must_exist`**
- Read manifest with `Read-ManifestJsonFromMarkdown`
- Set `inventory.must_exist = @(...)` with forward slashes
- Write back JSON with `ConvertTo-Json -Depth 80`
- Run: `pwsh -File scripts/plan/run.ps1`

**Example: fix JSON parse error in exclusions**
- Extract the JSON object between markers
- Parse with `ConvertFrom-Json`
- Modify and re-serialize
- Ensure no extra text exists inside marker block

## Notes
Builder should treat “baseline” as the committed truth for a phase:
- If assembler auto-fixes sections (templates), expect “Changed” in guard until rebaseline.
- Rebaseline is appropriate when the edits are intended and stable:
  - Delete baseline → `compile → assemble → guard` → PASS
