# Phase 15 Context: Dark Mode Foundation

**Phase goal:** The app detects, stores, and applies the correct theme before any content is visible — no flash, preference persisted.
**Requirements:** DARK-01, DARK-02, DARK-04

---

## Canonical Refs

- `.planning/ROADMAP.md` — Phase 15 goal and success criteria
- `.planning/REQUIREMENTS.md` — DARK-01, DARK-02, DARK-04 definitions
- `src/storage.js` — StorageAdapter (current schemaVersion: 1)
- `src/style.css` — Tailwind v4 CSS entry point (`@import "tailwindcss"`)
- `index.html` — HTML entry point where FOUC prevention script goes
- `vite.config.js` — `@tailwindcss/vite` plugin (Tailwind v4)

---

## Decisions

### 1. Storage: Separate `pb:theme` key via StorageAdapter

themePreference is stored under its own key (`pb:theme`) rather than inside the main `pb:all` state blob.

- **No v2 migration needed.** The existing `migrations` chain in `storage.js` stays untouched.
- StorageAdapter reads/writes theme via `StorageAdapter.get('theme')` / `StorageAdapter.set('theme', value)` — consistent with how the rest of the app uses StorageAdapter (satisfies DARK-04).
- The FOUC prevention script reads `localStorage.getItem('pb:theme')` directly (acceptable — modules aren't loaded yet at that point).
- StorageAdapter may need a minor update to support isolated keys (currently everything is under `pb:all`). If StorageAdapter doesn't support arbitrary top-level keys, add a `getItem(rawKey)` / `setItem(rawKey, value)` method or a dedicated `getTheme()`/`setTheme()` pair. The key name is `pb:theme`.

### 2. Tailwind v4 dark mode: `.dark` class on `<html>`

Add this line to `src/style.css`:
```css
@custom-variant dark (&:where(.dark, .dark *));
```

ThemeService and the FOUC script toggle dark mode by adding/removing the `dark` class on `document.documentElement`. Phase 16's `dark:` utilities will use this variant.

### 3. FOUC prevention: inline script in `<head>` of `index.html`

An inline `<script>` (not `type="module"`) is placed in `<head>` before any stylesheets or scripts. It:
1. Reads `localStorage.getItem('pb:theme')` to get the stored mode (`'light'`|`'dark'`|`'auto'`|null).
2. If `'dark'`, adds `dark` class to `<html>` immediately.
3. If `null` or `'auto'`, checks `window.matchMedia('(prefers-color-scheme: dark)').matches` and adds `dark` class if true.
4. If `'light'`, does nothing (default is light).

This runs synchronously before the browser paints — prevents white flash (satisfies DARK-02).

### 4. ThemeService: full `auto|light|dark` API, designed now

Create `src/services/theme.js` exposing:
- `ThemeService.init()` — called on app startup; applies stored preference and attaches matchMedia listener
- `ThemeService.setMode(mode)` — `'auto'|'light'|'dark'`; persists to StorageAdapter and calls `applyTheme()`
- `ThemeService.getMode()` — returns current stored mode (or `'auto'` if unset)
- `ThemeService.applyTheme()` — internal; reads mode + system pref and sets/removes `dark` class on `<html>`

Phase 15 implements the full API; Phase 16 only needs to call `ThemeService.setMode(selectedMode)` from the Settings UI toggle without any ThemeService changes.

### 5. Live system preference tracking

When in `'auto'` mode, ThemeService attaches a `matchMedia.addEventListener('change', ...)` listener in `init()`. If the OS dark/light preference changes mid-session, `applyTheme()` is called immediately — no page reload needed. This only fires when mode is `'auto'` (or unset).

---

## Implementation Notes for Researcher/Planner

- **`index.html` body classes**: `bg-gray-50 text-gray-900` are hardcoded. Phase 15 should add `dark:bg-gray-900 dark:text-gray-100` (or equivalent) so the initial background is correct before any view mounts. Phase 16 handles per-view dark overrides.
- **ThemeService.init() call site**: Should be called early in `src/main.js`, before the router mounts any view.
- **StorageAdapter compatibility**: Current `StorageAdapter.get/set` reads from the single `pb:all` blob. For `pb:theme`, the implementation may need to go directly to `localStorage` with a wrapper, or StorageAdapter needs a bypass path. Keep it simple — a thin wrapper in ThemeService that reads/writes `localStorage.getItem('pb:theme')` directly is acceptable as long as it's encapsulated inside ThemeService (DARK-04 says "not directly to localStorage" from caller perspective; ThemeService can be the single point of access).
- **FOUC script key**: `pb:theme` — must match what ThemeService writes.
- **Schema**: The `pb:theme` value is a plain string: `'light'|'dark'|'auto'`. No JSON wrapping needed.

---

## Deferred Ideas

*(None raised during discussion)*
