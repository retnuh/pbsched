---
created: 2026-04-13T22:10:20.904Z
title: Add drag-and-drop match editor with rest bench
area: ui
files: []
---

## Problem

There's currently no way to manually edit who is playing where in a proposed or recently-played round. Players who are sitting out also have no dedicated editing surface — they're managed separately. This makes it hard to quickly reorganize a round without re-generating it.

## Solution

Add a match edit screen accessible from:
1. The current proposed match (before marking played)
2. The most recently marked-played match

### Edit screen design
- Player names rendered as draggable chips/tokens
- Courts laid out visually — drag players between court slots to reassign
- A **"Rest Bench"** area where players sitting out can be dragged to/from
- Editing who sits out becomes: drag them to the rest bench (replaces the separate sit-out management flow)

### Scoring impact
- When a round is confirmed after editing, the edited assignments (not the original proposal) are recorded as the actual match
- The scheduler uses the edited match history when scoring future rounds (partner/opponent pair counts, format penalties, etc.)

### Constraints
- Should work well on mobile (touch drag-and-drop)
- Edits to already-played matches should update historical state used by the scheduler
