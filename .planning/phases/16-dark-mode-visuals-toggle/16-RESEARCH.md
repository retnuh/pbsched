# Phase 16: Dark Mode Visuals & Toggle — Research

**Researched:** 2026-04-14
**Domain:** Tailwind v4 dark mode utilities, CSS custom variant selectors, vanilla JS Settings UI wiring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **Zone chip dark palette:** A-side (blue) dark: `bg #1e3a5f / text #93c5fd / border #1d4ed8`. B-side (orange) dark: `bg #431407 / text #fdba74 / border #c2410c`. Bench dark: `bg #374151 / text #d1d5db / border #4b5563`. Override via `.dark &` selectors inside the same CSS blocks in `src/style.css`.
2. **SortableJS ghost border dark override:** `.sortable-ghost` border changes from `#111827` to `#9ca3af` (gray-400) in dark. `.sortable-swap` blue ring and border are unchanged — already light values that remain visible on dark.
3. **Settings theme toggle:** 3-button segmented control Auto | Light | Dark. Active: `bg-blue-600 text-white font-bold`. Inactive: `bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium`. On mount: `ThemeService.getMode()`. On tap: `ThemeService.setMode(mode)`.
4. **Appearance card placement:** First card in Settings, above Scheduler Optimization.
5. **Toast already dark-safe:** `bg-gray-900 text-white` in `showToast()` — no changes needed.
6. **No new npm packages:** All work is utility-class additions and CSS rule additions to existing files.

### Claude's Discretion

*(None — all key decisions locked)*

### Deferred Ideas (OUT OF SCOPE)

*(None raised during discussion)*
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DARK-03 | Organizer can manually override to light, dark, or system-auto via Settings | ThemeService.setMode/getMode API fully implemented in Phase 15; Settings.js needs Appearance card with 3-button segmented control wired to ThemeService |
| DARK-05 | All courts, bench chips, and drag states are legible in dark mode | Zone chip CSS blocks in src/style.css need `.dark &` overrides; .sortable-ghost needs dark border override |
| DARK-06 | All user-facing text (button labels, hint text, toasts, error states, empty states) is legible in dark mode | All 6 views + nav bar need systematic `dark:` utility additions per the element maps in UI-SPEC.md |
</phase_requirements>

---

## Summary

Phase 16 is a focused UI wiring phase — no new services, no new npm packages, no architectural changes. Phase 15 (confirmed complete in codebase) delivered everything in the infrastructure layer: `ThemeService` with `setMode`/`getMode`/`applyTheme`/`init`, the `@custom-variant dark (&:where(.dark, .dark *))` line in `src/style.css`, the FOUC prevention inline script in `index.html`, and `dark:bg-gray-900 dark:text-gray-100` on `<body>`. Phase 16 has exactly three jobs: (1) add `.dark &` CSS overrides for the hardcoded-hex zone chips and SortableJS ghost state in `src/style.css`; (2) add `dark:` utility classes to every element in all 6 views and the nav bar; (3) add the Appearance card (3-button segmented control) to `Settings.js` and wire it to `ThemeService`.

The scope is precise and bounded. The CONTEXT.md and UI-SPEC.md together constitute a near-complete implementation specification. The planner's primary job is to sequence the work (CSS overrides first since they unblock visual verification) and ensure each view receives complete coverage before the phase is called done.

**Primary recommendation:** Structure the plan as 3 tasks in sequence: (1) CSS overrides in `style.css` — zone chips + SortableJS ghost; (2) `dark:` utility audit across all 6 views + nav in `index.html`; (3) Appearance card in `Settings.js` with ThemeService wiring. Validate each task by switching `.dark` class manually in browser devtools.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Zone chip dark colors | CSS (src/style.css) | — | Hardcoded hex values live in CSS attribute selectors; `.dark &` context selectors override in the same layer |
| SortableJS drag-state dark override | CSS (src/style.css) | — | `.sortable-ghost` and `.sortable-swap` are dynamically applied class names; their colors must be in CSS, not JS |
| Per-view dark: utility classes | View templates (vanilla JS innerHTML) | — | Each view constructs its own HTML — dark overrides are added as additional Tailwind class strings in the template literals |
| Navigation bar dark overrides | index.html (static HTML) | — | Nav bar is hardcoded in index.html, not a JS view |
| Theme toggle UI | Settings.js (view) | — | New card added to the Settings mount() function |
| Theme toggle logic | ThemeService (service) | — | Already implemented; Settings.js is only the caller |

---

## Standard Stack

### Core (already installed, no changes)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS v4 | ^4.2.2 | Utility classes including `dark:` prefix | Installed via `@tailwindcss/vite`; `@custom-variant dark` already defined |
| ThemeService | local | setMode / getMode / applyTheme | Delivered by Phase 15, fully verified in codebase |

### No new packages required

[VERIFIED: package.json] The project has no dependency on shadcn, any component library, or any dark-mode helper library. All work is Tailwind utility classes and plain CSS.

---

## Architecture Patterns

### System Architecture: Theme Application Data Flow

```
User taps button (Auto|Light|Dark)
        |
        v
Settings.js: ThemeService.setMode(mode)
        |
        v
ThemeService.setMode() → localStorage.setItem('pb:theme', mode)
        |
        v
ThemeService.applyTheme() → reads mode + matchMedia → toggles .dark on <html>
        |
        v
CSS cascade: [data-theme variables / dark: utilities] → all elements repaint
        |
        v
Settings.js: update active button highlight (local DOM mutation)
```

On page load (FOUC prevention path, runs before any JS module):
```
<head> inline script → reads localStorage 'pb:theme'
        |
        v
If dark → adds .dark to <html> before first paint
If auto → checks matchMedia → adds .dark if system dark
If light → no-op (default is light)
```

### Tailwind v4 Dark Mode: `dark:` Prefix

[VERIFIED: src/style.css line 3] The `@custom-variant dark (&:where(.dark, .dark *))` variant is already defined. Any element inside a `.dark`-classed ancestor (including `<html class="dark">`) responds to `dark:` prefixed utilities.

**Pattern:** Add `dark:` classes alongside existing light classes in the template literal strings.

```javascript
// Before (light only)
`<div class="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">`

// After (dark overrides added)
`<div class="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-xl shadow-sm">`
```

Source: [VERIFIED: src/style.css, index.html body classes, CONTEXT.md]

### CSS Hardcoded Hex Dark Overrides

Zone chip colors cannot use Tailwind utilities because they use attribute selectors with hardcoded hex. Use `.dark &` inside the same block:

```css
/* Existing block */
[data-zone$="-a"] [data-player-id] {
  background-color: #EFF6FF; /* blue-50 */
  border-color: #BFDBFE;     /* blue-200 */
  color: #1E40AF;            /* blue-800 */
}

/* Add immediately after */
.dark [data-zone$="-a"] [data-player-id] {
  background-color: #1e3a5f;
  border-color: #1d4ed8;
  color: #93c5fd;
}
```

Note: The `@custom-variant dark (&:where(.dark, .dark *))` syntax means `.dark &` works inside `@layer` or utility contexts. For plain CSS rules outside `@apply`, the equivalent is the standard `.dark <selector>` descendant selector. Both work — use the simpler descendant selector form for the plain CSS blocks.

Source: [VERIFIED: src/style.css @custom-variant definition; CONTEXT.md Decision 1]

### Settings.js Segmented Control Pattern

The Appearance card follows the same structural pattern as existing Settings cards. The toggle buttons use the `data-mode` attribute for event delegation:

```javascript
// In mount(), before el.innerHTML = ...
import { ThemeService } from '../services/theme.js';

// In the HTML template (first card, before Scheduler Optimization)
const currentMode = ThemeService.getMode(); // 'auto' | 'light' | 'dark'

// Card HTML:
`<div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
  <h2 class="font-bold text-gray-700 dark:text-gray-200">Appearance</h2>
  <div class="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600" id="theme-toggle">
    ${['auto', 'light', 'dark'].map(mode => `
      <button data-mode="${mode}"
        class="flex-1 py-3 text-sm font-bold transition ${currentMode === mode
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        }">
        ${mode.charAt(0).toUpperCase() + mode.slice(1)}
      </button>
    `).join('')}
  </div>
</div>`

// After el.innerHTML = ..., wire the toggle:
el.querySelector('#theme-toggle').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-mode]');
  if (!btn) return;
  const mode = btn.getAttribute('data-mode');
  ThemeService.setMode(mode);
  // Update button active states:
  el.querySelectorAll('[data-mode]').forEach(b => {
    const isActive = b.getAttribute('data-mode') === mode;
    b.className = `flex-1 py-3 text-sm font-bold transition ${isActive
      ? 'bg-blue-600 text-white'
      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
    }`;
  });
});
```

Source: [VERIFIED: src/views/Settings.js structure, src/services/theme.js API; CONTEXT.md Decision 3]

### Recommended File Modification Order

1. `src/style.css` — Zone chip dark overrides + `.sortable-ghost` dark border
2. `index.html` — Nav bar `dark:` classes
3. `src/views/RoundDisplay.js` — Highest priority (most used at courts)
4. `src/views/MatchEditor.js` — Highest priority (most used at courts)
5. `src/views/Settings.js` — Appearance card + all existing card dark overrides
6. `src/views/SessionSetup.js` — Attendee list, form inputs
7. `src/views/ClubManager.js` — Club cards, empty state
8. `src/views/MemberEditor.js` — Member rows, inputs
9. `src/views/Help.js` — Help cards, body text

---

## Element Audit: What Each File Actually Contains

### `src/style.css` — Current state

[VERIFIED: file read] Contains:
- `@custom-variant dark` — already defined (Phase 15)
- Zone chip blocks: `[data-zone$="-a"]`, `[data-zone$="-b"]`, `[data-zone="bench"]` — hardcoded hex only, no dark overrides yet
- `.sortable-ghost`: `border: 3px dashed #111827 !important` — will be invisible on dark backgrounds
- `.sortable-chosen`, `.sortable-swap` — no dark overrides needed (swap uses blue-300 outline which remains visible)

**Action:** Add 3 `.dark [data-zone...]` blocks and 1 `.dark .sortable-ghost` rule.

### `index.html` — Current state

[VERIFIED: file read] Nav `<nav>` has: `bg-white/90 backdrop-blur-md border-t border-gray-200`. No dark classes.
Body already has: `dark:bg-gray-900 dark:text-gray-100` (Phase 15 delivered this).

**Action:** Add to `<nav>`: `dark:bg-gray-800/90 dark:border-gray-700`. Add to each nav `<a>` inactive state pattern and active indicator — these are set via `data-nav` JS in the router, so check router.js for how active class is toggled.

### `src/views/RoundDisplay.js` — Current state

[VERIFIED: file read] Key elements missing dark:

- Round cards: `bg-white border border-gray-100` (played) / `border-blue-200` (unplayed) — needs `dark:bg-gray-800 dark:border-gray-700`
- Round header: `bg-gray-50` (played) / `bg-blue-50` (unplayed) — needs `dark:bg-gray-700` / `dark:bg-blue-900/30`
- Round header text: `text-gray-500` / `text-blue-800` — needs `dark:text-gray-400` / `dark:text-blue-300`
- Completed badge: `text-gray-400 uppercase tracking-widest` — needs `dark:text-gray-500`
- Team A cell: `bg-blue-50 rounded border border-blue-100` — needs `dark:bg-blue-900/30 dark:border-blue-800`
- Team B cell: `bg-orange-50 rounded border border-orange-100` — needs `dark:bg-orange-900/20 dark:border-orange-800`
- Player name text: `text-sm font-bold` (inherits body color) — body already has `dark:text-gray-100`, but explicit `dark:text-gray-100` per element safer
- Sitting out label: `text-gray-400 uppercase` — needs `dark:text-gray-500`
- Sitting out chips: `bg-gray-100 text-gray-600 border border-gray-200` — needs `dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600`
- Empty state card: `bg-white rounded-xl border border-gray-100` — needs `dark:bg-gray-800 dark:border-gray-700`
- Empty state text: `text-gray-500` — needs `dark:text-gray-400`
- Attendee manager: `border-blue-500 bg-blue-50` (checked) / `border-gray-100` (unchecked) — needs dark variants
- Sticky footer bar (attendees): `bg-white/90 border-t border-gray-100` — needs `dark:bg-gray-800/90 dark:border-gray-700`
- Alternatives view: multiple cards with `bg-white border-gray-100`, `bg-gray-50` header, inline team cells — all need dark overrides

### `src/views/MatchEditor.js` — Current state

[VERIFIED: file read lines 1-100] Contains:
- Zone cards built via `renderZone()` — need to verify full render function for class names
- `border-red-400` / `border-gray-200` on court cards (validation toggle) — red border readable on dark; `border-gray-200` needs `dark:border-gray-700`
- Error label text: implied `text-red-600` → needs `dark:text-red-400`
- Ghost drag state is CSS-controlled (handled in style.css task)
- Toast: `bg-gray-900 text-white` — already dark-safe (CONTEXT.md Decision 5, no change)

### `src/views/Settings.js` — Current state

[VERIFIED: file read] Contains 4 cards (Scheduler Optimization, Backup & Restore, App Data, About). None have dark: classes.

Elements needing dark overrides (existing cards) + new Appearance card:
- All card containers: `bg-white border border-gray-100` → `dark:bg-gray-800 dark:border-gray-700`
- `h2` headings: `text-gray-700` → `dark:text-gray-200`
- `p` hint text: `text-gray-500`, `text-gray-400` → `dark:text-gray-400`, `dark:text-gray-500`
- Slider track: `bg-gray-200` → `dark:bg-gray-600`
- Slider value spans: `text-blue-600` → `dark:text-blue-400`
- Secondary buttons (`bg-blue-50 text-blue-600 border-blue-100`): → `dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800`
- Danger button (`bg-red-50 text-red-600 border-red-100`): → `dark:bg-red-900/20 dark:text-red-400 dark:border-red-800`
- Build version text (`text-gray-400 font-mono`): → `dark:text-gray-500`

### `src/views/MemberEditor.js` — Current state

[VERIFIED: file read] Elements needing dark:
- Member rows: `bg-white border border-gray-100` → `dark:bg-gray-800 dark:border-gray-700`
- Member name: inherits body (safe), but explicit `dark:text-gray-100` on `font-medium text-lg` span
- Edit/Remove buttons: `text-blue-600`, `text-red-500` — blue reads fine on dark; red reads fine; no changes strictly needed but can add `dark:text-blue-400`, `dark:text-red-400` for polish
- Member empty state: `bg-white rounded-xl border-2 border-dashed border-gray-200` → `dark:bg-gray-800 dark:border-gray-600`
- Empty state text: `text-gray-500 italic` → `dark:text-gray-400`
- Input field: `border-gray-200` → `dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100`
- Start Session card: `bg-blue-50 border-blue-100` → `dark:bg-blue-900/20 dark:border-blue-800`
- Start Session heading: `text-blue-800` → `dark:text-blue-300`
- Start Session sub-text: `text-blue-600` → `dark:text-blue-400`
- Roster section heading: `text-gray-700 uppercase` → `dark:text-gray-400`

### `src/views/SessionSetup.js` — Current state

[VERIFIED: file read] Elements needing dark:
- Member rows: `bg-white rounded-xl border border-gray-100 shadow-sm` → `dark:bg-gray-800 dark:border-gray-700`
- Member name: `text-lg font-medium` → `dark:text-gray-100`
- Last played sub-text: `text-gray-400` → `dark:text-gray-500`
- Never played sub-text: `text-gray-300` — this is already very light; `dark:text-gray-500` appropriate
- Checkbox: `border-gray-300 text-blue-600` — checked/unchecked appearance controlled by browser; accent color already `text-blue-600` which reads fine
- Sticky start button bar: `bg-gray-50/90 border-t border-gray-100` → `dark:bg-gray-800/90 dark:border-gray-700`
- Sub-text: `text-gray-500` → `dark:text-gray-400`
- "Invert" button: `text-blue-600 font-bold` → `dark:text-blue-400`

### `src/views/Help.js` — Current state

[VERIFIED: file read] Elements needing dark:
- Section heading icons: `bg-blue-100 text-blue-600` → `dark:bg-blue-900/30 dark:text-blue-400`
- Section heading text: `text-blue-600` → `dark:text-blue-400`
- Content cards: `bg-white border border-gray-100 shadow-sm` → `dark:bg-gray-800 dark:border-gray-700`
- Body text: `text-sm leading-relaxed` (inherits `dark:text-gray-100` from body) — add explicit `dark:text-gray-300` for softer secondary text feel
- `<strong>` labels: inherit body color — fine
- Footer text: `text-gray-400` → `dark:text-gray-500`
- Back button: `text-blue-600` → `dark:text-blue-400`

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dark mode toggle logic | Custom localStorage reader/writer | `ThemeService.setMode(mode)` | Already implemented with edge cases (matchMedia listener, auto mode) |
| CSS dark variant | Custom JS class-toggling per element | Tailwind `dark:` prefix + existing `@custom-variant` | Single source of truth; cascade handles everything |
| Segmented control state | Complex state machine | Simple DOM class toggle on button click | One active button, three total — delegate from container click |

---

## Common Pitfalls

### Pitfall 1: Forgetting the Nav Bar (in index.html)

**What goes wrong:** All views look correct in dark mode but the nav bar at the bottom stays white — jarring visual break.
**Why it happens:** The nav `<nav>` is in `index.html` as static HTML, not rendered by any JS view. A view audit catches views, not `index.html`.
**How to avoid:** Treat `index.html` nav as its own task item. Add `dark:bg-gray-800/90 dark:border-gray-700` to the `<nav>` element, and verify nav icon/label inactive colors get `dark:text-gray-500`.
**Warning signs:** Switching to dark in browser devtools; nav bar glows white at the bottom.

### Pitfall 2: Active Nav Icon State Not Covered

**What goes wrong:** The active nav tab (blue indicator) uses classes injected by the router via JS, not static HTML classes in `index.html`. The inactive gray `text-gray-400` gets a dark override but the active blue is set dynamically.
**Why it happens:** The router likely adds an active class to `<a data-nav>` elements. The dark override for the active state must be added there too, or the active classes themselves must include `dark:text-blue-400`.
**How to avoid:** Read `src/router.js` before finalizing the nav task — find where `data-nav` active classes are applied and add dark variants there.
**Warning signs:** Active nav tab looks correct in light, looks wrong in dark (too bright or missing indicator).

### Pitfall 3: `.sortable-ghost` `!important` Override

**What goes wrong:** Adding a `.dark .sortable-ghost` rule doesn't take effect because the existing rule uses `!important` on `border`.
**Why it happens:** `.sortable-ghost { border: 3px dashed #111827 !important }` — the `!important` must be matched in the dark override too.
**How to avoid:** The dark override must also use `!important`: `.dark .sortable-ghost { border: 3px dashed #9ca3af !important }`.
**Warning signs:** Ghost drag placeholder still shows dark border on dark background.

### Pitfall 4: RoundDisplay Attendee Manager Sub-View Missing Dark

**What goes wrong:** The main round list looks great in dark mode but switching to "manage attendees" (isManagingAttendees = true) shows all-light styling.
**Why it happens:** `RoundDisplay.js` has three separate `innerHTML` render functions: `renderMain()`, `renderAttendeeManager()`, and `renderAlternatives()`. All three need dark overrides independently.
**How to avoid:** When auditing RoundDisplay, check all three render functions, not just `renderMain()`.
**Warning signs:** Dark mode works on the round list but breaks after tapping "Players".

### Pitfall 5: Slider Thumb Not Covered by `dark:`

**What goes wrong:** Slider track gets `dark:bg-gray-600` but the range input thumb appearance is browser-controlled and may look wrong on some browsers.
**Why it happens:** Tailwind's `bg-` on range inputs only affects the track in some implementations. The `accent-blue-600` class controls thumb color on supporting browsers.
**How to avoid:** `accent-blue-600` works in modern mobile browsers (iOS 15.4+, Chrome 93+). Add `dark:accent-blue-400` alongside `dark:bg-gray-600` on the range input. If it doesn't take effect on iOS, the thumb appearance degrades gracefully (native styling).
**Warning signs:** Slider looks fine in Chrome DevTools dark mode but thumb looks wrong on device.

### Pitfall 6: `bg-blue-50/30` and `/20` Opacity Suffixes (Tailwind v4)

**What goes wrong:** Opacity-modified color utilities like `dark:bg-blue-900/20` are valid Tailwind v4 syntax but could be mistakenly written as `dark:bg-blue-900 dark:bg-opacity-20` (v3 pattern).
**Why it happens:** Tailwind v3 used separate opacity utilities; v4 uses the `/` syntax inline.
**How to avoid:** Always use the inline `/` form in class strings: `dark:bg-blue-900/20`, `dark:bg-blue-900/30`. [VERIFIED: src/style.css uses Tailwind v4 `@import "tailwindcss"` — v4 syntax is correct here]

---

## Code Examples

### Zone chip CSS dark overrides (src/style.css)

```css
/* Add after existing zone chip blocks */

.dark [data-zone$="-a"] [data-player-id] {
  background-color: #1e3a5f;
  border-color: #1d4ed8;
  color: #93c5fd;
}
.dark [data-zone$="-b"] [data-player-id] {
  background-color: #431407;
  border-color: #c2410c;
  color: #fdba74;
}
.dark [data-zone="bench"] [data-player-id] {
  background-color: #374151;
  border-color: #4b5563;
  color: #d1d5db;
}

/* SortableJS ghost — override !important to win specificity */
.dark .sortable-ghost {
  border: 3px dashed #9ca3af !important;
}
```

Source: [VERIFIED: src/style.css current state; CONTEXT.md Decisions 1 & 2]

### Appearance card (Settings.js addition)

```javascript
// At top of mount() — before el.innerHTML assignment
import { ThemeService } from '../services/theme.js';

// Inside mount():
const currentMode = ThemeService.getMode();

// In el.innerHTML template, insert as FIRST card:
`<div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
  <h2 class="font-bold text-gray-700 dark:text-gray-200">Appearance</h2>
  <div id="theme-toggle" class="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
    ${['auto', 'light', 'dark'].map(mode => `
      <button data-mode="${mode}"
        class="flex-1 py-3 text-sm font-bold transition ${currentMode === mode
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        }">
        ${ mode === 'auto' ? 'Auto' : mode === 'light' ? 'Light' : 'Dark' }
      </button>
    `).join('')}
  </div>
</div>`

// After el.innerHTML = ..., wire event:
el.querySelector('#theme-toggle').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-mode]');
  if (!btn) return;
  const mode = btn.getAttribute('data-mode');
  ThemeService.setMode(mode);
  el.querySelectorAll('[data-mode]').forEach(b => {
    const isActive = b.getAttribute('data-mode') === mode;
    b.className = `flex-1 py-3 text-sm font-bold transition ${
      isActive ? 'bg-blue-600 text-white'
               : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
    }`;
  });
});
```

Source: [VERIFIED: src/views/Settings.js structure; src/services/theme.js API; CONTEXT.md Decision 3]

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | vite.config.js (`test:` block) |
| Environment | happy-dom |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

[VERIFIED: vite.config.js, package.json]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DARK-03 | Settings toggle calls ThemeService.setMode and immediately applies theme | Covered by ThemeService unit tests (Phase 15 test stubs) | `npx vitest run src/services/theme.test.js` | Yes (theme.test.js exists) |
| DARK-05 | Zone chips and drag states legible in dark | Visual — manual only | Browser devtools + real device | N/A |
| DARK-06 | All text legible in dark mode | Visual — manual only | Browser devtools + real device | N/A |

**Manual verification protocol:** In Chrome DevTools → Elements → toggle `.dark` class on `<html>`. Switch through all 5 tabs (Clubs, Member Editor, Session Setup, Session/Rounds, Settings). Verify every card, label, chip, and button is readable. Switch Settings toggle to Dark — verify immediate effect without reload. Switch to Auto — verify system preference is honored.

### Wave 0 Gaps

None — existing test infrastructure (`theme.test.js`, `vite.config.js` test block, `src/test-setup.js`) covers the automated aspects of this phase. No new test files needed for Phase 16 itself (test coverage is Phase 17's scope).

---

## Environment Availability

Step 2.6: SKIPPED — Phase 16 is purely CSS/JS utility additions. No external tools, services, CLIs, or runtimes beyond the project's existing Vite dev server and browser are required.

---

## Runtime State Inventory

Step 2.5: NOT APPLICABLE — Phase 16 is a UI-only styling phase. No renames, refactors, or data migrations. The `pb:theme` key written by ThemeService and read by the FOUC script is already established by Phase 15 and requires no changes.

---

## Open Questions

1. **Router active nav class injection**
   - What we know: The `<nav>` in `index.html` has `<a data-nav="ClubManager">`, `<a data-nav="RoundDisplay">`, `<a data-nav="Settings">` elements with inactive class `text-gray-400`.
   - What's unclear: The router (src/router.js) likely sets an active class — probably replacing `text-gray-400` with `text-blue-600`. The exact class manipulation site is unknown without reading router.js.
   - Recommendation: The planner should include reading `src/router.js` as a sub-step of the nav task, to find where active state is set and add `dark:text-blue-400` (active) and `dark:text-gray-500` (inactive) at the right injection site.

2. **MatchEditor.js full render function structure**
   - What we know: The first 100 lines of MatchEditor.js show module-level helpers. The full render function with the court zone HTML was not read.
   - What's unclear: Exact class names on zone card containers, zone headers, and bench area — needed for precise dark override list.
   - Recommendation: The planner should include reading the full MatchEditor.js `render()` or `renderEditor()` function as part of the MatchEditor dark audit task. The UI-SPEC element table provides the full expected mapping; the developer just needs to confirm those classes exist in the actual template.

---

## Project Constraints (from CLAUDE.md)

- Milestones referred to by number (Milestone 8), never semantic versioning
- After any executor agent merges a worktree back to main, run the 3-step worktree safety check (git diff deleted planning files, out-of-scope src changes, ROADMAP.md content verification) before proceeding to verification

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `.dark .sortable-ghost` descendant selector wins over `.sortable-ghost` specificity when `!important` is present on both | Code Examples / Pitfall 3 | Ghost drag placeholder remains invisible on dark backgrounds — visual regression |
| A2 | Nav active state classes are injected by router.js via DOM manipulation rather than being static in index.html | Open Questions | If active classes are static, the dark audit scope for index.html changes |
| A3 | `dark:accent-blue-400` works on range inputs in iOS Safari 15.4+ | Pitfall 5 | Slider thumb color incorrect on device — degrades gracefully to browser default |

---

## Sources

### Primary (HIGH confidence)

- [VERIFIED: src/style.css] — `@custom-variant dark` confirmed present; zone chip hex values and `.sortable-ghost` rule confirmed as requiring dark overrides
- [VERIFIED: src/services/theme.js] — Full API surface confirmed: `init()`, `setMode(mode)`, `getMode()`, `applyTheme()`; reads/writes `pb:theme` in localStorage
- [VERIFIED: index.html] — FOUC script confirmed; `dark:bg-gray-900 dark:text-gray-100` on body confirmed; nav dark classes missing confirmed
- [VERIFIED: src/views/Settings.js] — Settings.js structure confirmed; no ThemeService import yet; no dark: classes on any element
- [VERIFIED: src/views/RoundDisplay.js] — Three render functions confirmed; element class names verified against UI-SPEC
- [VERIFIED: src/views/MatchEditor.js lines 1-100] — Module structure confirmed; full render function not read
- [VERIFIED: src/views/ClubManager.js] — Full element class names verified
- [VERIFIED: src/views/MemberEditor.js] — Full element class names verified
- [VERIFIED: src/views/SessionSetup.js] — Full element class names verified
- [VERIFIED: src/views/Help.js] — Full element class names verified
- [VERIFIED: vite.config.js] — Vitest 4.1.2 config confirmed; happy-dom environment confirmed
- [VERIFIED: src/test-setup.js] — Test infrastructure confirmed; localStorage and matchMedia mocks confirmed
- [VERIFIED: .planning/phases/16-dark-mode-visuals-toggle/16-CONTEXT.md] — All locked decisions
- [VERIFIED: .planning/phases/16-dark-mode-visuals-toggle/16-UI-SPEC.md] — Full element mapping per view

### Secondary (MEDIUM confidence)

- [CITED: Tailwind v4 docs pattern] `@custom-variant dark` enables `dark:` prefix on all utility classes when `.dark` is on an ancestor — consistent with observed behavior in src/style.css

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json, no new dependencies
- Architecture: HIGH — ThemeService API verified from source; Tailwind dark variant verified in style.css
- Pitfalls: HIGH — most derived from direct code inspection; A1 (CSS specificity with !important) is ASSUMED
- Element audit: HIGH for all views except MatchEditor render body (not fully read)

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable tech stack — Tailwind v4, vanilla JS, no external dark-mode dependencies)
