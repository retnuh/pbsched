# Phase 12: Editor Scaffold & Entry Points — Research

**Researched:** 2026-04-14
**Domain:** Vanilla JS SPA view scaffold, hash router extension, Tailwind CSS mobile UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Edit Button Placement — Proposed Round Card (MEDIT-01)**
- D-01: Move ALL action buttons off the proposed round card header and into a 3-button row at the bottom of the card — Alternatives | Edit | Mark Played.
- D-02: The proposed round card header becomes label-only: "Round X" with no action buttons.
- D-03: This is a RoundDisplay refactor, not just an additive change — the existing "Alternatives" and "Mark Played" buttons move from header to card bottom.

**Edit Button Placement — Most Recently Played Round Card (MEDIT-02)**
- D-04: Add "Edit" button to the header of the most recently played round card, alongside the existing "Undo" button. No structural change to the played round card layout.

**Route & View**
- D-05: Route: `#/edit/:roundIndex` — add to existing routes object in `router.js`.
- D-06: New file: `src/views/MatchEditor.js` — follows the established `mount(el, params)` / `unmount()` pattern.
- D-07: Entry point: `navigate('/edit/' + round.index)` from both round card edit buttons.

**Court Zone Layout in Editor**
- D-08: Courts rendered as 2-column Team A | Team B layout — same visual language as RoundDisplay for familiarity.
- D-09: Player names rendered as pill chips (rounded badge style) — blue for Team A, orange for Team B.
- D-10: Each court is labeled "Court N" (same as RoundDisplay).

**Rest Bench**
- D-11: Rest Bench rendered as a scrollable section below the last court, visually distinct from court cards (gray/neutral background zone, not a white card).
- D-12: Sitting-out players rendered as pill chips in the bench zone (same chip style as court chips).
- D-13: Bench section header: "Rest Bench" label.

**Back Navigation**
- D-14: Back button in editor header always navigates to `/active` (not browser history back).
- D-15: The session nav item stays highlighted while in the editor — `#/edit/` routes should match the `isSession` condition in the nav active-state logic in `router.js`.

### Claude's Discretion
- Exact button sizing/styling for the 3-button row at card bottom (follow existing button patterns in RoundDisplay)
- Whether the 3-button row uses flex or grid layout
- Pill chip height and padding (must meet ~44px tap target for Phase 13 drag readiness)
- Exact gray shade for Rest Bench background zone

### Deferred Ideas (OUT OF SCOPE)
- Whether RoundDisplay should also use pill chip styling for player names — deferred; plain text stays in RoundDisplay for now, pills are editor-only to signal interactivity
- Confirm/Cancel buttons in the editor — Phase 13
- Chip drag handles — Phase 13
- "Edited" badge on round cards — Future milestone requirement
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEDIT-01 | Organizer can open the match editor from the current proposed (unplayed) round, pre-populated with that round's lineup | D-01 through D-03 define the RoundDisplay refactor; D-07 defines navigation; UI-SPEC provides exact markup |
| MEDIT-02 | Organizer can open the match editor from the most recently played round, pre-populated with that round's lineup | D-04 defines the played-round header change; round data shape is `round.courts[i].teamA[]`, `round.courts[i].teamB[]`, `round.sittingOut[]` |
</phase_requirements>

---

## Summary

Phase 12 is a pure HTML/CSS scaffolding phase. It has three distinct work items: (1) refactor `RoundDisplay.js` `renderMain()` to move existing buttons off the proposed round card header and onto a 3-button bottom row, adding an "Edit" button, (2) add an "Edit" button to the most recently played round card header, and (3) create a new `MatchEditor.js` view mounted at `#/edit/:roundIndex` that renders a static, non-interactive court layout with pill chips. No new dependencies are needed.

The codebase is a vanilla JS SPA with a custom hash router. All views follow the `mount(el, params)` / `unmount()` pattern established in `RoundDisplay.js`, `MemberEditor.js`, and others. The router's `resolveRoute()` uses a simple segment-count + colon-prefix param extraction. Adding a new route is two lines: an import and an entry in the `routes` object. Extending the `isSession` active-state condition is a one-line string addition.

The UI-SPEC (`12-UI-SPEC.md`) is the authoritative design contract — exact Tailwind class strings, markup structure, and copywriting have already been validated against the codebase. The planner should treat the UI-SPEC component inventory as the implementation target without re-deriving it.

**Primary recommendation:** Implement in three task units — (A) RoundDisplay refactor, (B) router wiring, (C) MatchEditor view — in that order, since A and C are independent but B requires both the MatchEditor file and the route entry to exist.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS (ES modules) | — | View logic, DOM manipulation | Established project pattern — no framework |
| Tailwind CSS | 4.2.2 | Utility-class styling | `@import "tailwindcss"` in `src/style.css` [VERIFIED: package.json] |
| Vitest | 4.1.2 | Unit test runner | Already used for session.test.js, scheduler.test.js [VERIFIED: package.json] |
| happy-dom | 20.8.9 | DOM environment for Vitest | Configured in vite.config.js `test.environment` [VERIFIED: vite.config.js] |

### No New Dependencies
Phase 12 is static HTML/CSS only. No SortableJS, no npm installs required. [VERIFIED: CONTEXT.md "No New Dependencies"]

---

## Architecture Patterns

### Existing View Pattern
All views export two functions only. [VERIFIED: RoundDisplay.js, MemberEditor.js]

```js
// Source: src/views/MemberEditor.js pattern
export function mount(el, params) {
  // el = the container DOM node
  // params = extracted route params (strings — parseInt before numeric use)
  el.innerHTML = `...`;
  // attach event listeners
}

export function unmount() {}
```

### Router Registration Pattern
[VERIFIED: src/router.js]

```js
// 1. Add import at top of router.js
import * as MatchEditor from './views/MatchEditor.js';

// 2. Add route to routes object
const routes = {
  // ... existing routes ...
  '/edit/:roundIndex': MatchEditor,
};
```

The router's `resolveRoute()` splits on `/` and matches segment count. The `:roundIndex` param will be extracted automatically and available as `params.roundIndex` (a string — always `parseInt(params.roundIndex)` before use).

### Nav Active State Extension
[VERIFIED: src/router.js lines 75-79]

Current code:
```js
const isSession = hash.startsWith('#/active') && navTarget === 'RoundDisplay';
```

Required change — add the `/edit` prefix check:
```js
const isSession = (hash.startsWith('#/active') || hash.startsWith('#/edit')) && navTarget === 'RoundDisplay';
```

### getPlayerName Pattern
[VERIFIED: src/views/RoundDisplay.js line 23]

```js
const session = SessionService.getActiveSession();
const club = ClubService.getClub(session.clubId);
const getPlayerName = (id) => club.members.find(m => m.id === id)?.name || 'Unknown';
```

MatchEditor.js must replicate this pattern. It cannot assume the session or club exists — handle the null session case with a redirect or error message.

### Round Data Shape
[VERIFIED: src/services/session.js via CONTEXT.md canonical refs]

```js
round.courts[i].teamA   // array of player IDs (1-2 elements)
round.courts[i].teamB   // array of player IDs (1-2 elements)
round.sittingOut        // array of player IDs (0+ elements)
round.index             // 0-based integer (stored as int, but params.roundIndex arrives as string)
```

### Back Navigation Pattern
MemberEditor uses `<a href="#/">` for back. The decision (D-14) for MatchEditor changes this to programmatic `navigate('/active')`. Use a `<button>` with an event listener, not an anchor, for the back button in MatchEditor. [VERIFIED: CONTEXT.md D-14, MemberEditor.js line 45]

### Haptics Import
[VERIFIED: RoundDisplay.js line 4]

```js
import { Haptics } from '../services/haptics.js';
// Fire Haptics.light() on Edit button tap (before navigate call)
```

---

## UI-SPEC Is Authoritative

The `12-UI-SPEC.md` file contains fully verified Tailwind class strings and markup fragments for every new or modified component. The planner should reference it directly for implementation details. Key lookups:

| Component | UI-SPEC Section |
|-----------|-----------------|
| Proposed round card 3-button row | "Modified: Proposed Round Card" |
| Proposed round card header (after refactor) | "Modified: Proposed Round Card" |
| Most recently played round header (Edit + Undo) | "Modified: Most Recently Played Round Card Header" |
| MatchEditor page shell | "New: MatchEditor view" |
| Court zone card | "New: MatchEditor view — Court zone card" |
| Team A pill chip | "New: MatchEditor view — Player pill chip — Team A" |
| Team B pill chip | "New: MatchEditor view — Player pill chip — Team B" |
| Rest Bench zone | "New: MatchEditor view — Rest Bench zone" |
| Bench chip | "New: MatchEditor view — Rest Bench zone" |
| Error/empty states | "Copywriting Contract" |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Route param extraction | Custom regex/parser | Existing `resolveRoute()` in router.js | Already handles `:param` segments correctly |
| Player name lookup | ID→name map rebuilding | `getPlayerName(id)` closure pattern from RoundDisplay | Same pattern works identically in MatchEditor |
| Touch target sizing | Custom JS hit-area expansion | Tailwind `min-h-[44px]` on chip divs | CSS-only, matches iOS HIG tap target guidance |

---

## Common Pitfalls

### Pitfall 1: roundIndex param type
**What goes wrong:** `params.roundIndex` arrives as a string from the router. Using it directly in `session.rounds[params.roundIndex]` will fail (JS coerces it, but comparison like `round.index === params.roundIndex` will be false).
**Why it happens:** The router extracts params via string splitting — no type coercion is performed.
**How to avoid:** Always `const roundIndex = parseInt(params.roundIndex, 10)` at the top of `MatchEditor.mount()`.
**Warning signs:** Round data is undefined even when the route matches correctly.

### Pitfall 2: Stale session reference in RoundDisplay after refactor
**What goes wrong:** RoundDisplay holds a `session` reference captured at mount time. After the refactor adds an Edit button, the button navigates away — when the user returns, the view re-mounts and `getActiveSession()` is called fresh. This is correct behavior already, but the refactor must not introduce a second `session` capture.
**Why it happens:** Closures inside `renderMain()` reference `session` from the outer `mount()` scope. If anything creates a local `session` inside the refactored code, it will shadow the outer one.
**How to avoid:** Add the Edit button's click handler in the same `listEl.addEventListener('click', ...)` delegation block (lines 537–583) using `data-action="edit"` — no new closure needed.
**Warning signs:** Edit button fires but round data appears stale or undefined.

### Pitfall 3: lastPlayedIdx logic for Edit button visibility
**What goes wrong:** The Edit button on the played round must only appear for the most recently played round (`round.index === lastPlayedIdx`). Placing it in the wrong conditional branch causes it to appear on all played rounds or on no round.
**Why it happens:** The existing conditional in the `rounds.map()` template has three branches: unplayed, lastPlayed, and completed. The Edit button for played rounds belongs in the `lastPlayed` branch alongside Undo.
**How to avoid:** The UI-SPEC markup shows Edit and Undo both in the `flex items-center space-x-2` div. Keep them together. [VERIFIED: 12-UI-SPEC.md line 119-129]
**Warning signs:** Edit appears on all past rounds, or Undo disappears.

### Pitfall 4: Session guard missing in MatchEditor
**What goes wrong:** If no active session exists when the user lands on `#/edit/N`, `getActiveSession()` returns null and the court rendering crashes.
**Why it happens:** The editor route can be bookmarked or typed manually.
**How to avoid:** Check `if (!session)` at the top of `MatchEditor.mount()` and render the same no-session error message as RoundDisplay. [VERIFIED: RoundDisplay.js lines 9-19, UI-SPEC Copywriting Contract]

### Pitfall 5: roundIndex out-of-bounds access
**What goes wrong:** `session.rounds[roundIndex]` is undefined if `roundIndex >= session.rounds.length` or negative.
**Why it happens:** Stale URLs, typed routes, or the round was deleted.
**How to avoid:** After parseInt, check `if (!round)` and render the "Round not found" error per the Copywriting Contract. [VERIFIED: 12-UI-SPEC.md Copywriting Contract]

---

## Code Examples

### Adding MatchEditor route (router.js)
```js
// Source: src/router.js — extend imports and routes object
import * as MatchEditor from './views/MatchEditor.js';

const routes = {
  '/': ClubManager,
  '/club/:clubId': MemberEditor,
  '/setup/:clubId': SessionSetup,
  '/active': RoundDisplay,
  '/settings': Settings,
  '/help': Help,
  '/edit/:roundIndex': MatchEditor,   // NEW
};
```

### Extending isSession nav condition (router.js)
```js
// Source: src/router.js line 77 — current
const isSession = hash.startsWith('#/active') && navTarget === 'RoundDisplay';

// After change (D-15):
const isSession = (hash.startsWith('#/active') || hash.startsWith('#/edit')) && navTarget === 'RoundDisplay';
```

### Edit button click handler (RoundDisplay.js — to add to existing delegation block)
```js
// Source: existing delegation block src/views/RoundDisplay.js lines 537-583
const editBtn = e.target.closest('[data-action="edit"]');
if (editBtn) {
  const idx = parseInt(editBtn.getAttribute('data-index'));
  Haptics.light();
  navigate('/edit/' + idx);
  return;
}
```

### MatchEditor skeleton (src/views/MatchEditor.js)
```js
import { SessionService } from '../services/session.js';
import { ClubService } from '../services/club.js';
import { navigate } from '../router.js';

export function mount(el, params) {
  const session = SessionService.getActiveSession();
  if (!session) {
    el.innerHTML = `<div class="p-8 text-center space-y-4">
      <h1 class="text-2xl font-bold">No Active Session</h1>
      <p class="text-gray-500">Go to your clubs and select members to start a practice.</p>
      <a href="#/" class="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-md">Go to Clubs</a>
    </div>`;
    return;
  }

  const roundIndex = parseInt(params.roundIndex, 10);
  const round = session.rounds[roundIndex];

  if (!round) {
    el.innerHTML = `<div class="p-8 text-center space-y-4">
      <p class="text-gray-500">Round not found.</p>
      <a href="#/active" class="text-blue-600 font-bold">Return to session.</a>
    </div>`;
    return;
  }

  const club = ClubService.getClub(session.clubId);
  const getPlayerName = (id) => club.members.find(m => m.id === id)?.name || 'Unknown';

  el.innerHTML = `<!-- full layout per UI-SPEC -->`;

  el.querySelector('#back-btn').addEventListener('click', () => {
    navigate('/active');
  });
}

export function unmount() {}
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vite.config.js` (`test` key) — no separate vitest.config file |
| Environment | happy-dom 20.8.9 |
| Setup file | `src/test-setup.js` (localStorage shim + beforeEach clear) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

[VERIFIED: vite.config.js, package.json, src/test-setup.js]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEDIT-01 | Edit button appears on proposed round card; tapping navigates to `#/edit/N`; MatchEditor mounts pre-populated | Integration (DOM) | `npx vitest run src/views/MatchEditor.test.js` | No — Wave 0 gap |
| MEDIT-02 | Edit button appears on most-recently-played round card header; tapping navigates to `#/edit/N`; MatchEditor mounts pre-populated | Integration (DOM) | `npx vitest run src/views/MatchEditor.test.js` | No — Wave 0 gap |

**Note on testability:** Phase 12 changes are primarily in the DOM rendering layer (`RoundDisplay.js` and `MatchEditor.js`). The existing test infrastructure tests service-layer logic. DOM integration tests using happy-dom can be written for MatchEditor but require some boilerplate to mock `navigate()` and `SessionService`. The existing `src/test-setup.js` localStorage shim already handles the storage dependency. DOM tests for RoundDisplay refactor are optional but valuable for catching the Edit button visibility edge cases described in Common Pitfalls.

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/views/MatchEditor.test.js` — covers MEDIT-01 and MEDIT-02 editor mount, pre-population, back navigation

*(Existing test infrastructure — `src/test-setup.js`, `vite.config.js` test config — covers all framework needs; only the test file itself is missing.)*

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | Build, test | Yes | system | — |
| Vitest | Test runner | Yes | 4.1.2 (devDep) | — |
| Tailwind CSS | Styling | Yes | 4.2.2 (devDep) | — |
| Vite | Dev server / build | Yes | 8.0.1 (devDep) | — |

No missing dependencies. Phase 12 requires no new installations. [VERIFIED: package.json]

---

## Security Domain

No security-sensitive operations in Phase 12. The phase adds read-only navigation entry points and renders pre-existing session data. No network calls, no authentication, no input that persists. No ASVS categories apply to this phase's scope.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Buttons in proposed round card header | 3-button row at card bottom (D-01 to D-03) | Phase 12 | Requires removing existing header buttons in RoundDisplay `renderMain()` template — this is a deletion + addition, not purely additive |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | MatchEditor.js will be placed in `src/views/` alongside existing view files | Architecture Patterns | Low — all views are in src/views/, no evidence of exceptions |

All other claims were verified directly against codebase source files or locked decisions in CONTEXT.md.

---

## Open Questions

1. **Should the MatchEditor test mock `navigate()` or test actual hash changes?**
   - What we know: `navigate()` sets `window.location.hash`. happy-dom supports `window.location`.
   - What's unclear: Whether happy-dom's hash routing triggers the router's `hashchange` listener in test context.
   - Recommendation: Mock `navigate` with `vi.mock('../router.js', ...)` to keep MatchEditor tests fast and isolated. Test navigation calls rather than actual routing.

2. **RoundDisplay test coverage for refactored button layout**
   - What we know: No existing DOM tests for RoundDisplay.js exist — it is only visually tested.
   - What's unclear: Whether the planner should add RoundDisplay tests in Phase 12 or treat the visual diff as sufficient given the service-layer tests cover data integrity.
   - Recommendation: Write at least smoke tests for the presence of `data-action="edit"` and `data-action="alternatives"` and `data-action="play"` in the rendered HTML to catch regressions. Can be light — not full interaction tests.

---

## Sources

### Primary (HIGH confidence)
- `src/router.js` — route registration, resolveRoute(), isSession nav condition, navigate() — read directly
- `src/views/RoundDisplay.js` — renderMain() proposed round card template, event delegation, getPlayerName pattern — read directly
- `src/views/MemberEditor.js` — back nav pattern, mount/unmount signature — read directly
- `vite.config.js` — Vitest config (environment, globals, setupFiles) — read directly
- `package.json` — dependency versions — read directly
- `src/test-setup.js` — localStorage shim, beforeEach clear — read directly
- `.planning/phases/12-editor-scaffold-entry-points/12-CONTEXT.md` — locked decisions D-01 through D-15
- `.planning/phases/12-editor-scaffold-entry-points/12-UI-SPEC.md` — component markup, Tailwind classes, copywriting contract

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — MEDIT-01, MEDIT-02 definitions
- `.planning/STATE.md` — Milestone 7 decisions (SortableJS deferred to Phase 13, draft model)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against package.json and source files
- Architecture: HIGH — all patterns read directly from existing source files
- Pitfalls: HIGH — derived from reading actual router.js and RoundDisplay.js code
- UI patterns: HIGH — UI-SPEC was already produced and validated against codebase

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable vanilla JS stack — low churn risk)
