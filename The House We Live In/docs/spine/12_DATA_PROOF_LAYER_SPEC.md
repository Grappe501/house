# Data & Proof Layer Spec (Level 3)

## The point
Not “prove we’re right.”  
Instead: **earn trust** through transparency.

## Core components
### 1) Indicator Dashboard (Quality of Life + stability)
Minimum indicators (initial):
- disposable income after essentials (proxy)
- housing cost burden (% income)
- medical debt burden (rate / dollars)
- time recovered (hours per household / year proxy)
- volatility (income variance proxy)
- civic access (participation friction proxy)

### 2) Assumptions Registry
A structured table (JSON + human page) describing:
- assumption name
- value/range
- source
- confidence
- sensitivity (high/med/low)
- where used (pages/tools)

### 3) Source Registry / Audit trail
A single endpoint already exists conceptually (`/api/sources`).
Extend it so every chart/tool can cite:
- dataset
- version/date pulled
- transformations

### 4) Sliders / “What if” tools
Tool types:
- policy lever slider (e.g., fee cap %, debt relief rate)
- adoption slider (participation %)
- implementation speed slider (years to scale)

Output:
- indicator deltas
- uncertainty bands (simple ranges first)

## Honesty rules
- show uncertainty; avoid false precision
- label what’s modeled vs measured
- link to methods (“how calculated”)

## Initial tool list (starter)
- “Junk Fees” cost burden slider
- “Public Banking” interest spread benefit slider
- “Housing Supply” affordability projection slider
- “Medical Debt” household relief calculator
