# Feature Research

**Domain:** Polish & quality pass on a mobile-first vanilla JS PWA (pickleball scheduler)
**Researched:** 2026-04-14
**Confidence:** HIGH

---

## Feature Area 1: Dark Mode

The app runs at evening courts under artificial lighting. Users are non-technical organizers
on phones. The existing stack is Tailwind CSS v4 + Vite + vanilla JS, with `bg-gray-50` and
hardcoded light-mode colors throughout `index.html` and all views.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| System-preference auto-detection | Any modern phone app respects `prefers-color-scheme`; absence feels broken when OS is in dark mode | LOW | Tailwind v4 default `dark:` variant already uses `@media (prefers-color-scheme: dark)` — no config needed for the media strategy |
| Legible text + sufficient contrast in dark mode | WCAG AA (4.5:1) minimum; eye strain at evening courts is the stated use case | MEDIUM | All hardcoded `bg-gray-50`, `bg-white`, zone chip colors, drag state colors in `style.css` must get `dark:` counterparts |
| No flash of wrong theme on load | Phones hot-reload PWAs from cache; a white flash before dark mode kicks in destroys trust | LOW | Inline `<script>` in `<head>` of `index.html` reads localStorage and sets class before first paint |
| Preference persisted across sessions | If user switches theme, it must survive app close and reopen | LOW | `localStorage.setItem('theme', value)` — already used elsewhere in the app |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Manual override toggle in Settings | System preference is sometimes wrong (gym with mixed lighting); organizers want control | LOW | Toggle in existing Settings view; three states: auto / light / dark |
| Smooth transition between modes | Prevents jarring flash when switching manually | LOW | `transition-colors duration-200` on `<body>` or a single CSS `transition: background-color 0.2s` rule |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full CSS custom property theming system | "The right way to do theming" | 3-screen app with ~17 JS files — a design token system adds abstraction with zero user benefit | Tailwind `dark:` utility classes on each element; 1-2 hours of work |
| Per-screen theme customization | "Personalization" | No user need; adds confusion for a single-organizer utility app | Single global theme, persisted |
| Animated sun/moon icon toggle | Looks polished | Medium effort for near-zero UX improvement on a utility tool | Simple text label "Dark / Light / Auto" in Settings |
| Separate dark-mode brand refresh | "Good dark design requires rethinking the palette" | Out of scope for a polish pass; risks regressions in drag state colors and zone chip backgrounds | Invert grays + adjust zone chip backgrounds only |

### Implementation Notes

Tailwind v4 has two dark mode strategies:

1. **Media-only (default):** `dark:` classes respond to OS preference automatically with no configuration. Correct for the "auto" behavior.
2. **Class strategy:** Add `@custom-variant dark (&:where(.dark, .dark *));` to `style.css`. Toggle `<html class="dark">` from JS. Required for the manual override.

Recommended for this app: use the **class strategy** so the Settings toggle works, but initialize from `localStorage` with a `prefers-color-scheme` fallback. The anti-flash script belongs as the first child of `<head>` in `index.html`:

```js
const saved = localStorage.getItem('theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
if (saved === 'dark' || (!saved && prefersDark)) {
  document.documentElement.classList.add('dark')
}
```

Files that will need `dark:` classes added or CSS dark rules updated:
- `index.html` — `<body>` background, `<nav>` bottom bar, nav link colors
- `src/style.css` — zone chip colors (`[data-zone]` attribute selectors), drag states, `body` background
- Every view in `src/views/` — `bg-white`, `bg-gray-50`, `text-gray-900`, `border-gray-100`, card backgrounds
- `src/views/Settings.js` — add theme toggle UI

---

## Feature Area 2: Test Coverage Audit

The project currently has 6 test files:
- `src/storage.test.js`
- `src/scheduler.test.js`
- `src/router.test.js`
- `src/services/session.test.js`
- `src/views/MatchEditor.test.js`
- `src/views/RoundDisplay.test.js`

Source files with no test coverage at all:
- `src/services/club.js`
- `src/services/haptics.js`
- `src/utils/html.js`
- `src/views/ClubManager.js`
- `src/views/Help.js`
- `src/views/MemberEditor.js`
- `src/views/SessionSetup.js`
- `src/views/Settings.js`
- `src/main.js`
- `src/counter.js`

No coverage configuration exists in `vite.config.js`. `@vitest/coverage-v8` is not installed.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Coverage report enabled and runnable | Cannot audit what you cannot measure; the baseline report is the prerequisite for the entire coverage milestone | LOW | Install `@vitest/coverage-v8`; add `coverage` block to `vite.config.js` |
| Service layer covered — club.js | Business logic — bugs here corrupt organizer data in localStorage; the largest untested service gap | LOW-MEDIUM | `club.js` is likely simple CRUD wrappers around `StorageAdapter`; straightforward to test |
| Coverage for utils/html.js | Pure utility functions; easy to test; removes a blind spot with no DOM dependency | LOW | Template literal helpers; pure functions |
| Coverage thresholds enforced | Without thresholds the report is decorative; threshold enforcement makes coverage a quality gate | LOW | `thresholds: { lines: 80, functions: 80 }` in vitest config |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Mount/unmount smoke tests for untested views | Catches broken view initialization early without testing implementation details | LOW | Pattern is already established in `MatchEditor.test.js` and `RoundDisplay.test.js` |
| Coverage for the dark mode toggle (Settings.js) | The new feature being added this milestone should have test coverage when it ships | LOW | Test that toggle writes to localStorage and sets `<html>` class |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| 100% line coverage target | "If it's worth shipping it's worth testing" | Chasing 100% on DOM-heavy view files produces brittle tests of implementation details, not behavior; makes future refactors painful | 80% lines/functions aggregate; 90%+ for service layer only |
| Istanbul provider | Istanbul is historically more accurate for some edge cases | Vitest v4 uses AST-based coverage remapping for v8 since v3.2 — effectively identical accuracy, no extra install | Stay with v8 (already the default) |
| Tests for main.js | Completeness | `main.js` is app bootstrap wiring; testing it requires mocking the entire DOM and router, returns no behavior signal | Exclude from coverage with the `exclude` config list |
| Snapshot tests for view HTML output | "Prevent regressions" | Snapshots break on every `dark:` class addition during this milestone, creating churn | Behavior tests instead: does clicking X call Y? |

### Implementation Notes

Vitest v4 is already installed. Coverage requires only:

```bash
npm install -D @vitest/coverage-v8
```

Then extend the existing `test` block in `vite.config.js`:

```js
test: {
  environment: 'happy-dom',
  globals: true,
  setupFiles: ['./src/test-setup.js'],
  coverage: {
    provider: 'v8',
    include: ['src/**/*.js'],
    exclude: ['src/test-setup.js', 'src/main.js', 'src/counter.js'],
    thresholds: { lines: 80, functions: 80 }
  }
}
```

Priority order for new tests in Milestone 8:
1. `src/services/club.js` — pure service logic, no DOM dependency
2. `src/utils/html.js` — pure functions
3. `src/views/Settings.js` — mount/unmount smoke + dark mode toggle behavior
4. `src/views/ClubManager.js` — mount/unmount smoke + key interactions
5. `src/views/SessionSetup.js` — mount/unmount smoke
6. `src/views/MemberEditor.js` — mount/unmount smoke

View tests should follow the established pattern from `MatchEditor.test.js`: mock `router.js`, mock `haptics.js`, mount into a created `div`, assert DOM state changes.

---

## Feature Area 3: User-Facing Documentation

Two surfaces: (1) the in-app Help screen (`src/views/Help.js`), and (2) the GitHub README.

Current Help screen issues identified:
- Footer says "v1.0" — incorrect, app has no version number exposed to users
- References "Alternatives" feature but does not mention drag-and-drop (added in Milestone 13)
- Explains Settings with implementation jargon ("hundreds of simulations", "Fair Sitting Out", "Repeated Partners")
- No mention of dark mode (being added in Milestone 8)
- Tone and vocabulary assume technical readers

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Help content reflects current feature set | Stale instructions that contradict what the user sees destroy trust instantly | LOW | Prose rewrite; no code architecture changes required |
| Plain language throughout | Users are non-technical organizers; "penalty weights" and "candidate count" are meaningless to them | LOW | Rule: no word that would not appear in a sports club newsletter |
| Step-by-step flow mirrors actual app flow | Help should match the three-tab structure (Clubs / Session / Settings) | LOW | Restructure sections to match tab order; currently section 4 describes Settings before the user would encounter it |
| README explains how to open the app on a phone | A non-developer organizer who receives a link via text needs "open this link, tap Add to Home Screen" | LOW | README rewrite is a documentation task, not a code task |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| FAQ-style section for common confusion points | Odd player counts, "why did my matchups change?", "I accidentally marked a round played" are predictable questions | LOW | Short Q&A format is faster to scan than paragraphs for someone in a hurry at a court |
| Dark mode mentioned in Help | Once the toggle ships, users who discover dark mode accidentally may not know it is intentional | LOW | One sentence in the Settings section of Help |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Interactive tutorial or onboarding overlay | "Modern UX" | 3-screen utility app; organizers open it at a court and need speed, not a tour; overlays block the UI when the organizer is trying to start a session | Good plain-language labels in the UI itself; Help accessible from Settings |
| Video walkthrough | "Easier than reading" | Hosting, accessibility, maintenance burden — every feature change requires re-recording | Plain prose with short numbered steps |
| Searchable help | Feels complete | 4-section document under 300 words; nobody searches content this short | Section headers for visual scanning |
| In-app feedback form | "Support channel" | No backend; this is a local-only static app | Point README to GitHub Issues |
| Versioned help changelog in Help screen | Changelog | Organizers do not think in versions; they care what the button does now | Remove version footer; keep Help evergreen; changelog belongs in GitHub releases |

### Implementation Notes

The Help screen is a pure HTML string in a `mount()` function — the rewrite is copy/text only, no structural code change. No dependencies on dark mode or test coverage work.

README audience profile: "non-developer pickleball organizer who received a link via text message." Target reading level: 8th grade. Suggested structure:
1. What it does (one sentence)
2. How to open on your phone (Add to Home Screen steps)
3. Quick start (3 steps)
4. What the three tabs do
5. 2-3 FAQs for common confusion

Help screen should be the last Milestone 8 task — it should describe features as they exist at completion, including the dark mode toggle.

---

## Feature Dependencies

```
Dark mode (system-preference auto)
    └──requires──> @custom-variant dark in style.css
    └──requires──> inline <script> in index.html (before first paint)

Dark mode (manual toggle in Settings)
    └──requires──> dark mode (system-preference auto) working end-to-end
    └──requires──> Settings.js UI change
    └──enhances──> Help screen (the toggle should be documented once it exists)

Test coverage tooling
    └──requires──> @vitest/coverage-v8 installed

Tests for Settings.js dark mode toggle
    └──requires──> dark mode toggle implemented first

Help screen rewrite
    └──independent of coverage work (parallel)
    └──should happen AFTER dark mode ships (documents the new toggle)
```

### Dependency Notes

- **Manual toggle requires base dark mode first:** Wire the full `dark:` class implementation across the app before connecting the Settings toggle.
- **Settings.js tests depend on the toggle existing:** Write the toggle, then test it.
- **Help rewrite is the last task:** It documents the finished state of this milestone, including dark mode.
- **Coverage tooling is fully independent:** Can begin in parallel with dark mode work on day one.

---

## Milestone 8 Scope

### Must ship

- [x] Dark mode: system-preference auto (table stakes)
- [x] Dark mode: manual toggle in Settings with three states (auto / light / dark)
- [x] No flash of wrong theme on load (inline script in `<head>`)
- [x] Dark mode preference persisted to localStorage
- [x] Coverage tooling enabled (`@vitest/coverage-v8` installed, config in `vite.config.js`)
- [x] Tests for `src/services/club.js`
- [x] Tests for `src/utils/html.js`
- [x] Smoke tests for `src/views/Settings.js` including dark mode toggle behavior
- [x] Help screen prose rewrite (plain language, current feature set, mentions dark mode toggle)
- [x] README rewrite (non-developer organizer audience)

### Defer from Milestone 8

- Coverage thresholds enforced as a CI gate — set them in config for local use; CI enforcement is a follow-on
- Full smoke test suite for all untested views (ClubManager, SessionSetup, MemberEditor) — do club.js and html.js first; view smoke tests can be incremental
- FAQ section in Help — add if rewrite is done early; otherwise Milestone 9
- Dark mode transition animation — add if there is time; otherwise Milestone 9

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Dark mode (system auto) | HIGH — core use case is evening courts | LOW | P1 |
| No flash of wrong theme on load | HIGH — trust and polish | LOW | P1 |
| Help screen rewrite | HIGH — non-technical users need this | LOW | P1 |
| README rewrite | MEDIUM — only matters when sharing the link | LOW | P1 |
| Coverage tooling setup | MEDIUM — developer quality gate | LOW | P1 |
| Manual dark mode toggle in Settings | MEDIUM — power user convenience | LOW | P1 |
| Tests for club.js service | MEDIUM — largest untested service gap | LOW | P1 |
| Tests for html.js utility | LOW — pure functions, low risk | LOW | P2 |
| Smoke tests for Settings.js dark toggle | MEDIUM — new feature should ship with tests | LOW | P2 |
| View smoke tests (ClubManager, SessionSetup, MemberEditor) | LOW — behavior tested implicitly in app | LOW | P2 |
| Coverage thresholds enforced in config | LOW — governance improvement | LOW | P2 |
| FAQ section in Help | LOW — organizers rarely open help | LOW | P3 |
| Dark mode transition animation | LOW — cosmetic | LOW | P3 |

**Priority key:**
- P1: Must ship in Milestone 8
- P2: Should ship; add when P1 items complete
- P3: Defer to Milestone 9 or later

---

## Sources

- Tailwind CSS v4 dark mode documentation: https://tailwindcss.com/docs/dark-mode — HIGH confidence (official)
- Vitest coverage configuration: https://vitest.dev/guide/coverage — HIGH confidence (official)
- Vitest coverage thresholds API: https://github.com/vitest-dev/vitest/blob/main/docs/config/coverage.md — HIGH confidence (official)
- Dark mode flash prevention pattern: https://whitep4nth3r.com/blog/best-light-dark-mode-theme-toggle-javascript/ — MEDIUM confidence (community; pattern matches official Tailwind docs example)
- Mobile help screen UX patterns: https://ixdf.org/literature/article/help-i-need-some-help-not-just-any-help-help-in-mobile-applications — MEDIUM confidence

---
*Feature research for: Milestone 8 — Polish & Quality (dark mode, test coverage, documentation)*
*Researched: 2026-04-14*
