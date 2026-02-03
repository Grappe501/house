# HTML Room Interaction Model — v1
Date: 2026-01-31

This document defines the interactive reading experience for **The House We Live In**
as an iPad-first, page-turning “Room reader.” The paper book is visually designed
to echo these Rooms (lighting, margins, symbolism), while the website adds motion,
audio, notes, bookmarks, and deep dives.

---

## 1) Design Goals
**Primary goal:** Make the reader feel like they are *inside the House*—moving Room to Room—
while preserving a calm, literary tone.

### Non-negotiables
- **Page turn, not infinite scroll** (Room = 1 page view by default)
- **iPad-first** (touch, portrait/landscape)
- **Notes in margins** (like a real book)
- **Bookmarks / “Where I left off”**
- **Deep dives never disrupt the main reading flow**
- **Symbolic room styling** (light/dark, warmth/coolth, geometry, whitespace)

---

## 2) Core Interaction Model
### A. Navigation
- **Swipe left/right**: next/previous room
- **Tap left/right edges**: next/previous room
- **Keyboard arrows**: accessibility
- **House Map (floor plan)**: jump to any room

### B. Progress & Memory
- Auto-save “current Room” to local storage
- Bookmarks (multiple)
- “Continue reading” always available

### C. Notes & Highlights
- Right-side margin is the default note column
- Notes per Room stored locally (v1)
- Export notes to file (v2)
- Highlights stored as anchor IDs / ranges (v2)

### D. Deep Dive Entry (Discovery)
Words/phrases can behave differently:
- **Hover** → micro-definition bubble
- **Tap** → “Glossary card”
- **Long-press / icon** → “Open deep room” (side drawer)

**Rule:** Not every term is interactive. Discovery must feel rare and rewarding.

---

## 3) Room Visual Language (Symbol System)
Room styling communicates psychological state without explaining it.

### Room Archetypes → Visual cues
**Compression (Stress)**
- narrower text column
- tighter line height
- sharper contrast
- less whitespace
- darker or cooler palette

**Flow (Grounding)**
- balanced width
- stable leading
- neutral palette
- minimal motion

**Expansion (Beam / Growth)**
- slightly wider column
- more whitespace
- warmer palette
- slow “breath” motion (optional)

### Accessibility requirements
- Contrast checked
- Motion can be disabled (“Reduce motion”)
- Fonts legible; avoid decorative body fonts

---

## 4) Audio / Read-Along Model
### Target voice
- calm, consistent
- female
- younger
- educated
- warm authority

### v1 implementation
- Audio control UI + playback hooks
- Supports per-room audio file paths via manifest
- Read-along highlighting is a placeholder (sentence-level).

---

## 5) “Watch as it’s read” (Guided Reading)
Not a video.
A guided typographic experience:
- text reveals at narration pace
- subtle emphasis on key phrases
- optional ambient light shift per room

Motion is restrained and calm and always optional.

---

## 6) Content Model
Rooms stored as:
- `/data/rooms/manifest.json` (metadata)
- `/data/rooms/roomXXX.html` (Room body)

Manifest fields (v1):
- id, title, act, archetype, word_target
- mood: light/dark, warmth, geometry
- audio: optional file path
- links: deep dive pointers (optional)

---

## 7) Paper ↔ HTML Parity
The paperback/hardback uses:
- margin zones matching note columns
- subtle room markers (glyphs)
- intentional whitespace patterns

The website adds:
- discoverability
- audio
- bookmarks
- deep dives

---

## 8) Next Iterations
- v2: note export + highlight anchoring
- v3: token-level read-along highlighting
- v4: paid deep-dive gating + accounts
- v5: analytics + QoL model sliders
