# Phase 16 Context: Dark Mode Visuals & Toggle

**Phase goal:** Every element in the app is legible and correctly styled in dark mode, and the organizer can override the theme from Settings
**Requirements:** DARK-03, DARK-05, DARK-06

---

## Canonical Refs

- `.planning/ROADMAP.md` — Phase 16 goal and success criteria
- `.planning/REQUIREMENTS.md` — DARK-03, DARK-05, DARK-06 definitions
- `.planning/phases/15-dark-mode-foundation/15-CONTEXT.md` — ThemeService API decisions, storage key, toggle mechanism
- `src/services/theme.js` — ThemeService (setMode, getMode, applyTheme, init)
- `src/style.css` — Zone chip CSS rules + SortableJS drag state rules (hardcoded hex — dark overrides go here)
- `src/views/Settings.js` — Where the Appearance card and theme toggle will be added
- `src/views/RoundDisplay.js` — Round cards, sitting-out chips, error states
- `src/views/MatchEditor.js` — Zone chips, drag zones, bench, toast, error labels
- `src/views/SessionSetup.js` — Attendee list, form inputs
- `src/views/ClubManager.js` — Club list, empty states
- `src/views/MemberEditor.js` — Member list
- `src/views/Help.js` — Help text

---

## Decisions

### 1. Zone chip dark palette: same-family inverted lightness

The zone chip CSS rules in `src/style.css` use hardcoded hex values and must have dark overrides added via CSS `[data-zone...] .dark &` selectors (or equivalent `@custom-variant dark` approach). The chosen palette:

**A-side (blue) dark:**
- `background-color: #1e3a5f` (blue-900-ish)
- `color: #93c5fd` (blue-300)
- `border-color: #1d4ed8` (blue-700)

**B-side (orange) dark:**
- `background-color: #431407` (orange-950)
- `color: #fdba74` (orange-300)
- `border-color: #c2410c` (orange-700)

**Bench dark:**
- `background-color: #374151` (gray-700)
- `color: #d1d5db` (gray-300)
- `border-color: #4b5563` (gray-600)

Teams must remain visually distinct (blue vs orange) in dark mode — same hue family, darker backgrounds, lighter text.

### 2. SortableJS drag state dark overrides

Current `.sortable-ghost` uses `border: 3px dashed #111827` (near-black) — invisible on dark backgrounds. Must add dark override to make ghost border visible. Claude's discretion on exact color (a light gray like `#9ca3af` or white `#f9fafb` are reasonable choices). Same for `.sortable-swap` — the blue ring should remain visible.

### 3. Settings theme toggle: 3-button segmented control

The Appearance card in Settings contains a 3-button segmented control: **Auto | Light | Dark**.

- Active state: blue background (`bg-blue-600`), white text — matching existing primary button style
- Inactive state: gray background (`bg-gray-100`), gray text — matching existing secondary/muted style
- Calling `ThemeService.setMode(mode)` on tap — takes effect immediately, no page reload
- Current mode read from `ThemeService.getMode()` on mount to highlight the right button

### 4. Appearance section placement: top of Settings page

The Appearance card is the **first card** in the Settings page, above Scheduler Optimization. Order:
1. Appearance (theme toggle) ← new
2. Scheduler Optimization
3. Backup & Restore
4. App Data
5. About

### 5. Toast already works in dark mode

`showToast()` in `MatchEditor.js` uses `bg-gray-900 text-white` — this is already dark and reads well in both light and dark mode. No change needed.

---

## Implementation Notes for Researcher/Planner

- **View audit scope**: All 6 views (ClubManager, SessionSetup, RoundDisplay, MatchEditor, Settings, Help) need systematic `dark:` utility coverage. Priority: RoundDisplay and MatchEditor first (most complex, most used at courts), then SessionSetup, ClubManager, MemberEditor, Help.
- **Zone chip dark overrides**: The chip CSS uses attribute selectors (`[data-zone$="-a"] [data-player-id]`). The `@custom-variant dark` variant defined in style.css makes `.dark &` selectors work — use that for overrides in the same CSS block.
- **Settings.js mount**: On mount, read `ThemeService.getMode()` to set initial active button. Wire each button's click to `ThemeService.setMode(mode)` and update active button state.
- **ThemeService import in Settings.js**: Import `{ ThemeService }` from `'../services/theme.js'`.
- **No ThemeService changes needed**: Phase 15 delivered the complete API. Phase 16 is purely UI wiring + `dark:` utilities.
- **DARK-03 check** (immediate effect without reload): `ThemeService.setMode()` calls `applyTheme()` internally, which toggles the `.dark` class on `<html>` synchronously — immediate CSS cascade, no reload needed.
- **RoundDisplay "Completed" badge**: `text-gray-400 uppercase tracking-widest` — needs `dark:text-gray-500` or similar.
- **Error states in MatchEditor**: `border-red-400` error borders should remain visible in dark. Red typically works — verify contrast.

---

## Deferred Ideas

*(None raised during discussion)*
