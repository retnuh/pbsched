---
phase: 12-editor-scaffold-entry-points
reviewed: 2026-04-15T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/views/MatchEditor.js
  - src/views/MatchEditor.test.js
  - src/views/RoundDisplay.js
  - src/router.js
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-04-15T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

This phase introduced `MatchEditor.js` (the drag/drop court editor scaffold), registered it in the
router at `/edit/:roundIndex`, added "Edit" button entry points in `RoundDisplay.js`, and shipped an
initial test suite covering mount, error states, back-navigation, and drag interactions.

**Files reviewed as they exist now** (cumulative through Phases 13, 14, 16). Prior issues flagged in
the previous 2026-04-14 review and now resolved are confirmed fixed:

- `escapeHTML` is imported and applied to all player-name interpolations in `MatchEditor.js`.
- `MatchEditor` has a null guard for `ClubService.getClub()` with a graceful fallback.
- The router's stale-params bleed is fixed (uses `candidateParams` per attempt, breaks on first match).
- `MatchEditor.test.js` now has a test for the null-club scenario.
- `Haptics` is now legitimately imported by `MatchEditor.js` (Phase 14 added it), so the mock is
  no longer dead code.

Remaining issues are documented below. The most impactful is a persistent XSS path in
`RoundDisplay.js` where `member.name` and `club.name` are interpolated unescaped into `innerHTML`.
The router's `navigate()` is still declared `async` without reason. Several `parseInt` calls lack the
radix argument.

---

## Critical Issues

### CR-01: Unescaped member.name and club.name interpolated into innerHTML (stored XSS)

**File:** `src/views/RoundDisplay.js:95`, `src/views/RoundDisplay.js:253`

**Issue:** Two locations in `RoundDisplay.js` interpolate user-controlled strings directly into
`innerHTML` without calling `escapeHTML`:

- **Line 95** — `renderAttendeeManager()` renders the player list for the attendee-management
  sub-view. Every club member's name is placed raw into a `<span>`:
  ```js
  <span class="font-bold">${member.name}</span>
  ```
- **Line 253** — `renderMain()` renders the club name in the session header:
  ```js
  <p class="text-xs text-gray-500">${club.name}</p>
  ```

`escapeHTML` is already imported in `RoundDisplay.js` (line 5) and used correctly everywhere else
in the file. These two call sites were simply missed.

A member name or club name containing `<script>`, `<img onerror=...>`, or any other HTML special
characters would be parsed by the browser as markup. Because these strings originate from user input
(`ClubService.addMember()` and club-creation forms), this is a stored XSS vector: a crafted name
saved once will execute on every visit to the session view for every user sharing the same
localStorage partition.

The `escapeHTML` utility does not escape single quotes (`'`), which means attribute injection is
still possible in single-quoted HTML attribute contexts. However, all surrounding attributes in
these files use double quotes, so this is not an immediate risk here. The gap is documented as
IN-01 below.

**Fix:** Apply `escapeHTML` at both sites:

```js
// Line 95 — renderAttendeeManager()
<span class="font-bold">${escapeHTML(member.name)}</span>

// Line 253 — renderMain()
<p class="text-xs text-gray-500">${escapeHTML(club.name)}</p>
```

---

## Warnings

### WR-01: navigate() declared async with no async body

**File:** `src/router.js:57`

**Issue:** `navigate` is declared `export async function navigate(path)` but its body is a single
synchronous statement: `window.location.hash = path`. There is no `await`, no Promise, and no
returned value. The `async` wrapper makes the function return a `Promise<undefined>` instead of
`undefined`. Any caller using `await navigate(...)` will receive `undefined` — identical to not
awaiting — but the `async` keyword signals intent that does not exist and may cause confusion in
tests and in future callers.

**Fix:**
```js
export function navigate(path) {
  window.location.hash = path;
}
```

---

### WR-02: parseInt calls throughout RoundDisplay.js missing radix argument

**File:** `src/views/RoundDisplay.js:230`, `392`, `407`, `417`, `426`

**Issue:** All five `parseInt` calls that extract `data-index` attribute values omit the radix
argument:
```js
const altIndex = parseInt(btn.getAttribute('data-index'));
const idx = parseInt(playBtn.getAttribute('data-index'));
// ... and three more identical patterns
```

Without the radix, `parseInt` uses heuristics: strings starting with `0x` are treated as
hexadecimal, and historically strings starting with `0` were treated as octal (still true in some
engines). Round indices are always decimal integers rendered from `round.index`, so no bug exists
today. However, this is a lint error in every JS style guide and conceals intent. By contrast,
`MatchEditor.js` correctly uses `parseInt(params.roundIndex, 10)` throughout. Consistent radix
usage is especially important in a file where these indices are passed to `SessionService` methods
that index `session.rounds[]` directly.

**Fix:** Add `, 10` to every `parseInt` call reading `data-index`:
```js
const altIndex = parseInt(btn.getAttribute('data-index'), 10);
const idx = parseInt(playBtn.getAttribute('data-index'), 10);
// ... same for the remaining three
```

---

### WR-03: Sit-out badge counts in MatchEditor include the round being edited

**File:** `src/views/MatchEditor.js:158-163`, `src/views/MatchEditor.js:322-325`

**Issue:** The bench chip "N times sat out" badge is intended to show how many times a player has
sat out in rounds *other* than the current one (comment on line 158: "current draft NOT included").
However, `buildHTML` and `syncBenchBadges` both iterate `_session.rounds`, which is the session
as fetched from storage — including the saved `sittingOut` of the round at `_roundIndex`. The draft
being edited starts as a deep clone of that saved round, so if the player was sitting out in the
saved version of this round, their badge count is inflated by 1 during editing.

Example: A player sitting out in Round 3 is being edited. The badge shows "3x" (rounds 1, 2, 3).
If the user moves them to a court and saves, the badge would correctly show "2x" on next open. But
while editing, the badge is misleading because it counts this round's *pre-edit* sit-out.

The fix requires filtering out the round at `_roundIndex` when computing sit counts:

**Fix:**
```js
// buildHTML — filter out the round being edited
session.rounds
  .filter((_, i) => i !== /* the draft's index */ _roundIndex)
  .forEach(r => {
    r.sittingOut.forEach(id => {
      sitCounts[id] = (sitCounts[id] || 0) + 1;
    });
  });

// syncBenchBadges — same filter
_session.rounds
  .filter((_, i) => i !== _roundIndex)
  .forEach(r => {
    r.sittingOut.forEach(id => { sitCounts[id] = (sitCounts[id] || 0) + 1; });
  });
```

Note: `buildHTML` receives `session` as a parameter but `_roundIndex` is module scope — it is
accessible. `syncBenchBadges` already reads `_session` and `_roundIndex` directly.

---

## Info

### IN-01: escapeHTML does not escape single quotes

**File:** `src/utils/html.js:8-14`

**Issue:** The `escapeHTML` utility escapes `&`, `<`, `>`, and `"` but not `'` (single quote /
apostrophe). In all current uses the surrounding HTML attribute delimiters are double quotes, so
this is not an immediate vulnerability. However, if `escapeHTML` output is ever used inside a
single-quoted attribute value (e.g., `onclick='...'` or `data-x='...'`), single quotes in the
escaped value would break out of the attribute. Adding `&#x27;` escaping is low cost and removes
a future landmine.

**Fix:**
```js
export function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
```

---

### IN-02: Toast timer not cancelled on unmount (dangling setTimeout)

**File:** `src/views/MatchEditor.js:120-124`

**Issue:** `showToast()` schedules two nested `setTimeout` calls (2500 ms + 200 ms). If the user
navigates away from the editor before the timers fire, `unmount()` is called, which destroys the
Sortable instances and nulls module state. The timers still fire 2.5 seconds later and attempt to
call `.remove()` on a detached `div` element. This does not throw an error (removing a detached
element is a no-op), but the `div` referenced by the closure (`div.style.opacity`, `div.remove()`)
is a stale DOM reference appended to `document.body` — it will be removed eventually, but it leaks
for up to 2.7 seconds after navigation.

The practical impact is minimal (a stale invisible div on the body for a couple of seconds), but
it is a correctness gap that could grow if the toast is made visible during unmount.

**Fix:** Track the timeout IDs at module scope and cancel them in `unmount()`:
```js
let _toastTimer1 = null;
let _toastTimer2 = null;

function showToast(message) {
  clearTimeout(_toastTimer1);
  clearTimeout(_toastTimer2);
  const existing = document.getElementById('gsd-toast');
  if (existing) existing.remove();
  const div = document.createElement('div');
  // ... build div ...
  document.body.appendChild(div);
  _toastTimer1 = setTimeout(() => {
    div.style.transition = 'opacity 0.2s';
    div.style.opacity = '0';
    _toastTimer2 = setTimeout(() => div.remove(), 200);
  }, 2500);
}

export function unmount() {
  clearTimeout(_toastTimer1);
  clearTimeout(_toastTimer2);
  _toastTimer1 = null;
  _toastTimer2 = null;
  // ... existing cleanup ...
}
```

---

### IN-03: Test coverage gap — no test for unmount clearing module-scope state

**File:** `src/views/MatchEditor.test.js`

**Issue:** The existing unmount test (line 637) only verifies that `destroy()` is called on every
Sortable instance. It does not verify that module-scope variables (`_el`, `_draft`, `_roundIndex`,
`_session`, etc.) are nulled. If a future change accidentally removes a null assignment from
`unmount()`, stale state from a previous mount could bleed into a subsequent mount in the same
session. This is especially relevant because all module-scope variables are accessed directly by
handler functions (`handleCancel`, `handleConfirm`, `handleDragEnd`, etc.) without re-reading from
params.

**Fix:** Add a test that mounts, calls `unmount()`, mounts again with different data, and asserts
the second mount reflects the new data — not the old state. Alternatively, add an assertion that
a second mount after unmount does not show state from the first:
```js
test('unmount clears state so a second mount starts fresh', () => {
  const sessionA = makeSession([makeRound(0, false)]);
  StorageAdapter.set('clubs', CLUBS_DATA);
  StorageAdapter.set('sessions', [sessionA]);
  mount(el, { roundIndex: '0' });
  unmount();

  // Change storage to a different round
  const sessionB = makeSession([makeRound(0, false), makeRound(1, false)]);
  StorageAdapter.set('sessions', [sessionB]);
  mount(el, { roundIndex: '1' });

  expect(el.innerHTML).toContain('Edit Round 2');
});
```

---

## Summary

| Severity | Count | Items |
|----------|-------|-------|
| CRITICAL | 1 | CR-01: Unescaped member.name/club.name in RoundDisplay (stored XSS) |
| WARNING  | 3 | WR-01: async navigate, WR-02: parseInt radix, WR-03: Stale sit-out badge counts |
| INFO     | 3 | IN-01: escapeHTML missing single-quote, IN-02: Toast timer leak, IN-03: Test coverage gap |
| **Total** | **7** | |

**Resolved since 2026-04-14 review (not re-raised):**
- MatchEditor: escapeHTML applied to all player-name interpolations (was CR-01)
- MatchEditor: null guard on ClubService.getClub() (was CR-02)
- router.js: candidateParams per-loop-iteration fix applied (was WR-01)
- MatchEditor.test.js: club-not-found test added (was WR-04)
- MatchEditor.test.js: Haptics mock now legitimate — MatchEditor imports Haptics (was IN-02)

---

_Reviewed: 2026-04-15T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
