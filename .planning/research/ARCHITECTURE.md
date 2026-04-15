# Architecture Research

**Domain:** Client-only static SPA — scheduling/round-generation tool
**Researched:** 2026-04-02 (original) / 2026-04-14 (Milestone 8 integration update)
**Confidence:** HIGH (well-established patterns, no novel technology required)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         VIEW LAYER                              │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  ClubManager │  │ SessionSetup │  │    RoundDisplay      │  │
│  │   (view)     │  │   (view)     │  │       (view)         │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  MemberEditor│  │  AttendeeList│  │    Settings (view)   │  │
│  │   (view)     │  │   (view)     │  │                      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         └─────────────────┼──────────────────────┘              │
│                           │ DOM events / render calls           │
├───────────────────────────┼─────────────────────────────────────┤
│                    ROUTER / SHELL                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Hash Router — maps #/screen to view, manages            │   │
│  │  back-stack, passes context params                       │   │
│  └───────────────────────────┬──────────────────────────────┘   │
├───────────────────────────────┼─────────────────────────────────┤
│                    SERVICE LAYER                                │
│                              │                                  │
│  ┌───────────────┐  ┌────────┴──────┐  ┌──────────────────┐   │
│  │  ClubService  │  │SessionService │  │  SchedulerService│   │
│  │               │  │               │  │  (round engine)  │   │
│  └───────┬───────┘  └───────┬───────┘  └────────┬─────────┘   │
│           └─────────────────┼───────────────────┘              │
│                             │ read/write                        │
├─────────────────────────────┼───────────────────────────────────┤
│                    PERSISTENCE LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  StorageAdapter — versioned get/set, migration runner    │   │
│  │  (wraps localStorage; single point of schema knowledge)  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| Hash Router | Maps `window.location.hash` to a view; fires `hashchange`; passes route params | All views (mounts/unmounts them) |
| ClubManager view | List clubs, create/rename/delete a club, navigate into a club | ClubService, Router |
| MemberEditor view | Add/remove/rename members in a club roster | ClubService |
| SessionSetup view | Pick attending members, set round count, start session | SessionService, ClubService |
| AttendeeList view | Mid-session add/remove players, shows current attendees | SessionService, SchedulerService |
| RoundDisplay view | Show generated rounds court-by-court, mark round played, trigger regeneration | SessionService |
| Settings view | Edit penalty weights, reset data, manage app config | StorageAdapter directly |
| ClubService | CRUD for clubs and member rosters | StorageAdapter |
| SessionService | Create session, track played rounds, manage attendee list | StorageAdapter, SchedulerService |
| SchedulerService | Generate candidate rounds, score them, return ranked list | (pure functions — no I/O) |
| StorageAdapter | Versioned read/write to localStorage; runs migrations on load | localStorage |

---

## Data Model

### Canonical Schema (localStorage keys)

```
appMeta         — { schemaVersion: number }
clubs           — Club[]
sessions        — Session[]        (append-only log; current session is last open one)
settings        — AppSettings
```

### Type Definitions

```typescript
// --- Clubs / Members ---

interface Club {
  id: string;             // uuid v4, generated on creation
  name: string;
  members: Member[];
  createdAt: string;      // ISO 8601
}

interface Member {
  id: string;             // uuid v4
  name: string;
}

// --- Sessions ---

interface Session {
  id: string;
  clubId: string;
  createdAt: string;
  status: 'active' | 'closed';
  attendeeIds: string[];  // member IDs present this session
  targetRounds: number;
  rounds: Round[];        // ordered; may be partially played
  settings: SessionSettings;  // snapshot of penalty weights at session start
}

interface Round {
  index: number;          // 0-based position in the sequence
  courts: Court[];
  sittingOut: string[];   // member IDs not assigned (odd-player fallback)
  played: boolean;        // organizer taps "played" to advance
}

interface Court {
  teamA: [string, string];  // member IDs
  teamB: [string, string];
}

// --- Settings ---

interface AppSettings {
  penaltyRepeatedPartner: number;    // default: 10
  penaltyRepeatedOpponent: number;   // default:  5
  penaltyRepeatedSitOut: number;     // default:  3
  candidateCount: number;            // default: 200
  topNToShow: number;                // default:   3
  oddPlayerFallback: 'sit-out' | 'three-player-court';
  theme: 'system' | 'light' | 'dark';  // added Milestone 8
}

interface SessionSettings extends AppSettings {}  // snapshot copy
```

### Key Schema Decisions

- **UUIDs for all IDs** — avoids index-collision bugs when items are deleted and re-added; safe to generate with `crypto.randomUUID()` (available in all modern browsers, no library needed).
- **Members embedded in Club** — roster for a club is small (< 30 names); embedding avoids a separate join and keeps reads simple.
- **Sessions as append-only log** — never mutate historical sessions; the active session is the last one with `status: 'active'`. This makes history retrieval trivial without a query layer.
- **Round `played` flag on each round** — rather than a pointer to "current round", every round carries its own played state. This makes regeneration of future rounds safe (replace rounds with `played: false` after current index).
- **Settings snapshot on session** — penalty weights in effect when a session was started are captured in `session.settings` so changing global settings mid-session does not retroactively alter a session already in progress.

---

## Round-Generation Algorithm Architecture

The scheduler is the most algorithmically complex component. It is implemented as **pure functions with no side effects** — no I/O, no state mutation. This makes it independently testable and easy to reason about.

### Algorithm: Random Candidate Selection with Penalty Scoring

This is the approach specified in PROJECT.md and is well-suited to the problem size (6–12 players, 6–10 rounds).

```
generateRounds(attendees, playedRounds, targetCount, settings)
  │
  ├── Build pairHistory from playedRounds
  │     partnerCount[playerA][playerB] = N   (times they partnered)
  │     opponentCount[playerA][playerB] = N  (times they opposed)
  │     sitOutCount[playerA] = N
  │
  ├── For each remaining round slot (current+1 .. target):
  │     Generate `settings.candidateCount` random arrangements
  │       └── shuffle attendees → assign groups of 4 to courts
  │           → randomly split each group into two teams
  │     Score each candidate:
  │       score += penaltyRepeatedPartner  × (partnerCount above threshold)
  │       score += penaltyRepeatedOpponent × (opponentCount above threshold)
  │       score += penaltyRepeatedSitOut   × (sitOutCount above threshold)
  │     Select lowest-score candidate as the round
  │     Update pairHistory with chosen round (for next slot's scoring)
  │
  └── Return Round[]
```

### Key Algorithmic Decisions

**Greedy slot-by-slot generation, not global optimization.** Generate the best round 1, then the best round 2 given round 1 was chosen, and so on. True global optimization (all rounds simultaneously) is overkill for 6–12 players — the greedy approach yields visually fair schedules with no perceptible quality penalty.

**`candidateCount` as a tunable knob.** Default 200. At 12 players, generating 200 candidates and scoring each takes < 1 ms in JS (confirmed: O(players²) scoring, < 72 pair-checks per candidate). No Web Worker needed.

**Top-N alternatives for organizer review.** After generating the sequence, re-run candidate generation for round 1 only, keep the top `settings.topNToShow` (default 3) lowest-scoring alternatives. The organizer can tap to swap between them. This does not affect subsequent round generation.

**Odd player handling is a pre-pass, not part of scoring.** If `attendees.length % 4 !== 0`, the pre-pass assigns sit-outs (or creates a 3-player court) according to `oddPlayerFallback` before candidate generation begins. This keeps the main algorithm always working with groups of exactly 4.

### SchedulerService Interface

```typescript
interface PairHistory {
  partnerCount: Record<string, Record<string, number>>;
  opponentCount: Record<string, Record<string, number>>;
  sitOutCount: Record<string, number>;
}

function buildPairHistory(playedRounds: Round[]): PairHistory;

function generateCandidateRound(
  attendees: string[],
  history: PairHistory,
  settings: SessionSettings
): { round: Round; score: number };

function generateRounds(
  attendees: string[],
  playedRounds: Round[],
  targetCount: number,
  settings: SessionSettings
): Round[];

function getTopAlternatives(
  attendees: string[],
  playedRounds: Round[],
  settings: SessionSettings,
  n: number
): Array<{ round: Round; score: number }>;
```

---

## localStorage Schema Design

### StorageAdapter Pattern

All localStorage access is funneled through a single `StorageAdapter` module. No view or service calls `localStorage.getItem` directly. This provides:
- A single migration entry point on app boot
- Consistent error handling (parse failures, quota exceeded)
- Easy swap to IndexedDB later if needed

### Key Layout

```
localStorage keys:
  "pb:meta"       → { schemaVersion: 2 }
  "pb:clubs"      → Club[]   (JSON)
  "pb:sessions"   → Session[] (JSON)
  "pb:settings"   → AppSettings (JSON)
```

Prefix `pb:` avoids collisions if the GitHub Pages domain is shared with other apps.

### Migration Pattern

```javascript
// On every app boot:
const meta = JSON.parse(localStorage.getItem('pb:meta') ?? '{"schemaVersion":0}');
const migrations = {
  0: (data) => { /* initial population, set defaults */ return { ...data, schemaVersion: 1 }; },
  1: (data) => { /* e.g., add penaltyRepeatedSitOut field */ return { ...data, schemaVersion: 2 }; },
};
function migrate(data) {
  const migrateFn = migrations[data.schemaVersion];
  if (!migrateFn) return data;                    // already current
  return migrate(migrateFn(data));                // recurse until current
}
```

Each migration handles exactly one version step. Users who skip multiple versions get all migrations applied in sequence.

### Data Size Estimate

| Key | Typical Size |
|-----|-------------|
| `pb:clubs` | ~1–2 KB (3 clubs, 15 members each) |
| `pb:sessions` | ~10–50 KB (20 sessions, 10 rounds each) |
| `pb:settings` | < 1 KB |

Total well under the 5 MB localStorage quota in all browsers. No quota management needed.

---

## Mobile-First Navigation Architecture

### Hash-Based Routing (recommended over History API)

For a GitHub Pages static site, hash-based routing (`#/screen`) is strongly preferred over the History API (`/screen`) because:
- History API requires server-side fallback config (returning `index.html` for all paths). GitHub Pages does not support this natively (requires a 404.html hack).
- Hash changes are 100% client-side with zero server involvement.
- Back button works correctly for free via `hashchange`.

### Route Map

```
#/                    → ClubManager (home — list/create clubs)
#/club/:clubId        → MemberEditor (view/edit a club's roster)
#/session/:clubId     → SessionSetup (pick attendees, set target rounds)
#/active              → RoundDisplay (in-progress session)
#/settings            → Settings (penalty weights, app config)
```

### Router Implementation Shape

```javascript
// router.js — minimal hash router
const routes = {
  '/':              ClubManagerView,
  '/club/:clubId':  MemberEditorView,
  '/session/:clubId': SessionSetupView,
  '/active':        RoundDisplayView,
  '/settings':      SettingsView,
};

window.addEventListener('hashchange', () => render(window.location.hash));
window.addEventListener('load',       () => render(window.location.hash || '#/'));

function render(hash) {
  const { view, params } = matchRoute(hash, routes);
  document.getElementById('app').innerHTML = '';
  view.mount(document.getElementById('app'), params);
}
```

Each view exports `{ mount(el, params), unmount() }`. The router calls `mount` with the container element and parsed route params. No global state is shared via the DOM — views read from services.

### Mobile UI Navigation Pattern

Single `<div id="app">` as the mount root. Navigation is full-view replacement (not tabs with hidden panels), which keeps DOM weight minimal and prevents stale state in unmounted panels.

Bottom navigation bar with 3-4 thumb-reachable icons is the appropriate pattern for mobile:
- Clubs (home)
- Active session (prominent, highlighted when session is active)
- Settings

The nav bar is rendered outside `#/app` as a persistent shell element. The router sets an `active` class on the current tab.

---

## Recommended Project Structure

```
/                         # repo root (GitHub Pages serves from here)
├── index.html            # shell: <div id="app">, <nav>, script imports
├── styles/
│   ├── base.css          # reset, custom properties (colors, spacing)
│   ├── layout.css        # shell layout, nav bar, viewport sizing
│   └── components.css    # buttons, cards, lists, form inputs
├── src/
│   ├── router.js         # hash router, route definitions, mount/unmount
│   ├── storage.js        # StorageAdapter: versioned get/set, migrations
│   ├── scheduler.js      # pure functions: buildPairHistory, generateRounds, score
│   ├── services/
│   │   ├── club.js       # ClubService: CRUD via StorageAdapter
│   │   ├── session.js    # SessionService: session lifecycle, round state
│   │   └── theme.js      # ThemeService: dark mode (added Milestone 8)
│   └── views/
│       ├── ClubManager.js
│       ├── MemberEditor.js
│       ├── SessionSetup.js
│       ├── RoundDisplay.js
│       ├── Settings.js
│       └── Help.js
```

No bundler required. All `src/` files are ES modules loaded via `<script type="module">` in `index.html`. Works natively in all modern browsers and deploys to GitHub Pages as plain files.

### Structure Rationale

- **`scheduler.js` at top level of `src/`** — it's the domain core; not a service (no I/O) and not a view. Flat placement signals its special status.
- **`storage.js` separate from `services/`** — services consume it but don't own it. Keeping it separate enforces the rule that only one module touches localStorage.
- **`styles/` split into 3 files** — base/layout/components separation avoids a monolithic CSS file while staying manageable without a CSS framework.
- **No `utils/` folder** — a dumping ground; helpers live in the module that owns them.

---

## Data Flow

### User Navigates to a Screen

```
User taps link / back button
  → hashchange fires
  → router.matchRoute(hash)
  → view.mount(appEl, params)
  → view calls service.getX()
  → service calls storage.get('pb:...')
  → storage parses JSON from localStorage
  → data flows back up: storage → service → view
  → view renders DOM
```

### Organizer Starts a Session

```
SessionSetup view: user taps "Start"
  → SessionService.createSession({ clubId, attendeeIds, targetRounds })
  → SchedulerService.generateRounds(attendees, [], targetRounds, settings)
  → SessionService saves session (with rounds) via StorageAdapter
  → Router navigates to #/active
  → RoundDisplay view mounts, reads session from SessionService
  → Displays round 0 courts
```

### Mid-Session Player Change

```
AttendeeList: organizer adds/removes player
  → SessionService.updateAttendees(sessionId, newAttendeeIds)
  → SessionService gets playedRounds (rounds where played === true)
  → SchedulerService.generateRounds(newAttendees, playedRounds, remainingCount, settings)
  → SessionService replaces unplayed rounds with new schedule
  → StorageAdapter saves updated session
  → RoundDisplay re-renders from updated session
```

### Data Flow Direction (summary)

```
Views ──read──→ Services ──read──→ StorageAdapter ──→ localStorage
Views ──write─→ Services ──write─→ StorageAdapter ──→ localStorage
Views ──call──→ SchedulerService (pure, no I/O)
```

Views never talk to StorageAdapter directly. SchedulerService never reads storage.

---

## Suggested Build Order (Dependencies)

This order ensures each phase has a complete, runnable foundation before the next layer is added.

```
1. StorageAdapter + data model types
     └── Foundation everything else depends on

2. SchedulerService (pure functions)
     └── No dependencies; testable in isolation immediately

3. ClubService + ClubManager view + MemberEditor view
     └── Unlocks: creating clubs and rosters (prerequisite for sessions)

4. Hash Router + shell HTML/CSS
     └── Unlocks: navigation between views exists

5. SessionService + SessionSetup view
     └── Depends on: clubs/members, storage, scheduler

6. RoundDisplay view + AttendeeList view
     └── Depends on: sessions, scheduler (re-generation)

7. Settings view + penalty weight editing
     └── Depends on: storage, session (settings snapshot)

8. Polish: mobile CSS, edge cases (0 players, 1 court, etc.)
```

**Key dependency rule:** SchedulerService (step 2) can be built and tested with dummy data before any UI exists. This is valuable because it's the hardest algorithmic part — verify it produces good schedules before investing in views.

---

## Milestone 8 Integration: Dark Mode, Test Coverage, Help Rewrite

This section documents how Milestone 8 features integrate with the existing architecture. All changes are additive; no structural refactoring is needed.

### Component Map: New vs Modified

```
src/
├── services/
│   └── theme.js          [NEW — ThemeService]
│   └── theme.test.js     [NEW — unit tests]
├── views/
│   ├── Help.js           [MODIFIED — content rewrite only, same interface]
│   ├── MatchEditor.test.js  [MODIFIED — gap-filling tests added]
│   ├── RoundDisplay.test.js [MODIFIED — gap-filling tests added]
│   └── Settings.js       [MODIFIED — add Appearance section with dark toggle]
├── main.js               [MODIFIED — ThemeService.init() before initRouter()]
├── storage.js            [MODIFIED — SCHEMA_VERSION bump + v2 migration]
└── style.css             [MODIFIED — dark variant config + zone/sortable overrides]
index.html                [MODIFIED — dark: classes on body and nav]
```

The router, all other view modules, ClubService, SessionService, and SchedulerService are untouched.

### Dark Mode: ThemeService

ThemeService is a plain ES module singleton in `src/services/theme.js`. It:
- reads `StorageAdapter.get('settings').theme` on init (values: `'system' | 'light' | 'dark'`, default `'system'`)
- checks `window.matchMedia('(prefers-color-scheme: dark)')` when preference is `'system'`
- adds or removes `class="dark"` on `document.documentElement`
- registers a `matchMedia` change listener (only active when preference is `'system'`)
- exposes `toggle()` (cycles system → light → dark → system) and `current()` for Settings UI

`main.js` calls `ThemeService.init()` before `initRouter()` so the dark class is present before the first view paints. This eliminates the flash-of-wrong-theme.

### Dark Mode: CSS Strategy

The project uses Tailwind CSS v4 via `@tailwindcss/vite`. The CSS dark mode variant is declared once in `style.css`:

```css
@variant dark (&:where(.dark, .dark *));
```

This makes all Tailwind `dark:` utilities cascade automatically from `<html class="dark">`. No per-view changes are needed for standard Tailwind utility classes.

Exception: `style.css` contains hardcoded `background-color` values (not Tailwind utilities) for zone chips and SortableJS drag states. These need explicit dark overrides added in `style.css`:

```css
/* zone chip dark overrides */
.dark [data-zone$="-a"] [data-player-id] { background-color: #1e3a5f; border-color: #2563eb; color: #bfdbfe; }
.dark [data-zone$="-b"] [data-player-id] { background-color: #431407; border-color: #ea580c; color: #fed7aa; }
.dark [data-zone="bench"] [data-player-id] { background-color: #374151; border-color: #4b5563; color: #d1d5db; }
/* sortable dark overrides */
.dark .sortable-ghost { border-color: #f9fafb !important; }
.dark .sortable-swap  { border-color: #60a5fa !important; }
```

`index.html` body and nav need dark-mode Tailwind utility classes added inline:

```html
<body class="bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 ...">
<nav class="... bg-white/90 dark:bg-gray-900/90 border-gray-200 dark:border-gray-700 ...">
```

### Dark Mode: Persistence Data Flow

```
App boot
  → main.js: ThemeService.init()
    → StorageAdapter.get('settings').theme  (default: 'system' via v2 migration)
    → if 'system': matchMedia check → resolve to light or dark
    → document.documentElement.classList.toggle('dark', shouldBeDark)
    → if 'system': matchMedia.addEventListener('change', reEvaluate)

User taps toggle in Settings
  → ThemeService.toggle()
    → cycles: system → light → dark → system
    → StorageAdapter.set('settings', { ...settings, theme: newValue })
    → document.documentElement.classList.toggle('dark', ...)
    → Settings view updates toggle label (re-reads ThemeService.current())
```

### Dark Mode: Storage Migration

`storage.js` currently has `SCHEMA_VERSION = 1`. Milestone 8 increments it to 2. The v2 migration adds `theme: 'system'` to the `settings` object in any existing state blob:

```javascript
2: (data) => ({
  ...data,
  settings: { theme: 'system', ...data.settings },
  schemaVersion: 2,
}),
```

This is non-destructive: existing settings keys survive; `theme` is set only when absent.

### Help Rewrite: No Architecture Change

`Help.js` keeps the identical `mount(el, params)` / `export function unmount() {}` signature. The router calls these by convention; no router change is needed. Only the `el.innerHTML` template string changes. The current Help content references jargon ("three-player court", "2v1", penalty weight specifics) that real users find confusing — the rewrite addresses language only.

### Test Coverage: Gap-Filling

Existing test files and what needs adding:

| File | Gap | Approach |
|------|-----|----------|
| `views/MatchEditor.test.js` | Interaction paths for save/cancel/validation are partial | Add tests for: invalid court state blocks save; valid state enables save; cancel navigates back |
| `views/RoundDisplay.test.js` | Undo button behavior, player-add mid-session flow | Add tests for: undo marks last played round as unplayed; add-player triggers round regeneration |
| `services/session.test.js` | Already has good coverage; minor edge cases around empty rounds | Add: session with 0 unplayed rounds when extending |
| `services/theme.test.js` | Does not exist — ThemeService is new | New file; stubs `window.matchMedia`; tests init, toggle cycle, StorageAdapter persistence |
| `storage.test.js` | v2 migration path not yet covered | Extend: existing data without `theme` key migrates cleanly to `'system'` |

The test environment (happy-dom + vitest) does not implement `window.matchMedia`. Tests for ThemeService must stub it:

```javascript
vi.stubGlobal('matchMedia', (query) => ({
  matches: query.includes('dark') ? false : true,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}))
```

Follow the existing `test-setup.js` pattern: globals patched at setup time, not inside individual `beforeEach`.

### Build Order for Milestone 8

```
1. storage.js — SCHEMA_VERSION 1→2; v2 migration adds theme:'system'
   Extend storage.test.js to cover the migration

2. services/theme.js + services/theme.test.js
   ThemeService reads StorageAdapter, applies <html> class, handles matchMedia
   Fully tested before being wired to UI

3. main.js — ThemeService.init() before initRouter()
   Ensures dark class is on <html> before any view paints

4. style.css — @variant dark config + zone chip/sortable dark overrides
   index.html — dark: classes on <body> and <nav>
   (Visual steps; verify in browser; not unit-testable)

5. Settings.js — Appearance section with theme toggle
   Depends on ThemeService (step 2)

6. Test gap-filling — MatchEditor, RoundDisplay, SessionService
   Independent of dark mode; can overlap with steps 4-5

7. Help.js — plain-language content rewrite
   No dependencies; independent of dark mode
   Can be done in parallel with steps 4-6

8. README.md — non-developer rewrite
   External; no code dependencies; last
```

Steps 6-7-8 are fully independent of each other and of dark mode once step 5 is stable.

---

## Architectural Patterns

### Pattern 1: Module as Singleton Service

**What:** Each service file exports a plain object of functions that share a closed-over reference to `StorageAdapter`. No class instantiation.
**When to use:** Always for this project — no dependency injection needed at this scale.
**Trade-offs:** Simple, no boilerplate; cannot have multiple independent instances (not needed here).

```javascript
// services/club.js
import * as storage from '../storage.js';

export function getClubs() {
  return storage.get('pb:clubs') ?? [];
}
export function saveClub(club) {
  const clubs = getClubs();
  const idx = clubs.findIndex(c => c.id === club.id);
  if (idx === -1) clubs.push(club); else clubs[idx] = club;
  storage.set('pb:clubs', clubs);
}
```

### Pattern 2: View as Mount/Unmount Object

**What:** Each view exports `{ mount(el, params), unmount() }`. Mount renders into `el`. Unmount cleans up event listeners.
**When to use:** Always — keeps router simple and prevents listener leaks on navigation.
**Trade-offs:** Slightly more ceremony than just a render function; pays off when views have timers or subscriptions.

```javascript
// views/ClubManager.js
import { getClubs, saveClub } from '../services/club.js';

export function mount(el, params) {
  const clubs = getClubs();
  el.innerHTML = renderHTML(clubs);
  el.querySelector('#create-club').addEventListener('click', handleCreate);
}
export function unmount() {
  // remove any global listeners added during mount
}
```

### Pattern 3: Pure Scheduler with History Object

**What:** `buildPairHistory(playedRounds)` constructs the full pair-count matrix once. All scoring functions receive it as a parameter rather than maintaining internal state.
**When to use:** Always for the scheduler — makes unit testing trivial.
**Trade-offs:** Rebuilding history on each regeneration call is O(rounds × players²) but negligible at target scale (< 0.5 ms).

### Pattern 4: ThemeService as Pre-Router Bootstrap (Milestone 8)

**What:** `ThemeService.init()` runs in `main.js` before `initRouter(appEl)` so the `dark` class is on `<html>` before any view mounts. All Tailwind `dark:` utilities cascade from there without per-view logic.
**When to use:** Any time a global CSS state must be applied before first paint.
**Trade-offs:** None at this scale — one synchronous localStorage read. Not a network call.

---

## Anti-Patterns

### Anti-Pattern 1: Direct localStorage Access in Views

**What people do:** Call `localStorage.getItem` directly inside view render functions.
**Why it's wrong:** Scatters schema knowledge across the codebase; breaks migration strategy; impossible to refactor storage without touching every view.
**Do this instead:** All localStorage access goes through `StorageAdapter`. Views call services. Services call `StorageAdapter`.

### Anti-Pattern 2: Storing Derived State

**What people do:** Pre-compute and persist partner frequency tables in localStorage.
**Why it's wrong:** Derived state gets stale when source data changes. Rebuilding `pairHistory` from `playedRounds` at call time takes < 1 ms at target scale — compute it fresh every time.
**Do this instead:** Store only the canonical `Round[]` data. Derive `PairHistory` at runtime in `SchedulerService`.

### Anti-Pattern 3: Mutating Played Rounds

**What people do:** Update a round in-place after it's marked played (e.g., to record score).
**Why it's wrong:** Playing rounds are the ground truth for pair history. Mutating them corrupts the history used to score future rounds.
**Do this instead:** Rounds with `played: true` are immutable. Only append new rounds or replace rounds with `played: false`.

### Anti-Pattern 4: History API on GitHub Pages

**What people do:** Use `pushState`/`popState` for clean URLs like `/active`.
**Why it's wrong:** GitHub Pages serves a 404 for any URL that isn't a real file. Direct links to `/active` break unless you implement the 404.html redirect hack (fragile, non-obvious).
**Do this instead:** Hash routing (`#/active`) requires zero server config and works identically on GitHub Pages and localhost.

### Anti-Pattern 5: Global Optimizing All Rounds at Once

**What people do:** Try to find the globally optimal arrangement of all rounds simultaneously.
**Why it's wrong:** Combinatorial explosion. For 10 players across 8 rounds, the search space is astronomically large. Overkill for a tool where "good enough" is indistinguishable from optimal to the user.
**Do this instead:** Greedy slot-by-slot generation with 200 random candidates per slot. Produces fair schedules in < 5 ms total.

### Anti-Pattern 6: Dark Mode Preference Outside StorageAdapter (Milestone 8)

**What people do:** `localStorage.setItem('theme', 'dark')` as a standalone key outside the `pb:all` blob.
**Why it's wrong:** Bypasses migrations, invisible to import/export backup, creates a second source of truth alongside `StorageAdapter`.
**Do this instead:** Add `theme` to the settings object inside the StorageAdapter blob via a v2 migration. It travels with backup/restore automatically.

### Anti-Pattern 7: Per-View Dark Class Application (Milestone 8)

**What people do:** Each view's `mount()` checks ThemeService and appends `dark:` classes manually to rendered HTML.
**Why it's wrong:** Tailwind dark variants cascade automatically from `<html class="dark">`. Manual per-view dark classes duplicate work, miss new views added later, and defeat CSS cascade.
**Do this instead:** Toggle `class="dark"` on `<html>` once in ThemeService. All views pick up dark variants with no changes.

---

## Scaling Considerations

This app has no server and no network calls, so "scaling" means "handles edge cases gracefully."

| Scale Concern | Approach |
|--------------|----------|
| 0-player session | SessionSetup validates minimum attendee count (4) before enabling Start |
| Odd player counts | Pre-pass assigns sit-outs before scheduling; never passed to core algorithm |
| Large roster (30+ members) | No algorithm impact; list rendering stays fast; localStorage size stays < 5 KB |
| Many sessions over months | Sessions array grows; if ever near 5 MB limit, offer "archive old sessions" in Settings |
| candidateCount too slow | Never expected at target scale; if profiling shows > 100 ms, reduce default candidateCount |

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Rule |
|----------|---------------|------|
| View ↔ Service | Direct function call (imported) | Views import services; not the reverse |
| Service ↔ StorageAdapter | Direct function call (imported) | Services import storage; views do not |
| View ↔ SchedulerService | Views do NOT call scheduler directly | Only SessionService calls scheduler |
| Router ↔ Views | `mount(el, params)` / `unmount()` protocol | Router owns the container element |
| ThemeService ↔ StorageAdapter | ThemeService reads/writes `settings.theme` via StorageAdapter | Same rule as other services |
| ThemeService ↔ DOM | Writes only `document.documentElement.classList` | Only ThemeService touches this class |

### Milestone 8 Touch Points Summary

| File | Change Type | Notes |
|------|-------------|-------|
| `src/services/theme.js` | New file | ThemeService module |
| `src/services/theme.test.js` | New file | Stubs matchMedia; tests init/toggle/persistence |
| `src/storage.js` | Modified | SCHEMA_VERSION 1→2; v2 migration adds `settings.theme:'system'` |
| `src/main.js` | Modified | `ThemeService.init()` before `initRouter()` |
| `src/style.css` | Modified | `@variant dark` config; zone chip dark overrides; sortable dark overrides |
| `index.html` | Modified | `dark:` classes on `<body>` and `<nav>` |
| `src/views/Settings.js` | Modified | Appearance section with toggle; calls ThemeService |
| `src/views/Help.js` | Modified | Content only — mount/unmount interface unchanged |
| `src/views/MatchEditor.test.js` | Modified | Gap-filling: save/cancel/validation paths |
| `src/views/RoundDisplay.test.js` | Modified | Gap-filling: undo, mid-session add-player |

### External Integrations

None. The entire app is self-contained static files. No analytics, no CDN dependencies, no external APIs. All scripts load from the same repository.

---

## Sources

- Hash routing for GitHub Pages static sites: [DEV Community — SPA Routing Using Hash or URL](https://dev.to/thedevdrawer/single-page-application-routing-using-hash-or-url-9jh) (MEDIUM confidence — community article, pattern is well-established)
- localStorage migration pattern: [Simple Frontend Data Migration — Jan Monschke](https://janmonschke.com/simple-frontend-data-migration/) (HIGH confidence — describes recursive versioned migration pattern used widely)
- Vanilla JS state management patterns: [CSS-Tricks — Build a State Management System with Vanilla JavaScript](https://css-tricks.com/build-a-state-management-system-with-vanilla-javascript/) (HIGH confidence — established reference)
- Tailwind v4 dark mode strategy: direct inspection of `vite.config.js` (`@tailwindcss/vite` v4), `package.json`, and Tailwind v4 `@variant` syntax (HIGH confidence)
- Codebase direct inspection: `src/main.js`, `src/router.js`, `src/style.css`, `src/storage.js`, `src/views/Settings.js`, `src/views/Help.js`, `index.html`, all test files (HIGH confidence)

---

*Architecture research for: static pickleball practice scheduler SPA*
*Original: 2026-04-02 | Updated for Milestone 8: 2026-04-14*
