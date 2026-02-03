# DOOR_SCHEMA  
### How Depth, Navigation, and Trust Are Connected

This document defines what a **Door** is, how it functions, and how it must be implemented across *The House We Live In*.

Doors are not links.  
They are not calls to action.  
They are not persuasion devices.

Doors are **intentional transitions between levels of understanding**.

---

## What a Door Is

A Door is a **deliberate invitation to go deeper**.

It connects:
- emotional readiness → explanation
- explanation → mechanics
- mechanics → proof

A Door always moves **forward in depth**, never sideways in argument.

If the reader chooses not to walk through a Door, the room or page must still stand on its own.

---

## What a Door Is Not

A Door must **never** be:

- A demand for agreement  
- A jump scare into complexity  
- A hidden argument  
- A replacement for evidence  
- A dead end  

If a Door requires belief to proceed, it is invalid.  
If a Door hides uncertainty, it is invalid.  
If a Door skips a level without signaling the shift, it is invalid.

---

## The Three Door Types

### Type A — Room → Page  
**Level 1 → Level 2**

**Purpose:**  
Move from emotional orientation to conceptual clarity.

**Used when:**  
- a room introduces a system, pattern, or tension
- the reader is ready to ask “how does this actually work?”

**Characteristics:**
- Plain language
- No policy prescriptions
- Framed as curiosity, not urgency

**Example (conceptual):**
> “If you want to see how this system operates in practice, you can step through here.”

---

### Type B — Page → Proof  
**Level 2 → Level 3**

**Purpose:**  
Allow inspection, skepticism, and verification.

**Used when:**  
- a page makes a concrete claim
- assumptions or mechanics matter

**Characteristics:**
- Explicit about uncertainty
- Points to data, registries, or tools
- Does not overwhelm by default

**Example (conceptual):**
> “Here’s what this explanation rests on—and where it might be wrong.”

---

### Type C — Room → Proof (Rare)  
**Level 1 → Level 3**

**Purpose:**  
Serve readers who skip explanation and want evidence immediately.

**Used sparingly.**

**Characteristics:**
- Clearly labeled as a depth jump
- Optional, never required
- Must include re-orientation text

**Example (conceptual):**
> “If you want to examine the evidence directly, this door goes there.”

---

## Required Door Structure (Canonical)

Every Door must include **all four components**:

### 1. Orientation Line
A sentence that explains *why* the Door exists.

- Signals depth increase
- Sets expectations
- Calms urgency

### 2. Destination Label
A clear, honest description of what’s on the other side.

- No hype
- No marketing language
- No euphemisms

### 3. Level Signal
Explicit indication of the level change.

Examples:
- “This goes deeper into the model.”
- “This opens the proof layer.”

### 4. Return Safety
An implicit or explicit assurance that the reader can return without penalty.

---

## Formatting Standard (HTML)

Doors in rooms or pages should follow this pattern:

```html
<div class="door">
  <p class="door-orientation">
    If you want to understand how this works structurally,
  </p>
  <a href="/pages/example.html" class="door-link">
    Step into the system model
  </a>
  <p class="door-level">
    (Level 2 · Explanation)
  </p>
</div>
