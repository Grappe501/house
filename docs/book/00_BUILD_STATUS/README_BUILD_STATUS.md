# Build Status Dashboard
Generated: 2026-02-03

## Current state
- Act I / Chapter 01 (Rooms 001–005): MasterBuild ✅ Prose ✅ HTML ✅ Audit ✅ Patch ✅
- Act I / Chapters 02–05: Not started (blueprints next)

## Protocol (locked)
1) Build a 10× MasterBuild blueprint for a 5-room chapter.
2) Write prose pass v1 room-by-room (ship HTML + MD).
3) After all 5 rooms are drafted, ship a chapter audit (HTML + MD).
4) Only then patch specific lines via micro overlays.
5) Repeat next 5-room chapter.

## Overlay rule
Overlays contain ONLY:
- New files, or
- The single file explicitly requested for replacement
…always at the correct path. No silent overwrites.

## Word-count policy
Yes: we keep strict room-level word-count caps for pacing.
If we change a cap, we document it in the room’s MasterBuild and update the dashboard.