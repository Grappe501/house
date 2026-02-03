# Working Majority Republic — MASTER BUILD MAP

_Generated: 2026-01-31T18:32:12.839839Z_

## What this repository is
**Working Majority Republic (WMR)** is a static-first website + lightweight modeling playground intended to explain and simulate a *working-class-majority democratic republic* — a future government/economic system design.

The repo currently contains:
- A fully deployable static site (HTML/CSS/vanilla JS)
- A set of modeling JSON scaffolds (QoLI, fiscal model, trajectories)
- A Netlify Functions layer that proxies public-data APIs (Census + BLS)
- A 'book reader' experience for *The House We Live In* + behind-the-scenes deep dives
- A documentation spine that defines canon/guardrails/specs.

## What is built right now (facts, not aspirations)
### ✅ Built + deployed
- Static pages render (no framework required).
- Global styling (`assets/styles.css`) and a minimal site script (`assets/site.js`).
- A Netlify form named `thoughts` on most pages, posting to `/pages/thanks.html`.
- Netlify Functions: `/api/health`, `/api/census`, `/api/bls`, `/api/sources` with redirects via `netlify.toml`.
- Local JSON-driven widgets on select pages (QoLI, budgets, trajectories, etc.).
- House Reader: `/pages/book/house-reader/` with its own JS/CSS.

### ⚠️ Built but currently *scaffold / placeholder* (runs, but math/content is not final)
- QoLI output files contain placeholder values; domain math is not implemented.
- Many `*_scaffold.json` files are templates rather than live model outputs.
- Some policy pages are substantive narrative, but many are still outline-level.
- Navigation links only expose a subset of available pages.

### ❌ Not built / not wired yet (clear gaps)
- No build step / bundler / type-checking / tests.
- No site-wide search, tagging, cross-linking, or automated sitemap.
- No governance-model “drill-down engine” that ties docs → pages → model math.
- No data pipeline that refreshes snapshots and writes pull logs.
- No persistence layer (database) for pull history, community input, or moderation queues.
- No auth/roles for editors/moderators.

## What the site *does* today (user-visible)
- Presents a long-form political/governance vision via topical pages.
- Offers interactive (but early) modeling pages that load JSON and show deltas (QoLI, budget, trajectories).
- Provides a reader experience for *The House We Live In* (book + rooms + deep dives).
- Collects feedback via Netlify Forms (`thoughts`).
- Can call public-data proxies (Census + BLS) to support live/updated figures once keys + pull logic are added.

## What the site can do once finished (target capabilities)
1. **Explain the WMR system** with layered drill-down: high-level → constitutional mechanisms → statutes/protocols → implementation playbook.
2. **Quantify outcomes** via a transparent modeling suite (QoLI, fiscal/debt model, sector displacement, wealth controls, etc.).
3. **Generate reader-specific impacts** (household calculators with scenario toggles, region toggles, confidence bands).
4. **Maintain credibility** with a first-class source system: citations, pull logs, reproducible datasets.
5. **Enable organizing** with publishable playbooks, local chapters, and onboarding paths.
6. **Support governance evolution** with versioned proposals, changelogs, and public comment workflows.

## Architecture map
### Deployment
- Netlify publishes the repo root (`publish = '.'`).
- `netlify.toml` redirects `/api/*` → `/.netlify/functions/:splat`.

### Runtime layers
1. **Static UI**: `index.html` + `pages/**/*.html`
2. **Shared assets**: `assets/styles.css`, `assets/site.js`
3. **Model data**: `data/**/*.json` consumed by fetch() in some pages
4. **Serverless API**: `netlify/functions/*.js` for Census/BLS proxy + health + sources
5. **Book reader**: `pages/book/house-reader/` + `assets/css/house-reader.css` + `assets/js/house-reader.js`
6. **Docs spine**: `docs/**/*.md` canonical specs + guardrails

## Wiring map (what calls what)
- Most HTML pages include:
  - `<link rel='stylesheet' href='/assets/styles.css'>`
  - `<script src='/assets/site.js'></script>`
- `assets/site.js` stamps `page_slug` and `submitted_at` into the Netlify form.
- Modeling pages use `fetch('/data/...json')` to load local precomputed outputs.
- Some pages link to `/api/health` (and can be extended to call `/api/census` + `/api/bls`).
- House Reader uses its own CSS/JS and loads room content via `data/rooms/manifest.json` and `data/rooms/roomXXX.html`.

## Repository root files
_Files: 5_

- `.gitattributes` — **built** —
- `.gitignore` — **built** —
- `index.html` — **built** — Home — Working Majority Republic
- `netlify.toml` — **built** —
- `package.json` — **built** — JSON (name, private, description, version, engines)

## assets/ — global styles & JS
_Files: 5_

- `assets/css/house-reader.css` — **built** — CSS
- `assets/js/house-reader.js` — **built** — JavaScript
- `assets/site.js` — **built** — JavaScript
- `assets/styles.css` — **built** — CSS
- `assets/wmr_utils_v58.js` — **built** — JavaScript

## netlify/ — serverless functions
_Files: 4_

- `netlify/functions/bls.js` — **built** — JavaScript
- `netlify/functions/census.js` — **built** — JavaScript
- `netlify/functions/health.js` — **built** — JavaScript
- `netlify/functions/sources.js` — **built** — JavaScript

## tools/ — local scripts for model generation
_Files: 2_

- `tools/README.md` — **built** — Tools
- `tools/compute_qoli.py` — **built** —

## data/ — model inputs, scaffolds, and content payloads
_Files: 64_

- `data/ai/ai_capability_scenarios.json` — **built** — JSON (notes, timepoints)
- `data/ai/dividend_math_scaffold.json` — **scaffold** — JSON (notes, assumptions, formula, example_base_case)
- `data/ai/sector_displacement_scaffold.json` — **scaffold** — JSON (notes, sectors, interpretation)
- `data/finance/budget_line_items_scaffold.json` — **scaffold** — JSON (meta, status_quo, wmr)
- `data/finance/fiscal_and_debt_model_scaffold.json` — **scaffold** — JSON (meta, starting_point_placeholders, status_quo, wmr)
- `data/finance/government_funding_scaffold.json` — **scaffold** — JSON (notes, principles, revenue_streams, where_money_is_generated, how_capitalism_works_under_wmr, collection_institutions_scaffold)
- `data/finance/household_translation_scaffold.json` — **scaffold** — JSON (meta, inputs, status_quo, wmr)
- `data/finance/true_costs_ledger_scaffold.json` — **scaffold** — JSON (meta, categories, status_quo, wmr, growth_rates_annual)
- `data/live/baselines_snapshot.json` — **built** — JSON (meta, last_pull, geography, acs, bls)
- `data/live/pull_log_scaffold.json` — **scaffold** — JSON (meta, pulls)
- `data/qol/quality_of_life_index_scaffold.json` — **scaffold** — JSON (meta, dimensions, scoring)
- `data/qoli/config.json` — **built** — JSON (index_name, timepoints_years, domains, scoring, transparency_standard)
- `data/qoli/costs/status_quo.json` — **built** — JSON (scenario_key, generated_at, notes, timepoints, ranges, disclaimer, model_standard)
- `data/qoli/costs/wmr.json` — **built** — JSON (scenario_key, generated_at, notes, timepoints, ranges, disclaimer, model_standard)
- `data/qoli/domains/affordability.json` — **built** — JSON (domain_key, domain_name, description, indicators)
- `data/qoli/domains/democratic_agency.json` — **built** — JSON (domain_key, domain_name, description, indicators)
- `data/qoli/domains/education.json` — **built** — JSON (domain_key, domain_name, description, indicators)
- `data/qoli/domains/health.json` — **built** — JSON (domain_key, domain_name, description, indicators)
- `data/qoli/domains/housing.json` — **built** — JSON (domain_key, domain_name, description, indicators)
- `data/qoli/domains/income_work.json` — **built** — JSON (domain_key, domain_name, description, indicators)
- `data/qoli/domains/infrastructure_access.json` — **built** — JSON (domain_key, domain_name, description, indicators)
- `data/qoli/domains/safety_justice.json` — **built** — JSON (domain_key, domain_name, description, indicators)
- `data/qoli/domains/time_stress.json` — **built** — JSON (domain_key, domain_name, description, indicators)
- `data/qoli/households.json` — **built** — JSON (households)
- `data/qoli/metrics/ai_multiplier_rules.json` — **built** — JSON (name, version, purpose, inputs, scenarios, notes)
- `data/qoli/metrics/democratic_agency.json` — **built** — JSON (domain_key, domain_name, notes, timepoints)
- `data/qoli/metrics/household_impact_rules.json` — **built** — JSON (version, notes, cashflow, estimated_savings_per_qoli_point_per_member_usd_per_year, time, health)
- `data/qoli/metrics/household_variants.json` — **built** — JSON (notes, variants, mapping_rules)
- `data/qoli/metrics/safety_justice.json` — **built** — JSON (domain_key, domain_name, notes, timepoints)
- `data/qoli/outputs/base_working_family.json` — **built** — JSON (household_key, generated_at, timepoints, disclaimer)
- `data/qoli/outputs/base_working_family_ai_adjusted.json` — **built** — JSON (meta, scenarios)
- `data/qoli/outputs/baseline.json` — **built** — JSON (qoli, domains, baseline_selector)
- `data/qoli/outputs/baseline_ai_adjusted_bands.json` — **built** — JSON (meta, baseline, scenarios)
- `data/qoli/outputs/household_projections_scaffold.json` — **scaffold** — JSON (meta, variants)
- `data/qoli/scenarios.json` — **built** — JSON (scenarios, ranges)
- `data/rooms/manifest.json` — **content** — JSON (version, title, rooms)
- `data/rooms/room001.html` — **content** —
- `data/rooms/room002.html` — **content** —
- `data/rooms/room003.html` — **content** —
- `data/rooms/room004.html` — **content** —
- `data/rooms/room005.html` — **content** —
- `data/rooms/room006.html` — **content** —
- `data/rooms/room007.html` — **content** —
- `data/rooms/room008.html` — **content** —
- `data/rooms/room009.html` — **content** —
- `data/rooms/room010.html` — **content** —
- `data/rooms/room011.html` — **content** —
- `data/rooms/room012.html` — **content** —
- `data/rooms/room013.html` — **content** —
- `data/rooms/room014.html` — **content** —
- `data/rooms/room015.html` — **content** —
- `data/rooms/room016.html` — **content** —
- `data/rooms/room017.html` — **content** —
- `data/rooms/room018.html` — **content** —
- `data/rooms/room019.html` — **content** —
- `data/rooms/room020.html` — **content** —
- `data/rooms/room021.html` — **content** —
- `data/rooms/room022.html` — **content** —
- `data/rooms/room023.html` — **content** —
- `data/rooms/room024.html` — **content** —
- `data/rooms/room025.html` — **content** —
- `data/trajectories/pillar_engine_v57.json` — **built** — JSON (meta, horizons, pillars, helpers)
- `data/trajectories/trajectory_engine_v56.json` — **built** — JSON (meta, horizons, scenarios, qol_index)
- `data/transport/transport_cost_phasing_scaffold.json` — **scaffold** — JSON (notes, time_horizons_years, phases, unit_cost_placeholders, benefit_channels)

## dives/ — behind-the-house deep dives (Act I)
_Files: 38_

- `dives/act-i/README.md` — **content** — Act I Deep Dive Seed v1
- `dives/act-i/cracks.html` — **content** —
- `dives/act-i/index.html` — **content** —
- `dives/act-i/no-villains.html` — **content** —
- `dives/act-i/room01.html` — **content** —
- `dives/act-i/room02.html` — **content** —
- `dives/act-i/room03.html` — **content** —
- `dives/act-i/room04.html` — **content** —
- `dives/act-i/room05.html` — **content** —
- `dives/act-i/room06.html` — **content** —
- `dives/act-i/room07.html` — **content** —
- `dives/act-i/room08.html` — **content** —
- `dives/act-i/room09.html` — **content** —
- `dives/act-i/room10.html` — **content** —
- `dives/act-i/room11.html` — **content** —
- `dives/act-i/room12.html` — **content** —
- `dives/act-i/room13.html` — **content** —
- `dives/act-i/room14.html` — **content** —
- `dives/act-i/room15.html` — **content** —
- `dives/act-i/room16.html` — **content** —
- `dives/act-i/room17.html` — **content** —
- `dives/act-i/room18.html` — **content** —
- `dives/act-i/room19.html` — **content** —
- `dives/act-i/room20.html` — **content** —
- `dives/act-i/room21.html` — **content** —
- `dives/act-i/room22.html` — **content** —
- `dives/act-i/room23.html` — **content** —
- `dives/act-i/room24.html` — **content** —
- `dives/act-i/room25.html` — **content** —
- `dives/act-i/silence.html` — **content** —
- `dives/act-i/stress-signal.html` — **content** —
- `dives/act-i/structure.html` — **content** —
- `dives/act-i/weight.html` — **content** —
- `dives/act-i/window.html` — **content** —
- `dives/room-moods.html` — **content** —
- `dives/the-weight.html` — **content** —
- `dives/what-is-a-room.html` — **content** —
- `dives/why-no-blame.html` — **content** —

## docs/ — canonical documentation spine
_Files: 54_

- `docs/00_README_START_HERE.md` — **spec** — Working Majority Republic — Documentation Spine (Start Here)
- `docs/01_Vision_Guardrails.md` — **spec** — Vision & Guardrails (Non‑Negotiables)
- `docs/02_Book_Blueprint.md` — **spec** — Book Blueprint (Primary Artifact — Next Phase)
- `docs/03_Website_Architecture.md` — **spec** — Website Architecture (IA + Book Mapping Rules)
- `docs/04_Modeling_Standards.md` — **spec** — Modeling Standards (QoL / Pillars / Scenarios)
- `docs/05_Content_Style_Guide.md` — **spec** — Content Style Guide (Neutral, High-Trust Voice)
- `docs/06_Governance_System_Spec.md` — **spec** — Governance System Spec (Decentralized, Worker-First Democracy)
- `docs/07_Economy_Wealth_Work_Spec.md` — **spec** — Economy, Wealth, and Work (Capitalism for the 90%)
- `docs/08_Global_Stage_DeepDive_Plan.md` — **spec** — Global Stage Deep Dive (Opt‑In, Evidence‑First)
- `docs/09_Organizing_Action_Playbook.md` — **spec** — Organizing Action Playbook (End-of-Book → Real Life)
- `docs/10_Monetization_Integrity.md` — **spec** — Monetization & Integrity (Funding Without Capture)
- `docs/11_Risk_and_Attack_Surface.md` — **spec** — Risk & Attack Surface (How this gets misread)
- `docs/12_Roadmap_Phases.md` — **spec** — Roadmap Phases (Book-First to Movement)
- `docs/book/00_BOOK_PHYSICS.md` — **spec** — Book Physics & Geometry — Core Specification (v1)
- `docs/book/01_ROOM_ARCHITECTURE.md` — **spec** — Room-Based Narrative Architecture (v1)
- `docs/book/02_EMOTIONAL_SCORE.md` — **spec** — Emotional Scoring & Pacing (v1)
- `docs/book/03_PSYCHOLOGICAL_RESONANCE.md` — **spec** — Psychological Resonance Model (v1)
- `docs/book/04_DIGITAL_DELIVERY.md` — **spec** — Digital Delivery Philosophy (v1)
- `docs/book/05_BOOK_WEBSITE_CONTRACT.md` — **spec** — Book ↔ Website Contract (v1)
- `docs/book/06_100_PAGE_ROOM_BLUEPRINT.md` — **spec** — 100-Page Room Blueprint — v1
- `docs/book/07_HTML_ROOM_INTERACTION_MODEL.md` — **spec** — HTML Room Interaction Model — v1
- `docs/book/08_HTML_ROOM_INTERACTION_MODEL_v2.md` — **spec** — HTML Room Interaction Model — v2 (Mood + Bookmarks + Deep Dive Drawer)
- `docs/book/12_MICRO_BEATS_EPILOGUE.md` — **spec** — Epilogue Micro-Beats — *The House Is Ours* (v11)
- `docs/book/13_FINAL_INTEGRITY_CHECK.md` — **spec** — Final Integrity Check (v11)
- `docs/book/acts/ACT_I/00_ACT_I_MISSION.md` — **spec** — Act I Mission
- `docs/book/acts/ACT_I/01_ACT_I_EMOTIONAL_ARC.md` — **spec** — Act I Emotional Arc
- `docs/book/acts/ACT_I/02_ACT_I_THEMES.md` — **spec** — Act I Themes
- `docs/book/acts/ACT_I/03_ACT_I_CHARACTER_STATES.md` — **spec** — Act I Character States
- `docs/book/acts/ACT_I/04_ACT_I_ROOM_FUNCTIONS.md` — **spec** — Act I Room Functions
- `docs/book/acts/ACT_I/ACT_I_HTML_ROOM_SCAFFOLD_v1_README.md` — **scaffold** — Act I HTML Room Scaffold v1
- `docs/book/acts/ACT_I/ACT_I_ROOM_FUNCTIONS_FILLED.md` — **spec** —
- `docs/book/acts/ACT_I/ACT_I_ROOM_FUNCTIONS_GUIDANCE.md` — **spec** — Guidance for Filling Act I Room Functions
- `docs/book/acts/ACT_I/ACT_I_ROOM_FUNCTIONS_TABLE.md` — **spec** —
- `docs/book/acts/ACT_I/ACT_I_ROOM_FUNCTIONS_v2.md` — **spec** — Act I — Room Functions v2
- `docs/book/acts/ACT_I/ACT_I_ROOM_FUNCTIONS_v3.md` — **spec** — Act I — Room Functions v3 (Filled)
- `docs/book/audio/ACT_I_AUDIO_NAMING.md` — **spec** — Audio File Naming — Act I
- `docs/book/audio/ACT_I_AUDIO_SCORING_OVERVIEW.md` — **spec** — Act I — Audio Scoring Overview
- `docs/book/audio/ACT_I_GLOBAL_NARRATION_RULES.md` — **spec** — Global Narration Rules — Act I
- `docs/book/audio/ACT_I_ROOM_AUDIO_MAP.md` — **spec** —
- `docs/book/audio/ACT_I_SILENCE_PHILOSOPHY.md` — **spec** — Silence Philosophy — Act I
- `docs/book/canon/00_BOOK_PHILOSOPHY (2).md` — **spec** — Book Philosophy
- `docs/book/canon/00_BOOK_PHILOSOPHY.md` — **spec** — Book Philosophy
- `docs/book/canon/01_HOUSE_METAPHOR_SYSTEM.md` — **spec** — The House Metaphor System
- `docs/book/canon/02_ROOM_THEORY.md` — **spec** — Room Theory
- `docs/book/canon/03_TIME_AND_PACING.md` — **spec** — Time and Pacing
- `docs/book/canon/04_PSYCHOLOGICAL_ENGINE.md` — **spec** — Psychological Engine
- `docs/book/canon/05_READER_EXPERIENCE.md` — **spec** — Reader Experience
- `docs/book/canon/06_MONETIZATION_LAYERS.md` — **spec** — Monetization Layers
- `docs/book/canon/07_BEHIND_THE_HOUSE.md` — **spec** — Behind the House
- `docs/book/canon/08_NON_NEGOTIABLES.md` — **spec** — Non-Negotiables
- `docs/book/canon/09_MASTER_BUILD_LOCKBOX.md` — **spec** — Master Build: Story + Philosophy Architecture (Captured Notes)
- `docs/book/canon/README.md` — **spec** — Book Canon Folder
- `docs/book/plan` — **plan** —
- `docs/book/plan.txt` — **plan** —

## pages/ — Site pages (HTML)
_Files: 211_

### core nav & tooling (16)
- `pages/api-data.html` — **built** — Data APIs & Keys — Working Majority Republic
- `pages/assumptions-and-ranges.html` — **built** — Assumptions & Ranges — Working Majority Republic
- `pages/docs-spine.html` — **built** — Documentation Spine — Working Majority Republic
- `pages/model-overview.html` — **built** — The Model — Working Majority Republic
- `pages/moderation.html` — **built** — Moderation — Working Majority Republic
- `pages/pillar-engine.html` — **built** — Pillar Engine Spec — Working Majority Republic
- `pages/pillar-scorecards.html` — **built** — Pillar Scorecards — Working Majority Republic
- `pages/pillar-timelines.html` — **built** — Pillar Timelines — Working Majority Republic
- `pages/roadmap.html` — **built** — Pragmatic Roadmap — Working Majority Republic
- `pages/scenario-panel.html` — **built** — Scenario Panel — Working Majority Republic
- `pages/scope.html` — **built** — Future scope map — Working Majority Republic
- `pages/snapshots.html` — **built** — Snapshots & Audit Trail — Working Majority Republic
- `pages/thanks.html` — **built** — Thank you — Working Majority Republic
- `pages/trajectory-engine.html` — **built** — Trajectory Engine Spec — Working Majority Republic
- `pages/trajectory-hub.html` — **built** — Decade-by-Decade Futures — Working Majority Republic
- `pages/vision.html` — **built** — Future Vision — Working Majority Republic

### pillar hub pages (8)
- `pages/pillars/ai.html` — **built** — AI & Technology Futures — Working Majority Republic
- `pages/pillars/democracy.html` — **built** — Democracy & Accountability — Working Majority Republic
- `pages/pillars/economy.html` — **built** — Capitalism for the 90% — Working Majority Republic
- `pages/pillars/education.html` — **built** — Education & Skills — Working Majority Republic
- `pages/pillars/health.html` — **built** — Health, Stress, and Care — Working Majority Republic
- `pages/pillars/housing.html` — **built** — Housing & Homeownership — Working Majority Republic
- `pages/pillars/mobility.html` — **built** — Mobility, Time, and Transportation — Working Majority Republic
- `pages/pillars/safety.html` — **built** — Safety, Justice, and Prisons — Working Majority Republic

### pillar: AI (7)
- `pages/ai-and-automation.html` — **built** — AI & Automation — Working Majority Republic
- `pages/ai-baseline-and-participation.html` — **built** — Baseline, Participation & the Social Floor — Working Majority Republic
- `pages/ai-governance.html` — **built** — AI Governance — Working Majority Republic
- `pages/ai-jobs-and-dividend.html` — **built** — AI: Jobs & Dividend Model — Working Majority Republic
- `pages/ai-jobs-transition.html` — **built** — Jobs, Automation & Transition — Working Majority Republic
- `pages/ai-timeline.html` — **built** — AI → Super-AI Timeline — Working Majority Republic
- `pages/ai-wealth-control.html` — **built** — AI Wealth & Anti-Monopoly Controls — Working Majority Republic

### policy pages (111)
- `pages/anti-corruption.html` — **built** — Anti-Corruption & Money Neutralization — Working Majority Republic
- `pages/anti-hoarding-property.html` — **built** — Anti-Hoarding & Anti-Monopoly Property Rules — Working Majority Republic
- `pages/antitrust-monopoly.html` — **built** — Antitrust & Monopoly Breakup — Working Majority Republic
- `pages/automation-dividend.html` — **built** — Automation Dividend & Workforce Transition — Working Majority Republic
- `pages/automation.html` — **built** — Automation & AI Displacement — Working Majority Republic
- `pages/baselines.html` — **built** — Observed Baselines Dashboard — Working Majority Republic
- `pages/book/house-reader/index.html` — **built** — The House We Live In — Reader
- `pages/budget-line-items.html` — **built** — Budget Line Items — Working Majority Republic
- `pages/civil-rights-secular.html` — **built** — Civil Rights & Religious Neutrality — Working Majority Republic
- `pages/community-energy.html` — **built** — Community Energy & Local Ownership — Working Majority Republic
- `pages/community-policing.html` — **built** — Community Policing & Local Control — Working Majority Republic
- `pages/community-safety.html` — **built** — Community Safety & People’s Police — Working Majority Republic
- `pages/courts-restorative.html` — **built** — Courts, Diversion & Restorative Justice — Working Majority Republic
- `pages/data-rights.html` — **built** — Personal Data Rights — Working Majority Republic
- `pages/debt-reset.html` — **built** — Debt Reset — Working Majority Republic
- `pages/decentralized-governance.html` — **built** — Decentralized Governance & Local Sovereignty — Working Majority Republic
- `pages/defense-service.html` — **built** — Defense & Service Incentives — Working Majority Republic
- `pages/democracy.html` — **built** — Democracy & Representation — Working Majority Republic
- `pages/digital-rights.html` — **built** — Digital Civil Rights — Working Majority Republic
- `pages/diplomacy-alliance.html` — **built** — Diplomacy & Alliances — Working Majority Republic
- `pages/disability.html` — **built** — Disability & Dignity — Working Majority Republic
- `pages/distributions.html` — **built** — Distributions & Real-World Burden — Working Majority Republic
- `pages/economic-citizenship.html` — **built** — Economic Citizenship — Working Majority Republic
- `pages/economy.html` — **built** — Economy & Markets — Working Majority Republic
- `pages/education-and-skills.html` — **built** — Education & Skills — Working Majority Republic
- `pages/education-public-private.html` — **built** — Education: Public First, Private Allowed — Working Majority Republic
- `pages/energy-and-utilities.html` — **built** — Energy & Utilities — Working Majority Republic
- `pages/energy-climate-transition.html` — **built** — Energy & Climate Transition — Working Majority Republic
- `pages/energy-system.html` — **built** — Energy System Transition — Working Majority Republic
- `pages/energy-transition.html` — **built** — Energy Transition — Working Majority Republic
- `pages/environment-natural-commons.html` — **built** — Environment, Land & the Natural Commons — Working Majority Republic
- `pages/environment.html` — **built** — Environment & Resilience — Working Majority Republic
- `pages/fair-trade.html` — **built** — Fair Trade & Domestic Capacity — Working Majority Republic
- `pages/farm-fairness.html` — **built** — Farmer Fairness & Anti-Monopoly Agriculture — Working Majority Republic
- `pages/finance-banking-transition.html` — **built** — Finance & Banking Transition — Working Majority Republic
- `pages/finance-transition.html` — **built** — Finance Transition — Working Majority Republic
- `pages/fiscal-model.html` — **built** — Fiscal Model — Working Majority Republic
- `pages/food-and-agriculture.html` — **built** — Food Security & Agriculture — Working Majority Republic
- `pages/food-guarantee.html` — **built** — Food Guarantee & Nutrition Floor — Working Majority Republic
- `pages/food-hubs.html` — **built** — Food Hubs & Local Logistics — Working Majority Republic
- `pages/food-justice.html` — **built** — Food Justice & Food Availability — Working Majority Republic
- `pages/food-prices-transparency.html` — **built** — Price Transparency & Supply Chain Accountability — Working Majority Republic
- `pages/food-rural-access.html` — **built** — Rural Food Access — Working Majority Republic
- `pages/food-security.html` — **built** — Food Security — Working Majority Republic
- `pages/foreign-policy.html` — **built** — Foreign Policy & Global Role — Working Majority Republic
- `pages/free-education.html` — **built** — Free Education (Pre-K to Career) — Working Majority Republic
- `pages/freight-and-logistics.html` — **built** — Freight & Logistics — Working Majority Republic
- `pages/global-stage.html` — **built** — Global Stage — Working Majority Republic
- `pages/governance-decentralization.html` — **built** — Transparent & Decentralized Governance — Working Majority Republic
- `pages/government-funding.html` — **built** — How We Pay for Government — Working Majority Republic
- `pages/grid-modernization.html` — **built** — Grid Modernization & Resilience — Working Majority Republic
- `pages/health-and-wellbeing.html` — **built** — Health & Wellbeing — Working Majority Republic
- `pages/healthcare-governance.html` — **built** — Healthcare Governance & Universal Care — Working Majority Republic
- `pages/home-ownership-pathways.html` — **built** — Home Ownership Pathways — Working Majority Republic
- `pages/household-impact-sliders.html` — **built** — Household Impact Sliders — Working Majority Republic
- `pages/household-impact-views.html` — **built** — Household Impact Views — Working Majority Republic
- `pages/household-impact.html` — **built** — Household Impact Simulator — Working Majority Republic
- `pages/housing-and-ownership.html` — **built** — Housing & Ownership — Working Majority Republic
- `pages/housing-clt.html` — **built** — Community Land Trusts — Working Majority Republic
- `pages/housing-homeownership.html` — **built** — Housing & Homeownership — Working Majority Republic
- `pages/housing-mortgage-rails.html` — **built** — Mortgage Rails & Debt Transition — Working Majority Republic
- `pages/housing-supply.html` — **built** — Housing Supply & Zoning — Working Majority Republic
- `pages/housing-tenant-rules.html` — **built** — Universal Landlord/Tenant Rules — Working Majority Republic
- `pages/housing.html` — **built** — Housing & Homeownership — Working Majority Republic
- `pages/immigration.html` — **built** — Immigration & the Shadow Labor Market — Working Majority Republic
- `pages/justice-safety.html` — **built** — Justice & Community Safety — Working Majority Republic
- `pages/justice.html` — **built** — Justice & Safety — Working Majority Republic
- `pages/land-stewardship.html` — **built** — Land Stewardship & Local Ownership — Working Majority Republic
- `pages/local-food-systems.html` — **built** — Local Food Systems & Resilience — Working Majority Republic
- `pages/medical-debt-reset.html` — **built** — Medical Debt Abolition — Working Majority Republic
- `pages/medical-debt.html` — **built** — Medical Debt Elimination — Working Majority Republic
- `pages/mental-health.html` — **built** — Mental Health Infrastructure — Working Majority Republic
- `pages/model-sources.html` — **built** — Model Sources & Methods — Working Majority Republic
- `pages/mortgage-transition.html` — **built** — Mortgage Reform & Transition Plan — Working Majority Republic
- `pages/national-debt-paydown.html` — **built** — National Debt Paydown — Working Majority Republic
- `pages/poverty-floor.html` — **built** — Poverty Floor — Working Majority Republic
- `pages/predatory-finance.html` — **built** — Predatory Finance & Junk Fees — Working Majority Republic
- `pages/prison-crime.html` — **built** — Prison & Crime System Overhaul — Working Majority Republic
- `pages/prisons-reentry.html` — **built** — Prisons, Sentencing & Reentry — Working Majority Republic
- `pages/private-education.html` — **built** — Private Education & Incentives — Working Majority Republic
- `pages/public-banking.html` — **built** — Public Banking Option — Working Majority Republic
- `pages/public-health-prevention.html` — **built** — Public Health & Prevention — Working Majority Republic
- `pages/resilience-hubs.html` — **built** — Resilience Hubs & Community Continuity — Working Majority Republic
- `pages/retirement-social-security.html` — **built** — Retirement, Social Security & the People’s Wealth Fund — Working Majority Republic
- `pages/retirement.html` — **built** — Retirement & Social Security — Working Majority Republic
- `pages/rural-mobility.html` — **built** — Rural Mobility & Incentives — Working Majority Republic
- `pages/skills-apprenticeships.html` — **built** — Skills, Apprenticeships & Trades — Working Majority Republic
- `pages/stress-reduction.html` — **built** — Stress Reduction by Design — Working Majority Republic
- `pages/student-debt-reset.html` — **built** — Student Debt Reset & Education Debt Abolition — Working Majority Republic
- `pages/surplus-allocation.html` — **built** — Surplus Allocation Rules — Working Majority Republic
- `pages/surplus-projection.html` — **built** — Surplus Allocation Projection — Working Majority Republic
- `pages/technology-data-ai.html` — **built** — Technology, Data Rights, AI & Automation — Working Majority Republic
- `pages/tenant-rights.html` — **built** — Universal Tenant & Landlord Rules — Working Majority Republic
- `pages/transport-energy.html` — **built** — Transportation Energy & Efficiency — Working Majority Republic
- `pages/transport-phasing-and-cost.html` — **built** — Phasing & Costs — Working Majority Republic
- `pages/transport-rural-urban.html` — **built** — Rural ⇄ Urban Mobility — Working Majority Republic
- `pages/transport-urban.html` — **built** — Urban & Suburban Mobility — Working Majority Republic
- `pages/transportation.html` — **built** — Universal Transportation — Working Majority Republic
- `pages/true-costs-ledger.html` — **built** — True Costs Ledger — Working Majority Republic
- `pages/true-costs.html` — **built** — True Costs Ledger — Working Majority Republic
- `pages/universal-broadband.html` — **built** — Universal Broadband — Working Majority Republic
- `pages/universal-healthcare.html` — **built** — Universal Healthcare — Working Majority Republic
- `pages/universal-transportation.html` — **built** — Universal Transportation Network — Working Majority Republic
- `pages/urban-transit.html` — **built** — Urban/Suburban Transit — Working Majority Republic
- `pages/utilities-fire-water.html` — **built** — Utilities: Fire & Water Reliability — Working Majority Republic
- `pages/utilities-public-safety.html` — **built** — Universal Utilities & Public Safety Infrastructure — Working Majority Republic
- `pages/utility-governance.html` — **built** — Utility Governance & Transparency — Working Majority Republic
- `pages/water-utilities.html` — **built** — Water Utilities & Safe Water Guarantee — Working Majority Republic
- `pages/watersheds.html` — **built** — Watershed Protection — Working Majority Republic
- `pages/wealth-limits.html` — **built** — Wealth Limits & Oligarchy Prevention — Working Majority Republic
- `pages/wellbeing.html` — **built** — Wellbeing: Mental & Physical Health — Working Majority Republic

### models: QoL/QoLI (14)
- `pages/qol-index.html` — **built** — Quality of Life Index — Working Majority Republic
- `pages/qol-timeline.html` — **built** — Quality of Life Timeline — Working Majority Republic
- `pages/qoli-affordability.html` — **built** — QoLI Domain: Affordability — Working Majority Republic
- `pages/qoli-ai-domain-breakdown.html` — **built** — QoLI: AI Domain Breakdown — Working Majority Republic
- `pages/qoli-ai-multiplier.html` — **built** — QoLI: AI Multiplier Projections — Working Majority Republic
- `pages/qoli-confidence-bands.html` — **built** — QoLI Confidence Bands — Working Majority Republic
- `pages/qoli-democratic-agency.html` — **built** — QoLI Domain: Democratic Agency — Working Majority Republic
- `pages/qoli-education.html` — **built** — QoLI Domain: Education — Working Majority Republic
- `pages/qoli-health.html` — **built** — QoLI Domain: Health — Working Majority Republic
- `pages/qoli-housing.html` — **built** — QoLI Domain: Housing Stability — Working Majority Republic
- `pages/qoli-index.html` — **built** — Quality of Life Index — Working Majority Republic
- `pages/qoli-methodology.html` — **built** — QoLI Methodology — Working Majority Republic
- `pages/qoli-safety-justice.html` — **built** — QoLI Domain: Safety & Justice — Working Majority Republic
- `pages/qoli-time-stress.html` — **built** — QoLI Domain: Time & Stress — Working Majority Republic

### impact-lab: impact pages (48)
- `pages/impact-ai-governance.html` — **built** — AI Governance Impact — Working Majority Republic
- `pages/impact-ai.html` — **built** — AI & Automation Impact — Working Majority Republic
- `pages/impact-automation.html` — **built** — Automation Impact — Working Majority Republic
- `pages/impact-civil-rights.html` — **built** — Civil Rights Impact — Working Majority Republic
- `pages/impact-community-safety.html` — **built** — Community Safety Impact — Working Majority Republic
- `pages/impact-costs.html` — **built** — Costs Impact — Working Majority Republic
- `pages/impact-data-rights.html` — **built** — Digital Civil Rights Impact — Working Majority Republic
- `pages/impact-debt-reset.html` — **built** — Debt Reset — Working Majority Republic
- `pages/impact-decentralized-governance.html` — **built** — Decentralized Governance Impact — Working Majority Republic
- `pages/impact-defense-service.html` — **built** — Defense Impact — Working Majority Republic
- `pages/impact-defense.html` — **built** — Defense & the Defense Budget — Working Majority Republic
- `pages/impact-demographics.html` — **built** — Demographic Impact — Working Majority Republic
- `pages/impact-disability.html` — **built** — Disability Impact — Working Majority Republic
- `pages/impact-education.html` — **built** — Education Impact — Working Majority Republic
- `pages/impact-energy-transition.html` — **built** — Energy Transition Impact — Working Majority Republic
- `pages/impact-energy-utilities.html` — **built** — Energy & Utilities Impact — Working Majority Republic
- `pages/impact-energy.html` — **built** — Energy & Climate Impact — Working Majority Republic
- `pages/impact-environment.html` — **built** — Resilience Impact — Working Majority Republic
- `pages/impact-finance-transition.html` — **built** — Finance Transition Impact — Working Majority Republic
- `pages/impact-finance.html` — **built** — Finance Transition Impact — Working Majority Republic
- `pages/impact-food-justice.html` — **built** — Food Justice Impact — Working Majority Republic
- `pages/impact-food.html` — **built** — Food Security — Working Majority Republic
- `pages/impact-foreign-policy.html` — **built** — Foreign Policy Impact — Working Majority Republic
- `pages/impact-gdp.html` — **built** — GDP & Macro Impact — Working Majority Republic
- `pages/impact-global-stage.html` — **built** — Global Stage Impact — Working Majority Republic
- `pages/impact-governance.html` — **built** — Governance Impact — Working Majority Republic
- `pages/impact-health.html` — **built** — Health & Wellbeing Impact — Working Majority Republic
- `pages/impact-healthcare.html` — **built** — Healthcare Governance Impact — Working Majority Republic
- `pages/impact-housing-supply.html` — **built** — Housing Supply Impact — Working Majority Republic
- `pages/impact-housing.html` — **built** — Housing & Homeownership — Working Majority Republic
- `pages/impact-immigration.html` — **built** — Immigration & the Shadow Labor Market — Working Majority Republic
- `pages/impact-infrastructure.html` — **built** — Infrastructure & Utilities Impact — Working Majority Republic
- `pages/impact-justice.html` — **built** — Prisons, Crime, and Recidivism — Working Majority Republic
- `pages/impact-lab.html` — **built** — Impact Lab — Working Majority Republic
- `pages/impact-medical-debt.html` — **built** — Medical Debt Impact — Working Majority Republic
- `pages/impact-monopoly.html` — **built** — Billionaires, Monopoly Power & Shared Growth — Working Majority Republic
- `pages/impact-poverty.html` — **built** — Poverty Floor — Working Majority Republic
- `pages/impact-predatory-finance.html` — **built** — Predatory Finance Impact — Working Majority Republic
- `pages/impact-prison-crime.html` — **built** — Prison & Crime Impact — Working Majority Republic
- `pages/impact-public-banking.html` — **built** — Public Banking Impact — Working Majority Republic
- `pages/impact-retirement.html` — **built** — Retirement & Intergenerational Security — Working Majority Republic
- `pages/impact-safety.html` — **built** — Community Safety (“People’s Police”) — Working Majority Republic
- `pages/impact-student-debt.html` — **built** — Student Debt Reset Impact — Working Majority Republic
- `pages/impact-technology.html` — **built** — Technology, AI & Data Rights Impact — Working Majority Republic
- `pages/impact-transportation.html` — **built** — Transportation Impact — Working Majority Republic
- `pages/impact-universal-broadband.html` — **built** — Universal Broadband Impact — Working Majority Republic
- `pages/impact-utilities.html` — **built** — Utilities Impact — Working Majority Republic
- `pages/impact-wellbeing.html` — **built** — Wellbeing Impact — Working Majority Republic

### stubs (7)
- `pages/stub-automation.html` — **scaffold** — Automation & AI Displacement — Working Majority Republic
- `pages/stub-disability.html` — **scaffold** — Disability & Dignity — Working Majority Republic
- `pages/stub-environment.html` — **scaffold** — Environment & Resilience — Working Majority Republic
- `pages/stub-housing-supply.html` — **scaffold** — Housing Supply & Zoning — Working Majority Republic
- `pages/stub-medical-debt.html` — **scaffold** — Medical Debt Elimination — Working Majority Republic
- `pages/stub-predatory-finance.html` — **scaffold** — Predatory Finance & Junk Fees — Working Majority Republic
- `pages/stub-public-banking.html` — **scaffold** — Public Banking Option — Working Majority Republic

## Next 50 concrete steps (ordered for momentum)
1. Confirm canonical information architecture: define the *one true* nav (pillars → subpages → tools → book) and wire all pages into it.
2. Create an auto-generated sitemap (static `sitemap.xml` + `robots.txt`) and ensure all intended pages are discoverable.
3. Add a `README.md` at repo root with: purpose, local dev, deploy, env vars, content conventions.
4. Normalize line endings: add `.gitattributes` rules and set `git config core.autocrlf` guidance for Windows.
5. Add `.netlifyignore` / `.gitignore` sanity: ensure `.env`, `.netlify`, `node_modules` are ignored (confirm).
6. Add Netlify env var checklist + redeploy notes; document keys required and fallback behavior.
7. Implement `/api/health` to include function version + git SHA (via build env) for debugging.
8. Create a `data/live/` pipeline design: what is pulled, when, and how it’s logged.
9. Implement pull logging (write to `data/live/pull_log.json` or a Netlify KV/DB later).
10. Decide whether the long-term persistence is: Netlify Blobs, Supabase, Neon, or Git-based data commits.
11. Build a **Sources** system: per-page citations + centralized source registry + pull timestamps.
12. Convert `netlify/functions/sources.js` from scaffold to live registry output (driven by `data/live/pull_log`).
13. Add caching strategy per endpoint: `Cache-Control` rules + ETag handling where appropriate.
14. Implement a strict allowlist for Census/BLS proxy parameters to prevent abuse and unexpected cost.
15. Add rate limiting / basic abuse protection for functions.
16. Establish model versioning: `data/qoli/outputs/v1/...`, `v2/...` etc. + page selector.
17. Finish QoLI math: replace placeholders in `tools/compute_qoli.py` using domain indicator definitions.
18. Define QoLI domain indicator schemas and normalize all `data/qoli/domains/*.json` into a consistent format.
19. Create confidence band logic and compute `baseline_ai_adjusted_bands.json` from rules, not hand edits.
20. Add household variants (rural/urban, renter/owner, single parent, disabled, retiree, etc.).
21. Add geography variants (US-wide first, then state/county) using Census ACS pulls.
22. Build a “Model Inputs” page that shows every assumption and links to its source.
23. Wire `/pages/qoli-*` pages to the computed outputs and ensure no duplicated scripts.
24. Create a single shared JS module for model widgets (reduce duplicated inline scripts).
25. Add unit tests for model math (even minimal) to prevent silent regressions.
26. Build the Fiscal Model engine: define the schema, compute outputs, render charts.
27. Build True Costs Ledger engine: define categories, compute totals, render comparisons.
28. Build Transport phasing engine: implement schedule/cost calculations and UI.
29. Create an “Impact Lab” hub that links to every impact-* page + definitions.
30. On every impact page: show status quo vs WMR deltas, sources, and confidence intervals.
31. Implement Trajectory Engine: load `data/trajectories/*.json`, render decade outcomes with drill-down.
32. Create a policy-to-model mapping: every policy page should state which model levers it changes.
33. Create pillar hubs (`pages/pillars/*.html`) as the main entry points with clear reader paths.
34. Establish content governance: editorial standards, moderation policy, change control, release notes.
35. Implement moderation queue for Netlify form submissions (or integrate a backend).
36. Build a public “Changelog” page listing model/version changes.
37. Build a “How to implement” playbook: phases, legislation, constitutional amendments, institutions, staffing.
38. Create a “Transition” roadmap that is politically realistic: local wins → state wins → federal package.
39. Define the constitutional skeleton: articles, amendments, and enforcement mechanisms.
40. Define the economic system skeleton: property rules, wealth limits, anti-monopoly, public options.
41. Define the democracy skeleton: anti-corruption, campaign finance redesign, voting systems, citizen assemblies.
42. Define the justice/safety skeleton: restorative courts, policing redesign, incarceration alternatives.
43. Build a glossary + concept map (one page + JSON-driven search).
44. Add site-wide search (lunr.js or simple index JSON).
45. Integrate the book experience with the governance model pages (book passages → policy links).
46. Add analytics with privacy-respecting defaults (optional).
47. Add accessibility pass (keyboard nav, contrast, reduced motion, skip links).
48. Add performance pass: preloading key CSS, minimizing duplicated markup, caching.
49. Create local dev workflow: `netlify dev` instructions, plus mock env vars.
50. Create CI: lint functions, validate JSON schemas, run model tests, ensure no broken links.
