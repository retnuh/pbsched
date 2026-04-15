---
phase: 13-drag-interactions-validation
reviewed: 2026-04-15T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/views/MatchEditor.js
  - src/style.css
  - src/views/MatchEditor.test.js
findings:
  critical: 0
  warning: 5
  info: 6
  total: 11
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-04-15
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Phase 13 adds SortableJS drag-and-drop to MatchEditor with full-zone drag groups, an `onMove` guard to cap each court side at 2 players, a `validateAndUpdateUI` function that drives error labels and the Confirm button, `handleConfirm` / `handleCancel` with a discard modal, and `unmount()` cleanup. The overall design is sound and the happy-path behavior is well-covered. No security vulnerabilities or data-loss critical bugs were found.

Five warnings were identified — three in the validation/drag logic that can produce misleading UI state or allow a logically inconsistent save, one in the `hasChanges` comparison, and one CSS interaction issue. Six informational items cover test coverage gaps, dead code paths, and style details.

---

## Warnings

### WR-01: `validateAndUpdateUI` evaluates `oversized` before `imbalanced`, masking the imbalanced error message when a side is both oversized and imbalanced

**File:** `src/views/MatchEditor.js:43-57`

The conditions in `validateAndUpdateUI` are evaluated independently but the error label text is assigned in priority order: oversized wins over imbalanced. The check `oversized` is `teamA.length > 2 || teamB.length > 2`. If `teamA = [p1, p2, p3]` and `teamB = []` (total = 3, one side empty), the court is simultaneously oversized AND imbalanced. The label correctly shows "max 2 per side", which is acceptable. However there is a subtler issue: `imbalanced` is only evaluated when `total > 1`, meaning the condition is:

```js
const imbalanced = total > 1 && (court.teamA.length === 0 || court.teamB.length === 0);
```

Consider `teamA = [p1, p2, p3]`, `teamB = []`: total = 3, so `imbalanced` = `true`. But `oversized` also = `true`, so the label says "max 2 per side". That is correct. The real gap is: `teamA = [p1]`, `teamB = [p2, p3]` (total = 3, not oversized, not imbalanced in the `(one side empty)` sense) — this state is **valid** per the current logic even though pickleball requires equal-or-near-equal teams. This is a design choice issue rather than a pure bug, but it allows a 1v2 court to pass validation and be saved.

**Fix:** If 1v2 is an invalid match format, add a balance check:

```js
const unbalanced = total > 1 && Math.abs(court.teamA.length - court.teamB.length) > 1;
const isInvalid = total === 1 || oversized || imbalanced || unbalanced;
```

If 1v2 is intentionally allowed (e.g. singles against a team), document this explicitly so future reviewers understand the intent. Currently neither the spec comment nor the code makes this clear.

---

### WR-02: `onMove` guard counts `[data-player-id]` children live during drag — counts the dragged chip as still present, producing an off-by-one false positive

**File:** `src/views/MatchEditor.js:379-384`

```js
const chipCount = evt.to.querySelectorAll('[data-player-id]').length;
if (chipCount >= 2) {
  const isPlayerSwap = evt.related?.hasAttribute('data-player-id');
  if (!isPlayerSwap) return false;
}
```

During SortableJS `onMove`, the dragged chip (`evt.item`) has **already been temporarily removed** from the source zone but has **not yet been inserted** into the target zone. So `chipCount` reflects the true count of existing chips in `evt.to` at that moment. This is actually correct for most drag paths. However, in Swap mode, the `evt.related` element is the swap target that will be displaced — it is still counted in `chipCount` until the swap completes. This means: when dragging from a 1-chip zone to a 2-chip zone in Swap mode, `chipCount` = 2 and the guard allows it because `evt.related` has `data-player-id`. After the swap, the source zone receives `evt.related` and the target keeps `evt.item`, preserving the 2-chip count — so Swap paths are safe.

The real gap is **bench-to-court-with-empty-slot**: `evt.to` has 1 chip + 1 empty slot, `chipCount = 1`, guard is skipped (chipCount < 2), and the bench chip is inserted, producing 2 chips. Then `reconcileDraftFromDOM` reads `[data-player-id]` correctly (only chips have that attribute, not empty slots). This path is fine. The issue is if `chipCount` is somehow 2 with an empty slot — but empty slots have no `data-player-id`, so the count is reliable. **Conclusion:** The off-by-one risk described above does not materialise, but the guard has a latent correctness dependency on empty slots never receiving `data-player-id`. That invariant is currently maintained but not enforced or commented.

**Fix:** Add a comment documenting the invariant:

```js
// Empty slots intentionally have no data-player-id so querySelectorAll('[data-player-id]')
// always returns the true player count for the cap check.
const chipCount = evt.to.querySelectorAll('[data-player-id]').length;
```

---

### WR-03: `hasChanges()` uses `JSON.stringify` on objects that may have property order differences, producing false "no changes" if key order diverges between `_draft` and `_originalRound`

**File:** `src/views/MatchEditor.js:71`

```js
function hasChanges() {
  return JSON.stringify(_draft) !== JSON.stringify(_originalRound);
}
```

`_draft` is initialized with `JSON.parse(JSON.stringify(round))` and `_originalRound` with the same. Both start with identical key order, so this is safe on initial mount. However, `reconcileDraftFromDOM` replaces `_draft.courts` with new objects built via spread:

```js
_draft.courts = _draft.courts.map((court, i) => ({
  ...court,
  teamA: readZoneIds(...),
  teamB: readZoneIds(...),
}));
```

If `court` originally has keys `{ teamA, teamB }` and the spread produces `{ teamA, teamB, teamA, teamB }` (duplicates collapsed by spread semantics), the final key order is `teamA, teamB` — same as original. Safe. If `_originalRound` courts have additional properties (e.g. a future `label` field), those will survive in `_originalRound` but be spread-preserved in `_draft` at reconciliation. Key order divergence is unlikely in practice with this schema but is a fragile assumption. If `hasChanges` returns `false` when it should return `true`, the user will navigate away without the discard modal, silently discarding changes.

**Fix:** For a small object like a round, a structural equality check is safer and explicit:

```js
function hasChanges() {
  const d = _draft;
  const o = _originalRound;
  if (d.sittingOut.join(',') !== o.sittingOut.join(',')) return true;
  if (d.courts.length !== o.courts.length) return true;
  return d.courts.some((c, i) =>
    c.teamA.join(',') !== o.courts[i].teamA.join(',') ||
    c.teamB.join(',') !== o.courts[i].teamB.join(',')
  );
}
```

Alternatively, if `JSON.stringify` is kept, sort keys before stringifying both sides.

---

### WR-04: `handleConfirm` re-validates `_draft` rather than re-reading the DOM — stale `_draft` if a drag fires `onEnd` but `reconcileDraftFromDOM` was skipped (e.g. dropped onto an invalid target)

**File:** `src/views/MatchEditor.js:85-98`

`handleConfirm` runs the validation check against `_draft`. The draft is only updated in `handleDragEnd` via `reconcileDraftFromDOM`. SortableJS does not call `onEnd` for moves that were blocked by `onMove` returning `false`. In the blocked case, the DOM reverts to the pre-drag state and `_draft` stays correct. This is safe for the current implementation.

However, if SortableJS fires `onEnd` in an edge case where the DOM and `_draft` diverge (e.g., a touch-cancel event mid-drag on some mobile browsers), `_draft` can be stale and `handleConfirm` would validate the stale state rather than the current DOM. The save would then persist an incorrect round.

**Fix:** Call `reconcileDraftFromDOM(_el)` at the top of `handleConfirm` before validation, or ensure the `onEnd` handler always fires for every completed gesture (including cancels). The defensive reconcile is the simpler fix:

```js
function handleConfirm() {
  reconcileDraftFromDOM(_el); // always read current DOM state before saving
  const anyInvalid = _draft.courts.some(c => { ... });
  ...
}
```

---

### WR-05: `sortable-ghost` uses `!important` on `border` and `background-color` — this overrides dark-mode chip border colors set by zone selectors, but the dark-mode ghost rule is correct; light-mode ghost may be invisible on white backgrounds

**File:** `src/style.css:87-95`

```css
.sortable-ghost {
  opacity: 0.35;
  border: 3px dashed #111827 !important; /* gray-900 */
  background-color: transparent !important;
  color: transparent !important;
}
.dark .sortable-ghost {
  border: 3px dashed #9ca3af !important;
}
```

The ghost element is a clone of the dragged chip placed at the drop-preview location. The ghost's original zone-based chip color (`background-color: #EFF6FF` for team A, white-ish) is forced to `transparent`, leaving only the dashed border. In light mode, a gray-900 dashed border on a transparent background over a white card renders as a dark outline — visible, intentional. No visual bug here on its own.

The issue is specificity: the zone-color rules (e.g., `[data-zone$="-a"] [data-player-id]`) apply `border-color` with no `!important`. The ghost rule uses `!important` to override. This is correct. **But** the dark-mode ghost selector `.dark .sortable-ghost` has lower specificity than `.dark [data-zone$="-a"] [data-player-id]` for chips that match both (a ghost inside a dark zone). Because both use `!important`, the last-declared rule wins. The dark ghost rule is declared after the zone rules in the file, so it wins. This is correct but fragile — CSS source order is load-order sensitive and this will silently break if style.css is ever split or concatenated differently.

**Fix:** Apply the dark ghost border inside the zone selectors or use a data attribute on the ghost to allow explicit targeting. At minimum, add a comment:

```css
/* NOTE: .dark .sortable-ghost MUST be declared after zone chip rules to win the !important
   specificity tie. Do not reorder these blocks. */
```

---

## Info

### IN-01: No test covers `unmount()` clearing all module-scope state (`_draft`, `_el`, etc.)

**File:** `src/views/MatchEditor.test.js:636-643`

The existing unmount test only verifies that `destroy()` is called on Sortable instances. None of the module-scope variables (`_draft`, `_el`, `_session`, `_round`, etc.) are observable from tests, but a future test mounting after an un-destroyed state would silently read stale data. A minimal coverage improvement would be to call `unmount()` then `mount()` again and assert that it renders fresh state rather than crashing or showing stale content.

---

### IN-02: `handleDragEnd` always fires `Haptics.medium()` — fires even when the chip returns to its original zone (no-op drag)

**File:** `src/views/MatchEditor.js:355`

SortableJS fires `onEnd` when the drag gesture completes, including when the chip is dropped back into the exact same position (e.g. a tap that becomes a drag then is released). In that case, `reconcileDraftFromDOM` computes the same state, `hasChanges()` returns false, but haptics still fire. On devices with haptic feedback, this is a noticeable false positive. No test covers the "drag-then-drop-in-place" path.

**Fix:**

```js
function handleDragEnd(evt) {
  const before = JSON.stringify(_draft);
  reconcileDraftFromDOM(_el);
  const changed = JSON.stringify(_draft) !== before;
  syncEmptySlots(_el);
  syncBenchBadges(_el);
  validateAndUpdateUI(_el);
  updateRemoveButtonVisibility(_el);
  if (changed) Haptics.medium(); // only fire if state actually changed
  ...
}
```

---

### IN-03: `handleAddCourt` toast threshold uses `20` for the Wimbledon flavour message but cap is `55` — the gap between thresholds is never explained

**File:** `src/views/MatchEditor.js:305-313`

```js
if (_draft.courts.length >= 55) { showToast("Can't be better than Wimbledon!"); return; }
_draft.courts.push({ teamA: [], teamB: [] });
if (_draft.courts.length === 20) { showToast("Oooh, more than Wimbledon's..."); }
```

Magic numbers. The 20 and 55 values have a comment explaining intent but no named constant. A future maintainer changing the cap from 55 could miss the toast at 20 since they are not linked. This is a maintainability note only.

**Fix:**

```js
const MAX_COURTS = 55;
const WIMBLEDON_COURTS = 18; // actual Championship court count — toast fires when this is exceeded
```

---

### IN-04: The discard modal backdrop click is not wired — users cannot dismiss the modal by tapping the overlay

**File:** `src/views/MatchEditor.js:249`

The modal HTML has `<div class="absolute inset-0 bg-black/40">` as the backdrop but no click handler. Only "Keep Editing" dismisses the modal. Tapping outside on mobile is a universal UX convention for dismissing bottom sheets. This is not a bug, but it is a missing affordance that will surprise users.

**Fix:** In `wireListeners`, add:

```js
el.querySelector('#discard-modal .absolute.inset-0').addEventListener('click', handleDiscardKeep);
```

---

### IN-05: `showToast` uses `innerHTML` to inject an `escapeHTML`-sanitized message, which is safe, but could be written with `textContent` to eliminate any XSS surface entirely

**File:** `src/views/MatchEditor.js:118`

```js
div.innerHTML = `<div class="...">${escapeHTML(message)}</div>`;
```

`escapeHTML` is used correctly and the value is safe. However, since the inner content is plain text, `textContent` eliminates the pattern entirely:

```js
const inner = document.createElement('div');
inner.className = 'bg-gray-900 text-white rounded-xl px-4 py-3 max-w-xs mx-auto text-sm font-medium shadow-lg';
inner.textContent = message;
div.appendChild(inner);
```

This is a defense-in-depth suggestion; not a live vulnerability.

---

### IN-06: Test coverage gap — no test simulates a drag that produces a 1v2 court and verifies that `validateAndUpdateUI` does or does not flag it as invalid

**File:** `src/views/MatchEditor.test.js`

Related to WR-01: the validation logic allows a 1v2 split as valid. There is no test that verifies this is intentional. A test should either assert that `{ teamA: ['p1'], teamB: ['p2', 'p3'] }` passes validation (documenting the intent) or assert it fails (if 1v2 is disallowed). Currently the behavior is uncovered and unspecified.

---

## Summary Table

| ID    | Severity | Area                          | Short Description                                                        |
|-------|----------|-------------------------------|--------------------------------------------------------------------------|
| WR-01 | Warning  | Validation logic              | 1v2 court passes validation; intent is unspecified and uncovered by tests |
| WR-02 | Warning  | Drag guard (onMove)           | Correctness depends on undocumented invariant: empty slots have no data-player-id |
| WR-03 | Warning  | hasChanges / cancel safety    | JSON.stringify key-order dependency could cause false "no changes" in future |
| WR-04 | Warning  | Confirm handler safety        | handleConfirm validates stale _draft; no reconcile call before save      |
| WR-05 | Warning  | CSS / dark mode               | !important ghost border relies on fragile CSS source-order for dark mode  |
| IN-01 | Info     | Test coverage                 | unmount() test only checks destroy(); module-scope state reset uncovered  |
| IN-02 | Info     | Drag interaction              | Haptics fire on no-op drag (chip returned to origin)                     |
| IN-03 | Info     | Code quality                  | Magic numbers 20 and 55 in handleAddCourt are unlinked                   |
| IN-04 | Info     | UX / cancel handler           | Discard modal backdrop is not clickable; no dismiss-on-overlay-tap       |
| IN-05 | Info     | Security (defense-in-depth)   | showToast uses innerHTML+escapeHTML; textContent would be safer           |
| IN-06 | Info     | Test coverage                 | No test specifies whether 1v2 court is valid or invalid                  |

**Total findings: 11 (0 Critical, 5 Warning, 6 Info)**

---

_Reviewed: 2026-04-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
