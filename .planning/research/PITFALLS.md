# Pitfalls Research

**Domain:** Static SPA with localStorage persistence — round-robin sports scheduler — mobile-first organizer tool
**Researched:** 2026-04-02
**Confidence:** MEDIUM-HIGH (localStorage and mobile pitfalls HIGH from authoritative sources; scheduling algorithm pitfalls MEDIUM from domain reasoning + sports scheduling literature)

---

## Critical Pitfalls

### Pitfall 1: No localStorage Schema Versioning

**What goes wrong:**
The app writes data to localStorage in one structure. A future code change (renaming a key, adding a required field, restructuring club/session data) silently reads stale data of the old shape, causing crashes, blank screens, or corrupted schedules that the organizer sees at the worst possible time — standing on the pickleball court.

**Why it happens:**
localStorage has no schema enforcement. Developers write to it freely during early development, then change the shape without any migration layer. The old data is still there and gets deserialized into an object that no longer matches what the code expects.

**How to avoid:**
Store a `schemaVersion` integer alongside all data from day one. On every app load, read the version first. If missing or older than current, run a migration function before touching anything else. Keep migrations simple (v1 → v2 functions). Design the initial schema carefully so migrations are rare.

```js
// Example minimal guard
const SCHEMA_VERSION = 1;
const stored = JSON.parse(localStorage.getItem('pb_data') ?? 'null');
if (!stored || stored.schemaVersion !== SCHEMA_VERSION) {
  migrateOrReset(stored);
}
```

**Warning signs:**
- Any code that reads `localStorage.getItem` without first checking a version field
- Changing the shape of a stored object without a migration path
- "Works on my machine but broken for anyone with old data" bug reports

**Phase to address:** Data persistence / storage layer phase (first phase that touches localStorage)

---

### Pitfall 2: Unhandled QuotaExceededError Crashes the App Silently

**What goes wrong:**
localStorage is capped at ~5 MiB per origin. A `localStorage.setItem()` call that would exceed the quota throws a `QuotaExceededError`. If uncaught, this silently fails in some browsers or crashes the JS execution context — the organizer loses session data mid-practice with no explanation.

**Why it happens:**
Developers assume localStorage writes always succeed. The error varies by browser (`err.code === 22`, `err.code === 1014` on Firefox, `err.name === "QuotaExceededError"`, `err.name === "NS_ERROR_DOM_QUOTA_REACHED"`), which makes a catch-all hard to write without looking it up.

**How to avoid:**
Wrap every `setItem` call in a try/catch. For this app specifically, data volume is tiny (a roster of ~50 members, a few sessions of matchup arrays) — nowhere near 5 MiB — so the main goal is graceful degradation, not active management. Show a clear error message if it ever fires; do not swallow silently.

```js
function safeSave(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
      // Show user-visible error; do not lose in-memory state
      showStorageError();
    }
  }
}
```

**Warning signs:**
- Any `localStorage.setItem` call without a try/catch
- No user-visible error path for failed saves

**Phase to address:** Data persistence / storage layer phase

---

### Pitfall 3: Round-Robin Candidate Generator Produces Biased Output at Small Player Counts

**What goes wrong:**
The app generates N random candidate schedules, scores them, and picks the best. With small player counts (6–10 players), the total space of unique pairings is tiny. A naive random generator — shuffling player arrays and splitting into courts — will repeatedly produce the same small set of arrangements, making the "random" search ineffective. The chosen schedule will have hidden repetition bias that the scoring function may not catch because all candidates are equally mediocre.

**Why it happens:**
For 8 players across 10 rounds, there are only 105 unique partnerships. Naive random shuffling revisits the same high-probability arrangements. The generator needs to actively avoid previously-used pairings when constructing candidates, not just score them after the fact.

**How to avoid:**
Build pairing history into the candidate construction step (not just the scoring step). When assembling a round, use a weighted random draw that penalizes recently-used partnerships during construction. This produces structurally different candidates rather than re-scoring slight variations. Also set a minimum candidate pool size (e.g., 200–500 candidates) before selecting the winner.

**Warning signs:**
- "Best" schedule still shows the same two players paired in 4 of 8 rounds
- Scoring function detects penalties but candidate pool doesn't improve score across iterations
- Player count under 8 produces noticeably worse variety than player count 10+

**Phase to address:** Scheduling algorithm phase

---

### Pitfall 4: Odd Player Count Edge Cases Not Handled at Algorithm Level

**What goes wrong:**
The round generator is built and tested with 8 or 10 players. When 7 or 9 players show up, the algorithm receives a player list that doesn't divide evenly into 4-player courts. Without explicit handling, it either crashes, leaves a player out with no explanation, or silently produces an incomplete round.

**Why it happens:**
The happy path (divisible by 4) is the obvious test case. Odd player counts require a policy decision — sit out rotation, 3-player court, ghost player — and that policy needs to be surfaced to the organizer, not silently decided by the code.

**How to avoid:**
Determine the odd-player policy in design (the PROJECT.md calls this "organizer-chosen fallback") and encode it explicitly before passing any data to the scheduling function. The algorithm should never receive an ambiguous player count; the UI layer resolves it first. For sit-out rotation specifically: pad to the next multiple of 4 with a `BYE` sentinel, then exclude BYE from display. Distribute BYE slots evenly across rounds and players.

**Warning signs:**
- Algorithm function that receives a raw player array without checking `players.length % 4`
- No test cases for 5, 6, 7, 9 player counts
- Odd-player behavior only discovered when testing with real session data

**Phase to address:** Scheduling algorithm phase — before any "happy path" testing

---

### Pitfall 5: iOS Safari Viewport and Fixed-Position Bugs Break the Organizer UI

**What goes wrong:**
iOS Safari has well-documented layout bugs that hit organizer-style apps hard. The virtual keyboard causes `position: fixed` elements (like a sticky "Next Round" button or bottom nav) to jump or overlap content. `100vh` includes the browser chrome, causing layout overflow. On iOS 26 (beta), `position: fixed` elements bounce when scroll direction changes. The organizer is standing on a court, holding a phone one-handed — any layout instability is a severe UX failure.

**Why it happens:**
iOS Safari's Layout Viewport does not resize when the keyboard appears — only the Visual Viewport shrinks. Developers test on desktop Chrome, where none of this manifests. `position: sticky; bottom: 0` also breaks when the keyboard is open.

**How to avoid:**
- Use `dvh` (dynamic viewport height) instead of `vh` for any full-height containers: `height: 100dvh`
- Prefer `position: sticky` over `position: fixed` wherever possible; for elements that must be fixed, use a `visualViewport` resize listener to manually reposition
- Test on a real iOS device (not just browser DevTools) before declaring any phase complete
- Avoid bottom-anchored inputs or action buttons that sit directly above the keyboard trigger zone

**Warning signs:**
- Any CSS using `100vh` for full-height layouts
- `position: fixed; bottom: 0` buttons in the design
- No real-device iOS testing checkpoint in the phase plan

**Phase to address:** UI/layout phase; verify in every subsequent phase that adds interactive elements

---

### Pitfall 6: Tap Targets Too Small for One-Handed Outdoor Use

**What goes wrong:**
The organizer is standing outside, holding a phone in one hand, possibly in sunlight, under time pressure. Buttons and interactive elements sized for comfortable desktop use (24–32px) are unusable in these conditions. Accidentally tapping the wrong player name or dismissing a session is a high-cost error.

**Why it happens:**
Design is done at a desk with a mouse cursor. Mobile emulation in DevTools does not simulate the imprecision of a real thumb tap, sunlight glare, or single-hand grip.

**How to avoid:**
- All tappable elements must be at minimum 48×48px touch targets (Google's material guidance; Apple HIG recommends 44×44pt)
- Player name checkboxes / toggle buttons should have hit areas that extend beyond their visual boundary (use padding, not just size)
- Destructive actions (remove player, clear session) should require confirmation or be placed far from frequently-tapped items
- Design for right-thumb primary reach zone: primary actions in bottom-right quadrant

**Warning signs:**
- Any interactive element with height under 44px
- Player list items that are icon-only or text-only without extended hit areas
- "Accidentally tapped wrong player" happening in any real-use test

**Phase to address:** UI phase; enforce as a code review checklist item for every interactive component

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Write directly to `localStorage` without an abstraction layer | Simpler early code | Any future change to persistence (IndexedDB, compression, migration) requires touching every callsite | Never — wrap in a thin storage module from day one |
| Skip schema versioning until "later" | Faster initial development | First code change that alters data shape corrupts existing user data with no recovery | Never for this app — add on first write |
| Hardcode "sit out" as the odd-player policy | Removes a decision | Organizers with different preferences have no recourse; complaints arrive after deployment | Only if you're certain the target club always does sit-out |
| Generate only 50 candidates for scheduling | Faster scheduling | Higher chance of poor variety schedules, especially at 6–8 players | Never below 200 candidates; 500 is cheap at this scale |
| Use `100vh` for full-height layouts | Works instantly in Chrome | Broken on iOS Safari (includes browser chrome in measurement) | Never — use `100dvh` instead, with `100vh` as fallback |
| Build desktop-first, then "make it mobile" at the end | Easier initial layout | Touch targets, thumb zones, and iOS bugs are retrofitted rather than designed in — double the work | Never for this project — mobile is the primary surface |

---

## Integration Gotchas

This app has no external integrations. The only "integration" is the browser storage API.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| localStorage | Assuming reads always return valid JSON | Wrap all reads in try/catch; validate shape after parse |
| localStorage | Storing objects directly without `JSON.stringify` | Always serialize; always deserialize with `JSON.parse` |
| localStorage | Assuming it's always available (private browsing mode, storage denied) | Feature-detect with a write/read/delete test on app init; degrade gracefully |
| GitHub Pages | Assuming all paths are routable (SPA deep links) | All navigation must be hash-based (`#/session`) or use a 404.html redirect trick; avoid History API routing |
| GitHub Pages | Stale deploy cache serving old JS | Filename-hash assets (if using a build step) or append cache-busting query params; document deploy delay expectations |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-running full schedule generation on every player add/remove | UI freezes for 1–3 seconds; janky on older phones | Run generation in a microtask/setTimeout; show a spinner; or debounce mid-session changes | Immediately on older Android phones with 500+ candidates |
| Storing full session history with every round's candidate pool | localStorage fills up over many sessions | Store only the winning schedule per session, not the discarded candidates | After ~20 sessions with large candidate pools |
| Synchronous JSON parse of all localStorage on every page load | Slow initial render; blocks main thread | Load and parse only what the current view needs; lazy-load session history | Not a real concern at this app's data scale, but bad habit |
| Scoring function with O(n²) pairing comparisons per candidate | Slow for large candidate pools | Precompute a pairing-frequency map and look up in O(1) per pair check | At 500+ candidates with 12+ players |

---

## Security Mistakes

This app has no authentication, no server, and stores no sensitive data. Security scope is narrow.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing club member names without user awareness | Privacy expectation mismatch; data visible to anyone with device access | Add a one-time "data stays on this device" notice on first launch; no real mitigation needed beyond that |
| Reading localStorage values and injecting into DOM without escaping | XSS if a player name contains `<script>` | Always set `textContent` or use a safe DOM creation method, never `innerHTML` with localStorage data |
| No "clear all data" option | User can't reset or transfer app to new phone | Provide explicit "Delete all data" in settings; this also serves as the migration escape hatch |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| "Generate schedule" produces one result with no alternatives shown | Organizer has no agency; if result looks wrong, they're stuck | Show top 3 alternatives as required; let organizer pick |
| Mid-session player changes silently regenerate all future rounds | Organizer loses rounds they'd mentally planned | Show a confirmation dialog: "Adding Sam will regenerate rounds 4–8. Continue?" |
| Round display shows player names in a format hard to read aloud | Organizer misreads matchups while calling out to the court | Use large text, clear Team A vs Team B layout; consider "Court 1: Alice + Bob vs Carol + Dave" format explicitly |
| No "mark round as played" step — app doesn't know which rounds are history | Mid-session player change can't determine which rounds to re-generate | Track round state: pending / in-play / completed; this is required for the mid-session add/remove feature |
| Settings for scoring weights on the main screen | Clutters the organizer's primary workflow | Settings behind a gear icon / separate screen; defaults should work without ever touching settings |
| No confirmation before clearing session | Accidental tap loses the evening's schedule | Require explicit confirmation; consider a 5-second undo toast instead of a modal |

---

## "Looks Done But Isn't" Checklist

- [ ] **Schedule generation:** Tested with 5, 6, 7, 8, 9, 10, 11, 12 players — not just the happy-path 8 — verify odd counts produce correct bye distribution
- [ ] **localStorage writes:** Every `setItem` call is wrapped in try/catch with user-visible error on failure — verify by filling storage in DevTools and triggering a save
- [ ] **Schema version:** First thing read on app load; migrations run before any other data access — verify by manually editing localStorage to an old schema shape
- [ ] **iOS layout:** Tested on a real iOS device (not just DevTools mobile emulation) with keyboard open — verify sticky buttons don't overlap content
- [ ] **Offline operation:** App fully functional with network disabled — verify in DevTools offline mode (no external CDN dependencies)
- [ ] **Mid-session player change:** Add and remove players at round 3 of 8 — verify only future rounds regenerate, past rounds are preserved, and confirmation is shown
- [ ] **Multi-club switching:** Switch clubs, verify session data does not bleed between clubs, member rosters are independent
- [ ] **Private browsing / storage denied:** App loads without crashing when localStorage is unavailable — verify in a private window

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Schema mismatch corruption | MEDIUM | Ship a migration function; users with broken data get a "data reset" prompt that clears and starts fresh; no server to assist |
| QuotaExceeded data loss | LOW | App never approaches 5 MiB; if it somehow fires, show error and offer to clear session history (the largest data category) |
| Biased scheduling output | LOW | Increase candidate pool size and add pairing-history weighting to construction; deploy new static files; no user action needed |
| iOS layout regression | MEDIUM | Identify the specific iOS/Safari version triggering the bug; apply a targeted CSS fix; test on device before re-deploying |
| Odd-player crash in production | MEDIUM | Hotfix the guard condition; if data is corrupted, localStorage reset recovers the app |
| "Mark as played" state missing | HIGH (rewrite) | If round-state tracking was skipped, adding it mid-project requires re-architecting the schedule data model; do not skip this |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| No schema versioning | Phase 1 (data model + localStorage layer) | Edit localStorage to old shape; confirm app migrates without crash |
| Unhandled QuotaExceededError | Phase 1 (data model + localStorage layer) | Fill storage in DevTools; confirm graceful error message |
| Biased candidate generation | Phase 2 (scheduling algorithm) | Run generator 100 times for 6-player count; confirm variety scores don't plateau |
| Odd player count not handled | Phase 2 (scheduling algorithm) | Test 5, 7, 9 players explicitly before any other scenario |
| iOS viewport / fixed position bugs | Phase 3 (UI layout) | Real iOS device test with keyboard open before phase sign-off |
| Tap targets too small | Phase 3 (UI layout) | Measure all interactive elements; add to code review checklist |
| Missing round-state tracking | Phase 2 (scheduling algorithm) | Verify data model has pending/completed state before building mid-session changes |
| Stale GitHub Pages cache | Deployment phase | Test deploy flow; document expected propagation delay |
| XSS via localStorage to DOM | Phase 3 (UI layout) | Audit all DOM writes; no `innerHTML` with user-controlled strings |
| Accidental session clear | Phase 3 (UI) | Verify all destructive actions have confirmation or undo |

---

## Sources

- RxDB — Using localStorage in Modern Applications: https://rxdb.info/articles/localstorage.html
- Michal Zalecki — Why using localStorage directly is a bad idea: https://michalzalecki.com/why-using-localStorage-directly-is-a-bad-idea/
- Matteo Mazzarolo — Handling localStorage errors (quota exceeded): https://mmazzarolo.com/blog/2022-06-25-local-storage-status/
- MDN — Storage quotas and eviction criteria: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- DEV Community — How to migrate Zustand local storage store to a new version: https://dev.to/diballesteros/how-to-migrate-zustand-local-storage-store-to-a-new-version-njp
- Diamond Scheduler — Optimizing Game Scheduling With Round-Robin Algorithms: https://cactusware.com/blog/round-robin-scheduling-algorithms
- Round-Robin Sports Scheduling survey (CMU): https://mat.tepper.cmu.edu/trick/survey.pdf
- Pickleheads — How To Run a Pickleball Round Robin: https://www.pickleheads.com/guides/pickleball-round-robin
- DEV Community — Mobile-First UX: Designing for Thumbs, Not Just Screens: https://dev.to/prateekshaweb/mobile-first-ux-designing-for-thumbs-not-just-screens-339m
- Medium — Fixing the Safari Mobile Resizing Bug: https://medium.com/@krutilin.sergey.ks/fixing-the-safari-mobile-resizing-bug-a-developers-guide-6568f933cde0
- Medium — Fixing the Double-Tap and Hover State Issue in iOS Safari: https://medium.com/@kristiantolleshaugmrch/fixing-the-double-tap-issue-in-ios-safari-with-javascript-4e72a18a1feb
- Rich Harris — Stuff I wish I'd known sooner about service workers: https://gist.github.com/Rich-Harris/fd6c3c73e6e707e312d7c5d7d0f3b2f9
- BrightHR Engineering — Designing for thumbs: https://engineering.brighthr.com/blog-post/designing-for-thumbs

---
*Pitfalls research for: Static pickleball practice scheduler SPA*
*Researched: 2026-04-02*

---
---

# Milestone 8 Pitfalls: Dark Mode, Test Coverage, and Help Content

**Domain:** Adding dark mode, Vitest coverage improvements, and plain-language help to an existing vanilla JS / Tailwind v4 / Vitest / happy-dom mobile SPA
**Researched:** 2026-04-14
**Confidence:** HIGH (dark mode — Tailwind v4 docs + direct code inspection), MEDIUM (happy-dom coverage gaps — community issues + official docs), HIGH (help content — direct code audit + UX literature)

---

## Critical Pitfalls

### Pitfall M8-1: Flash of Wrong Theme on Load (FOUC)

**What goes wrong:**
The page renders in light mode for a visible instant before JavaScript loads and applies the `dark` class to `<html>`. On OLED mobile screens at evening pickleball sessions — exactly when dark mode matters — this flash is jarring and signals a broken implementation.

**Why it happens:**
`src/main.js` is loaded via `<script type="module">`, which is always deferred. Module scripts execute after the document is parsed and initial paint occurs. Any theme initialization logic placed inside `main.js`, `initRouter()`, or a view's `mount()` function runs too late — the `bg-gray-50` body class has already painted white.

**How to avoid:**
Place a tiny blocking inline `<script>` in `<head>` — before any stylesheet link — that reads `localStorage.getItem('theme')` and sets the `dark` class on `<html>` synchronously:

```html
<script>
  (function() {
    var t = localStorage.getItem('theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  })();
</script>
```

This script must be inline (not `src=`), because external scripts require a network round-trip that creates its own delay even if not deferred.

**Warning signs:**
- White flash visible on hard reload when OS is in dark mode
- Flash visible when toggling from light to dark and then reloading the page
- Dark mode toggle works mid-session but not after a fresh load

**Phase to address:** Dark mode implementation — very first task before any component markup changes.

---

### Pitfall M8-2: Tailwind v4 Requires @custom-variant for Class-Based Dark Mode

**What goes wrong:**
Developer adds `dark:bg-gray-800` to every view, adds the JS toggle, verifies `.dark` appears on `<html>` in DevTools — and nothing changes visually. The `dark:` utilities do nothing when driven by a class toggle.

**Why it happens:**
Tailwind v4 removed `darkMode: 'class'` from `tailwind.config.js` (which no longer exists). The equivalent must be declared in `style.css` using the new CSS-first API. Without it, Tailwind generates only `@media (prefers-color-scheme: dark)` rules. The `.dark` class is on the DOM element but no CSS rule targets it.

**How to avoid:**
Add this line to `style.css` immediately after `@import "tailwindcss"`:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

This is a one-line change but it must happen before writing a single `dark:` utility anywhere in the codebase.

**Warning signs:**
- `dark:bg-gray-800` on a div; adding `.dark` to `<html>` via DevTools does nothing
- Dark mode only activates by changing OS system preference
- DevTools Elements panel shows no matching CSS rule for any `dark:` utility

**Phase to address:** Dark mode implementation — first change to `style.css`, before any HTML edits.

---

### Pitfall M8-3: Hardcoded Hex Colors in style.css Bypass Dark Mode Entirely

**What goes wrong:**
The existing `style.css` contains 11+ hardcoded hex color values for zone-based player chips, SortableJS ghost states, and swap target highlights. None of these respond to `dark:` Tailwind utilities or to the `.dark` class on `<html>`. In dark mode, blue-team chips remain `#EFF6FF` — a near-white background — on top of a dark card, making them visually pop in the wrong direction. The drag ghost border stays `#111827` (fine), but the orange chip zone (`#FFF7ED`, `#FED7AA`) and bench zone (`#E5E7EB`) will look broken.

**Why it happens:**
These styles were written before dark mode was a requirement, using raw hex because Tailwind utility classes cannot be used inside `[data-zone$="-a"] [data-player-id]` attribute-descendant selectors. There was no reason to use CSS variables at the time.

**How to avoid:**
Convert each hex block to a CSS custom property pair defined under `:root { }` and `.dark { }`:

```css
:root {
  --chip-a-bg: #EFF6FF;
  --chip-a-border: #BFDBFE;
  --chip-a-text: #1E40AF;
}
.dark {
  --chip-a-bg: #1e3a5f;
  --chip-a-border: #3b82f6;
  --chip-a-text: #93C5FD;
}
[data-zone$="-a"] [data-player-id] {
  background-color: var(--chip-a-bg);
  border-color: var(--chip-a-border);
  color: var(--chip-a-text);
}
```

Repeat for zone `-b` (orange), bench (gray), and the SortableJS swap ring.

**Warning signs:**
- Enabling dark mode shows bright blue or orange player chips unchanged against a dark card background
- Running `grep -n '#[0-9A-Fa-f]' src/style.css` returns any result not addressed with a `.dark` counterpart

**Phase to address:** Dark mode implementation — audit style.css before touching any view markup.

---

### Pitfall M8-4: index.html Shell Has No Dark Mode Styles

**What goes wrong:**
Dark mode utilities are added to all the view components but `index.html`'s static markup — `<body class="bg-gray-50 text-gray-900">` and the bottom `<nav class="bg-white/90 border-gray-200">` — has no `dark:` variants. The nav bar stays white over a dark page. The body background doesn't match the card surfaces.

**Why it happens:**
The bottom nav and body are defined once in `index.html` and are never re-rendered by the router. Developers focus dark mode work on view components returned from `mount()` and forget the persistent shell.

**How to avoid:**
Treat `index.html` as a first-class dark mode target. Checklist of elements that need `dark:` variants: `<body>` background and text, `<nav>` background, border, and backdrop, each `<a>` element's active/inactive color classes, and any SVG stroke colors that reference Tailwind color classes.

**Warning signs:**
- Views look correct in dark mode but the nav bar is blindingly white at the bottom
- Body background is a different dark value than the card surfaces, creating a mismatched stripe effect

**Phase to address:** Dark mode implementation — add `index.html` to the audit checklist alongside views.

---

### Pitfall M8-5: window.matchMedia Throws in happy-dom Tests

**What goes wrong:**
Any test that imports a module which calls `window.matchMedia('(prefers-color-scheme: dark)')` at module scope or during initialization throws `TypeError: window.matchMedia is not a function`. This causes unrelated test failures and hides real bugs behind a test infrastructure error.

**Why it happens:**
happy-dom has partial `matchMedia` support added in v9.19.0, but the implementation of `prefers-color-scheme` matching is incomplete and may not be reliable without explicit configuration. The existing `test-setup.js` already demonstrates this pattern: it patches `localStorage` because happy-dom's default is a no-op. The same treatment is needed for `matchMedia`.

**How to avoid:**
Add a `window.matchMedia` mock to `src/test-setup.js` alongside the existing localStorage patch:

```js
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
```

For tests that simulate dark system preference, override `matches: true` locally in the test body.

**Warning signs:**
- `TypeError: window.matchMedia is not a function` in any test run after dark mode logic is added
- Tests pass locally on a macOS dark-mode system but fail in CI where system preference is light

**Phase to address:** Test coverage — add to `test-setup.js` at the same time as dark mode theme logic tests are written.

---

### Pitfall M8-6: Coverage Report Hides Untested Files

**What goes wrong:**
`vitest --coverage` reports 75%+ overall coverage, which looks healthy. But `Help.js`, `Settings.js`, and any newly added dark mode module are never imported by any test file, so they contribute 0 lines to the denominator and don't appear in the report at all. The number is meaningless.

**Why it happens:**
Vitest's default coverage behavior (both v8 and Istanbul providers) only instruments files that are imported during the test run. Files with no test coverage are simply absent from the report rather than shown at 0%.

**How to avoid:**
Add coverage configuration to `vite.config.js` before running the initial coverage audit:

```js
test: {
  coverage: {
    provider: 'v8',
    all: true,
    include: ['src/**/*.js'],
    exclude: ['src/test-setup.js'],
  },
}
```

With `all: true`, files with zero tests appear in the report at 0%, making gaps immediately visible.

**Warning signs:**
- Coverage summary shows a clean percentage but you know a view file has never been tested
- Running `vitest --coverage` produces no row for `Help.js` or `Settings.js`

**Phase to address:** Test coverage audit phase — configure before interpreting any coverage number.

---

### Pitfall M8-7: Help Screen Describes UI That No Longer Matches the App

**What goes wrong:**
The new help content references button labels, flows, or features that changed in earlier milestones. For example, the current `Help.js` describes "Tap Alternatives" — if that label changed in the MatchEditor during Milestone 13, the help text sends organizers looking for a button that doesn't exist. Even subtle drift (a flow that requires one more tap than described) erodes trust.

**Why it happens:**
Help screens are written once early in a project and rarely updated as the UI evolves. A rewrite done from memory of the intended design — rather than the shipped design — reproduces the same staleness in fresh prose.

**How to avoid:**
Before writing any new help content, walk through the live app on a real mobile device (or mobile-emulation mode) and record every visible button label, section heading, and interactive step. Use those exact strings in the help text. Treat the help rewrite as a documentation task that requires a test-pass against the running app, not a creative writing exercise.

**Warning signs:**
- Any help section that refers to a button name not present in the current view source files
- A described workflow that requires more or fewer taps than the current app requires

**Phase to address:** Help content rewrite — start with a live-app audit pass, not a blank document.

---

### Pitfall M8-8: Help Content Retains Developer Vocabulary for Non-Technical Organizers

**What goes wrong:**
The rewritten help uses terms like "generate," "algorithm," "session," "fallback strategy," "simulation," or "penalty weights." The current `Help.js` already contains "simulations," "strategy toggle," and "optimized." Non-technical pickleball organizers — the sole audience — do not know what these mean in context and will not connect them to what they see on screen.

**Why it happens:**
Developers write from the codebase's conceptual model, not the organizer's mental model. "The scheduler runs hundreds of simulations" is technically accurate and feels natural to a developer. It is meaningless to someone who just wants to know who plays who.

**How to avoid:**
Apply a strict plain-language filter after drafting. Read each sentence and ask: "would the person running tonight's pickleball practice understand this without explanation?" Replace:
- "Generate" with "Create" or "Set up"
- "Session" with "Practice" (the organizer's own word for it)
- "Fallback strategy" with "What to do when someone's left over"
- "Penalty weights / scoring weights" with "Fairness settings"
- "Simulations / candidates" — remove entirely; the organizer doesn't need to know how the math works

**Warning signs:**
- Any sentence in the help that uses a word ending in "-ation" as a concept the user must understand
- Terms that appear verbatim in variable names or function names in the codebase
- The current "v1.0" version number in the footer — remove it; it will always be stale

**Phase to address:** Help content rewrite — budget a dedicated jargon-elimination pass after the first draft.

---

### Pitfall M8-9: Dark Mode Preference Lost After Service Worker Update

**What goes wrong:**
After a service worker update triggers `window.location.reload()`, the page reloads cleanly. If the dark mode init logic was ever moved from an inline `<head>` script to an external JS file, the SW may serve a stale cached version of that file — causing the FOUC to return for one page load after each update.

**Why it happens:**
The update flow in `main.js` posts `SKIP_WAITING`, the new SW takes over, and `controllerchange` triggers a reload. The new SW serves the updated `index.html` correctly, but external scripts are cached separately and may lag. Inline scripts are part of the HTML document itself — they update atomically with `index.html`.

**How to avoid:**
Keep the dark mode initialization script inline in `<head>` as a stated constraint, never in an external file. This is the same reason the existing update banner is built dynamically in `main.js` rather than loaded from a template.

**Warning signs:**
- Any PR that extracts the head init script into a separate `.js` file
- FOUC reappears for exactly one load after a SW update, then goes away

**Phase to address:** Dark mode implementation — state "keep inline" as an explicit constraint in the implementation plan.

---

## Technical Debt Patterns (Milestone 8)

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Apply `dark:` only to card elements; skip body and nav | Faster implementation | Nav bar stays white in dark mode — immediately visible at runtime | Never |
| Use `prefers-color-scheme` media only, no toggle | No JS, no FOUC | Organizer cannot override OS preference; useless if phone is always in light mode | Only for a throw-away proof of concept |
| Write dark mode tests that only assert class names | Tests pass quickly | Wrong dark colors pass; no verification of actual visual correctness | Acceptable if paired with a manual visual review session |
| Skip `coverage.all: true` | Simpler config | Coverage looks healthy; untested files are invisible | Never — configure before reporting any coverage number |
| Rewrite Help from memory without auditing the live app | Faster writing | Produces stale help text that directs organizers to missing buttons | Never |
| Leave "v1.0" in the Help footer | No extra work | Version becomes wrong immediately and may confuse users | Never — remove from user-visible content |

---

## Integration Gotchas (Milestone 8)

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Tailwind v4 + manual dark class toggle | Forgetting `@custom-variant dark` in style.css | Add `@custom-variant dark (&:where(.dark, .dark *))` as first thing after `@import "tailwindcss"` |
| Dark mode + hash router SPA | Putting theme init in router.js or a mount() function | Theme init belongs in an inline `<head>` script only — before any CSS paint |
| Dark mode + SortableJS styles | Sortable ghost/swap use hardcoded hex in style.css | Audit all `.sortable-*` rules; convert to CSS variables with `.dark` overrides |
| happy-dom + matchMedia | Calling `window.matchMedia` in module scope with no mock | Mock matchMedia in test-setup.js before any importing module calls it |
| Vitest coverage + new/untested files | Assuming the coverage report is complete | Add `coverage.all: true` and `coverage.include` to vite.config.js |
| Service worker + dark mode init script | Extracting inline script to an external JS file | Keep inline in `<head>`; external scripts are SW-cached separately |
| Help back button + hash router | `window.history.back()` from a deep-linked `#/help` URL | Verify behavior when user arrives at `#/help` directly (e.g., from a shared link), not just via in-app navigation |

---

## "Looks Done But Isn't" Checklist (Milestone 8)

- [ ] **Dark mode FOUC:** Hard-reload the page with OS in dark mode — verify no white flash before dark styles apply
- [ ] **style.css hex values:** Run `grep -n '#[0-9A-Fa-f]' src/style.css` — every result must have a `.dark` CSS variable counterpart
- [ ] **Nav bar dark mode:** Confirm bottom nav background, border, icon colors, and active state all change in dark mode
- [ ] **Body background:** Confirm `<body>` background matches card dark backgrounds (no light-on-dark stripe)
- [ ] **Toggle persistence:** Set to dark, close tab, reopen — should open in dark mode without flash
- [ ] **System preference follow:** Toggle OS dark mode while app is open — app should follow if no manual override is set
- [ ] **Coverage all files visible:** Run `vitest --coverage` — verify `Help.js` and `Settings.js` appear in the coverage table
- [ ] **matchMedia mock active:** Confirm no `matchMedia is not a function` TypeError in test output after dark mode logic is added
- [ ] **Help button labels accurate:** Every button name mentioned in help text exists verbatim in the current view source files
- [ ] **Help jargon eliminated:** Read help text aloud to a non-developer — flag any word that requires technical context
- [ ] **Help version number removed:** Footer "v1.0" label is gone from the Help view

---

## Recovery Strategies (Milestone 8)

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| FOUC discovered after dark mode ships | LOW | Add 3-line inline script to index.html `<head>`; redeploy |
| Hardcoded hex not dark-aware | MEDIUM | Audit style.css, convert to CSS variables, test each zone color in dark mode; redeploy |
| @custom-variant missing; dark: classes do nothing | LOW | Add one line to style.css; rebuild and redeploy |
| Coverage report missing files | LOW | Add `coverage.all: true` to vite.config.js |
| matchMedia throws in tests | LOW | Add mock to test-setup.js |
| Help text references non-existent buttons | LOW | Re-audit live app; rewrite affected sections |

---

## Pitfall-to-Phase Mapping (Milestone 8)

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| FOUC (M8-1) | Dark mode — before any component work | Hard reload with OS in dark mode; no white flash |
| Missing @custom-variant (M8-2) | Dark mode — first line added to style.css | `dark:bg-gray-800` responds to `.dark` on `<html>` in DevTools |
| Hardcoded hex bypasses dark mode (M8-3) | Dark mode — style.css audit | Grep for hex literals; visual check of chip colors in dark mode |
| Shell missing dark styles (M8-4) | Dark mode — index.html pass | Nav bar and body correct in dark mode |
| matchMedia not mocked (M8-5) | Test coverage — update test-setup.js | No TypeError in test output |
| Coverage hiding untested files (M8-6) | Test coverage — configure before first report | Help.js and Settings.js appear in coverage table |
| Help describes stale UI (M8-7) | Help rewrite — live-app audit pass | Every button name in help matches current view source |
| Help jargon (M8-8) | Help rewrite — review pass after first draft | Plain-language read-aloud passes |
| SW caching inline script (M8-9) | Dark mode — stated as implementation constraint | Init script remains inline in index.html |

---

## Sources (Milestone 8)

- [Tailwind CSS v4 Dark Mode — official docs](https://tailwindcss.com/docs/dark-mode) — HIGH confidence
- [Tailwind v4 dark variant doesn't apply properly — GitHub issue #16068](https://github.com/tailwindlabs/tailwindcss/issues/16068) — HIGH confidence (maintainer confirmed behavior)
- [How to Fix Dark Classes Not Applying in Tailwind CSS v4](https://www.sujalvanjare.com/blog/fix-dark-class-not-applying-tailwind-css-v4) — MEDIUM confidence
- [Dark and light themes with Tailwind: common pitfalls](https://www.dimitribourreau.dev/en/blog/themes-sombres-et-clairs-tailwind) — MEDIUM confidence
- [MatchMedia.matches support in happy-dom — GitHub issue #921](https://github.com/capricorn86/happy-dom/issues/921) — HIGH confidence
- [Fix "window.matchMedia is not a function" in Vitest](https://rebeccamdeprey.com/blog/mock-windowmatchmedia-in-vitest) — MEDIUM confidence
- [Vitest Coverage — all: true config](https://vitest.dev/guide/coverage) — official, HIGH confidence
- [Basics of Plain Language in Technical Documentation](https://clickhelp.com/clickhelp-technical-writing-blog/basics-of-plain-language-in-technical-documentation/) — MEDIUM confidence
- [NN/G UX Writing Study Guide](https://www.nngroup.com/articles/ux-writing-study-guide/) — HIGH confidence
- Project source inspection: `src/style.css`, `index.html`, `src/main.js`, `src/router.js`, `src/test-setup.js`, `src/views/Help.js` — HIGH confidence (direct code audit)

---
*Milestone 8 pitfalls addendum for: Dark mode, test coverage, help content (vanilla JS / Tailwind v4 / Vitest / happy-dom)*
*Researched: 2026-04-14*
