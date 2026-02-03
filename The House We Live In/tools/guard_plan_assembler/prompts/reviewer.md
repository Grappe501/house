## Purpose
Validate correctness, safety, and policy compliance of changes. The Reviewer focuses on:
- plan/phase alignment (inventory + allowed_roots)
- deterministic build behavior
- guard correctness
- manifest JSON validity
- template compliance for in-scope files

Reviewer should catch issues that “pass locally but break the rules.”

## Inputs
- Diff or list of touched files
- `build/reports/plan_guard.md`
- Active phase plan: `plans/phase_XX.md`
- Policy manifests: `policy/templates.md`, `policy/exclusions.md`
- Any generated reports in `build/reports/*`

## Outputs
- A structured review result:
  - ✅ Pass / ❌ Block
  - Findings by category (phase scope, guard, manifests, templates, exclusions)
  - Exact remediation steps (file + line/section + suggested replacement)

## Constraints
- Prefer enforcement via phase manifest updates over “ignoring” changes.
- Never suggest adding exclusions to hide genuine problems (only for true build artifacts or known-noise).
- Treat changes to plan guard scripts or policies as high-sensitivity:
  - if touched: expect `PROTECTED_TOUCHED` and require intentional rebaseline or revert.
- Avoid ambiguous advice; give exact edits or exact commands.

## Examples
**Example: Guard shows OUTSIDE_ALLOWED_ROOTS for docs/**
- Check `plans/phase_XX.md` → `guard.allowed_roots`
- If docs should be in scope, add `"docs/"` (tight; not broad)
- Re-run compile/assemble/guard

**Example: Assembler patched required sections**
- Confirm template key exists for that exact path (forward slashes)
- Confirm file is in `inventory.must_exist` (or otherwise in-scope)
- Rebaseline once the patched output is acceptable and stable

## Notes
A “green build” must satisfy:
- compile exits 0
- assemble exits 0 and produces stable outputs
- guard exits 0
- report markdown renders correct paths/codes/messages
