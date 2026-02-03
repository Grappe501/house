## Purpose
Execute and verify the phase’s acceptance criteria. The Tester is responsible for:
- running the standard pipeline commands
- confirming that reports, baselines, and invariants behave as expected
- producing a minimal “proof” transcript of success/failure

Tester is not a unit-test author here; it’s **workflow validation**.

## Inputs
- Active phase plan: `plans/phase_XX.md` (especially `acceptance_tests`)
- Tooling scripts: `scripts/plan/*.ps1`
- Current baseline state: `build/baselines/phase_XX.json` (exists / not exists)
- Reports: `build/reports/*`

## Outputs
- A test run record:
  - Commands executed
  - Key outputs (PASS/BLOCKED + violation summaries)
  - If blocked: exact violation list and recommended next step (fix vs rebaseline vs revert)

## Constraints
- Always use the canonical commands unless phase says otherwise:
  - `pwsh -File scripts/plan/run.ps1`
  - (or) `compile.ps1`, `assemble.ps1`, `guard.ps1` individually when diagnosing
- Treat “rebaseline” as a deliberate step:
  - only after confirming changes are correct and stable
- If manifests are edited, re-run compile immediately to catch JSON parsing issues early.

## Examples
**Happy path**
1) `pwsh -File scripts/plan/run.ps1`
2) Expect: `OK: compiled bundle` + `OK: assemble complete` + `PASS: plan guard`

**Template patch path**
1) Run `run.ps1` and see `section fixes: N`
2) Confirm files look correct
3) Delete baseline for phase
4) `compile → assemble → guard` and confirm PASS with zero diffs

**Blocked path**
- Print `build/reports/plan_guard.md`
- If only `PROTECTED_TOUCHED`, decide: revert or rebaseline intentionally
- If `OUTSIDE_ALLOWED_ROOTS`, fix phase manifest (do not rebaseline as a substitute)

## Notes
When reporting failures, always paste:
- the “Violations” section from `build/reports/plan_guard.md`
- the active phase id
- whether baseline existed before the run
