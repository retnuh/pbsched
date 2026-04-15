---
phase: 08-club-name-editing
reviewed: 2026-04-15T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/views/MemberEditor.js
  - src/services/club.js
findings:
  critical: 0
  warning: 4
  high: 1
  medium: 2
  low: 1
  info: 3
  total: 11
status: issues_found
---

# Phase 08: Code Review Report — Club Name Editing

**Reviewed:** 2026-04-15
**Depth:** standard
**Files Reviewed:** 2 (`src/views/MemberEditor.js`, `src/services/club.js`)
**Status:** issues_found

## Summary

Phase 08 added tap-to-edit inline renaming of the club name header in `MemberEditor`, plus
a companion member rename flow that replaces the previous `prompt()`-based UX. The XSS
mitigations required by the threat model (T-08-02) are correctly implemented for both the
club-name `restore()` function and the member list render loop — both use `textContent`
after building the DOM skeleton. The `saved` guard against blur/Enter double-fire is sound.

Four issues warrant attention before the phase is considered fully clean:

1. **HIGH — Selector injection in member rename handler** (line 86): the `querySelector`
   call uses `member.id` — a UUID from localStorage — inside a CSS attribute selector
   without sanitization. A malformed `id` containing `"` or `]` breaks the query silently.
2. **MEDIUM — Blur fires after empty-name cancel in member rename** (line 341): pressing
   Escape fires `cancelMember`, sets `saved = true`, then the `blur` listener fires
   `saveMember` anyway, triggering a second (no-op) path — but only because the existing
   `if (saved) return` guard saves it. The guard is correct, but the listener is registered
   unconditionally and the Escape path never removes it. This works today but is fragile.
3. **MEDIUM — `updateClub` silently swallows unknown `clubId`** (club.js line 32–36): if
   `clubId` is not found, the function returns `undefined` with no error signal. The caller
   cannot detect the failure.
4. **LOW — No `maxlength` on the club name or member name inline inputs**: the threat model
   explicitly deferred length enforcement but the plan acknowledged this. A crafted name of
   10 000+ characters causes the fixed-position toast to overflow the viewport and may push
   `localStorage` toward quota on low-end devices.

Additionally, three informational items are noted below.

---

## HIGH Issues

### HI-01: CSS attribute-selector injection via `member.id` in the member list handler

**File:** `src/views/MemberEditor.js:86`
**Scope:** Phase 08 member-rename work (lines 274–343)

The `querySelector` call constructs a CSS selector by interpolating `member.id` directly:

```js
// line 86
const span = memberListEl.querySelector(`[data-member-name="${member.id}"]`);
```

`member.id` is a `crypto.randomUUID()` value written to localStorage and read back
unvalidated. A value containing `"` or `]` produces a syntactically invalid selector,
causing `querySelector` to throw a `DOMException`. The same pattern recurs at line 286
in the click handler:

```js
// line 286
const nameSpan = el.querySelector(`[data-member-name="${memberId}"]`);
```

Here `memberId` is read from the `data-id` attribute of a button that was itself
rendered by interpolating `member.id` into the HTML template (lines 75–80). This is a
second occurrence of the same fragility.

In the current app `crypto.randomUUID()` always produces safe characters (hex + hyphens),
so this does not produce observable failures in practice. However, the data comes from
`localStorage`, which can be modified by hand or by a browser extension. A malformed id
causes a silent render failure (the span's `textContent` is never set) or an unhandled
exception, depending on the browser's `querySelector` error-handling path.

**Fix:** Escape the id before using it in a selector, or use `dataset` traversal instead:

```js
// Option A — use CSS.escape (well-supported)
const span = memberListEl.querySelector(
  `[data-member-name="${CSS.escape(member.id)}"]`
);

// Option B — avoid the selector entirely with a dataset lookup
const span = Array.from(memberListEl.querySelectorAll('[data-member-name]'))
  .find(el => el.dataset.memberName === member.id) ?? null;
```

Apply the same fix to line 286.

---

## MEDIUM Issues

### ME-01: Escape key in member rename does not remove the blur listener

**File:** `src/views/MemberEditor.js:337–341`

When the user presses Escape during a member rename, `cancelMember` runs and sets
`saved = true`. The `blur` event then fires (because the input loses focus as the span
replaces it), calling `saveMember`. The `if (saved) return` guard on line 318 prevents
the double-save, so the observable behaviour is correct today.

The fragility is that `saveMember` (which calls `renderMembers()`) is invoked one extra
time before the guard fires when Escape is used. If `renderMembers()` is ever made
async, or if a future refactor changes the guard ordering, the extra call will cause a
visible re-render glitch or a double storage write.

**Fix:** Remove the blur listener before restoring in `cancelMember`, mirroring best
practice for one-shot inline editors:

```js
function cancelMember() {
  if (saved) return;
  saved = true;
  input.removeEventListener('blur', saveMember);
  restoreSpan(currentName);
}
```

The same pattern applies to the club-name `cancel()` function at line 211–215, which
also does not remove its `blur` listener:

```js
function cancel() {
  if (saved) return;
  saved = true;
  input.removeEventListener('blur', save);
  restore(currentName);
}
```

### ME-02: `ClubService.updateClub` and `renameMember` return no signal on missing id

**File:** `src/services/club.js:30–37`, `68–78`

Both `updateClub` and `renameMember` are silent no-ops when the provided id is not found
— they return `undefined` without throwing. `MemberEditor` calls these unconditionally and
assumes success. If the club is deleted in another tab while the editor is open, the save
silently disappears and the UI shows stale data with no feedback to the user.

```js
// club.js line 30-36 — no branch for idx === -1 that signals failure
updateClub(id, updates) {
  const clubs = this.getClubs();
  const idx = clubs.findIndex(c => c.id === id);
  if (idx !== -1) {
    clubs[idx] = { ...clubs[idx], ...updates };
    StorageAdapter.set('clubs', clubs);
  }
  // falls off the end — caller cannot tell if save happened
},
```

This is a pre-existing pattern across ClubService (not introduced by Phase 08), but the
inline editing path in Phase 08 is the highest-frequency mutation surface and the most
user-visible failure mode.

**Fix (minimal):** Return a boolean from `updateClub` and check it in `save()`:

```js
// club.js
updateClub(id, updates) {
  const clubs = this.getClubs();
  const idx = clubs.findIndex(c => c.id === id);
  if (idx === -1) return false;
  clubs[idx] = { ...clubs[idx], ...updates };
  StorageAdapter.set('clubs', clubs);
  return true;
},
```

```js
// MemberEditor.js save()
const ok = ClubService.updateClub(clubId, { name: newName });
if (!ok) {
  showToast("Could not save — club no longer exists");
  restore(currentName);
  return;
}
```

---

## LOW Issues

### LO-01: No `maxlength` on inline inputs

**File:** `src/views/MemberEditor.js:174–187` (club name input), `290–301` (member name input)

The threat model (T-08-01) explicitly accepted the absence of a `maxlength`, citing the
local-only nature of the app. However, the toast element at line 27–43 uses
`white-space:nowrap`, meaning a very long name causes the toast to extend beyond the
viewport. This is a minor cosmetic defect rather than a data-loss risk.

The localStorage quota concern is real but minor on modern browsers (typically 5 MB).

**Fix (optional):** Add `input.maxLength = 100` (or a reasonable constant) immediately
after constructing each inline input. This costs one line and removes both the cosmetic
defect and the quota micro-risk.

---

## INFO Items

### IN-01: `showToast` accepts `anchorEl` but callers in the empty-name path pass the input element

**File:** `src/views/MemberEditor.js:5–43`, `204`, `323`

The `showToast` signature is `showToast(message, anchorEl)`. The empty-name club-name
path at line 204 passes `input` as the anchor:

```js
showToast("Club name can't be empty", input);
```

The member-rename path at line 323 does the same:

```js
showToast("Member name can't be empty", input);
```

At the moment `showToast` is called, `input` is still in the DOM and `getBoundingClientRect()`
is valid. However, if the `restore` / `restoreSpan` call that immediately follows removes
the input before the toast's `setTimeout` fires, `anchorEl` is a detached node — but since
the toast's position is computed synchronously before `appendChild`, this is fine. No bug,
but the comment on lines 10–14 could note this timing assumption explicitly.

### IN-02: Heading `click` listener is not re-bound after `restore()`

**File:** `src/views/MemberEditor.js:225–228`, `242`

After `restore()` rebuilds `nameDisplay.innerHTML`, it re-binds the pencil button:

```js
nameDisplay.querySelector('#edit-club-name').addEventListener('click', activateEdit);
```

But the h1 `click` listener (line 242 — `nameHeading.addEventListener('click', activateEdit)`)
is **not** re-bound. After the first save/cancel cycle, tapping the heading text no longer
activates edit mode — only the pencil icon works.

This is a minor UX regression introduced in Phase 08: the initial bind targets a stale
reference once `nameDisplay.innerHTML` is cleared and rebuilt.

**Fix:** Re-bind both listeners inside `restore()`:

```js
function restore(displayName) {
  nameDisplay.innerHTML = `
    <h1 id="club-name-heading" class="text-2xl font-bold truncate flex-grow dark:text-gray-100"></h1>
    <button id="edit-club-name" aria-label="Edit club name"
      class="text-gray-400 dark:text-gray-500 text-lg leading-none flex-shrink-0"
      style="background:none;border:none;cursor:pointer;padding:2px 4px;">✏️</button>
  `;
  nameDisplay.querySelector('#club-name-heading').textContent = displayName;
  nameDisplay.querySelector('#edit-club-name').addEventListener('click', activateEdit);
  nameDisplay.querySelector('#club-name-heading').addEventListener('click', activateEdit); // add this
}
```

### IN-03: `keypress` used for Add Member Enter handling (deprecated event)

**File:** `src/views/MemberEditor.js:258–260`

```js
nameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleAdd();
});
```

`keypress` is deprecated in the DOM spec (removed from Firefox 130+). The inline editor
added in Phase 08 correctly uses `keydown` for its Enter/Escape handling. The `Add Member`
input should be consistent.

**Fix:** Replace `keypress` with `keydown`:

```js
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleAdd();
});
```

---

## Summary

| Severity | Count | Items |
|----------|-------|-------|
| HIGH | 1 | HI-01: CSS selector injection via member.id |
| MEDIUM | 2 | ME-01: Escape blur listener not removed; ME-02: ClubService mutations silent on missing id |
| LOW | 1 | LO-01: No maxlength on inline inputs |
| INFO | 3 | IN-02: Heading click not re-bound after restore (UX regression); IN-03: deprecated keypress; IN-01: anchorEl timing note |
| **Total** | **7** | |

**Priority order for fixes:**
1. **IN-02** (heading click not re-bound) — this is a real, reproducible UX bug introduced by Phase 08; fix is one line inside `restore()`.
2. **HI-01** (selector injection) — technically safe with UUIDs today but violates the defensive coding contract; fix is mechanical (`CSS.escape`).
3. **ME-01** (blur listener not removed on Escape) — correct today due to the `saved` guard; fix is one `removeEventListener` call per cancel function.
4. **ME-02** (silent ClubService no-op) — pre-existing pattern; address when hardening the service layer.
5. **LO-01** / **IN-03** — cosmetic / spec-compliance; low urgency.

---

_Reviewed: 2026-04-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
