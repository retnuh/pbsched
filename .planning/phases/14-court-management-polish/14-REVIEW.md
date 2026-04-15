---
phase: 14-court-management-polish
reviewed: 2026-04-15T00:00:00Z
depth: deep
files_reviewed: 2
files_reviewed_list:
  - src/views/MatchEditor.js
  - src/views/MatchEditor.test.js
findings:
  critical: 0
  high: 1
  medium: 3
  low: 3
  info: 4
  total: 11
status: issues_found
---

# Phase 14: Code Review Report

**Reviewed:** 2026-04-15
**Depth:** deep (full file read + cross-function call-chain analysis)
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Phase 14 adds haptics, `showToast`, Add Court, Remove Court, bench badge sync, the court-limit guardrail (55-court cap with a milestone toast at 20), and refactors `mount()` into `buildHTML` / `wireListeners` / `rerender` helpers. The architecture is clean and the rerender cycle is correct: sortables are destroyed before `innerHTML` is overwritten and re-initialized after. Event listeners are attached to child elements only, so `innerHTML` rewrite naturally cleans them up — no accumulation leak.

One HIGH finding: `handleRemoveCourt` has no guard verifying the target court is empty before splicing it from `_draft`. The court's players would be silently discarded with no warning and no undo path. This is mitigated today by UI-only visibility hiding the Remove button — but a defense-in-depth guard in the handler itself is absent. All other issues are MEDIUM or below.

---

## High Issues

### H-01: `handleRemoveCourt` silently discards players if called on a non-empty court

**File:** `src/views/MatchEditor.js:316-319`

**Issue:** `handleRemoveCourt` only guards against removing the last remaining court; it does not verify the target court is actually empty before splicing it from `_draft.courts`. If `btn.dataset.removeCourt` resolves to a non-empty court (stale DOM reference, direct test call, or a future code path that makes the button accessible when non-empty), all players in that court are silently dropped from the draft. There is no undo and no warning. The data loss happens in-memory before `rerender()`, so it would be saved if the user then clicks Confirm.

```js
function handleRemoveCourt(courtIndex) {
  if (_draft.courts.length <= 1) return;
  // Missing guard:
  const court = _draft.courts[courtIndex];
  if (!court) return;
  if (court.teamA.length > 0 || court.teamB.length > 0) return; // never drop players silently
  _draft.courts.splice(courtIndex, 1);
  rerender(_el);
}
```

---

## Medium Issues

### M-01: Misleading inline comment in `buildHTML` about sit-count scope

**File:** `src/views/MatchEditor.js:158-163`

**Issue:** The comment reads `// sitCounts — count sit-outs from ALL session rounds (current draft NOT included)`. This is incorrect. `_session` is the live object returned by `SessionService.getActiveSession()`, which includes `session.rounds[roundIndex]` — the same round currently being edited. When editing round 2, `session.rounds[2].sittingOut` is read (with its original/stored value), so the current draft's stored sit-outs ARE counted. The test at line 930 explicitly documents the real behavior (`3×` because all three rounds contribute). A developer reading this comment will have the wrong mental model of what the badge numbers mean.

**Fix:** Update the comment:
```js
// sitCounts — count sit-outs from ALL session.rounds, including the current draft's
// stored sittingOut (the session is not mutated until Confirm). Badge shows historical context.
```

---

### M-02: `drop-pop` animation class persists permanently if CSS `animationend` never fires

**File:** `src/views/MatchEditor.js:357-359`

**Issue:** `handleDragEnd` adds the `drop-pop` class to the dragged chip and relies on `animationend` (with `{ once: true }`) to remove it. If the `drop-pop` CSS animation is not defined or is suppressed (e.g., `prefers-reduced-motion`, a browser that skips the animation, or a missing stylesheet in a test or SSR context), `animationend` never fires. The class accumulates on the chip indefinitely. On subsequent drags of the same chip, `classList.add('drop-pop')` is a no-op and the animation never plays again for that chip.

`drop-pop` is confirmed defined in `src/style.css` (line 119), so this does not affect the current production build. However it is a latent bug that will surface if the animation is ever moved, conditionally disabled, or the component is rendered in an environment without `src/style.css` loaded.

**Fix:** Add a `setTimeout` fallback:
```js
evt.item.classList.add('drop-pop');
const removeDropPop = () => evt.item.classList.remove('drop-pop');
evt.item.addEventListener('animationend', removeDropPop, { once: true });
setTimeout(removeDropPop, 600); // fallback if animationend never fires
```

---

### M-03: `showToast` leaves orphaned `setTimeout` closures on rapid successive calls

**File:** `src/views/MatchEditor.js:112-125`

**Issue:** When `showToast` is called a second time while the first toast is still fading (within the 2700 ms window), it removes the existing `div` from the DOM and creates a fresh one. However, the two `setTimeout` closures from the first call still hold a reference to the detached `div` and will fire at their scheduled times. The operations are harmless (setting `.style` on a detached node is a no-op; calling `.remove()` on a detached node is also a no-op), but the timer handles are never cleared. On devices where `showToast` is called repeatedly in quick succession (e.g., tapping Add Court rapidly near the 20-court milestone), this produces a small set of orphaned timer handles that live until they fire.

**Fix:** Track and cancel the previous timer:
```js
let _toastTimer = null;

function showToast(message) {
  const existing = document.getElementById('gsd-toast');
  if (existing) { existing.remove(); }
  if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
  const div = document.createElement('div');
  div.id = 'gsd-toast';
  // ... (rest unchanged)
  document.body.appendChild(div);
  _toastTimer = setTimeout(() => {
    div.style.transition = 'opacity 0.2s';
    div.style.opacity = '0';
    setTimeout(() => { div.remove(); _toastTimer = null; }, 200);
  }, 2500);
}
```

---

## Low Issues

### L-01: `mount()` does not clean up existing sortables on double-call

**File:** `src/views/MatchEditor.js:393-449`

**Issue:** If the router calls `mount()` a second time without an intervening `unmount()` (e.g., a user navigates to the same URL while already on the editor), `_sortableInstances` is overwritten without calling `destroy()` on the previous instances first. The previous Sortable instances remain attached to now-orphaned DOM nodes (because `innerHTML` was replaced), but they are never destroyed and their internal event listeners are not cleaned up. `rerender()` handles this correctly (it calls `destroy()` first), but `mount()` itself does not.

**Fix:**
```js
export function mount(el, params) {
  // Guard against double-mount
  if (_sortableInstances.length) {
    _sortableInstances.forEach(s => s.destroy());
    _sortableInstances = [];
  }
  // ... rest of mount
}
```

---

### L-02: Duplicate `parseInt` of `params.roundIndex`

**File:** `src/views/MatchEditor.js:407` and `src/views/MatchEditor.js:442`

**Issue:** `params.roundIndex` is parsed twice: once as `const roundIndex = parseInt(params.roundIndex, 10)` (used for the bounds check), and again as `_roundIndex = parseInt(params.roundIndex, 10)` (stored for later use). The two results are always identical. This is a harmless code smell but creates a discrepancy in intent — a reader might wonder if the two variables are meant to differ.

**Fix:** Assign once and reuse:
```js
const roundIndex = parseInt(params.roundIndex, 10);
// ... use roundIndex for the round lookup and early return
_roundIndex = roundIndex; // reuse instead of reparsing
```

---

### L-03: No toast fired and no user feedback when Remove Court discards a court at index 0

**File:** `src/views/MatchEditor.js:316-319`

**Issue:** When a user removes a court at index 0 (the first court), the remaining courts are silently renumbered. "Court 2" becomes "Court 1", "Court 3" becomes "Court 2", etc. There is no feedback indicating that court numbers shifted. This is low severity because the rerender shows the updated labels clearly, but users who were focused on "Court 3" may be confused to find it is now "Court 2" with no explanation.

**Fix:** Consider a brief toast on any Remove action: `showToast('Court removed')`. This aligns with how Add Court provides toast feedback at milestones.

---

## Info Items

### IN-01: BENCH-01 test 3 comment contradicts the assertion it describes

**File:** `src/views/MatchEditor.test.js:997`

**Issue:** The comment reads `// p1's badge = 0 (never sat out in any stored round)`. However the assertion on the next line correctly expects `'1×'`, because `session.rounds[2].sittingOut = ['p1']` — p1 IS in a stored round's `sittingOut`. The comment will mislead future maintainers into expecting the badge to show 0 and potentially writing an incorrect fix if the badge count behavior is revisited.

**Fix:** Update the comment:
```js
// p1 sits out in rounds[2] (stored in session), so count = 1
expect(p1Chip.textContent).toContain('1×')
```

---

### IN-02: No test for exact toast message at the 55-court hard cap

**File:** `src/views/MatchEditor.test.js:1042-1048`

**Issue:** The guardrail test verifies that the 56th court is not added (`data-court="55"` is absent), but it does not assert that the "Wimbledon" toast fires or check its message text. The 20-court milestone toast is tested (line 1051-1064), creating an asymmetry. If the 55-court message is changed or the `showToast` call is accidentally removed from the hard-cap branch, no test would catch it.

**Fix:** Add a toast assertion to the hard-cap test:
```js
el.querySelector('#add-court-btn').click()
expect(el.querySelector('[data-court="55"]')).toBeNull()
expect(document.getElementById('gsd-toast')).not.toBeNull()
expect(document.getElementById('gsd-toast').textContent).toContain('Wimbledon')
```

---

### IN-03: No test for removing court 0 when multiple courts exist

**File:** `src/views/MatchEditor.test.js` (COURT-02 block, lines 796-882)

**Issue:** All `handleRemoveCourt` tests target court index 1 (the second court). There is no test that clicks `[data-remove-court="0"]` when multiple courts exist. Removing the first court is distinct because `splice(0, 1)` shifts all remaining court indices down by one — the rerender must correctly rebuild data-court attributes starting from 0. The current implementation handles this correctly via full rerender, but it is not exercised by any test.

**Fix:** Add a test:
```js
test('after removing court 0, former court 2 becomes court 1 in the DOM', () => {
  const round = {
    index: 0, played: false,
    courts: [
      { teamA: [], teamB: [] },            // court 0: empty, removable
      { teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] }, // court 1
    ],
    sittingOut: [],
  }
  setupEditor(round)
  el.querySelector('[data-remove-court="0"]').click()
  expect(el.querySelector('[data-court="0"]')).not.toBeNull()
  expect(el.querySelector('[data-court="1"]')).toBeNull()
  expect(el.innerHTML).toContain('Court 1')
  expect(el.innerHTML).not.toContain('Court 2')
})
```

---

### IN-04: No test for `hasChanges()` after Add Court (discard modal with structural change)

**File:** `src/views/MatchEditor.test.js` (DISCARD-01 block, lines 448-481)

**Issue:** The DISCARD-01 tests simulate a change via a drag operation. There is no test verifying that clicking Add Court (which modifies `_draft.courts`) also causes `hasChanges()` to return `true` and triggers the discard modal. The JSON comparison in `hasChanges()` compares the entire `_draft` object — an added court would correctly make the comparison unequal — but this code path is untested.

**Fix:** Add a test:
```js
test('Cancel after Add Court shows discard modal (draft has extra court)', () => {
  setupEditor(makeRoundWithBench())
  el.querySelector('#add-court-btn').click()
  el.querySelector('#cancel-btn').click()
  expect(el.querySelector('#discard-modal').classList.contains('hidden')).toBe(false)
})
```

---

## Summary

| Severity | Count | Items |
|----------|-------|-------|
| CRITICAL | 0     | — |
| HIGH     | 1     | H-01 (silent player loss on Remove Court) |
| MEDIUM   | 3     | M-01 (misleading comment), M-02 (drop-pop leak), M-03 (orphaned timers) |
| LOW      | 3     | L-01 (double-mount leak), L-02 (duplicate parseInt), L-03 (no feedback on court renumber) |
| INFO     | 4     | IN-01 (test comment wrong), IN-02 (missing toast message assertion), IN-03 (remove-court-0 gap), IN-04 (discard-after-add-court gap) |
| **Total**| **11**| |

The single HIGH issue (H-01) is the most actionable: add a three-line emptiness guard inside `handleRemoveCourt`. The rest are polish items and test coverage gaps that pose no immediate data integrity risk given the current UI-only visibility control on the Remove button, but should be addressed before any future change that might make that button accessible in non-empty states.

---

_Reviewed: 2026-04-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
