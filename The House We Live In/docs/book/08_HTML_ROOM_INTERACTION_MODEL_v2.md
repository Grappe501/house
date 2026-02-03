# HTML Room Interaction Model — v2 (Mood + Bookmarks + Deep Dive Drawer)
Date: 2026-01-31

Adds three major capabilities to the House Reader:
1) **Mood System**: room mood controls CSS variables (light/dark/warm/cool/geometry).
2) **Bookmarks Panel**: view/jump/remove bookmarks; persistent "Continue reading".
3) **Deep Dive Drawer**: open "rooms within rooms" without leaving the main Room.

This is still a static-site friendly model (Netlify-ready).
No accounts required (localStorage only).

---

## Mood System
Rooms declare:
- mood.light: dark | dim | neutral | bright
- mood.warmth: cool | neutral | warm
- mood.geometry: tight | balanced | open

The reader maps these to CSS variables:
- background gradients
- text column width
- line-height / spacing (subtle)

A “Reduce motion” toggle is included; motion defaults calm.

## Bookmarks
- Bookmark current room
- Open bookmarks drawer
- Jump to bookmarked room
- Remove bookmark
- Continue reading: loads last roomIndex

## Deep Dive Drawer
Deep dive triggers:
- `data-dive="/dives/whatever.html"` on a phrase
- click opens right-side drawer with the deep content
- drawer has its own internal links; does not navigate away
- close returns instantly to the main room

Rule: Depth must never interrupt flow.
