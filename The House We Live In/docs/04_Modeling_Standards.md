# Modeling Standards (QoL / Pillars / Scenarios)

## Purpose of models
Models are **explainers**, not predictions.
They exist to:
- show tradeoffs
- make assumptions visible
- compare trajectories (status quo vs new path)
- invite experimentation

## Required properties
- Every output must trace back to explicit inputs
- All formulas are visible
- All assumptions are labeled as:
  - observed (data-driven)
  - inferred (logic)
  - placeholder (not yet wired)
- Provide horizon outputs at: 1 / 5 / 10 / 20 / 50 years

## Current model architecture (site)
- Scenario settings: `wmr_scenario_v56` (localStorage)
- QoL proxies: `wmr_qol_proxies_v54` (localStorage)
- Pillar params: `wmr_pillar_params_v58` (localStorage)
- Snapshot exports: JSON downloads (audit trail)

## Data integration plan (future)
- Census + ACS (baseline distributions)
- BLS (wages, employment, productivity)
- BEA (GDP, national accounts)
- CDC/CMS (health outcomes) — careful staging
- DOJ/BJS (justice metrics)
- Energy (EIA), broadband (FCC), transportation (DOT)

## Transparency requirements
Every model page must show:
- which data is used
- which scenario is active
- which pillar params are active
- a “drivers” section

## Calibration and humility
- Never imply certainty
- Use ranges where feasible
- Clearly show “best guess” logic
- Prefer explainability over complexity

## Snapshot rules
Snapshots must include:
- timestamp
- scenario + params
- pillar params (if applicable)
- observed proxies (if present)
- outputs by horizon
