# Deployment Pipeline (Git → Netlify)

## Current reality (repo)
- publish directory: `.`
- functions: `netlify/functions`
- routes: `/api/*` → functions

## Recommended setup
1) Connect Netlify to GitHub repo (main branch deploy)
2) Enable deploy previews for PRs (optional but ideal)
3) Add env vars:
   - `BLS_API_KEY`
   - `CENSUS_API_KEY` (if used)
4) Smoke tests after every deploy:
   - `/pages/book/house-reader/`
   - `/api/sources`
   - any tool pages
   - a Netlify form submission page

## Commit slicing
- Commit by coherent “rooms” (5 at a time)
- Separate commits for code vs content when possible

## Release discipline
- Tag milestones:
  - `v0.1-act1-complete`
  - `v0.2-reader-acts`
  - `v0.3-first-3deep-topics`
