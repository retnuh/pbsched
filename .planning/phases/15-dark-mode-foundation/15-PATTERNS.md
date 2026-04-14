# Phase 15: Dark Mode Foundation - Pattern Map

**Mapped:** 2026-04-14
**Files analyzed:** 6 (1 new service, 1 new test, 2 modified config files, 1 modified HTML, 1 modified JS entry)
**Analogs found:** 5 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/services/theme.js` | service | event-driven | `src/services/haptics.js` | role-match |
| `src/services/theme.test.js` | test | request-response | `src/services/session.test.js` | role-match |
| `src/style.css` | config | transform | `src/style.css` (itself) | exact — single-line addition |
| `index.html` (FOUC script + body classes) | config | request-response | `index.html` (itself) | exact — additive edit |
| `src/main.js` (add ThemeService.init() call) | config | request-response | `src/main.js` (itself) | exact — single-line addition |
| `src/test-setup.js` (add matchMedia mock) | utility | transform | `src/test-setup.js` (itself) | exact — additive edit |

---

## Pattern Assignments

### `src/services/theme.js` (service, event-driven)

**Analog:** `src/services/haptics.js`

The project's service pattern is a plain exported `const` object literal — no class, no default export, no constructor. Methods reference `this` when needed for internal calls. Browser API availability is checked defensively. No imports are needed for a service that only touches browser APIs and localStorage directly.

**Imports pattern** — `src/services/haptics.js` lines 1-6:
```javascript
/**
 * Haptics Utility
 * Provides subtle tactile feedback for mobile devices.
 */

export const Haptics = {
```

ThemeService follows the same structure: JSDoc comment block, then `export const ThemeService = { ... }`. No imports (ThemeService accesses localStorage directly, encapsulated, not via StorageAdapter).

**Core service object pattern** — `src/services/haptics.js` lines 6-42:
```javascript
export const Haptics = {
  light() {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  },
  // ... more methods
};
```

Key conventions to copy:
- Named export `const` object, not a class
- Method shorthand syntax (`init() {`, not `init: function() {`)
- Browser API guarded defensively before use
- No error thrown — silent fallback

**ThemeService implementation** (derived from CONTEXT.md locked decisions, matching haptics.js structure):
```javascript
// src/services/theme.js

const THEME_KEY = 'pb:theme';
const VALID_MODES = ['auto', 'light', 'dark'];

let _mediaQuery = null;
let _mediaListener = null;

export const ThemeService = {
  init() {
    this.applyTheme();
    try {
      _mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      _mediaListener = () => {
        if (this.getMode() === 'auto') {
          this.applyTheme();
        }
      };
      _mediaQuery.addEventListener('change', _mediaListener);
    } catch (e) { /* matchMedia unavailable — do nothing */ }
  },

  setMode(mode) {
    if (!VALID_MODES.includes(mode)) return;
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch (e) { /* quota or private browsing — best effort */ }
    this.applyTheme();
  },

  getMode() {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      return VALID_MODES.includes(stored) ? stored : 'auto';
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

**Security note:** `getMode()` returns `'auto'` for any unrecognized value (defensive against a tampered `pb:theme` key). `setMode()` validates against `VALID_MODES` before writing.

---

### `src/services/theme.test.js` (test, request-response)

**Analog:** `src/services/session.test.js`

**Imports pattern** — `src/services/session.test.js` lines 1-4:
```javascript
import { expect, test, describe, beforeEach, vi } from 'vitest'
import { StorageAdapter } from '../storage.js'
import { SessionService } from './session.js'
import * as schedulerModule from '../scheduler.js'
```

ThemeService test replaces `StorageAdapter` with direct `localStorage` references (ThemeService uses localStorage directly, not StorageAdapter). `vi` is imported for `vi.fn()` mocks.

**beforeEach/describe structure** — `src/services/session.test.js` lines 37-58:
```javascript
describe('SessionService — WR-01: generateNextRound empty-result guard', () => {
  beforeEach(() => {
    StorageAdapter.reset()
  })

  test('returns null and does not corrupt rounds when scheduler returns no candidates', () => {
    // ...
  })
})
```

ThemeService test replaces `StorageAdapter.reset()` with DOM class cleanup + localStorage key removal (the global `beforeEach` in `test-setup.js` already clears all localStorage keys, so only the DOM reset is needed per-test).

**matchMedia mock pattern** — must be defined at module scope, before any test runs (RESEARCH.md Pattern 5):
```javascript
// window.matchMedia is not implemented in happy-dom — mock it before ThemeService import
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
```

**Test structure to produce** (mirrors session.test.js describe-per-requirement pattern):
```javascript
import { describe, it, vi, expect, beforeEach } from 'vitest'
import { ThemeService } from './theme.js'

const mockMatchMedia = (matches) => { /* ... as above ... */ };

describe('ThemeService — DARK-01: system preference detection', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    mockMatchMedia(false); // default: system light
  });

  it('applies dark class when system prefers dark and mode is auto', () => { /* ... */ });
  it('updates class immediately when OS pref changes in auto mode', () => { /* ... */ });
});

describe('ThemeService — DARK-04: persistence', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    mockMatchMedia(false);
  });

  it('setMode persists to pb:theme', () => { /* ... */ });
  it('getMode returns auto when key absent', () => { /* ... */ });
});
```

**Key difference from session.test.js:** ThemeService must NOT be imported as a side-effect-free module if `init()` touches matchMedia at module scope. Confirm `init()` is NOT called at module scope before importing — per CONTEXT.md design it is not.

---

### `src/style.css` (config, transform — additive edit)

**Analog:** `src/style.css` itself (lines 1-9)

**Current state** — `src/style.css` lines 1-9:
```css
@import "tailwindcss";

@layer base {
  /* Prevent overscroll bounce on mobile Safari */
  html, body {
    overscroll-behavior-y: none;
    -webkit-tap-highlight-color: transparent;
  }
}
```

**Change:** Insert `@custom-variant dark (&:where(.dark, .dark *));` on line 3, immediately after `@import "tailwindcss"` and before `@layer base`. This matches the Tailwind v4 docs example ordering (RESEARCH.md Open Question 2 recommendation).

**Target state after edit:**
```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@layer base {
  /* Prevent overscroll bounce on mobile Safari */
  html, body {
    overscroll-behavior-y: none;
    -webkit-tap-highlight-color: transparent;
  }
}
```

---

### `index.html` (config — two additive edits)

**Analog:** `index.html` itself

**Current `<head>` structure** — `index.html` lines 1-12:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="PB Sched" />
    <link rel="manifest" href="/manifest.json" />
    <title>Pickleball Practice Scheduler</title>
  </head>
```

**Change 1 — FOUC inline script:** Insert after `<meta charset="UTF-8" />` (line 4) and BEFORE the `<link rel="icon">` tag — the script must be the first executable content in `<head>`, before any resource loads.

**FOUC script to insert:**
```html
    <script>
      (function () {
        try {
          var mode = localStorage.getItem('pb:theme');
          if (mode === 'dark') {
            document.documentElement.classList.add('dark');
          } else if (mode !== 'light') {
            // 'auto' or null — fall back to system preference
            try {
              if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
              }
            } catch (e2) { /* matchMedia unavailable — light is default */ }
          }
        } catch (e) {
          // localStorage unavailable (private browsing) — fall back to system preference
          try {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
              document.documentElement.classList.add('dark');
            }
          } catch (e2) { /* matchMedia unavailable — do nothing */ }
        }
      })();
    </script>
```

**Change 2 — body dark baseline classes** — `index.html` line 13:

Current:
```html
  <body class="bg-gray-50 text-gray-900 font-sans min-h-[100dvh] flex flex-col overflow-x-hidden">
```

Target:
```html
  <body class="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans min-h-[100dvh] flex flex-col overflow-x-hidden">
```

---

### `src/main.js` (config — single-line addition)

**Analog:** `src/main.js` itself (lines 1-6)

**Current state** — `src/main.js` lines 1-6:
```javascript
import './style.css'
import { initRouter } from './router.js'

// Initialize the Hash Router
const appEl = document.querySelector('#app');
initRouter(appEl);
```

**Change:** Add `import { ThemeService } from './services/theme.js'` to the imports block, then call `ThemeService.init()` before `initRouter(appEl)`.

**Target state:**
```javascript
import './style.css'
import { initRouter } from './router.js'
import { ThemeService } from './services/theme.js'

// Initialize theme before router mounts any view
ThemeService.init();

// Initialize the Hash Router
const appEl = document.querySelector('#app');
initRouter(appEl);
```

---

### `src/test-setup.js` (utility — additive edit)

**Analog:** `src/test-setup.js` itself

**Current state** — `src/test-setup.js` lines 1-27 (full file):
```javascript
// src/test-setup.js
// Patches globalThis.localStorage before any ES module runs.
const _store = {}
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key) => _store[key] ?? null,
    setItem: (key, value) => { _store[key] = String(value) },
    removeItem: (key) => { delete _store[key] },
    clear: () => { Object.keys(_store).forEach(k => delete _store[k]) },
    get length() { return Object.keys(_store).length },
  },
  writable: true,
  configurable: true,
})

import { beforeEach } from 'vitest'
beforeEach(() => {
  Object.keys(_store).forEach(k => delete _store[k])
})
```

**Decision point (RESEARCH.md Open Question 1):** Add the `matchMedia` mock here (global, benefits all future tests) OR define it only in `theme.test.js`. Recommendation: add to `test-setup.js` to match the existing localStorage mock pattern — no existing code uses matchMedia, so no existing tests are disrupted.

**Change:** Append a `window.matchMedia` mock at the end of `test-setup.js`, using the same `Object.defineProperty` pattern as the localStorage mock:

```javascript
// window.matchMedia is not implemented in happy-dom 20.x — mock it globally
// Default: system prefers light. Override per-test with Object.defineProperty writable: true.
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})
```

Individual tests that need to test dark-system-preference behavior override this with `vi.fn()` returning `matches: true`.

---

## Shared Patterns

### Browser API Defensive Access
**Source:** `src/services/haptics.js` lines 9-13
**Apply to:** `src/services/theme.js` — all methods that touch `window.matchMedia` or `localStorage`
```javascript
if (window.navigator && window.navigator.vibrate) {
  window.navigator.vibrate(10);
}
```
ThemeService equivalent: wrap every `localStorage.*` and `window.matchMedia(...)` call in try/catch, returning a safe default on failure.

### Object.defineProperty Mock Pattern
**Source:** `src/test-setup.js` lines 7-16
**Apply to:** `src/test-setup.js` (new matchMedia mock) and optionally per-test overrides in `theme.test.js`
```javascript
Object.defineProperty(globalThis, 'localStorage', {
  value: { /* ... */ },
  writable: true,
  configurable: true,
})
```
The `writable: true, configurable: true` flags are required so per-test overrides with `Object.defineProperty` do not throw.

### beforeEach DOM Reset Pattern
**Source:** `src/services/session.test.js` lines 38-40
**Apply to:** `src/services/theme.test.js` — each describe block needs `document.documentElement.classList.remove('dark')` in `beforeEach` to prevent DOM state leaking between tests
```javascript
beforeEach(() => {
  StorageAdapter.reset()
})
```

---

## No Analog Found

All files have usable analogs. The only greenfield file (`theme.js`) has a strong role-match in `haptics.js` (same exported object pattern, same defensive browser API style).

---

## Metadata

**Analog search scope:** `src/services/`, `src/`, `index.html`, `src/test-setup.js`
**Files scanned:** 8 (`haptics.js`, `session.js`, `club.js`, `session.test.js`, `storage.js`, `style.css`, `main.js`, `index.html`, `test-setup.js`)
**Pattern extraction date:** 2026-04-14
