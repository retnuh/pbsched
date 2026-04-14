# Pickleball Practice Scheduler

## What This Is

A static single-page app hosted on GitHub Pages that helps a pickleball organizer schedule practice rounds. The organizer picks which club members showed up, sets a target number of rounds, and the app generates optimized matchups — grouping players into 2v2 courts with maximum variety so no one ends up playing with or against the same people repeatedly.

## Core Value

Generate fair, varied round matchups instantly — so the organizer can focus on running practice, not doing scheduling math in their head.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Multi-club support: user can create and switch between clubs, each with a named member roster
- [ ] Session management: pick attending members at session start; add/remove players mid-session
- [ ] Round generation: group players into 2v2 courts (4 players per court); handle odd counts with organizer-chosen fallback (sit out, 3-player court, etc.)
- [ ] Variety algorithm: randomly generate candidate round schedules, score them with penalties for repeated partner/opponent matchups, auto-select the best — with option to view and pick from top alternatives
- [ ] Advanced settings screen: expose and allow editing of scoring weights (penalty values for repeated pairings) with sensible defaults
- [ ] Mid-session player changes: when a player is added or removed, auto-regenerate remaining (unplayed) rounds
- [ ] Flexible round count: set a target number of rounds upfront, extend on the fly
- [ ] All data stored in localStorage — no server, no backend

### Out of Scope

- Score tracking — not needed for v1; scheduling only
- Court assignment — organizer just reads out the matchups, court numbers don't matter
- Multi-user / shared sessions — one organizer runs the app; no real-time sync
- Authentication — local storage only, no accounts

## Context

- Deployed as a static site on GitHub Pages — no server-side logic, no build pipeline required
- Runs on mobile (organizer's phone) — UI must be phone-friendly
- Data persistence via localStorage only; clubs, members, and session history live on-device
- Session = a practice evening with rounds; not an HTTP session
- Typical session: 6–12 players, 6–10 rounds, one organizer announcing matchups

## Constraints

- **Tech stack**: Vanilla JS/HTML/CSS or lightweight framework — no server, must deploy to GitHub Pages as static files
- **Persistence**: localStorage only — no external DB, no cookies for auth
- **Platform**: Mobile-first — designed for phone screen, thumb-friendly UI
- **Deployment**: GitHub Pages — everything must work as static assets

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Random-generate + score candidates (not deterministic solver) | Simpler to implement, easy to tune, produces good-enough results for small group sizes | — Pending |
| Organizer-chosen fallback for odd player counts | Different groups have different preferences; not worth hardcoding | — Pending |
| Advanced settings screen for scoring weights | Developer wants control; organizers don't need it by default | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-02 after initialization*
