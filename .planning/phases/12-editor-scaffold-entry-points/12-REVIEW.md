---
phase: 12-editor-scaffold-entry-points
reviewed: 2026-04-14T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/views/MatchEditor.js
  - src/views/MatchEditor.test.js
  - src/test-setup.js
  - src/views/RoundDisplay.js
  - src/router.js
  - vite.config.js
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-04-14T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

This phase introduces `MatchEditor.js` as a read-only scaffold view for editing a round, registers it in the router at `/edit/:roundIndex`, and adds tests covering mount, back-navigation, and error states. `RoundDisplay.js` gains an "Edit" button entry point that calls `navigate('/edit/' + idx)`.

The new code is well-structured and the test coverage for the happy path is solid. Two cross-cutting issues stand out: unescaped member names are interpolated into `innerHTML` throughout both view files (stored XSS if names contain HTML), and neither view guards against a null `club` return from `ClubService.getClub()`. The router also has a stale-params bug in its route-matching loop.

---

## Critical Issues

### CR-01: Unescaped player names interpolated into innerHTML (stored XSS)

**File:** `src/views/MatchEditor.js:37`, `src/views/MatchEditor.js:41`, `src/views/MatchEditor.js:45`
**Also:** `src/views/RoundDisplay.js:91`, `src/views/RoundDisplay.js:192`, `src/views/RoundDisplay.js:296-299`, `src/views/RoundDisplay.js:469-474`

**Issue:** `getPlayerName(id)` returns a raw string from club member data and is interpolated directly into `el.innerHTML` template literals without HTML-escaping. A member name containing `<`, `>`, `"`, or `&` — either entered by the user or via `ClubService.addMember()` — will be parsed as HTML and can execute script nodes (e.g., a name like `<img src=x onerror=alert(1)>`). `ClubService.addMember()` in `RoundDisplay.js` line 117 takes user input directly from a text field with no sanitization before saving.

**Fix:** Introduce a one-line escape helper and apply it to all name interpolations:
```js
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Then replace all getPlayerName(id) calls in innerHTML with:
escapeHTML(getPlayerName(id))
```

This helper should live in a shared utility (e.g., `src/utils/html.js`) and be imported by both view files.

---

### CR-02: No null guard on ClubService.getClub() return value

**File:** `src/views/MatchEditor.js:33`
**Also:** `src/views/RoundDisplay.js:23`

**Issue:** Both files call `ClubService.getClub(session.clubId)` and immediately dereference the result without checking for `null`/`undefined`. If the club no longer exists (deleted, corrupted storage, or a stale session referencing a removed club), the very next line (`club.members.find(...)`) will throw a `TypeError: Cannot read properties of null`, crashing the view with an unhandled exception rather than showing a graceful fallback.

**Fix:**
```js
const club = ClubService.getClub(session.clubId);
if (!club) {
  el.innerHTML = `
    <div class="p-8 text-center space-y-4">
      <h1 class="text-2xl font-bold">Club Not Found</h1>
      <p class="text-gray-500">This session references a club that no longer exists.</p>
      <a href="#/" class="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-md">Go to Clubs</a>
    </div>
  `;
  return;
}
```

---

## Warnings

### WR-01: Stale params bleed between route-match attempts in router

**File:** `src/router.js:31-49`

**Issue:** `params` is initialised to `{}` once before the outer `for` loop (line 31). Inside the loop, `:param` segments are written to this shared object as the `every()` predicate executes. If an early route partially matches (writes some params) but ultimately fails, those stale keys remain in `params` when the next route is evaluated. A successful later match will inherit the dirty params from the failed attempt.

Example: if `/edit/:roundIndex` is checked before `/:clubId` and partially writes `roundIndex`, then a route that matches `/:clubId` would receive both `clubId` and the leftover `roundIndex` in its `params`.

**Fix:** Reset `params` inside the outer loop on each iteration:
```js
for (const path in routes) {
  const routeParts = path.split('/');
  const hashParts = hash.split('/');
  const candidateParams = {}; // fresh object per attempt

  if (routeParts.length === hashParts.length) {
    const isMatch = routeParts.every((part, i) => {
      if (part.startsWith(':')) {
        candidateParams[part.slice(1)] = hashParts[i];
        return true;
      }
      return part === hashParts[i];
    });

    if (isMatch) {
      params = candidateParams;
      matchedRoute = routes[path];
      break;
    }
  }
}
```

---

### WR-02: renderSitterPicker accesses round without bounds check

**File:** `src/views/RoundDisplay.js:154`

**Issue:** `pickingSitterFor` is set from `data-index` attribute values parsed with `parseInt` (line 587). If `session.rounds` has changed (e.g., undo deleted rounds) between the time the index was set and `renderSitterPicker` is called, `session.rounds[pickingSitterFor]` returns `undefined`, and the immediately following `round.sittingOut.forEach(...)` on line 163 throws a TypeError.

**Fix:**
```js
function renderSitterPicker() {
  const round = session.rounds[pickingSitterFor];
  if (!round) {
    pickingSitterFor = null;
    render();
    return;
  }
  // ... rest of function
}
```

---

### WR-03: Test MEDIT-01 second case tests the mock, not the code

**File:** `src/views/MatchEditor.test.js:80-85`

**Issue:** The test "Edit button entry point calls navigate with correct route" directly calls `navigate('/edit/0')` then asserts `navigate` was called with that argument. This only verifies that the vitest mock works — it does not exercise any code path in `MatchEditor.js` or `RoundDisplay.js`. If the actual Edit button in `RoundDisplay.js` were removed or changed to call a different route, this test would still pass.

**Fix:** Replace with a test that mounts `RoundDisplay` with a played round, clicks the Edit button, and asserts `navigate` was called with `/edit/0`. Alternatively, remove the test if coverage is provided elsewhere.

---

### WR-04: Missing test for null club scenario in MatchEditor

**File:** `src/views/MatchEditor.test.js`

**Issue:** The test suite covers "No Active Session" and "Round not found" error states, but does not cover the case where `ClubService.getClub()` returns `null` (CR-02 above). Once CR-02 is fixed with a graceful fallback, a corresponding regression test is needed.

**Fix:** Add a test case:
```js
test('renders error when club is not found', () => {
  const session = makeSession([makeRound(0, false)]);
  // Seed session with a clubId that has no matching club
  StorageAdapter.set('sessions', [session]);
  // Do NOT seed clubs data

  mount(el, { roundIndex: '0' });

  expect(el.innerHTML).toContain('Club Not Found');
});
```

---

## Info

### IN-01: navigate() is async but performs only synchronous work

**File:** `src/router.js:55-57`

**Issue:** `navigate` is declared `async` but its body (`window.location.hash = path`) is synchronous. There is no `await` and no returned Promise value. The `async` keyword is misleading — callers that `await navigate(...)` receive `undefined` rather than a meaningful signal.

**Fix:** Remove `async` from the declaration:
```js
export function navigate(path) {
  window.location.hash = path;
}
```

---

### IN-02: Haptics mock in MatchEditor.test.js is unused

**File:** `src/views/MatchEditor.test.js:10-12`

**Issue:** The test file mocks `../services/haptics.js` (lines 10-12) but `MatchEditor.js` does not import haptics. The mock is harmless but adds noise and may confuse future maintainers into thinking `MatchEditor.js` uses haptics.

**Fix:** Remove the haptics mock from `MatchEditor.test.js`:
```js
// Remove these lines:
vi.mock('../services/haptics.js', () => ({
  Haptics: { light: vi.fn(), medium: vi.fn(), success: vi.fn() },
}))
```

---

_Reviewed: 2026-04-14T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
