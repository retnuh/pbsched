# Phase 13: Drag Interactions & Validation — Research

**Researched:** 2026-04-14
**Domain:** SortableJS drag-and-drop, draft state management, reactive validation, vanilla JS view lifecycle
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Occupied-slot drag triggers an instant swap (dragged player to target slot, displaced player to origin). This is the SortableJS Swap plugin behavior.
- **D-02:** In-memory draft copy of round data while editing; original session data is never mutated until Confirm is tapped.
- **D-03:** Confirm button is disabled whenever any court has exactly 1 player.
- **D-04:** Invalid courts get a red border (`border-red-400`) and inline label ("needs 2+ players") beneath the court header. Reactively toggled on every drag end.
- **D-05:** Cancel with no changes navigates directly to `/active`.
- **D-06:** Cancel with changes shows a native `confirm()` dialog before navigating away.
- **D-07:** Fixed bottom bar above the nav bar. `[Cancel]` left, `[Confirm]` right, always visible.
- **D-08:** Destination slot highlighted during drag via SortableJS `ghostClass` / `chosenClass`. Blue highlight for court slots.
- **D-09:** One SortableJS list per zone (each court's Team A column, each court's Team B column, the Rest Bench), all in the same `group`. Use the Swap plugin for chip-on-chip swap. Touch settings: `delay: 150`, `delayOnTouchOnly: true`, `touchStartThreshold: 5`.
- Install `sortablejs` as a production dependency.

### Claude's Discretion

- Exact ghost chip CSS (opacity, dashed border, background tint)
- Whether to use a modal dialog or a slide-up sheet for "Discard changes?" — confirmed: use native `confirm()` (matches existing "End session" pattern in RoundDisplay)
- Bottom bar height and button sizing (follow existing `fixed-safe-bottom` conventions)
- How to detect "changes were made" — shallow JSON comparison of draft vs original round

### Deferred Ideas (OUT OF SCOPE)

- Haptic feedback on successful drop — Phase 14
- Sit-out count badges on bench chips — Phase 14
- Add/remove courts in editor — Phase 14
- Dark mode support — separate backlog
- Test coverage gap audit — separate backlog
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRAG-01 | Dragging a chip to an empty slot places the player there (including touch on iOS) | SortableJS group config with `put: true`; touch delay settings confirmed in official docs |
| DRAG-02 | Dragging onto an occupied slot swaps the two players | SortableJS Swap plugin with `swap: true`; inter-list swap confirmed supported (GitHub issue #1206 resolved) |
| DRAG-03 | Dragging a chip to the Rest Bench moves the player off the court | Bench zone is a peer SortableJS list in the same group; standard move-between-lists behavior |
| DRAG-04 | Dragging from the Rest Bench onto a court slot places the player there | Same group config enables bidirectional movement |
| DRAG-05 | Confirm saves edited lineup; Cancel discards all changes | `SessionService.updateRound()` is verified and ready; draft-copy pattern maps cleanly |
| DRAG-06 | Confirm disabled and error shown when any court has exactly 1 player | Reactive validation in `onEnd` callback; button state toggle via DOM class swap |
| VALID-01 | Confirm button disabled when any court has exactly 1 player | Validate draft state after each `onEnd`; disable button + add `disabled` attribute |
| VALID-02 | Error indicator per invalid court — reactive | Add/remove `border-red-400` on court card element and toggle inline label on each `onEnd` |
| VIS-01 | Destination slot highlighted during drag | `ghostClass: 'sortable-ghost'` and `chosenClass: 'sortable-chosen'` built into SortableJS |
</phase_requirements>

---

## Summary

Phase 13 wires up SortableJS drag-and-drop on top of the existing static `MatchEditor.js` view. The view already renders all the HTML (courts, chips, bench) — Phase 13's job is to initialize SortableJS instances on those elements in `mount()`, maintain a draft copy of the round data, re-validate after every drag, and wire up Confirm/Cancel.

The locked decisions in CONTEXT.md resolve most architectural choices before research even started. The key findings from research are: (1) `sortablejs` v1.15.7 is current and not yet installed — it needs `npm install sortablejs`; (2) the Swap plugin does support inter-list swapping when all zones share the same `group` name; (3) the data-reconciliation strategy after drag requires reading DOM order back into the draft state on each `onEnd` because SortableJS mutates the DOM directly; (4) SortableJS instances must be destroyed in `unmount()` or repeated navigation creates duplicate listeners.

**Primary recommendation:** Initialize one SortableJS instance per zone in `mount()`, read DOM order back to draft state on every `onEnd`, run the single-player validation, and update button/court-card state inline. All state lives in module-scope variables scoped to the current `mount()` call; `unmount()` destroys instances and nulls references.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sortablejs | 1.15.7 | Drag-and-drop + Swap plugin | Locked in CONTEXT.md D-09; battle-tested, no-framework, touch-native |

[VERIFIED: npm registry — `npm view sortablejs version` returned `1.15.7`, published 2026-02-11]

### Supporting (already installed)

| Library | Version | Purpose |
|---------|---------|---------|
| vitest | ^4.1.2 | Unit testing framework (already in devDependencies) |
| happy-dom | ^20.8.9 | DOM environment for tests (already in devDependencies) |

No other new dependencies are needed for this phase.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SortableJS Swap plugin | Custom `onEnd` swap logic | Custom: more control, but must hand-roll what Swap plugin gives for free |
| Native `confirm()` dialog | Custom modal component | Custom modal: more polish, but CONTEXT.md locks native `confirm()` as matching existing pattern |

**Installation:**
```bash
npm install sortablejs
```

---

## Architecture Patterns

### Module-Scope State Pattern

`MatchEditor.js` uses the existing `mount(el, params)` / `unmount()` module export pattern. All state for a mounted view should be held in module-scope `let` variables that are initialized in `mount()` and nulled in `unmount()`.

```javascript
// Source: established pattern in existing views (RoundDisplay.js, MemberEditor.js)

let _sortableInstances = [];
let _draft = null;
let _originalRound = null;
let _roundIndex = null;

export function mount(el, params) {
  _roundIndex = parseInt(params.roundIndex, 10);
  // Deep-copy original round into draft
  _draft = JSON.parse(JSON.stringify(session.rounds[_roundIndex]));
  _originalRound = JSON.parse(JSON.stringify(session.rounds[_roundIndex]));
  // ... render, then init sortables
}

export function unmount() {
  _sortableInstances.forEach(s => s.destroy());
  _sortableInstances = [];
  _draft = null;
  _originalRound = null;
}
```

[VERIFIED: codebase — `src/views/MatchEditor.js` already exports `mount` and a no-op `unmount`; router calls `unmount()` before every view transition]

### SortableJS Initialization Pattern

```javascript
// Source: SortableJS official README [CITED: github.com/SortableJS/Sortable/blob/master/README.md]
import Sortable, { Swap } from 'sortablejs';
Sortable.mount(new Swap());

// One Sortable per zone — call after el.innerHTML is set
function initSortables(el) {
  const zones = el.querySelectorAll('[data-zone]');
  zones.forEach(zone => {
    const instance = new Sortable(zone, {
      group: 'players',          // same group = cross-list movement allowed
      swap: true,                // Swap plugin: chip-on-chip swaps
      swapClass: 'sortable-swap-highlight',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      delay: 150,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      onEnd: handleDragEnd,
    });
    _sortableInstances.push(instance);
  });
}
```

[CITED: github.com/SortableJS/Sortable/blob/master/README.md — options table]
[CITED: github.com/SortableJS/Sortable/blob/master/plugins/Swap/README.md — Swap plugin options]

### Draft State Reconciliation After Drag

SortableJS mutates the DOM directly — it physically moves chip elements between zone containers. After each `onEnd`, the draft state must be rebuilt by reading the current DOM order rather than trying to compute diffs from event indices.

```javascript
// Source: [ASSUMED] — derived from SortableJS DOM-mutation behavior

function handleDragEnd(evt) {
  reconcileDraftFromDOM(el);
  validateAndUpdateUI(el);
}

function reconcileDraftFromDOM(el) {
  // Rebuild draft.courts and draft.sittingOut from current DOM
  _draft.courts = _draft.courts.map((court, i) => ({
    ...court,
    teamA: readZoneIds(el, `court-${i}-a`),
    teamB: readZoneIds(el, `court-${i}-b`),
  }));
  _draft.sittingOut = readZoneIds(el, 'bench');
}

function readZoneIds(el, zoneKey) {
  const zone = el.querySelector(`[data-zone="${zoneKey}"]`);
  if (!zone) return [];
  return [...zone.querySelectorAll('[data-player-id]')]
    .map(chip => chip.dataset.playerId);
}
```

Each chip element needs a `data-player-id` attribute set at render time. This attribute survives DOM moves.

### Validation Pattern

```javascript
// Source: CONTEXT.md D-03, D-04 (locked decisions)

function validateAndUpdateUI(el) {
  let anyInvalid = false;

  _draft.courts.forEach((court, i) => {
    const total = court.teamA.length + court.teamB.length;
    const isInvalid = total === 1;
    if (isInvalid) anyInvalid = true;

    const card = el.querySelector(`[data-court="${i}"]`);
    if (!card) return;

    card.classList.toggle('border-red-400', isInvalid);
    card.classList.toggle('border-gray-200', !isInvalid);

    const errorLabel = card.querySelector('[data-court-error]');
    if (errorLabel) errorLabel.classList.toggle('hidden', !isInvalid);
  });

  const confirmBtn = el.querySelector('#confirm-btn');
  if (confirmBtn) {
    confirmBtn.disabled = anyInvalid;
    confirmBtn.classList.toggle('opacity-50', anyInvalid);
    confirmBtn.classList.toggle('cursor-not-allowed', anyInvalid);
    confirmBtn.classList.toggle('bg-blue-600', !anyInvalid);
    confirmBtn.classList.toggle('bg-gray-300', anyInvalid);
  }
}
```

### Change Detection Pattern

```javascript
// Source: CONTEXT.md (Claude's discretion — "shallow JSON comparison is sufficient")

function hasChanges() {
  return JSON.stringify(_draft) !== JSON.stringify(_originalRound);
}
```

JSON.stringify comparison works because both objects are plain data (no functions, no circular refs). [ASSUMED — but straightforward given the data shape confirmed in session.js]

### Cancel Handler Pattern

```javascript
// Source: CONTEXT.md D-05, D-06; UI-SPEC Cancel/Discard Dialog Contract

function handleCancel() {
  if (!hasChanges()) {
    navigate('/active');
    return;
  }
  const confirmed = confirm("Discard changes? Your edits won't be saved.");
  if (confirmed) navigate('/active');
  // else: do nothing, stay in editor
}
```

Native `confirm()` is consistent with the existing "End session" confirmation in `RoundDisplay.js`. [VERIFIED: codebase — RoundDisplay.js uses native `confirm()` for end-session flow]

### Confirm Handler Pattern

```javascript
// Source: CONTEXT.md D-02; session.js updateRound() method

function handleConfirm() {
  if (!isValid()) return; // guard — button should already be disabled
  SessionService.updateRound(_roundIndex, _draft);
  navigate('/active');
}
```

`SessionService.updateRound()` handles both played and unplayed round cases internally. [VERIFIED: codebase — session.js lines 278-302]

### Recommended Structure Within MatchEditor.js

```
mount(el, params)
  ├── Guard: no session / no round / no club  (existing)
  ├── Build draft and originalRound (deep copy)
  ├── Render HTML (courts with data-court, data-zone, data-player-id; bench; bottom bar)
  ├── initSortables(el)  — one Sortable per [data-zone]
  ├── validateAndUpdateUI(el)  — initial validation pass
  ├── Wire #cancel-btn → handleCancel()
  └── Wire #confirm-btn → handleConfirm()

handleDragEnd(evt)
  ├── reconcileDraftFromDOM(el)
  └── validateAndUpdateUI(el)

unmount()
  ├── _sortableInstances.forEach(s => s.destroy())
  └── null all module-scope variables
```

### Anti-Patterns to Avoid

- **Mutating session data before Confirm:** Always operate on `_draft`, never on `session.rounds[i]` directly until `SessionService.updateRound()` is called.
- **Reconstructing draft from event indices:** SortableJS `oldIndex`/`newIndex` are unreliable for inter-list moves with the Swap plugin. Read DOM order instead.
- **Forgetting `unmount()` cleanup:** The router calls `unmount()` on every navigation. If SortableJS instances are not destroyed, navigating away and back duplicates all event listeners.
- **Setting `disabled` on the button without also blocking the click handler:** `disabled` on a `<button>` is correct; avoid relying solely on CSS `pointer-events: none`.
- **Reinitializing Sortables without destroying old ones:** Never call `initSortables()` again after first mount without calling `unmount()` first.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Touch drag with scroll disambiguation | Custom pointer event handler | SortableJS `delay` + `delayOnTouchOnly` + `touchStartThreshold` | Handles iOS Safari edge cases, passive listener compliance, touch cancel events |
| Swap-on-drop for two chips | Custom DOM diffing | SortableJS Swap plugin | Plugin handles the element exchange and fires one `onEnd` per drop |
| Cross-list drag-and-drop | Custom drag API | SortableJS `group` config | Group config handles all the DOM bookkeeping for inter-list moves |

**Key insight:** The only custom logic this phase needs is (a) reading DOM order into draft state after drag, (b) validation, and (c) Confirm/Cancel wiring. SortableJS handles all drag mechanics.

---

## Common Pitfalls

### Pitfall 1: Swap Plugin Import Path

**What goes wrong:** Importing `Sortable` alone without mounting the Swap plugin causes `swap: true` to be silently ignored.

**Why it happens:** Plugins in SortableJS 1.15 are opt-in; importing the package gives only the core.

**How to avoid:**
```javascript
import Sortable, { Swap } from 'sortablejs';
Sortable.mount(new Swap());
// Call Sortable.mount() ONCE at module load, not inside mount()
```

**Warning signs:** Dragging onto occupied chips moves them instead of swapping — no swap behavior fires.

[CITED: github.com/SortableJS/Sortable — named export `Swap` from the package]

### Pitfall 2: Chips Lacking `data-player-id`

**What goes wrong:** `reconcileDraftFromDOM()` reads `data-player-id` from chip elements. If chips are rendered without this attribute, all zone reads return empty arrays and the draft gets corrupted on first drag.

**Why it happens:** The existing chip rendering functions (`teamAChip`, `teamBChip`, `benchChip`) do not currently include a `data-player-id` attribute — they will need to be updated.

**How to avoid:** Update each chip render helper to emit `data-player-id="${escapeHTML(id)}"`. The player `id` is already available in scope when each chip helper is called.

**Warning signs:** After a drag, the draft shows empty courts.

[VERIFIED: codebase — MatchEditor.js lines 47-56; no data-player-id present in existing chip HTML]

### Pitfall 3: Bottom Bar Hidden by Nav Bar

**What goes wrong:** The fixed bottom bar overlaps or is hidden behind the app's bottom navigation bar.

**Why it happens:** The app uses `fixed-safe-bottom` for nav positioning. A second fixed element needs to sit above it, or the scroll content area needs enough bottom padding.

**How to avoid:** Use `fixed-safe-bottom` on the bottom bar (same class the nav uses). The scroll content already has `pb-48` in the existing MatchEditor render — verify this still clears both bars. Per the UI-SPEC, the bottom bar uses `fixed-safe-bottom left-0 right-0 max-w-lg mx-auto z-40`.

[VERIFIED: codebase — style.css defines `.fixed-safe-bottom` as `bottom: calc(4rem + env(safe-area-inset-bottom, 0px))`; MatchEditor.js already has `pb-48` on scroll content]

### Pitfall 4: Bench Empty-State Marker Becomes Draggable

**What goes wrong:** The `--|--` empty-state span in the bench zone is rendered inside the SortableJS list container. If Sortable treats it as a draggable item, it can be dragged out and the empty-state marker appears in a court slot.

**Why it happens:** SortableJS treats all direct children of a zone element as sortable items by default.

**How to avoid:** Use the `filter` option on the bench Sortable instance to exclude the empty-state marker, or wrap the marker in a container outside the SortableJS list. Alternatively, render the empty-state marker conditionally outside the list container and toggle its visibility based on bench content.

```javascript
// Option: filter the non-player element
new Sortable(benchZone, {
  group: 'players',
  filter: '.bench-empty-marker',
  // ...
});
```

[ASSUMED — derived from SortableJS default behavior of treating all child elements as draggables]

### Pitfall 5: `onEnd` Fires on Both Source and Destination Lists

**What goes wrong:** For inter-list moves, SortableJS fires `onEnd` once on the source list and potentially on the destination list. If `reconcileDraftFromDOM` is called multiple times per drag, it should be idempotent (reading DOM order is idempotent, so this is safe).

**Why it happens:** SortableJS event model.

**How to avoid:** The DOM-read strategy for reconciliation is inherently idempotent — running it twice gives the same result. No special handling needed, but be aware that `onEnd` is fired once total per drag operation (not twice), on the instance where the drag originated.

[CITED: github.com/SortableJS/Sortable/blob/master/README.md — event documentation]

### Pitfall 6: SortableJS Not Available in Test Environment

**What goes wrong:** Tests that mount MatchEditor fail because SortableJS tries to call DOM APIs that happy-dom doesn't support.

**Why it happens:** SortableJS is a production dependency that accesses native browser drag APIs.

**How to avoid:** Mock SortableJS in the test file the same way `navigate` and `Haptics` are already mocked:

```javascript
vi.mock('sortablejs', () => ({
  default: class MockSortable {
    constructor() {}
    destroy() {}
    static mount() {}
  },
  Swap: class MockSwap {},
}));
```

[VERIFIED: codebase — MatchEditor.test.js already uses `vi.mock` pattern for router and haptics]

---

## Code Examples

### Full SortableJS Init (verified pattern)

```javascript
// Source: SortableJS README [CITED: github.com/SortableJS/Sortable]
import Sortable, { Swap } from 'sortablejs';
Sortable.mount(new Swap());

// In mount(), after el.innerHTML is set:
const zones = el.querySelectorAll('[data-zone]');
zones.forEach(zone => {
  _sortableInstances.push(new Sortable(zone, {
    group: 'players',
    swap: true,
    swapClass: 'sortable-swap-highlight',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    delay: 150,
    delayOnTouchOnly: true,
    touchStartThreshold: 5,
    filter: '.bench-empty-marker',
    onEnd: handleDragEnd,
  }));
});
```

### Ghost/Chosen CSS for src/style.css

```css
/* Source: UI-SPEC Chip States section */
.sortable-ghost {
  opacity: 0.4;
  border: 2px dashed #93C5FD; /* blue-300 */
}

.sortable-chosen {
  opacity: 0.9;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.sortable-swap-highlight {
  background-color: #EFF6FF; /* blue-50 */
  border: 2px dashed #60A5FA; /* blue-400 */
}
```

### Data Attributes on Chip HTML

```javascript
// Chip helpers need data-player-id; update existing functions:
const teamAChip = (id) =>
  `<div data-player-id="${escapeHTML(id)}"
        class="px-3 py-3 bg-blue-50 border border-blue-200 rounded-full
               text-sm font-medium text-blue-800 text-center min-h-[44px]
               flex items-center justify-center cursor-grab">
     ${escapeHTML(getPlayerName(id))}
   </div>`;
```

### Court HTML with Data Attributes

```javascript
// Courts need data-court for validation; zones need data-zone for SortableJS init:
const courtHTML = (court, i) => `
  <div data-court="${i}"
       class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div class="p-3 bg-gray-50 flex items-center justify-between">
      <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Court ${i + 1}</span>
      <span data-court-error class="hidden text-xs font-bold text-red-600">needs 2+ players</span>
    </div>
    <div class="p-4">
      <div class="grid grid-cols-2 gap-3">
        <div data-zone="court-${i}-a" class="space-y-2">
          ${court.teamA.map(teamAChip).join('')}
        </div>
        <div data-zone="court-${i}-b" class="space-y-2">
          ${court.teamB.map(teamBChip).join('')}
        </div>
      </div>
    </div>
  </div>
`;
```

### Bottom Bar HTML

```javascript
// Source: UI-SPEC Bottom Bar Contract
const bottomBarHTML = `
  <div class="fixed-safe-bottom left-0 right-0 max-w-lg mx-auto z-40
              bg-white/90 backdrop-blur-sm border-t border-gray-100">
    <div class="flex items-center gap-3 p-4">
      <button id="cancel-btn"
              class="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl
                     font-bold border border-gray-200">
        Cancel
      </button>
      <button id="confirm-btn"
              class="flex-1 py-4 bg-blue-600 text-white rounded-xl
                     font-bold shadow-lg shadow-blue-200">
        Confirm
      </button>
    </div>
  </div>
`;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Sortable` default import only | Named export `{ Swap }` + `Sortable.mount(new Swap())` | SortableJS ~1.10 | Plugin must be explicitly mounted or `swap: true` is ignored |
| jQuery-dependent drag libs | SortableJS (no jQuery) | 2014+ | No jQuery needed; works with any framework or vanilla JS |

**Deprecated/outdated:**

- Importing SortableJS via CDN `<script>` tag: project uses Vite + npm modules, use `import` instead.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Reading DOM order back into draft after each `onEnd` is more reliable than computing state from event indices for inter-list Swap moves | Architecture Patterns — Draft State Reconciliation | Low risk: DOM order is the ground truth; if wrong, event-index approach is the fallback |
| A2 | `JSON.stringify` comparison is sufficient for change detection given the round data shape | Architecture Patterns — Change Detection | Low risk: round data is plain nested arrays/strings with no cycles or functions |
| A3 | The bench empty-state `--|--` marker must be excluded from SortableJS via `filter` to prevent it from being dragged | Common Pitfalls — Pitfall 4 | Medium risk: if SortableJS ignores non-draggable-looking text spans, no fix needed; but adding filter is safe regardless |
| A4 | `onEnd` fires once per drag operation (not per zone) | Common Pitfalls — Pitfall 5 | Low risk: DOM-read reconciliation is idempotent regardless |

---

## Open Questions

1. **Position of bottom bar relative to bottom nav**
   - What we know: `.fixed-safe-bottom` puts elements at `calc(4rem + env(safe-area-inset-bottom, 0px))`. Both the bottom nav and the new Confirm/Cancel bar use this class.
   - What's unclear: Does the bottom nav already occupy this position, meaning a second element with the same class would overlap it?
   - Recommendation: In Wave 0, visually verify on device. If overlap occurs, the Confirm/Cancel bar needs a higher `z-index` and the bottom nav needs to be measured — or the bar sits above the nav by adding additional bottom offset. The planner should add a verification step for this.

2. **Bench zone: empty state rendering during drag**
   - What we know: The bench renders `--|--` when `sittingOut` is empty. When all bench players are dragged to courts, the bench becomes empty mid-edit.
   - What's unclear: Should the empty-state marker appear/disappear reactively as bench empties/fills?
   - Recommendation: `reconcileDraftFromDOM` already reads bench state; after reconciliation, re-render the empty-state marker inside the bench zone based on `_draft.sittingOut.length`. Add this to the `validateAndUpdateUI` pass.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | `npm install sortablejs` | Yes | (project already using npm) | — |
| sortablejs | DRAG-01 through VIS-01 | Not yet installed | — (1.15.7 on registry) | — |
| vitest | Phase 13 tests | Yes (devDependency) | ^4.1.2 | — |
| happy-dom | DOM test environment | Yes (devDependency) | ^20.8.9 | — |

**Missing dependencies with no fallback:**

- `sortablejs` — must be installed before any implementation begins: `npm install sortablejs`

**Missing dependencies with fallback:**

- None

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.2 |
| Config file | `vite.config.js` (test section with `environment: 'happy-dom'`) |
| Quick run command | `npx vitest run src/views/MatchEditor.test.js` |
| Full suite command | `npx vitest run` (or `just test`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DRAG-01 | Empty slot drop places player | unit (DOM) | `npx vitest run src/views/MatchEditor.test.js` | Partially — file exists, tests need new cases |
| DRAG-02 | Occupied slot drop swaps two players | unit (DOM, mock SortableJS) | `npx vitest run src/views/MatchEditor.test.js` | New test cases needed |
| DRAG-03 | Drag to bench moves player off court | unit (DOM, mock SortableJS) | `npx vitest run src/views/MatchEditor.test.js` | New test cases needed |
| DRAG-04 | Drag from bench to court slot | unit (DOM, mock SortableJS) | `npx vitest run src/views/MatchEditor.test.js` | New test cases needed |
| DRAG-05 | Confirm saves; Cancel discards | unit (DOM, mock navigate) | `npx vitest run src/views/MatchEditor.test.js` | New test cases needed |
| DRAG-06 | Confirm disabled when 1-player court | unit (DOM) | `npx vitest run src/views/MatchEditor.test.js` | New test cases needed |
| VALID-01 | Confirm button disabled on 1-player court | unit (DOM) | `npx vitest run src/views/MatchEditor.test.js` | New test cases needed |
| VALID-02 | Red border + error label on invalid court | unit (DOM) | `npx vitest run src/views/MatchEditor.test.js` | New test cases needed |
| VIS-01 | Ghost/chosen CSS classes applied during drag | manual only | N/A — requires real browser drag gesture | N/A |

Note: VIS-01 is manual-only because SortableJS ghost/chosen classes require real pointer events that happy-dom does not simulate.

### Sampling Rate

- **Per task commit:** `npx vitest run src/views/MatchEditor.test.js`
- **Per wave merge:** `npx vitest run` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/views/MatchEditor.test.js` — file exists but needs new test cases for DRAG-01 through VALID-02
- [ ] SortableJS mock — add `vi.mock('sortablejs', ...)` pattern at top of test file; not yet present
- [ ] No new test infrastructure files needed (framework already configured)

---

## Security Domain

> `security_enforcement` key absent from config — treated as enabled. However, this phase is entirely client-side UI state manipulation with no network calls, authentication, input from untrusted sources, or cryptographic operations. ASVS categories below are evaluated for completeness.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth in this phase |
| V3 Session Management | No | No server sessions; local storage only |
| V4 Access Control | No | Single-user local-first app |
| V5 Input Validation | Partial | Player IDs are internal UUIDs read from `data-player-id` attributes set by the app itself — not user-typed input. `escapeHTML` already used for all player names at render time. |
| V6 Cryptography | No | No cryptographic operations |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via player name in chip HTML | Tampering | `escapeHTML()` already applied at chip render time — continue using it |
| Stale draft persisted after navigation | Elevation of Privilege | `unmount()` nulls `_draft`; `SessionService.updateRound()` only called on explicit Confirm |

No new threat surface introduced by drag interactions beyond what already exists in the static MatchEditor.

---

## Sources

### Primary (HIGH confidence)

- [VERIFIED: npm registry] — `sortablejs` v1.15.7, published 2026-02-11
- [CITED: github.com/SortableJS/Sortable/blob/master/README.md] — options table (ghostClass, chosenClass, group, delay, delayOnTouchOnly, touchStartThreshold, destroy)
- [CITED: github.com/SortableJS/Sortable/blob/master/plugins/Swap/README.md] — Swap plugin options (swap: true, swapClass)
- [VERIFIED: codebase] — MatchEditor.js, session.js, router.js, style.css, vite.config.js, test-setup.js, MatchEditor.test.js
- [CITED: github.com/SortableJS/Sortable/issues/1206] — Inter-list Swap plugin support confirmed (closed as COMPLETED)

### Secondary (MEDIUM confidence)

- [WebSearch verified with GitHub issue] — SortableJS Swap plugin supports inter-list swapping via same `group` config

### Tertiary (LOW confidence)

- None — no claims in this research rely solely on unverified web search.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — version verified against npm registry
- Architecture: HIGH — patterns derived directly from existing codebase code and locked CONTEXT.md decisions
- Pitfalls: MEDIUM/HIGH — SortableJS-specific pitfalls verified against official docs; bench empty-state pitfall is ASSUMED
- Validation architecture: HIGH — test file and framework verified in codebase

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (SortableJS 1.x is stable; no expected breaking changes)
