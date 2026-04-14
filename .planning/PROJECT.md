# Pickleball Practice Scheduler

## What This Is

A static single-page PWA hosted on GitHub Pages that helps a pickleball organizer schedule practice rounds. The organizer picks which club members showed up, sets a target number of rounds, and the app generates optimized matchups — grouping players into 2v2 courts (with singles/3-way fallbacks) with maximum variety so no one ends up playing with or against the same people repeatedly. Short-sided match penalties are configurable so organizers can tune how strongly the scheduler avoids repeating unfair formats.

## Core Value

Generate fair, varied round matchups instantly — so the organizer can focus on running practice, not doing scheduling math in their head.

## Current Milestone: Milestone 7 — Match Editor

**Goal:** Let the organizer manually reassign players between courts and the rest bench before confirming or after a round is played.

**Target features:**
- Draggable player chips on a visual court layout
- Rest Bench area for sitting-out players
- Accessible from: current proposed match + most recently played match
- Edits to played rounds update scheduler history
- Mobile touch drag-and-drop

## Current State (after Milestone 6)

**Shipped:** 2026-04-14 (Milestone 6)
**Codebase:** ~2,574 lines Vanilla JS, deployed as static PWA on GitHub Pages

Milestone 6 delivered:
- Inline club name editing (tap pencil → edit → blur/Enter saves)
- Vitest test suite for session immutability (mid-session roster changes don't mutate played rounds)
- Configurable short-sided match penalties (singles, 3-way solo, 3-way pair) with Settings sliders
- Schema v2 migration (backward-compatible, no breaking change)
- All fairness slider ranges updated to 0-50 (0 = disable); plain-English organizer copy throughout

## Requirements

### Validated (Milestone 6)

- ✓ Multi-club support with named rosters — Milestone 6 (phases 1-3)
- ✓ Session management with attendance picker — Milestone 6 (phase 4)
- ✓ Round generation: 2v2 courts, odd-count fallback — Milestone 6 (phase 2)
- ✓ Variety algorithm: penalty-based scoring, best candidate auto-selected — Milestone 6 (phase 2)
- ✓ Mid-session player changes auto-regenerate unplayed rounds — Milestone 6 (phase 5)
- ✓ Advanced settings: scoring weight sliders with defaults — Milestone 6 (phase 6)
- ✓ PWA + offline support — Milestone 6 (phase 7)
- ✓ Inline club name editing — Milestone 6 (phase 8)
- ✓ Session immutability tests — Milestone 6 (phase 9)
- ✓ Configurable short-sided match penalties — Milestone 6 (phase 10)

### Active

- [ ] JSON export/import per club (CLUB-05/06) — requested, not yet prioritized
- [ ] Late arrival / early departure in-session player changes via UI (SESS-03/04) — logic exists, no dedicated UI flow
- [ ] Top-N alternative schedule picker (RGEN-03) — logic exists, partial UI
- [ ] Default odd-player policy per club (SETT-02) — skip per-round prompt

### Out of Scope

- Score tracking — scheduling only
- Court assignment — organizer reads matchups verbally
- Multi-user / shared sessions — single organizer, local-first
- Authentication — localStorage only
- DUPR / rating integration

## Context

- Deployed as static site on GitHub Pages — no server, no build pipeline required
- Runs on organizer's phone — mobile-first, thumb-friendly
- localStorage only; clubs, members, session history on-device
- Session = a practice evening; not an HTTP session
- Typical: 6-12 players, 6-10 rounds, one organizer

## Constraints

- **Tech stack**: Vanilla JS/HTML/CSS — no server, GitHub Pages static files
- **Persistence**: localStorage only
- **Platform**: Mobile-first — phone screen, thumb-friendly
- **Deployment**: GitHub Pages — everything as static assets

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Random-generate + score candidates (not deterministic solver) | Simpler, easy to tune, good-enough for small groups | ✓ Good — works well in practice |
| Organizer-chosen fallback for odd player counts | Different groups have different preferences | ✓ Good — preferred over hardcoding |
| Advanced settings screen for scoring weights | Developer wants control; organizers don't need defaults changed | ✓ Good — power users appreciate it |
| Exponential sit-out penalty (`base * 100^count`) | Prevents repeated sit-outs before others have had a turn | ✓ Good — fairness-over-equality semantics |
| Schema v2 migration with `?? default` fallbacks | Avoid breaking existing sessions | ✓ Good — zero-downtime deploy |
| Slider range 0-50 (0 = disable) | Organizers may want to fully disable certain penalty types | ✓ Good — more flexible than 1-50 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-14 — Milestone 7 started*
