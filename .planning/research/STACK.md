# Stack Research

**Domain:** Static SPA — Milestone 8 additions: dark mode, test coverage, documentation
**Researched:** 2026-04-14
**Confidence:** HIGH (all approaches verified against official Tailwind v4 docs and Vitest 4.x docs)

---

> **Scope note:** This document covers only the NEW capabilities for Milestone 8. The foundational stack
> (Vite 8, Tailwind CSS v4, Vitest 4, vanilla JS, SortableJS, localStorage) is unchanged and already
> in place. See the prior STACK.md (dated 2026-04-02) for foundational rationale.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Tailwind CSS v4 dark variant | 4.2.2 (already installed) | Dark mode styling | No new dependency. v4 dark variant works out of the box with `@custom-variant dark` in CSS. Class-based toggle fits the "user-toggleable + system fallback" requirement. |
| `@vitest/coverage-v8` | ^4.1.2 (matches vitest) | Coverage measurement | V8-native instrumentation — no Babel transform needed, works with the existing vanilla JS/ESM setup. Vitest auto-prompts install when `--coverage` is first run. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None new required | — | — | Dark mode is pure CSS+JS. Coverage is a dev dependency. Docs are Markdown files. No additional runtime libraries needed. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `@vitest/coverage-v8` | Code coverage provider | Install as dev dependency; invoke via `vitest --coverage`. Generates lcov, html, and text reports from V8's built-in coverage engine. |
| `npx vitest --coverage` | Run tests with coverage | One-shot command; add as `"coverage"` script in package.json. No server required at runtime — output is static HTML files in `coverage/`. |

---

## Feature-by-Feature Approach

### Dark Mode

**Approach: Tailwind v4 class-based dark variant + inline FOUC-prevention script**

Tailwind v4 ships with a `dark` variant that defaults to `prefers-color-scheme: dark` media query. For user-toggleable dark mode with a system-preference fallback, override to a class-based variant — this lets JS toggle the `.dark` class on `<html>` without requiring any new library.

**CSS change (one line in `src/style.css`):**

```css
@import "tailwindcss";

/* Override dark variant to use class — enables JS toggle */
@custom-variant dark (&:where(.dark, .dark *));
```

**FOUC prevention (inline script in `<head>` of `index.html`):**

```html
<script>
  (function () {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  })();
</script>
```

This script must be inline in `<head>`, before any CSS loads, to prevent flash of unstyled content (FOUC). It cannot live in a module script — modules are deferred.

**JS toggle logic (new `src/utils/theme.js` module):**

```js
export function getTheme() {
  return localStorage.getItem('theme') || 'system';
}

export function setTheme(value) {
  // value: 'light' | 'dark' | 'system'
  if (value === 'system') {
    localStorage.removeItem('theme');
  } else {
    localStorage.setItem('theme', value);
  }
  applyTheme();
}

export function applyTheme() {
  var stored = localStorage.getItem('theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle(
    'dark',
    stored === 'dark' || (!stored && prefersDark)
  );
}
```

**Why NOT CSS custom properties alone or media-query only:**

- Media-query-only (`@media (prefers-color-scheme: dark)`) gives no user toggle — system setting is the only lever. The milestone requires both system detection AND a manual override that persists.
- CSS custom properties alone (without the Tailwind `dark:` variant) would require rewriting all color utilities as variables — a large refactor of every view file. The Tailwind v4 `@custom-variant` approach requires zero changes to existing utility classes.
- The class-based Tailwind variant has zero runtime cost: it's a CSS selector change compiled at build time. No JS framework, no extra CSS-in-JS.

**Integration point:** Settings view gets a three-state toggle (Light / Dark / System). The `setTheme()` call is the only integration required — all `dark:` Tailwind classes in views are additive, not replacements.

---

### Test Coverage

**Approach: `@vitest/coverage-v8` (V8 provider)**

Vitest 4.x supports two coverage providers: `v8` and `istanbul`. V8 is the right choice for this project.

**Why V8 over Istanbul:**

| Criterion | V8 (`@vitest/coverage-v8`) | Istanbul (`@vitest/coverage-istanbul`) |
|-----------|---------------------------|----------------------------------------|
| Instrumentation method | Native V8 engine (zero transform overhead) | Babel source transform |
| Works with vanilla JS ESM | Yes — no transform needed | Yes, but adds Babel to the chain |
| Requires build config changes | No | No |
| Reports | lcov, html, text, json | lcov, html, text, json (identical) |
| Accuracy for vanilla JS | Slightly lower (byte-level, not statement) | Higher (statement-level) |
| Recommended for | ESM projects without TypeScript | TypeScript projects, legacy CJS |

For vanilla JS with no TypeScript, V8 native coverage is simpler and faster. The marginal accuracy difference (byte-level vs statement-level) does not matter for the goal (identifying untested files and functions).

**Installation (one dev dependency):**

```bash
npm install -D @vitest/coverage-v8
```

**`vite.config.js` addition:**

```js
test: {
  environment: 'happy-dom',
  globals: true,
  setupFiles: ['./src/test-setup.js'],
  coverage: {
    provider: 'v8',
    include: ['src/**/*.js'],
    exclude: [
      'src/test-setup.js',
      'src/**/*.test.js',
    ],
    reporter: ['text', 'html'],
    reportsDirectory: './coverage',
  },
},
```

**`package.json` script addition:**

```json
"coverage": "vitest run --coverage"
```

The `html` reporter produces a static `coverage/index.html` file — open locally with any browser, no server required. The `text` reporter prints a summary table to the terminal. Neither requires a running Node.js process after the run completes.

**Note on `coverage.all` (removed in Vitest 4.0):** The old `coverage.all: true` option was removed in Vitest 4.0. Use `coverage.include` to specify which files get reported even if not imported during tests. The config above covers all `src/**/*.js` files.

---

### Documentation Tooling

**Approach: No tooling — plain Markdown files only**

Neither the in-app Help screen nor the GitHub README needs a documentation generator for this project.

- **In-app Help screen:** Rendered as static HTML inside the SPA's existing router/view pattern (`src/views/Help.js`). Content is plain strings or HTML in the JS file — the same pattern as all other views. No markdown parser, no MDX, no documentation framework.
- **GitHub README:** Standard `README.md` at the project root. GitHub renders it automatically. No generator, no static site docs tool (Docusaurus, VitePress, etc.) is justified at this scope.

Why NOT to add a documentation tool:

| Option | Problem |
|--------|---------|
| VitePress | Adds a second build pipeline and `docs/` site, separate from the app. Overkill for one README and one help screen. |
| Docusaurus | React-based, Node.js dev server, entirely separate project. Massively over-engineered. |
| MDX in Vite | Requires `@vitejs/plugin-react` or `@vitejs/plugin-vue`. Introduces a framework dependency to the project solely for Markdown — wrong tradeoff. |
| Marked / markdown-it (runtime) | Parsing Markdown at runtime in the browser adds a dependency and requires fetching `.md` files — network request, Content-Security-Policy concerns on GitHub Pages. Unnecessary when the content is short and maintained by a developer. |

The Help screen content is short (one screen), changes rarely, and is written by the developer — not end-users. Plain JS string templates are appropriate.

---

## Installation

```bash
# Dark mode — no new install required
# (Tailwind v4 already installed; @custom-variant is a CSS directive, not a package)

# Coverage — one dev dependency
npm install -D @vitest/coverage-v8
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Tailwind class-based dark variant | CSS custom properties (`--color-bg` etc.) | If you needed to theme third-party components or non-Tailwind elements extensively. For a pure Tailwind project, `dark:` utilities are simpler. |
| Tailwind class-based dark variant | Media-query only (no toggle) | If the requirement were "system preference only, no manual override." It's simpler — but the milestone explicitly requires a manual toggle. |
| `@vitest/coverage-v8` | `@vitest/coverage-istanbul` | If the project moved to TypeScript (Istanbul gives more accurate statement coverage for transpiled code). Not needed here. |
| Plain Markdown docs | VitePress / Docusaurus | If documentation grew to 20+ pages, needed versioning, or had non-developer contributors. Not the case here. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Tailwind Play CDN for dark mode testing | CDN is "not for production," disables `@apply`, adds 100ms runtime cost | The existing `@tailwindcss/vite` build pipeline — dark mode classes compile to static CSS |
| Deferred `<script type="module">` for FOUC prevention | Module scripts are deferred by the browser — they execute after the page renders, causing a visible flash | Inline `<script>` in `<head>` (synchronous, before CSS) |
| `coverage.all: true` | Removed in Vitest 4.0 — will throw a config error | `coverage.include: ['src/**/*.js']` |
| Istanbul provider | Requires Babel transform for ESM; adds complexity without benefit for plain vanilla JS | `@vitest/coverage-v8` |
| Runtime Markdown parser for Help screen | Adds a library dependency and a network fetch for content that never changes at runtime | Static HTML/string content in the view's JS file |

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@vitest/coverage-v8@4.x` | `vitest@4.1.2` | Must match Vitest major version. Install `@vitest/coverage-v8@^4.1.2` to match. |
| Tailwind `@custom-variant dark` directive | `tailwindcss@4.x` | This directive does not exist in Tailwind v3. Already on v4.2.2 — no issue. |
| Inline `<script>` FOUC script | All browsers + PWA WebView | Synchronous inline scripts in `<head>` are supported universally. Works inside the existing PWA service worker scope without modification. |

## Sources

- [Tailwind CSS v4 Dark Mode docs](https://tailwindcss.com/docs/dark-mode) — `@custom-variant dark`, three-way toggle pattern, FOUC prevention verified (HIGH confidence)
- [Vitest 4.x Coverage docs — GitHub](https://github.com/vitest-dev/vitest/blob/main/docs/guide/coverage.md) — v8 vs istanbul providers, `coverage.include`, reporter options verified via Context7 (HIGH confidence)
- [Vitest 4.0 Migration Guide](https://github.com/vitest-dev/vitest/blob/main/docs/guide/migration.md) — `coverage.all` removal, `coverage.include` replacement confirmed (HIGH confidence)
- [Vitest Coverage Config reference](https://github.com/vitest-dev/vitest/blob/main/docs/config/coverage.md) — `thresholds`, `reporter`, `htmlDir` options verified via Context7 (HIGH confidence)
- WebSearch: Tailwind CSS v4 dark mode class toggle localStorage 2025 — class-based pattern, inline script placement confirmed across multiple sources (MEDIUM, corroborated by official docs)

---
*Stack research for: Pickleball Practice Scheduler — Milestone 8 dark mode, coverage, docs*
*Researched: 2026-04-14*
