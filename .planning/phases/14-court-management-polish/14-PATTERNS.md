# Phase 14: Court Management & Polish — Pattern Map

**Mapped:** 2026-04-14
**Files analyzed:** 2 (1 modified source, 1 extended test)
**Analogs found:** 2 / 2

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/views/MatchEditor.js` | view/controller | event-driven, CRUD | `src/views/MatchEditor.js` (existing — extend in place) | self |
| `src/views/MatchEditor.test.js` | test | — | `src/views/MatchEditor.test.js` (existing — extend in place) | self |

All Phase 14 work is additive to the two existing files above. No new files are created.

---

## Pattern Assignments

### `src/views/MatchEditor.js` — Add Court Button (COURT-01)

**Analog:** self (lines 217–234, `courtsHTML` block)

**Placement pattern** — the button is rendered between `courtsHTML` and `benchHTML` in the main `el.innerHTML` template (line 291):
```javascript
// Current structure (lines 285–295):
el.innerHTML = `
  <div class="p-4 space-y-6 pb-48">
    <header ...>...</header>
    ${courtsHTML}
    ${benchHTML}
    ${bottomBarHTML}
  </div>
  ${discardModalHTML}
`;
// Phase 14: insert addCourtButtonHTML between courtsHTML and benchHTML
```

**Button HTML pattern** — follow the inline-button-between-sections style used by `bottomBarHTML` (lines 247–263). The Add Court button is a self-contained HTML string:
```javascript
const addCourtButtonHTML = `
  <button id="add-court-btn"
          class="flex items-center gap-2 justify-center w-full
                 min-h-[44px] px-4 py-3
                 bg-white border border-gray-200 rounded-xl
                 text-blue-600 font-medium text-sm">
    <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"/>
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v8M8 12h8"/>
    </svg>
    Add court
  </button>
`;
```

**Event wiring pattern** — follows the existing button listener pattern (lines 305–308):
```javascript
// Existing pattern:
el.querySelector('#cancel-btn').addEventListener('click', handleCancel);
el.querySelector('#confirm-btn').addEventListener('click', handleConfirm);

// Phase 14 addition (same pattern):
el.querySelector('#add-court-btn').addEventListener('click', handleAddCourt);
```

**Add court handler** — follows `_draft.courts` mutation + full re-render pattern described in CONTEXT.md:
```javascript
function handleAddCourt() {
  if (_draft.courts.length >= 55) {
    showToast("Can't be better than Wimbledon!");
    return;
  }
  _draft.courts.push({ teamA: [], teamB: [] });
  if (_draft.courts.length === 20) {
    showToast("Oooh, more than Wimbledon's Championship courts? Fancy");
  }
  rerender(_el);
}
```

**Re-render helper** — encapsulate the DOM rebuild + re-init sequence (replaces inline `el.innerHTML = ...` to allow calling from add/remove handlers):
```javascript
function rerender(el) {
  // 1. Destroy existing SortableJS instances (unmount pattern, line 312):
  _sortableInstances.forEach(s => s.destroy());
  _sortableInstances = [];
  // 2. Rebuild innerHTML (same template as initial mount)
  el.innerHTML = buildHTML(_draft, round, club, getPlayerName, session);
  // 3. Re-init (line 303):
  initSortables(el);
  validateAndUpdateUI(el);
  // 4. Re-wire button listeners
  wireListeners(el);
}
```

---

### `src/views/MatchEditor.js` — Remove Court Button (COURT-02)

**Analog:** existing court card header (lines 219–221)

**Court card header pattern** (lines 218–222):
```javascript
// Current header (no Remove button):
<div class="p-3 bg-gray-50 flex items-center justify-between">
  <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Court ${i + 1}</span>
  <span data-court-error class="hidden text-xs font-bold text-red-600">needs 2+ players</span>
</div>

// Phase 14 — Add Remove button; court-error moves or stays:
<div class="p-3 bg-gray-50 flex items-center justify-between">
  <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Court ${i + 1}</span>
  <div class="flex items-center gap-2">
    <span data-court-error class="hidden text-xs font-bold text-red-600">needs 2+ players</span>
    <button data-remove-court="${i}"
            class="text-xs font-medium text-gray-400 hover:text-red-500
                   ${(court.teamA.length === 0 && court.teamB.length === 0 && _draft.courts.length > 1) ? '' : 'hidden'}">
      Remove
    </button>
  </div>
</div>
```

**Remove handler** — follows same `_draft.courts` splice + rerender pattern as add:
```javascript
function handleRemoveCourt(courtIndex) {
  if (_draft.courts.length <= 1) return; // guard: min 1 court
  _draft.courts.splice(courtIndex, 1);
  rerender(_el);
}
```

**Event delegation pattern** — follow the `listEl.addEventListener('click', ...)` delegation in `RoundDisplay.js` (lines 370–413) for handling Remove button clicks without re-wiring per court:
```javascript
// Attach once on the courts container (event delegation):
el.querySelector('#courts-container').addEventListener('click', (e) => {
  const removeBtn = e.target.closest('[data-remove-court]');
  if (removeBtn) {
    handleRemoveCourt(parseInt(removeBtn.dataset.removeCourt));
  }
});
```

**Re-evaluate Remove visibility after drag** — call `updateRemoveButtonVisibility(el)` at end of `handleDragEnd` (line 121–130 pattern):
```javascript
function updateRemoveButtonVisibility(el) {
  _draft.courts.forEach((court, i) => {
    const btn = el.querySelector(`[data-remove-court="${i}"]`);
    if (!btn) return;
    const isEmpty = court.teamA.length === 0 && court.teamB.length === 0;
    const isOnlyOne = _draft.courts.length <= 1;
    btn.classList.toggle('hidden', !isEmpty || isOnlyOne);
  });
}
```

---

### `src/views/MatchEditor.js` — Empty-Court Pruning on Confirm (COURT-03)

**Analog:** existing `handleConfirm` (lines 81–88)

**Current handleConfirm:**
```javascript
function handleConfirm() {
  const anyInvalid = _draft.courts.some(c =>
    (c.teamA.length + c.teamB.length) === 1 || c.teamA.length > 2 || c.teamB.length > 2
  );
  if (anyInvalid) return;
  SessionService.updateRound(_roundIndex, _draft);
  navigate('/active');
}
```

**Phase 14 addition** — add pruning step before `updateRound`:
```javascript
function handleConfirm() {
  const anyInvalid = _draft.courts.some(c =>
    (c.teamA.length + c.teamB.length) === 1 || c.teamA.length > 2 || c.teamB.length > 2
  );
  if (anyInvalid) return;
  // Phase 14: prune empty courts before save (silent)
  const prunedDraft = {
    ..._draft,
    courts: _draft.courts.filter(c => c.teamA.length > 0 || c.teamB.length > 0),
  };
  SessionService.updateRound(_roundIndex, prunedDraft);
  navigate('/active');
}
```

---

### `src/views/MatchEditor.js` — Sit-Out Count Badges on Bench Chips (BENCH-01)

**Analog:** `src/views/RoundDisplay.js` lines 57–63 (`sitCounts` calculation) and lines 89–99 (display pattern)

**sitCounts calculation pattern** (RoundDisplay.js lines 57–63):
```javascript
const sitCounts = {};
session.rounds.forEach(round => {
  round.sittingOut.forEach(id => {
    sitCounts[id] = (sitCounts[id] || 0) + 1;
  });
});
```

**Phase 14 adaptation** — compute once in `mount()` before rendering, using only already-played rounds (current draft excluded since it hasn't been saved yet):
```javascript
// In mount(), after session/club/round validation:
const sitCounts = {};
session.rounds.forEach(round => {
  round.sittingOut.forEach(id => {
    sitCounts[id] = (sitCounts[id] || 0) + 1;
  });
});
```

**Bench chip HTML pattern** — current `playerChip` (lines 205–209):
```javascript
const playerChip = (id) =>
  `<div data-player-id="${escapeHTML(id)}"
        class="px-3 py-3 border rounded-full text-sm font-medium text-center min-h-[44px] flex items-center justify-center cursor-grab">
     ${escapeHTML(getPlayerName(id))}
   </div>`;
```

**Phase 14: two-chip factories** — split into `courtChip` (unchanged) and `benchChip` (adds badge):
```javascript
const courtChip = (id) =>
  `<div data-player-id="${escapeHTML(id)}"
        class="px-3 py-3 border rounded-full text-sm font-medium text-center min-h-[44px] flex items-center justify-center cursor-grab">
     ${escapeHTML(getPlayerName(id))}
   </div>`;

const benchChip = (id) =>
  `<div data-player-id="${escapeHTML(id)}"
        class="px-3 py-2 border rounded-full text-sm font-medium text-center min-h-[44px] flex flex-col items-center justify-center cursor-grab">
     <span>${escapeHTML(getPlayerName(id))}</span>
     <span class="text-xs font-medium text-gray-500">${sitCounts[id] || 0}×</span>
   </div>`;
```

**Display pattern reference** (RoundDisplay.js line 96):
```javascript
// RoundDisplay renders: `<span class="text-[10px] text-gray-400 uppercase font-bold">Sat out ${sitCount}x</span>`
// Phase 14 badge uses: `<span class="text-xs font-medium text-gray-500">{N}×</span>` (per UI-SPEC)
```

---

### `src/views/MatchEditor.js` — Haptic Feedback on Successful Drop (BENCH-02)

**Analog:** `src/views/RoundDisplay.js` lines 1–5 (import) and lines 126–127, 144–145 (call sites)

**Import pattern** (RoundDisplay.js line 4):
```javascript
import { Haptics } from '../services/haptics.js';
```

**Call site pattern** (RoundDisplay.js lines 126–127, 218–219, 364–365):
```javascript
Haptics.light();   // navigation
Haptics.medium();  // moderate action (close session, undo)
Haptics.success(); // confirmation
```

**Phase 14 addition** — add `Haptics.medium()` to `handleDragEnd` (current lines 121–130) after reconcile + sync + validate:
```javascript
function handleDragEnd(evt) {
  reconcileDraftFromDOM(_el);
  syncEmptySlots(_el);
  validateAndUpdateUI(_el);
  updateRemoveButtonVisibility(_el); // Phase 14: re-evaluate Remove buttons
  Haptics.medium();                   // Phase 14: tactile feedback on every successful drop
  // Pop animation on the dropped chip (existing):
  if (evt?.item) {
    evt.item.classList.add('drop-pop');
    evt.item.addEventListener('animationend', () => evt.item.classList.remove('drop-pop'), { once: true });
  }
}
```

---

### `src/views/MatchEditor.js` — Toast (Wimbledon Easter Egg)

**Analog:** no existing toast in codebase — new pattern. `bounceIn` keyframe already defined in `src/style.css` lines 20–28.

**`bounceIn` animation** (`src/style.css` lines 20–28):
```css
@keyframes bounceIn {
  0% { opacity: 0; transform: translateY(-20px); }
  60% { opacity: 1; transform: translateY(4px); }
  100% { opacity: 1; transform: translateY(0); }
}
.animate-bounce-in {
  animation: bounceIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
```

**Toast implementation pattern** — inline helper function (no library):
```javascript
function showToast(message) {
  const existing = document.getElementById('gsd-toast');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.id = 'gsd-toast';
  div.className = 'fixed top-4 left-0 right-0 flex justify-center z-50 animate-bounce-in';
  div.innerHTML = `
    <div class="bg-gray-900 text-white rounded-xl px-4 py-3 max-w-xs mx-auto text-sm font-medium shadow-lg">
      ${escapeHTML(message)}
    </div>
  `;
  document.body.appendChild(div);

  setTimeout(() => {
    div.style.transition = 'opacity 0.2s';
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 200);
  }, 2500);
}
```

**Threshold logic in `handleAddCourt`** (exact thresholds from CONTEXT.md D-05):
- At 55 courts: show block toast, do NOT add
- After adding when count crosses from 19 to 20: show warning toast, court IS added

---

## Shared Patterns

### Module-scope state pattern
**Source:** `src/views/MatchEditor.js` lines 8–14
**Apply to:** All new handlers in MatchEditor.js — they reference `_draft`, `_el`, `_roundIndex`, `_sortableInstances` as module-scope variables, never as parameters.
```javascript
let _sortableInstances = [];
let _draft = null;
let _originalRound = null;
let _roundIndex = null;
let _el = null;
```

### Re-render / re-init pattern
**Source:** `src/views/MatchEditor.js` lines 303–308 (initial mount) and line 311–318 (`unmount`)
**Apply to:** `handleAddCourt`, `handleRemoveCourt` — both must destroy-and-reinit SortableJS:
```javascript
// Destroy (unmount pattern, lines 312–313):
_sortableInstances.forEach(s => s.destroy());
_sortableInstances = [];

// Re-init (mount pattern, lines 303–308):
initSortables(el);
validateAndUpdateUI(el);
// wire all button listeners again
```

### escapeHTML usage
**Source:** `src/views/MatchEditor.js` line 4, lines 206, 208
**Apply to:** All user-supplied string output in new HTML templates (toast message, player names in chips):
```javascript
import { escapeHTML } from '../utils/html.js';
// Usage:
`${escapeHTML(getPlayerName(id))}`
`${escapeHTML(message)}`
```

### SortableJS destroy-all guard
**Source:** `src/views/MatchEditor.js` lines 132–161 (`initSortables`)
**Apply to:** After add/remove court — must call on ALL zones after DOM rebuild, not targeted per-zone:
```javascript
// initSortables iterates ALL [data-zone] elements — safe to call after full re-render:
function initSortables(el) {
  const zones = el.querySelectorAll('[data-zone]');
  zones.forEach(zone => {
    const instance = new Sortable(zone, { /* options */ });
    _sortableInstances.push(instance);
  });
}
```

---

## Test Patterns

### `src/views/MatchEditor.test.js` — Phase 14 tests

**Analog:** Existing Phase 13 test block (lines 228–683) — use identical setup, mock, and assertion patterns.

**Test file structure pattern** (lines 1–35):
```javascript
import { expect, test, describe, beforeEach, vi } from 'vitest'
import { StorageAdapter } from '../storage.js'
import { SessionService } from '../services/session.js'

vi.mock('../router.js', () => ({ navigate: vi.fn() }))
vi.mock('../services/haptics.js', () => ({
  Haptics: { light: vi.fn(), medium: vi.fn(), success: vi.fn() },
}))

const mockSortable = vi.hoisted(() => ({ instances: [] }))
vi.mock('sortablejs', () => ({
  default: class MockSortable {
    constructor(el, options) {
      this._el = el; this.options = options || {};
      mockSortable.instances.push(this);
    }
    destroy() {}
    static mount() {}
  },
  Swap: class MockSwap {},
}))
```

**`beforeEach` cleanup pattern** (lines 232–236):
```javascript
beforeEach(() => {
  StorageAdapter.reset()
  vi.clearAllMocks()
  mockSortable.instances = []
  el = document.createElement('div')
})
```

**`setupEditor` helper pattern** (lines 247–252):
```javascript
function setupEditor(round) {
  const session = makeSession([round])
  StorageAdapter.set('clubs', CLUBS_DATA)
  StorageAdapter.set('sessions', [session])
  mount(el, { roundIndex: '0' })
}
```

**Simulate drag + onEnd pattern** (lines 487–492):
```javascript
// Move chip in DOM, then fire onEnd to trigger handleDragEnd:
const chip = el.querySelector('[data-player-id="p4"]')
const targetZone = el.querySelector('[data-zone="bench"]')
targetZone.appendChild(chip)
mockSortable.instances[0].options.onEnd({ item: chip })
```

**Button click pattern** (lines 119–122):
```javascript
vi.spyOn(SessionService, 'updateRound').mockImplementation(() => {})
el.querySelector('#confirm-btn').click()
expect(SessionService.updateRound).toHaveBeenCalledWith(0, expect.any(Object))
```

**Session fixture with sit-out history** — new helper needed for BENCH-01 tests:
```javascript
function makeSessionWithHistory() {
  return {
    ...makeSession([
      { index: 0, played: true,  courts: [{ teamA: ['p1','p2'], teamB: ['p3','p4'] }], sittingOut: ['p5'] },
      { index: 1, played: true,  courts: [{ teamA: ['p1','p3'], teamB: ['p2','p4'] }], sittingOut: ['p5'] },
      { index: 2, played: false, courts: [{ teamA: ['p1','p2'], teamB: ['p3','p4'] }], sittingOut: ['p5'] },
    ]),
    attendeeIds: ['p1','p2','p3','p4','p5'],
  }
}
// p5 has sitCount 2 from played rounds 0+1; round 2 is current draft (not counted)
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Toast (`showToast` function) | utility | event-driven | No existing toast pattern in codebase — implement as inline helper in MatchEditor.js |

---

## Metadata

**Analog search scope:** `src/views/`, `src/services/`, `src/style.css`
**Files read:** `MatchEditor.js`, `RoundDisplay.js`, `MatchEditor.test.js`, `haptics.js`, `style.css`
**Pattern extraction date:** 2026-04-14
