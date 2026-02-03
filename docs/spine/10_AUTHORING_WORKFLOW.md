# Authoring Workflow (Cursor + Guard Rails)

## Working order (highest leverage)
1) Finish Act I rooms 009–025
2) Enable `data-dive` clicks in house-reader.js
3) Convert first two Impact Lab stubs
4) Create Mechanics pages for those two
5) Build Act II then Act III while repeating the topic pattern
6) Add completeness checker + QA gates

## Room drafting workflow (repeatable)
1) Open beat sheet entry (Act I Beat Sheet)
2) Copy `templates/ROOM_TEMPLATE.md`
3) Draft sensory detail (Flow/Compression)
4) Write the Beam line (if Beam room)
5) Write the Door Line (the final line)
6) Run reader straight-through test
7) Commit as a slice (5 rooms at a time)

## QA gates (definition of done)
### Gate 1 — Act I complete
- 0 TODO blocks in rooms 001–025
- reader loads without errors
- glossary and Door Lines behave

### Gate 2 — Full 3-act reader
- Acts I–III exist and are navigable end-to-end
- map drawer groups by act
- final room hands off to Level 2/3

### Gate 3 — 3-deep topic system is real
- each priority topic has Explainer + Impact + Mechanics
- links are two-way

### Gate 4 — deployment is one-button
- Git push triggers Netlify deploy
- functions work with env vars
- smoke tests pass

## Completeness checker (spec)
A simple script or page that flags:
- any `<!-- TODO:` in `/data/rooms/`
- any “STUB” marker in `/pages/`
- any missing dive pages referenced by `data-dive=`

Output:
- list of files + line excerpts
- counts by category
