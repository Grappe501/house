# Site Mapping & Linking Conventions (3‑Deep)

## The 3 depths (site-wide rule)
- **Level A:** What it is (Rooms + Explainers)
- **Level B:** Impact (Impact Lab pages)
- **Level C:** Mechanics/Proof (Mechanics pages + data + tools)

## URL conventions (recommended)
### Level A
- Rooms: `/pages/book/house-reader/` loads `/data/rooms/...`
- Explainers: `/pages/explain-<topic>.html`

### Level B
- Impact: `/pages/impact-<topic>.html`

### Level C
- Mechanics: `/pages/mechanics-<topic>.html`
- Dives: `/pages/book/dives/<act>/dive-<term>.html`
- Data: `/data/<domain>/...`
- Tools: `/pages/tools/<tool>.html` (or keep as simple pages)

## Cross-link rules
Every “topic cluster” must have:
1) A **Level A anchor** (room or explainer)
2) An **Impact page** (Level B)
3) A **Mechanics page** (Level C)

### Minimum link set per topic
- Explainer ↔ Impact (two-way)
- Impact ↔ Mechanics (two-way)
- Rooms that introduce the topic should link to either Explainer or Impact.

## Reader glossary behavior
- `data-def="..."` shows bubble definition
- `data-dive="/pages/book/dives/.../dive-xxx.html"` opens deep dive (modal or new tab)

## Naming conventions (content files)
- Room files: `room###.html` (or per act folder with same naming)
- Beat sheets: `Act_X_Room_Beat_Sheet.md`
- Act outlines: `Act_X_Master.md`
