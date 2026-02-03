# Phase 2 — Maintenance Dashboard (v1)
_Last updated: 2026-02-01_

## Purpose
Provide a single, legible operating view for Act IV maintenance:
- overall status
- drift signals
- next cadence events
- patch backlog

## Files
- Page: `/pages/maintenance-dashboard.html`
- Data: `/data/maintenance/dashboard.json`

## Door Line targets (Act IV)
- Room 076 (Calendar) → dashboard as “today view”
- Room 079 (Drift Test BEAM) → dashboard + cadence
- Room 087 (Loophole Hunt BEAM) → backlog + audit log
- Room 094 (Trust Dividend BEAM) → trust trajectory + dashboard trend view (Phase 3)

## Upgrade path (Phase 3)
Replace static JSON with live tools/dashboards + automatic patch note generation.
