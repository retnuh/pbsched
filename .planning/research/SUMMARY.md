# Project Research Summary

**Project:** Pickleball Practice Session Scheduler
**Domain:** Static SPA — client-only, local-first, mobile-first, GitHub Pages
**Researched:** 2026-04-02
**Confidence:** HIGH

## Executive Summary

This is a mobile-first, offline-capable single-page application built as a pure static site deployed to GitHub Pages. The problem it solves — generating fair, varied pickleball practice matchups for a group of 6–12 players with no backend, no account, and no connectivity requirement — is well-understood from both the scheduling literature and competitor product analysis. The recommended approach is Vanilla JS ES Modules + Vite 8 + Tailwind CSS v4, keeping the stack minimal and the architecture layered: a hash router and view layer over a service layer over a single StorageAdapter that owns all localStorage access. The scheduling algorithm is the domain core and the most technically interesting piece: random candidate generation with penalty-based scoring, greedy round-by-round, running in well under 5 ms at target scale.

The primary competitive differentiation is the combination of features no existing tool offers simultaneously: multi-club roster support, offline-first operation, no account required, and organizer-selectable top-N schedule alternatives. Every existing competitor (Pickleheads, PlayMore, MatchUp) requires accounts, depends on connectivity, and is either tournament-focused or lacks variety-optimization depth. This app targets the organizer standing courtside with a phone.

The critical risk is not technical sophistication — the algorithm is straightforward and the infrastructure is zero-ops static files — but execution discipline. Three pitfalls can cause serious user harm if skipped: (1) localStorage schema versioning must be built from the first line of persistence code, not retrofitted; (2) odd player count handling must be a first-class pre-pass in the algorithm, not an afterthought; and (3) iOS Safari layout bugs (`100vh`, `position: fixed`) must be addressed during UI development, not at the end. Building the SchedulerService as pure functions first, before any UI, is strongly recommended — it's the hardest piece and can be verified with unit tests in isolation.

## Key Findings

### Recommended Stack

Vite 8 + Vanilla JS (ES Modules) + Tailwind CSS v4 is the correct and well-supported choice for this scope. Tailwind v4 integrates directly into Vite via `@tailwindcss/vite` — no PostCSS config, no separate config file, a single `@import "tailwindcss"` in CSS. GitHub Pages deployment is handled by a GitHub Actions workflow. Vitest shares the Vite config with zero additional setup and is the right choice for unit testing the scheduler algorithm. Preact is the documented escalation path if vanilla JS component complexity grows past 8 interactive components with shared state, but is not needed at v1 scope.

**Core technologies:**
- Vite 8 (v8.0.3): Build tool and dev server — industry standard, zero-config HMR, official GitHub Pages deployment guide
- Vanilla JS ES2022+: App logic and UI — appropriate for ~5-screen app with no complex shared state tree; no framework overhead
- Tailwind CSS v4 (v4.2.2): Styling — zero-config with `@tailwindcss/vite`, mobile-first utilities, 5x faster builds than v3
- GitHub Actions: CI/CD — push-to-deploy on main; official Vite docs provide copy-paste workflow
- Vitest 4 (v4.1.2): Unit testing — shares Vite config, Jest-compatible API, essential for scheduler algorithm coverage

See `.planning/research/STACK.md` for version compatibility matrix and installation commands.

### Expected Features

The feature set is clearly bounded. The core session workflow (roster → attendance → generate rounds → display → advance) must be complete and solid at launch. Multi-club support, top-N alternatives, and mid-session player changes are validated v1.x additions once the core is confirmed useful. Score tracking, multi-device sync, skill-level balancing, and push notifications are all explicitly out of scope — they conflict with the static/local-first architecture constraint or dilute focus.

**Must have (table stakes):**
- Member roster management (add, remove, rename) per club — prerequisite for everything
- Attendance selection at session start — required before round generation
- Round generation with variety optimization — core product value; candidate scoring algorithm
- Odd player handling (sit-out or 3-player court, organizer-chosen) — every real session needs this
- Round display optimized for phone screen — organizer reads this aloud at courtside
- Mark round as played / advance to next round — required for session state tracking
- Set round count upfront; extend session on the fly — organizers pre-commit to session structure

**Should have (competitive differentiators for v1.x):**
- Multi-club roster support — no existing local-first tool handles this; data model must accommodate it from day one even if UI exposes only one club at launch
- View and choose from top-N generated schedules — unique among all competitors; gives organizer agency
- Mid-session player add/remove with round regeneration — most-praised feature in PlayMore; resolves the "someone showed up late" pain point

**Defer (v2+):**
- Tunable scoring weights (advanced settings screen) — sensible defaults cover most cases; add when organizers ask
- Session history / past session review — no immediate in-session value
- PWA / installable app shell — improves mobile UX but adds complexity; defer until usage justifies it

See `.planning/research/FEATURES.md` for full feature dependency graph, prioritization matrix, and competitor analysis.

### Architecture Approach

The architecture is a clean four-layer stack: View Layer (5 views) → Hash Router / Shell → Service Layer (ClubService, SessionService, SchedulerService) → StorageAdapter (single point of localStorage access). No view calls localStorage directly; no SchedulerService reads storage. Hash-based routing (`#/screen`) is mandatory over History API — GitHub Pages cannot serve fallback `index.html` for deep links without the fragile 404.html hack. The data model uses UUIDs for all IDs, embeds members in clubs, stores sessions as an append-only log, and snapshots penalty weights per session so global settings changes don't alter sessions in progress.

**Major components:**
1. StorageAdapter — versioned `get`/`set` wrapper over localStorage; runs schema migrations on boot; single migration entry point; all other modules import it, never localStorage directly
2. SchedulerService — pure functions with no I/O or side effects; `buildPairHistory(playedRounds)` → scoring maps; `generateRounds(attendees, playedRounds, targetCount, settings)` → `Round[]`; independently unit-testable before any UI exists
3. ClubService / SessionService — CRUD and session lifecycle; consume StorageAdapter; called by views
4. Hash Router — maps `window.location.hash` to view `mount(el, params)` / `unmount()` calls; back button works for free via `hashchange`
5. Views (ClubManager, MemberEditor, SessionSetup, RoundDisplay, Settings) — render DOM, handle events, call services; never share state through the DOM

See `.planning/research/ARCHITECTURE.md` for full data model schema, algorithm pseudocode, SchedulerService interface, and build order.

### Critical Pitfalls

1. **No localStorage schema versioning** — Store a `schemaVersion` integer from the very first persistence write. Run a recursive migration chain on every app boot before touching any other data. Retrofitting this after data is in users' browsers is painful with no recovery path.

2. **Odd player count edge cases not handled at algorithm level** — Resolve the odd-player policy (sit-out vs. 3-player court) as a pre-pass before candidate generation. The core algorithm must always receive a player count that divides evenly into 4-player courts. Test with 5, 6, 7, 9 players before any other scenario.

3. **iOS Safari viewport and fixed-position bugs** — Use `100dvh` (not `100vh`) for full-height containers. Prefer `position: sticky` over `position: fixed` for bottom-anchored action buttons. Test on a real iOS device with keyboard open before declaring any phase complete. DevTools mobile emulation does not reproduce these bugs.

4. **Biased candidate generation at small player counts** — With 6–8 players, the total unique partnership space is small. Build pairing history weighting into the candidate construction step, not just the scoring step. Minimum 200 candidates per slot. Verify variety scores don't plateau across 100 test runs at 6-player count.

5. **Tap targets too small for outdoor one-handed use** — All interactive elements must meet 44×44px minimum. Player list items need extended hit areas beyond visual boundaries. Destructive actions (clear session, remove player) must require confirmation and be placed away from frequently-tapped areas.

## Implications for Roadmap

Based on combined research, the architecture's own suggested build order (ARCHITECTURE.md, "Suggested Build Order") provides the correct phase structure. Dependencies are clear and the algorithm is explicitly identified as the highest-risk piece that benefits from being built and tested first.

### Phase 1: Data Foundation
**Rationale:** Everything else depends on the persistence layer. Schema versioning must be established before any data is written. This is also the lowest-risk place to make architectural decisions.
**Delivers:** StorageAdapter with versioned read/write, schema migration runner, canonical data model (Club, Member, Session, Round, AppSettings), feature-detect for private browsing / storage-denied
**Addresses:** Member roster persistence, multi-club data structure (accommodate from day one even if UI exposes one club)
**Avoids:** No schema versioning (Pitfall 1), unhandled QuotaExceededError (Pitfall 2), direct localStorage access in views (Anti-Pattern 1)

### Phase 2: Scheduling Algorithm
**Rationale:** The SchedulerService is the hardest and most domain-specific component. Building it as pure functions before any UI exists means it can be verified with Vitest unit tests against known inputs. Algorithmic bugs discovered here cost nothing; discovered after UI is built they cost much more.
**Delivers:** `buildPairHistory`, `generateCandidateRound`, `generateRounds`, `getTopAlternatives` — all covered by Vitest unit tests for 5–12 player counts including all odd-count cases
**Addresses:** Variety optimization, odd player handling, top-N alternatives generation
**Avoids:** Biased candidate generation (Pitfall 3), odd player count crashes (Pitfall 4), global optimization trap (Anti-Pattern 5), storing derived state (Anti-Pattern 2)

### Phase 3: Club and Roster Management
**Rationale:** The session workflow's first dependency is a populated roster. ClubService and the two roster views are low-risk and establish the navigation shell. Getting real member data into the app validates the data model before sessions are built.
**Delivers:** Hash Router shell, ClubManager view (list/create/rename clubs), MemberEditor view (add/remove/rename members), ClubService, bottom nav bar, mobile CSS baseline
**Addresses:** Member roster management, single-club UI (multi-club data model already ready from Phase 1)
**Avoids:** History API routing on GitHub Pages (Anti-Pattern 4), tap targets too small (Pitfall 6)

### Phase 4: Session Workflow — Core
**Rationale:** With storage, algorithm, and roster in place, the full session workflow can be built. This is the first end-to-end runnable version of the product. Odd player handling and round-state tracking must be complete here — not deferred.
**Delivers:** SessionSetup view (attendance selection, round count), SessionService (create session, track played rounds), RoundDisplay view (court-by-court display, mark as played, extend session), full session flow from start to final round
**Addresses:** Attendance selection, round generation, round display, mark round as played, set/extend round count
**Avoids:** Missing round-state tracking (high recovery cost per PITFALLS.md), iOS viewport bugs (Pitfall 5), XSS via localStorage to DOM

### Phase 5: Session Enhancements
**Rationale:** Once the core session flow is validated with real organizers, add the three v1.x differentiators. Mid-session player changes depend on round-state tracking from Phase 4. Top-N alternatives depend on the algorithm from Phase 2. These are additive features that don't require rearchitecting anything.
**Delivers:** AttendeeList view (mid-session add/remove with confirmation dialog), round regeneration for unplayed rounds, top-N alternative schedule picker, multi-club UI switcher
**Addresses:** Multi-club support (UI layer; data model was built in Phase 1), top-N schedule alternatives, mid-session player changes
**Avoids:** Silent regeneration without confirmation (UX pitfall), mid-session change corrupting played-round history

### Phase 6: Settings and Polish
**Rationale:** Settings are intentionally last — they wrap tunable knobs around the algorithm defaults, which need to be validated before the knobs are exposed. Polish is easier to apply once all features exist.
**Delivers:** Settings view (penalty weights, oddPlayerFallback, candidateCount, clear all data), first-launch data-stays-on-device notice, confirmation dialogs for all destructive actions, session-clear undo toast, real iOS device testing checkpoint, deploy pipeline verification
**Addresses:** Tunable scoring weights (P3), session history (P3 — light read-only view of past sessions)
**Avoids:** Accidental session clear (UX pitfall), missing "clear all data" (Security section), stale GitHub Pages cache (Integration Gotchas)

### Phase Ordering Rationale

- StorageAdapter before everything because all services depend on it and schema versioning must be day-one
- SchedulerService before views because it's independently testable as pure functions and is the highest-complexity piece — verify it first
- Club/roster before sessions because attendance selection requires a populated member list
- Core session flow before enhancements because mid-session changes depend on `played` round-state tracking being present
- Settings last because tunable weights require validated algorithm defaults

### Research Flags

Phases with well-documented patterns (skip deeper research):
- **Phase 1 (Data Foundation):** localStorage migration patterns are well-documented; StorageAdapter is standard; no novel decisions needed
- **Phase 3 (Club/Roster Management):** Hash routing, singleton service pattern, mount/unmount views — all established vanilla JS patterns
- **Phase 6 (Settings/Polish):** No novel technology; CSS fixes for iOS are documented in PITFALLS.md sources

Phases that may benefit from brief research-phase during planning:
- **Phase 2 (Scheduling Algorithm):** The candidate-construction weighting strategy (pairing history in construction vs. scoring only) may need validation against scheduling literature before committing to implementation. PITFALLS.md flags this as the most nuanced algorithmic decision.
- **Phase 4 (Session Workflow):** Odd player BYE sentinel pattern and 3-player court handling need explicit design before implementation — the policy interaction (organizer chooses once at app settings level vs. per-session) affects the data model.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against official release pages; Vite 8.0.3, Tailwind 4.2.2, Vitest 4.1.2 confirmed current as of 2026-04-02 |
| Features | HIGH | Core scheduling features verified across multiple competitor products; pickleball-specific organizer pain points confirmed through multiple sources |
| Architecture | HIGH | Well-established patterns (hash routing, singleton services, mount/unmount views, localStorage migration); no novel technology required |
| Pitfalls | MEDIUM-HIGH | localStorage and iOS mobile pitfalls HIGH from authoritative sources; scheduling algorithm bias pitfall MEDIUM from domain reasoning and sports scheduling literature |

**Overall confidence:** HIGH

### Gaps to Address

- **Candidate construction weighting:** PITFALLS.md recommends building pairing history into the candidate construction step (not just scoring), but the algorithm architecture in ARCHITECTURE.md describes scoring-only. These need to be reconciled during Phase 2 planning — the construction weighting approach is the safer choice for small player counts.
- **Odd player policy UX:** The data model supports `oddPlayerFallback` as a global app setting, but real organizer behavior may prefer per-session choice. Validate this with at least one real organizer before finalizing the SessionSetup view in Phase 4.
- **Multi-club data model validation:** Phase 1 must accommodate multi-club from the start (FEATURES.md is explicit about this), but the UI only exposes single-club. Ensure the `Club[]` array structure in `pb:clubs` is validated under multi-club assumptions even at Phase 1, so Phase 5 requires no data migration.

## Sources

### Primary (HIGH confidence)
- [Vite — Deploying a Static Site](https://vite.dev/guide/static-deploy) — GitHub Pages workflow, Vite 8.0.3 confirmed
- [GitHub Releases — vitejs/vite](https://github.com/vitejs/vite/releases) — v8.0.3 release date confirmed
- [Tailwind CSS v4 Blog Post](https://tailwindcss.com/blog/tailwindcss-v4) — v4 architecture, Vite plugin, zero-config
- [Tailwind GitHub Releases](https://github.com/tailwindlabs/tailwindcss/releases) — v4.2.2 confirmed latest
- [Vitest 4.0 release announcement](https://vitest.dev/blog/vitest-4) — v4.1.2 confirmed current
- [MDN — Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — localStorage quota and QuotaExceededError
- [localStorage migration pattern — Jan Monschke](https://janmonschke.com/simple-frontend-data-migration/) — versioned migration pattern

### Secondary (MEDIUM confidence)
- [Pickleheads Round Robin Guide](https://www.pickleheads.com/guides/pickleball-round-robin) — organizer pain points, competitor feature set
- [PlayMore App](https://getplaymore.com/) — mid-session add/remove feature validation
- [All-Play-All Round Robin App](https://www.allplayall.app/) — variety algorithm approach, odd player handling
- [Diamond Scheduler Blog](https://cactusware.com/blog/round-robin-scheduling-algorithms) — candidate scoring approach for small groups
- [Medium — Fixing the Safari Mobile Resizing Bug](https://medium.com/@krutilin.sergey.ks/fixing-the-safari-mobile-resizing-bug-a-developers-guide-6568f933cde0) — iOS Safari viewport fixes
- [DEV Community — Hash Routing for SPAs](https://dev.to/thedevdrawer/single-page-application-routing-using-hash-or-url-9jh) — GitHub Pages routing constraint

### Tertiary (MEDIUM-LOW confidence)
- [Round-Robin Sports Scheduling survey (CMU)](https://mat.tepper.cmu.edu/trick/survey.pdf) — algorithmic foundation for candidate-scoring approach
- WebSearch: mobile-first CSS frameworks 2025 — alternatives considered and rejected

---
*Research completed: 2026-04-02*
*Ready for roadmap: yes*
