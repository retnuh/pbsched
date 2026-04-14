# Stack Research

**Domain:** Static SPA — no backend, GitHub Pages deployment, mobile-first, localStorage persistence
**Researched:** 2026-04-02 (initial) / 2026-04-13 (milestone 6 update) / 2026-04-14 (milestone 7 update)
**Confidence:** HIGH (all versions verified against official sources)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vite | 8.x (latest: 8.0.3) | Build tool, dev server | Industry standard for static SPAs. Zero-config HMR, fast Rolldown-based builds. GitHub Pages deployment is first-class with official docs. No alternatives come close for DX in 2025. |
| Vanilla JS (ES Modules) | ES2022+ | UI and app logic | Project constraint says "Vanilla JS or lightweight framework." For a scheduler app with ~5 screens and no complex shared state tree, vanilla JS with modules avoids framework overhead entirely. Preact is the right escalation path if component complexity grows. |
| Tailwind CSS v4 | 4.x (latest: 4.2.2) | Utility-first styling | v4 integrates directly into Vite via `@tailwindcss/vite` — no PostCSS config, no separate config file, single `@import "tailwindcss"` in CSS. Zero-config mobile-first utilities. Fastest builds in v4 history (full builds 5x faster than v3). |
| GitHub Actions | N/A | CI/CD for GitHub Pages | Official Vite docs recommend GitHub Actions over the legacy `gh-pages` branch approach. Push-to-deploy on main. Vite's static deploy guide has a copy-paste workflow. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tailwindcss/vite` | 4.x (matches tailwindcss) | Vite plugin for Tailwind v4 | Required alongside `tailwindcss` — this replaces the old PostCSS integration. Always install together. |
| Vitest | 4.x (latest: 4.1.2) | Unit testing | Use for testing the variety/scoring algorithm (penalty weights, candidate scoring, round generation). Shares Vite config — zero additional setup. Do NOT use Jest: it requires separate transpilation config and doesn't share Vite's module graph. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite dev server | Local development with HMR | `npm run dev` — instant start, no config needed for vanilla JS |
| GitHub Actions deploy workflow | Push-to-deploy to GitHub Pages | Set `base` in `vite.config.js` to `'/<repo-name>/'` for project pages; `'/'` for user/org pages. Case-sensitive — match repo name exactly. |
| ESLint | Linting | Optional but recommended. `npm create @eslint/config` for vanilla JS. Catches the localStorage type errors early. |

## Installation

```bash
# Scaffold project
npm create vite@latest pickle-ball -- --template vanilla

cd pickle-ball

# Tailwind v4 with Vite plugin (replaces PostCSS approach)
npm install tailwindcss @tailwindcss/vite

# Testing (optional but recommended for algorithm code)
npm install -D vitest
```

Then update `vite.config.js`:

```js
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/pickle-ball/',   // match repo name exactly
  plugins: [tailwindcss()],
})
```

And in `src/style.css`:

```css
@import "tailwindcss";
```

That's the entire setup — no `tailwind.config.js`, no `postcss.config.js`.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vanilla JS | Preact 10.x | If the app grows to 8+ interactive components with shared state. Preact is 3kB, React-compatible hooks, drops in via Vite's preact template. Use it when prop drilling becomes painful. |
| Vanilla JS | Vue 3 (via CDN/Vite) | If you already know Vue. No strong reason to pick it over vanilla for this scope; adds 40kB+ to bundle. |
| Vanilla JS | React/Next.js | Overkill. React alone is ~30kB. This is a static tool, not a product with complex routing. |
| Tailwind CSS v4 | Pico CSS | If you want zero-JS, pure semantic HTML styling with no build step at all. Valid for a proof of concept; outgrown quickly when you need custom mobile thumb zones and specific layout control. |
| Tailwind CSS v4 | Bootstrap 5 | If the team knows Bootstrap cold. However, Bootstrap v5 adds ~22kB CSS + JS and is component-centric, not utility-first — fights mobile-first custom layouts. |
| GitHub Actions | `gh-pages` npm package | Only if you refuse to use Actions. The `gh-pages` package works but requires a manual deploy command; Actions gives push-to-deploy automatically. |
| Vitest | Jest | Never for a Vite project. Jest requires Babel or ts-jest transpilation, doesn't share Vite's module resolution. Vitest is Jest-compatible and needs zero extra config in a Vite project. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Tailwind Play CDN (`@tailwindcss/browser`) | Officially marked "not for production." Requires runtime CSS scanning — adds ~100ms on every page load. `@apply` is disabled. | `@tailwindcss/vite` plugin with a build step |
| `create-react-app` | Unmaintained since 2022. No active maintainer, broken with Node 18+. | `npm create vite@latest` with the framework of your choice |
| `gh-pages` branch (manual) | Error-prone, requires running a deploy script. Superseded by GitHub Actions. | `.github/workflows/deploy.yml` via GitHub Actions |
| IndexedDB directly | Correct persistence choice for large structured data, but massively over-engineered for this app's data model (clubs + members + session history). localStorage is synchronous and simple. | localStorage with a thin JSON wrapper |
| Sass/SCSS | Unnecessary with Tailwind v4. Tailwind v4 supports `@theme` and CSS custom properties natively — the main reasons to reach for Sass are gone. | Tailwind v4 `@theme` blocks in CSS |
| Webpack | Obsolete as a greenfield choice. Config complexity is high, cold starts are slow. | Vite |

## Stack Patterns by Variant

**If the algorithm logic grows complex (penalty tuning, many weight parameters):**
- Extract scheduling logic into pure ES module functions (`src/scheduler.js`)
- Cover with Vitest unit tests
- Keep UI layer as plain DOM manipulation — don't mix algorithm into event handlers

**If you want to add a PWA manifest (offline support, "Add to Home Screen"):**
- Add `vite-plugin-pwa` to Vite config — it generates the service worker and manifest automatically
- This is not required for v1 but is a one-dependency addition later

**If Vanilla JS state management becomes unwieldy (multiple views need the same data):**
- Escalate to Preact 10.x (`npm create vite@latest -- --template preact`)
- State stays in a top-level component, localStorage sync goes in a `useEffect`-equivalent
- No other changes to tooling needed

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `vite@8.x` | Node.js 18+ | Vite 8 requires Node 18 minimum. GitHub Actions `node-version: '20'` is the safe default. |
| `tailwindcss@4.x` + `@tailwindcss/vite@4.x` | `vite@5+` and `vite@8.x` | Keep both at the same major version (both `4.x`). Do not mix with the old `postcss`-based Tailwind v3 config. |
| `vitest@4.x` | `vite@8.x` | Vitest 4 targets Vite 5+. Works with Vite 8. Both can share a single `vite.config.js`. |

---

## Milestone 6 Stack Assessment

**New dependencies required: None.**

All three milestone 6 features are implementable within the existing stack. The analysis below explains exactly what touches which layer, and what to watch out for.

### Feature 1: Inline tap-to-edit club name

**What:** Replace the static club name heading in the club view with a tap-to-edit `<input>` that writes back via `ClubService.updateClub()`.

**Stack fit:** `ClubService.updateClub(id, updates)` already exists in `src/services/club.js`. The view layer (likely `src/views/MemberEditor.js` or the club detail view) already uses inline `<input>` elements for member names. This pattern is established — use `<input>` (not `contenteditable`) for mobile consistency and to match existing patterns.

**No new code needed in:** scheduler, storage, session, settings.

**Mobile note:** On iOS Safari, `contenteditable` elements have known caret-position bugs on first tap. A styled `<input>` avoids this entirely. Existing member-add inputs in `RoundDisplay.js` and `ClubManager.js` demonstrate the correct approach.

### Feature 2: Scheduling penalties for singles (1v1) and 3-way solo (2v1) matches

**What:** Add two new penalty weights (`penaltySinglesMatch`, `penaltyThreeWaySoloMatch`) to the settings schema and apply them in `scoreRound()`.

**Stack fit:** `scoreRound()` in `src/scheduler.js` already reads all penalty weights from the `settings` argument. The round data structure already captures non-standard courts (`teamA.length === 1` for singles, one team length-1 and the other length-2 for 3-way). The Settings view already renders range sliders for three penalty weights — adding two more follows the same pattern exactly.

**Required changes (source files only):**

- `src/storage.js`: Increment `SCHEMA_VERSION` to 2. Add a migration 2 function that spreads existing settings and adds new penalty defaults (e.g. `penaltySinglesMatch: 8`, `penaltyThreeWaySoloMatch: 5`). The migration chain in the file already handles this pattern.
- `src/scheduler.js`: In `scoreRound()`, after the existing partner/opponent loops, add detection for courts where `teamA.length === 1 || teamB.length === 1` and apply the appropriate penalty from settings.
- `src/views/Settings.js`: Add two range sliders following the pattern of the existing three, wired to the new settings keys.

**Schema migration is required** — users with stored settings must receive the new keys with defaults. The `migrate()` function in `storage.js` is already the right mechanism.

### Feature 3: Tests for player changes preserving played match state

**What:** Vitest tests asserting that when `SessionService.updateAttendees()` is called mid-session, rounds already marked `played: true` retain their data and `played` flag unchanged.

**Stack fit:** Vitest + happy-dom is configured in `vite.config.js` (`test: { environment: 'happy-dom', globals: true }`). The test file pattern is established: `vi.stubGlobal('localStorage', ...)` in `beforeEach`, then direct service method calls, then `expect()` assertions. See `src/storage.test.js` for the exact pattern.

**New file:** `src/session.test.js` (following the same naming convention as `storage.test.js` and `scheduler.test.js`).

**No source changes required** — if the feature works correctly, only new test assertions are needed. If tests reveal a bug, a fix to `SessionService` methods would be scoped.

### What NOT to Add for Milestone 6

- No new npm packages
- No new Vite plugins
- No changes to `vite.config.js` (test environment already configured)
- No additional test utilities (Testing Library, sinon, etc.) — `vi.stubGlobal` and `vi.fn()` from Vitest cover all mocking needs
- No state management library — the service module pattern handles everything
- No form validation library — `.trim()` and empty-string checks are sufficient, matching existing club/member name handling

---

## Milestone 7 Stack Assessment: Match Editor Drag-and-Drop

**New dependency required: SortableJS 1.15.7**

The match editor needs touch drag-and-drop to move player chips between court zones and the rest bench. This is the only new dependency required.

### Recommended: SortableJS 1.15.7

**Install:**
```bash
npm install sortablejs@1.15.7
```

**Import in the match editor view module:**
```js
import Sortable from 'sortablejs'
```

**Why SortableJS over alternatives:**

SortableJS is the right choice for this specific use case because:

1. **Cross-container drag-and-drop is its primary feature.** The `group` option lets you define a named group across multiple `Sortable` instances (court 1, court 2, rest bench). Items drag freely between any zone in the group with a single config option — no custom hit-testing required.

2. **Touch is first-class, not an afterthought.** SortableJS implements its own touch event handling internally via `touchstart`/`touchmove`/`touchend`. It does not rely on the broken HTML5 drag-and-drop API on iOS. Options like `delayOnTouchOnly` and `touchStartThreshold` handle the "accidental drag while scrolling" problem that kills most mobile DnD implementations.

3. **Actively maintained.** v1.15.7 released February 2026. Over 1 million weekly npm downloads. The project receives consistent releases and bug fixes.

4. **Framework-agnostic vanilla JS.** `Sortable.create(el, options)` is a plain function call on a DOM element. No virtual DOM, no React, no Vue wrapper needed. Integrates directly into the existing view module pattern.

5. **No additional polyfill needed.** Unlike libraries built on top of the HTML5 DnD API (which requires a separate touch polyfill on mobile), SortableJS handles touch natively. You do not need `@dragdroptouch/drag-drop-touch` alongside it.

**Basic integration pattern for the match editor:**

```js
import Sortable from 'sortablejs'

const GROUP_NAME = 'match-editor'
const SORTABLE_OPTIONS = {
  group: GROUP_NAME,
  animation: 150,
  delay: 100,           // prevents accidental drags from taps
  delayOnTouchOnly: true,
  touchStartThreshold: 5,
}

function initMatchEditor(roundData) {
  const zones = document.querySelectorAll('.court-zone, .bench-zone')
  zones.forEach(zone => {
    Sortable.create(zone, {
      ...SORTABLE_OPTIONS,
      onEnd(evt) {
        // evt.item is the dragged player chip
        // evt.from / evt.to are the source/target zone elements
        handlePlayerMove(evt)
      }
    })
  })
}
```

**CSS required:** Add `touch-action: none` to draggable player chip elements. This prevents the browser from claiming touch events for scrolling before SortableJS can intercept them.

```css
.player-chip {
  touch-action: none;
}
```

**What SortableJS does NOT do for this use case:**
- It does not enforce game-valid moves (e.g., max 2 players per team). That validation belongs in `handlePlayerMove()` in the view layer, which can inspect zone occupancy after the drop and revert if invalid.
- It does not manage the data model. `onEnd` fires after the DOM has changed; the view layer must sync the DOM state back into the round data object before saving.

### Why NOT the alternatives

**Custom PointerEvents implementation (no library):**
- PointerEvents unify mouse and touch, and Safari iOS 13+ supports them. Writing a custom DnD with `pointerdown`/`pointermove`/`pointerup` is feasible but requires implementing: visual drag preview/ghost element, hit-testing against drop zones on each `pointermove`, scroll-while-dragging auto-scroll, and cleanup on cancel. Estimated 150-300 lines of edge-case-heavy code. SortableJS solves all of this in one npm install. The custom approach is only justified if you need behavior SortableJS cannot provide — this use case does not reach that bar.

**DragDropTouch polyfill + native HTML5 DnD API:**
- The native HTML5 DnD API fires `dragstart`, `dragover`, `drop` events. iOS Safari 15+ supports these natively. However, iOS Safari's implementation of `dragover` does not fire continuously during touch movement (a known platform bug), making visual feedback during dragging nearly impossible. The DragDropTouch polyfill translates touch events into synthetic DnD events to paper over this, but it is a compatibility layer on a leaky abstraction. SortableJS bypasses the HTML5 DnD API entirely and directly consumes touch events — a cleaner foundation.

**Dragula 3.7.3:**
- Last published 5 years ago. Touch support on mobile Android and iOS has open, unresolved issues in the GitHub tracker (issues #236, #239). Not suitable for a mobile-first PWA.

**interact.js 1.10.27:**
- Last published approximately 2 years ago. Officially in maintenance-only mode (no new features). Designed primarily for free-form dragging and resizing of arbitrary elements, not for list/zone-based drag-and-drop between containers. Overkill API surface for this use case.

**Shopify Draggable:**
- Actively maintained but bundled as CommonJS modules with no clean single-file ES module build. Requires a build step to tree-shake. SortableJS provides a cleaner no-config ES module import.

### iOS Safari Compatibility Note

SortableJS has had minor iOS-specific issues over the years (e.g., `onFilter` regression in iOS 17.4 per GitHub issue #2374, resolved in subsequent releases). These are library-level bugs with tracked fixes, not platform-level limitations. At v1.15.7, iOS touch drag-and-drop with the `group` option is the library's most battle-tested use case. The `delay: 100, delayOnTouchOnly: true` options are the recommended config for mobile — they prevent conflicts between scroll intent and drag intent on touch screens.

### What NOT to Add for Milestone 7

- No additional drag-and-drop libraries alongside SortableJS (do not add DragDropTouch polyfill — it is not needed)
- No animation library (SortableJS `animation: 150` provides built-in CSS transition animations)
- No gesture library (e.g., Hammer.js) — SortableJS handles all touch gestures needed
- No React/Vue — the existing view module pattern handles the match editor UI
- No state management library — round data flows through the same localStorage service layer already in place

---

## Sources

- [Vite — Deploying a Static Site](https://vite.dev/guide/static-deploy) — GitHub Pages workflow verified, Vite 8.0.3 confirmed as current stable (HIGH confidence)
- [GitHub Releases — vitejs/vite](https://github.com/vitejs/vite/releases) — v8.0.3 released March 26, 2026 (HIGH confidence)
- [Tailwind CSS v4 Blog Post](https://tailwindcss.com/blog/tailwindcss-v4) — v4 architecture, Vite plugin, zero-config setup verified (HIGH confidence)
- [Tailwind GitHub Releases](https://github.com/tailwindlabs/tailwindcss/releases) — v4.2.2 confirmed latest (HIGH confidence)
- [Tailwind Play CDN Docs](https://tailwindcss.com/docs/installation/play-cdn) — "not intended for production" confirmed (HIGH confidence)
- [Vitest 4.0 release announcement](https://vitest.dev/blog/vitest-4) — v4.1.2 confirmed current (HIGH confidence)
- [Preact npm / GitHub releases](https://github.com/preactjs/preact/releases) — 10.27.2 stable, 11.0.0-beta.0 not production-ready (HIGH confidence)
- [SortableJS GitHub Releases](https://github.com/SortableJS/Sortable/releases) — v1.15.7 released February 11, 2026 (HIGH confidence)
- [SortableJS npm](https://www.npmjs.com/package/sortablejs) — 1M+ weekly downloads, last updated February 2026 (HIGH confidence)
- [DragDropTouch GitHub](https://github.com/drag-drop-touch-js/dragdroptouch) — v1.2, polyfill approach, why not used (MEDIUM confidence)
- [Dragula GitHub issues #236, #239](https://github.com/bevacqua/dragula/issues/239) — confirmed mobile touch problems, last published 5 years ago (HIGH confidence)
- [interact.js npm](https://www.npmjs.com/package/interactjs) — 1.10.27, published ~2 years ago, maintenance-only (HIGH confidence)
- [Can I Use — Drag and Drop](https://caniuse.com/dragndrop) — iOS Safari 15+ native DnD support confirmed (HIGH confidence)
- [SortableJS iOS issue #2374](https://github.com/SortableJS/Sortable/issues/2374) — iOS 17.4 onFilter regression, tracked and resolved (MEDIUM confidence)
- WebSearch: mobile-first CSS frameworks 2025 — Pico CSS, Beer CSS, Tachyons alternatives reviewed (MEDIUM confidence)
- WebSearch: localStorage best practices 2025 — JSON.parse/stringify wrapper pattern, try-catch availability check (MEDIUM confidence)
- Codebase inspection: `src/scheduler.js`, `src/storage.js`, `src/services/club.js`, `src/services/session.js`, `src/views/Settings.js`, `src/views/RoundDisplay.js`, `package.json`, `vite.config.js` — direct verification (HIGH confidence)

---
*Stack research for: Pickleball Practice Scheduler — static SPA, GitHub Pages, mobile-first, localStorage*
*Initial research: 2026-04-02 | Milestone 6 update: 2026-04-13 | Milestone 7 update: 2026-04-14*
