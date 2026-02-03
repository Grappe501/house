# Guard Plan Assembler (Standalone Kernel)

This folder is a **reusable build kernel** for assembling and validating large markdown plans.

## Zero-bleed rule
- Tooling lives here (scripts/contracts/templates/prompts/config)
- **WMR plan content does NOT live here**
- _examples/ contains reference-only plan templates; do not wire into WMR directly.

## How to use in a project
1. Copy this folder into the project root (or keep as subtree/submodule)
2. Point .plan_guard/config.json to the project's plan path and output paths
3. Run the guard scripts to generate:
   - bundle JSON
   - markdown + json reports

## Safety
- Never commit generated uild/ outputs inside this module
- Never import _examples/ prose into WMR without rewriting
