# Phase 15: Dark Mode Foundation - Research

**Researched:** 2026-04-14
**Domain:** Tailwind v4 dark mode variant, FOUC prevention, ThemeService design, matchMedia API
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **Storage: Separate `pb:theme` key via StorageAdapter**
   - `pb:theme` is stored independently from `pb:all` blob — no v2 migration
   - StorageAdapter's `get/set` reads/writes the `pb:all` blob; ThemeService reads/writes `localStorage.getItem/setItem('pb:theme')` directly, encapsulated inside ThemeService
   - FOUC script reads `localStorage.getItem('pb:theme')` directly (acceptable — modules not loaded)
   - Key name: `pb:theme`; value: plain string `'light'|'dark'|'auto'` (no JSON wrapping)

2. **Tailwind v4 dark mode: `.dark` class on `<html>`**
   - Add exactly: `@custom-variant dark (&:where(.dark, .dark *));` to `src/style.css` after `@import "tailwindcss"`
   - ThemeService and FOUC script toggle by adding/removing `dark` class on `document.documentElement`

3. **FOUC prevention: inline `<script>` in `<head>` of `index.html`**
   - No `type="module"`, placed before any `<link>` or other `<script>` tags
   - Logic: read `pb:theme`; `'dark'` → add class; `'light'` → do nothing; `'auto'`/null → check matchMedia
   - Must catch localStorage errors silently (private browsing)

4. **ThemeService: full `auto|light|dark` API**
   - File: `src/services/theme.js`
   - Methods: `init()`, `setMode(mode)`, `getMode()`, `applyTheme()` (internal)
   - `getMode()` defaults to `'auto'` if key absent
   - `init()` called in `src/main.js` before router mounts

5. **Live system preference tracking**
   - `matchMedia.addEventListener('change', ...)` attached in `init()`
   - Only fires `applyTheme()` when current mode is `'auto'` or unset

### Claude's Discretion

*(None raised — all decisions are locked)*

### Deferred Ideas (OUT OF SCOPE)

*(None raised during discussion)*
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DARK-01 | Organizer's device dark mode preference is respected automatically on first load | FOUC script reads `matchMedia`; `init()` attaches live listener for OS changes |
| DARK-02 | App renders in correct theme before any content is visible (no white flash) | Inline `<script>` in `<head>` before any `<link>` tag runs synchronously before first paint |
| DARK-04 | Theme preference persists across sessions | ThemeService writes to `pb:theme` key; FOUC script reads same key on next load |
</phase_requirements>

---

## Summary

Phase 15 installs the dark mode infrastructure without changing any visible UI. The deliverables are: (1) a `@custom-variant` line in `style.css`, (2) an inline FOUC prevention script at the top of `<head>` in `index.html`, (3) `dark:bg-gray-900 dark:text-gray-100` on `<body>` in `index.html`, and (4) a new `src/services/theme.js` module. No views receive `dark:` utilities in this phase — that is Phase 16 scope.

The technical approach is confirmed correct for Tailwind v4.2.2 (installed). The `@custom-variant dark (&:where(.dark, .dark *))` syntax is the official Tailwind v4 way to configure class-based dark mode. The FOUC prevention pattern (inline script before stylesheets, synchronously sets `.dark` on `<html>`) is the canonical solution used across the industry. The `matchMedia` change listener approach for live OS preference tracking is well-supported in all modern browsers.

The one testing wrinkle: `window.matchMedia` is not natively implemented in happy-dom (the project's test environment). ThemeService tests must mock it. A straightforward `Object.defineProperty` mock in the test file works correctly and is well-documented.

**Primary recommendation:** Implement exactly as specified in CONTEXT.md and UI-SPEC.md. No alternative approaches need research — all decisions are locked. Focus on the `matchMedia` mock pattern needed for ThemeService tests.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Theme class toggle on `<html>` | Browser / Client | — | DOM manipulation runs in the browser |
| FOUC prevention (first paint) | Browser / Client | — | Must run synchronously before CSS renders; inline script is the only option |
| Theme persistence | Browser / Client (localStorage) | — | Local-first app; no backend |
| System preference detection | Browser / Client (matchMedia API) | — | OS/media query is a browser-side API |
| ThemeService module | Browser / Client (ES module) | — | Vanilla JS service, loaded by main.js |
| Tailwind variant definition | Build (CSS) | — | `@custom-variant` is a CSS-layer declaration processed at build time |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss | 4.2.2 [VERIFIED: package.json] | CSS framework + dark variant | Already installed; `@custom-variant` is the v4-native API |
| @tailwindcss/vite | 4.2.2 [VERIFIED: package.json] | Vite integration for Tailwind v4 | Already installed and configured |
| vitest | 4.1.2 [VERIFIED: package.json] | Test runner | Already configured in vite.config.js |
| happy-dom | 20.8.9 [VERIFIED: package.json] | DOM environment for tests | Already configured as `environment: 'happy-dom'` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| window.matchMedia (browser API) | native | Detects OS dark/light preference | Used in ThemeService.init() and FOUC script |
| localStorage (browser API) | native | Persists theme choice | Used in ThemeService; already used by StorageAdapter |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@custom-variant` in style.css | `darkMode: 'class'` in tailwind.config.js | Tailwind v4 has no tailwind.config.js — CSS-first config is the v4 way |
| Direct localStorage in ThemeService | StorageAdapter blob | Decided against; avoids v2 schema migration; ThemeService is the encapsulated access point |

**Installation:** No new packages required. All dependencies are already installed.

---

## Architecture Patterns

### System Architecture Diagram

```
First Paint (synchronous)
────────────────────────────────────────────────────────────────
index.html <head>
  └─ inline <script> (no type="module")
        ├─ localStorage.getItem('pb:theme')  ──── 'dark'   ──► classList.add('dark') on <html>
        │                                    ──── 'light'  ──► (nothing)
        │                                    ──── 'auto'   ──► matchMedia check ──► maybe add 'dark'
        │                                    ──── null     ──► matchMedia check ──► maybe add 'dark'
        └─ [catches localStorage errors silently]

CSS (style.css) — processed at build time
  └─ @custom-variant dark (&:where(.dark, .dark *))
        └─ enables dark: utilities throughout the app (used by Phase 16)

body (index.html) gets: dark:bg-gray-900 dark:text-gray-100
  └─ baseline dark paint before any view mounts

────────────────────────────────────────────────────────────────
App Startup (module load, after paint)
────────────────────────────────────────────────────────────────
main.js
  └─ ThemeService.init()  ──► reads pb:theme from localStorage
         │                ──► calls applyTheme() (reconcile DOM with stored pref)
         └─ if mode is 'auto'/null: attachs matchMedia change listener
               └─ OS changes dark/light ──► applyTheme() (no reload)
  └─ initRouter(appEl)    ──► views mount here (after theme is stable)

Caller (Phase 16 Settings toggle)
  └─ ThemeService.setMode('light'|'dark'|'auto')
        ├─ localStorage.setItem('pb:theme', mode)
        └─ applyTheme()
```

### Recommended Project Structure
```
src/
├── services/
│   ├── club.js           # existing
│   ├── session.js        # existing
│   ├── haptics.js        # existing
│   ├── html.js           # existing
│   └── theme.js          # NEW — Phase 15
├── style.css             # add @custom-variant line
├── main.js               # add ThemeService.init() call
└── (views/ unchanged)

index.html                # add FOUC script + dark: body classes
```

### Pattern 1: Tailwind v4 Class-Based Dark Mode Variant
**What:** Override the built-in `dark` variant to trigger on `.dark` class instead of `prefers-color-scheme` media query
**When to use:** When you need manual JS control over dark/light switching
**Example:**
```css
/* src/style.css */
/* Source: https://tailwindcss.com/docs/dark-mode */
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
```
[VERIFIED: tailwindcss.com/docs/dark-mode]

### Pattern 2: FOUC Prevention Inline Script
**What:** Synchronous inline script in `<head>` that reads stored preference and sets `.dark` before the browser paints
**When to use:** Any app using class-based dark mode that persists user preference
**Example:**
```html
<!-- index.html — place before any <link> or <script type="module"> -->
<script>
  (function () {
    try {
      var mode = localStorage.getItem('pb:theme');
      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (mode !== 'light') {
        // 'auto' or null — fall back to system preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark');
        }
      }
    } catch (e) {
      // localStorage may throw in private browsing — fall back to system preference silently
      try {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark');
        }
      } catch (e2) { /* matchMedia unavailable — do nothing, light is default */ }
    }
  })();
</script>
```
[ASSUMED — standard FOUC prevention pattern; structure confirmed by tailwindcss.com/docs/dark-mode example]

### Pattern 3: ThemeService Module
**What:** Encapsulated service object (matches project's existing service pattern) for reading, writing, and applying theme
**When to use:** All theme operations must go through ThemeService — no direct localStorage from callers
**Example:**
```javascript
// src/services/theme.js
// Source: matches pattern from src/services/club.js, src/services/session.js

const THEME_KEY = 'pb:theme';

let _mediaQuery = null;
let _mediaListener = null;

export const ThemeService = {
  init() {
    this.applyTheme();
    _mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    _mediaListener = () => {
      if (this.getMode() === 'auto') {
        this.applyTheme();
      }
    };
    _mediaQuery.addEventListener('change', _mediaListener);
  },

  setMode(mode) {
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch (e) { /* quota or private browsing — best effort */ }
    this.applyTheme();
  },

  getMode() {
    try {
      return localStorage.getItem(THEME_KEY) || 'auto';
    } catch (e) {
      return 'auto';
    }
  },

  applyTheme() {
    const mode = this.getMode();
    let isDark;
    if (mode === 'dark') {
      isDark = true;
    } else if (mode === 'light') {
      isDark = false;
    } else {
      // 'auto' or unset
      try {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } catch (e) {
        isDark = false;
      }
    }
    document.documentElement.classList.toggle('dark', isDark);
  },
};
```
[ASSUMED — design derived from locked decisions in CONTEXT.md and UI-SPEC.md]

### Pattern 4: matchMedia Change Listener
**What:** Listen for OS-level dark/light preference changes and respond without page reload
**When to use:** In auto mode — system pref is the effective setting
**Example:**
```javascript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList/change_event
const mql = window.matchMedia('(prefers-color-scheme: dark)');
mql.addEventListener('change', (event) => {
  // event.matches === true means OS just switched to dark
});
```
[VERIFIED: MDN Web Docs]

### Pattern 5: ThemeService Test with matchMedia Mock
**What:** Mock `window.matchMedia` in happy-dom test environment (which does not implement it natively)
**When to use:** Any Vitest test that exercises ThemeService.init(), applyTheme(), or system-pref detection
**Example:**
```javascript
// In theme.test.js — mock must be defined before ThemeService import
import { describe, it, vi, expect, beforeEach } from 'vitest';

// window.matchMedia is not implemented in happy-dom — mock it
const mockMatchMedia = (matches) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('ThemeService', () => {
  beforeEach(() => {
    // Clear localStorage between tests (test-setup.js does this globally)
    // Reset DOM class
    document.documentElement.classList.remove('dark');
    // Default: system is light
    mockMatchMedia(false);
  });

  it('applies dark class when stored mode is dark', async () => {
    localStorage.setItem('pb:theme', 'dark');
    const { ThemeService } = await import('./theme.js');
    ThemeService.applyTheme();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
```
[CITED: https://rebeccamdeprey.com/blog/mock-windowmatchmedia-in-vitest]

### Anti-Patterns to Avoid
- **Placing the FOUC script after `<link rel="stylesheet">` or `<script type="module">`:** The script must run before any render. If placed after the stylesheet link, the browser may have already applied a paint pass. [VERIFIED: tailwindcss.com docs structure]
- **Using `type="module"` on the FOUC script:** Module scripts are deferred — they run after DOM parsing completes, not synchronously in `<head>`. [VERIFIED: MDN spec]
- **Skipping the try/catch in the FOUC script:** Private browsing mode can throw when accessing localStorage; an uncaught error in the FOUC script will break app startup entirely.
- **Adding `dark:` utilities to any view in Phase 15:** Per UI-SPEC, all per-view dark overrides are Phase 16 scope. Phase 15 adds only the `dark:` body baseline classes.
- **Forgetting to remove the matchMedia listener if `init()` is called multiple times:** In the current app, `init()` is called once at startup. However, if tests call it multiple times, stale listeners accumulate. Using a module-level variable to track the listener and re-attach defensively prevents this.
- **Writing `pb:theme` into the `pb:all` blob:** CONTEXT.md explicitly locks this as a separate key. Mixing it in would require a v2 migration.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS dark mode variant | Custom CSS selector chains | `@custom-variant dark (...)` in style.css | Tailwind v4 native; integrates with all `dark:` utilities automatically |
| System preference detection | Custom CSS media query listeners | `window.matchMedia('(prefers-color-scheme: dark)')` | Browser native API; baseline widely available (MDN) |
| Dark class management | Custom attribute or data-theme approach | `.dark` class on `<html>` via `classList.toggle` | Matches the `@custom-variant` selector; simplest path |

**Key insight:** The entire pattern (FOUC script + matchMedia + class toggle) is a solved, well-documented problem with a canonical 20-line implementation. No libraries needed.

---

## Common Pitfalls

### Pitfall 1: FOUC Script Placement
**What goes wrong:** Dark background flashes white for one frame on load in dark mode
**Why it happens:** Script placed after `<link>` tags, so CSS paints before script sets `.dark`
**How to avoid:** Script must be the FIRST element in `<head>`, before any `<link>` or `<script type="module">`
**Warning signs:** In browser DevTools → Performance panel, you see a paint with `bg-gray-50` before `.dark` is added

### Pitfall 2: matchMedia in Tests
**What goes wrong:** `TypeError: window.matchMedia is not a function` when running ThemeService tests
**Why it happens:** happy-dom (v20.8.9) does not implement `matchMedia`
**How to avoid:** Add `Object.defineProperty(window, 'matchMedia', ...)` mock at the top of `theme.test.js` or in the global `src/test-setup.js`. If added to `test-setup.js`, it benefits all test files.
**Warning signs:** Test runner throws `window.matchMedia is not a function` on import of ThemeService

### Pitfall 3: Module Import Order in Tests
**What goes wrong:** ThemeService test mocks don't take effect because `init()` already ran during module evaluation
**Why it happens:** If ThemeService called `init()` at module scope (not lazily), the matchMedia call happens before the mock is set up
**How to avoid:** ThemeService must NOT call `init()` at module scope. `init()` must be called explicitly by `main.js`. Tests then set up mocks before calling `init()` manually.
**Warning signs:** Tests pass in isolation but fail when the module is imported without explicit init

### Pitfall 4: Stale matchMedia Listener in Auto Mode
**What goes wrong:** After calling `setMode('light')`, the OS-preference listener still fires and toggles `.dark`
**Why it happens:** Listener was attached in `init()` but never detached or made conditional
**How to avoid:** The listener callback must check `this.getMode() === 'auto'` before calling `applyTheme()` — matching the design in CONTEXT.md
**Warning signs:** Manually setting mode to `'light'`, then changing OS to dark, causes the app to switch to dark anyway

### Pitfall 5: FOUC Script Hardcoded Key Mismatch
**What goes wrong:** First paint uses wrong default (e.g., shows light when user set dark)
**Why it happens:** FOUC script uses a different key string than ThemeService (e.g., `theme` vs `pb:theme`)
**How to avoid:** The key in the FOUC script must exactly match `pb:theme` — what ThemeService writes
**Warning signs:** Manual dark mode set in Settings persists fine, but reload always shows flash

---

## Code Examples

### Verified: Tailwind v4 `@custom-variant` syntax
```css
/* src/style.css */
/* Source: https://tailwindcss.com/docs/dark-mode */
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
```

### Verified: `matchMedia` change event listener
```javascript
/* Source: https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList/change_event */
const mql = window.matchMedia('(prefers-color-scheme: dark)');
mql.addEventListener('change', (event) => {
  // event.matches: true = OS switched to dark; false = OS switched to light
});
```

### Verified: `classList.toggle` with boolean
```javascript
/* Standard DOM API — removes 'dark' if false, adds if true */
document.documentElement.classList.toggle('dark', isDark);
```

### Body classes to add in index.html
```html
<!-- existing -->
<body class="bg-gray-50 text-gray-900 font-sans min-h-[100dvh] flex flex-col overflow-x-hidden">
<!-- Phase 15: add dark:bg-gray-900 dark:text-gray-100 -->
<body class="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans min-h-[100dvh] flex flex-col overflow-x-hidden">
```

---

## Runtime State Inventory

> This section is omitted — Phase 15 is a greenfield feature addition (new key `pb:theme`), not a rename/refactor/migration. No existing runtime state is renamed or moved.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` with `darkMode: 'class'` | `@custom-variant dark (...)` in CSS | Tailwind v4.0 (Jan 2025) | No config file needed; CSS-first config is the v4 way |
| `mql.addListener()` | `mql.addEventListener('change', ...)` | ~2020 | `addListener` is deprecated; use `addEventListener` |

**Deprecated/outdated:**
- `addListener` / `removeListener` on MediaQueryList: deprecated in all modern browsers; use `addEventListener('change', ...)` instead. [VERIFIED: MDN]
- `darkMode: 'class'` in tailwind.config.js: not applicable in Tailwind v4, which uses CSS-first config.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | FOUC script code structure (IIFE, try/catch pattern) | Code Examples | Low — behavior contract is locked in UI-SPEC; implementation detail |
| A2 | ThemeService implementation (module-level vars for listener) | Code Examples | Low — interface is locked; internal implementation can vary |

**Two assumptions exist, both low-risk** — the interface contracts and behavior are fully specified in CONTEXT.md and UI-SPEC.md. The assumptions only affect internal implementation style.

---

## Open Questions (RESOLVED)

1. **Should the matchMedia mock be added to the global `test-setup.js` or per-test-file?**
   - What we know: `test-setup.js` currently sets up localStorage globally; adding matchMedia there benefits all test files
   - What's unclear: Whether any existing tests would be disrupted by a global matchMedia mock (currently no existing code uses matchMedia)
   - Recommendation: Add matchMedia mock to `test-setup.js` to keep it consistent with the localStorage mock pattern already there. Risk is minimal since no existing code uses matchMedia.
   RESOLVED: Mock added globally to src/test-setup.js, matching the localStorage mock pattern already in place.

2. **Does the `@custom-variant` line interact with the existing `@layer base` block?**
   - What we know: Tailwind v4 docs show `@custom-variant` placed after `@import "tailwindcss"` — same location as `@layer base`
   - What's unclear: Whether declaration order matters (before vs after `@layer base`)
   - Recommendation: Place `@custom-variant` immediately after `@import "tailwindcss"` and before `@layer base`, matching the Tailwind docs example. [ASSUMED — documentation example ordering]
   RESOLVED: @custom-variant dark line placed immediately after @import "tailwindcss" and before the existing @layer base block in style.css.

---

## Environment Availability

> Step 2.6: SKIPPED — Phase 15 is purely code/config changes. No external CLIs, databases, or services beyond the browser's native APIs (localStorage, matchMedia) are required. All dependencies are already installed.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vite.config.js` (inline `test:` block) |
| Quick run command | `npx vitest run src/services/theme.test.js` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DARK-01 | System pref detected on first load (auto mode reads matchMedia) | unit | `npx vitest run src/services/theme.test.js` | ❌ Wave 0 |
| DARK-01 | Live OS change in auto mode triggers applyTheme | unit | `npx vitest run src/services/theme.test.js` | ❌ Wave 0 |
| DARK-02 | FOUC script: dark mode stored → `.dark` added before paint | manual | Browser DevTools → disable JS → inspect `<html>` class | manual only |
| DARK-02 | FOUC script: auto + system dark → `.dark` added | manual | Browser DevTools Network throttle + fast-3G | manual only |
| DARK-04 | `setMode('dark')` persists to `pb:theme`; reload reads it | unit | `npx vitest run src/services/theme.test.js` | ❌ Wave 0 |
| DARK-04 | `getMode()` returns `'auto'` when key absent | unit | `npx vitest run src/services/theme.test.js` | ❌ Wave 0 |

**Note on DARK-02:** The no-FOUC guarantee requires a synchronous browser paint, which cannot be automated in Vitest (a JS test runner with no paint cycle). Manual verification via browser DevTools is the appropriate test type. The acceptance check is: reload in dark mode → no white flash visible.

### Sampling Rate
- **Per task commit:** `npx vitest run src/services/theme.test.js`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/services/theme.test.js` — covers DARK-01, DARK-04 (system pref detection, manual override, persistence, getMode default)
- [ ] `window.matchMedia` mock — add to `src/test-setup.js` OR define at top of `theme.test.js`

*(Existing test infrastructure covers all other needs — no new framework config required)*

---

## Security Domain

> `security_enforcement` not set to false — section included. However, this phase has a minimal security surface.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a — theme is not auth-related |
| V3 Session Management | no | n/a |
| V4 Access Control | no | n/a — theme preference is non-sensitive |
| V5 Input Validation | yes (minor) | ThemeService.setMode() should validate input is one of `'auto'|'light'|'dark'` |
| V6 Cryptography | no | n/a |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Invalid mode value injected via `pb:theme` key | Tampering | `ThemeService.getMode()` returns `'auto'` for any unrecognized value (safe default) |
| localStorage unavailable (private browsing, strict security policy) | Denial of Service | All localStorage access wrapped in try/catch; silent fallback to system preference |

**Security note:** Theme preference is non-sensitive data. The primary security concern is defensive coding (try/catch) rather than access control.

---

## Sources

### Primary (HIGH confidence)
- [tailwindcss.com/docs/dark-mode](https://tailwindcss.com/docs/dark-mode) — `@custom-variant` syntax, class-based dark mode configuration
- [MDN: MediaQueryList change event](https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList/change_event) — `addEventListener('change', ...)` API, event properties
- `package.json` (local) — verified tailwindcss@4.2.2, @tailwindcss/vite@4.2.2, vitest@4.1.2, happy-dom@20.8.9
- `src/storage.js` (local) — confirmed StorageAdapter stores everything in `pb:all`; `pb:theme` must be a separate key
- `index.html` (local) — confirmed current `<body>` class, `<head>` structure, script placement
- `src/main.js` (local) — confirmed ThemeService.init() call site before initRouter

### Secondary (MEDIUM confidence)
- [rebeccamdeprey.com — Mock matchMedia in Vitest](https://rebeccamdeprey.com/blog/mock-windowmatchmedia-in-vitest) — matchMedia mock pattern for happy-dom; verified consistent with vitest vi.fn() API
- [happy-dom GitHub issue #306](https://github.com/capricorn86/happy-dom/issues/306) — confirmed matchMedia not natively implemented in happy-dom

### Tertiary (LOW confidence)
*(None — all findings confirmed via primary or secondary sources)*

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against installed node_modules
- Architecture: HIGH — verified against existing codebase (index.html, main.js, storage.js) and official Tailwind v4 docs
- Tailwind v4 @custom-variant: HIGH — verified against official tailwindcss.com/docs
- matchMedia API: HIGH — verified against MDN
- ThemeService implementation: MEDIUM — interface locked by CONTEXT.md; internal code is inferred pattern
- Pitfalls: HIGH — derived from codebase inspection + verified documentation

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable APIs — tailwindcss, matchMedia, localStorage are all stable)
