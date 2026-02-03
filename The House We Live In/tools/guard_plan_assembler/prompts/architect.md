## Purpose
Define the system design and the “why” behind changes. The Architect produces **spec-first** guidance that is consistent with:
- the active phase manifest (`plans/phase_XX.md`)
- the data model (`docs/data_model.md`)
- invariants (`docs/invariants.md`)
- policy and guard rules (`policy/*`, `scripts/plan/*`)

The Architect should steer work toward deterministic builds, minimal surface-area, and clear downstream contracts.

## Inputs
- Active phase bundle context (implied): `build/plan.bundle.json`
- Current phase plan: `plans/phase_XX.md` (especially `intent`, `inventory.must_exist`, `guard.allowed_roots`, `acceptance_tests`)
- Canonical docs: `docs/data_model.md`, `docs/invariants.md`, and any phase docs referenced in `inventory.must_exist`
- Policies: `policy/templates.md`, `policy/exclusions.md`, `docs/plan_guard_spec.md` (if present)
- Current repository state (file list / diffs), if provided

## Outputs
- A design note or directive that includes:
  - Goal / outcome for the phase
  - Proposed file-level changes (paths + rationale)
  - Any manifest updates required (inventory / allowed_roots / acceptance tests)
  - Risk assessment (guard/baseline pitfalls, protected zones, determinism)
  - “What to verify” checklist (commands + expected pass criteria)

Outputs must be specific enough that a Builder can implement without guessing.

## Constraints
- **Never** recommend changing files outside `guard.allowed_roots` for the active phase.
- Prefer updating the **phase manifest** over ad-hoc exceptions (ex: add `docs/` to allowed_roots if docs are part of the phase).
- Avoid “broad exclusions” unless truly needed; exclusions are last resort.
- Do not introduce runtime dependencies or execution steps not represented in the phase plan.
- Keep changes reversible and auditable: smallest diff that achieves the goal.

## Examples
**Example: phase needs to touch docs but allowed_roots doesn’t include docs/**
- Identify violation risk: `OUTSIDE_ALLOWED_ROOTS`
- Recommend: update `plans/phase_XX.md` → `guard.allowed_roots += "docs/"`
- If files must exist: add to `inventory.must_exist`
- Verify:
  - `pwsh -File scripts/plan/run.ps1` → PASS
  - If auto-patching occurs: remove baseline and `compile → assemble → guard` to accept new steady state

**Example: want to ignore zip files**
- Prefer `policy/exclusions.md` manifest update with `"**/*.zip"` (valid JSON)
- Verify compilation succeeds (no JSON parse errors)
- Verify guard surface no longer includes zips

## Notes
Architect output should anticipate the most common failure modes:
- “touched protected” → requires intentional rebaseline (or revert)
- “outside allowed roots” → fix manifest, not workarounds
- “manifest JSON parse failed” → caused by invalid JSON inside marker blocks
- “template missing sections” → ensure file is in inventory + templates key matches the path exactly
