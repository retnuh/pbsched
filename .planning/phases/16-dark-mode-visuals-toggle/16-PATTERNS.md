# Phase 16: Dark Mode Visuals & Toggle — Pattern Map

**Mapped:** 2026-04-14
**Files analyzed:** 9 (1 CSS, 1 HTML, 6 JS views, 1 router)
**Analogs found:** 9 / 9 (all files are existing modifications, not new — patterns extracted from the files themselves)

---

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `src/style.css` | config/style | transform | itself (existing zone chip blocks) | exact — add sibling rules |
| `index.html` | config/template | request-response | `src/router.js` lines 76-86 (active class injection site) | exact — same nav elements |
| `src/views/Settings.js` | view + service-caller | request-response | itself (existing card pattern) + `src/services/theme.js` | exact |
| `src/views/RoundDisplay.js` | view | request-response | itself (3 render functions) | exact |
| `src/views/MatchEditor.js` | view | event-driven | itself (`buildHTML` function) | exact |
| `src/views/SessionSetup.js` | view | request-response | itself (`renderAttendance` function) | exact |
| `src/views/ClubManager.js` | view | CRUD | itself (`renderClubs` function) | exact |
| `src/views/MemberEditor.js` | view | CRUD | itself (`renderMembers` function) | exact |
| `src/views/Help.js` | view | request-response | itself (static sections) | exact |

---

## Pattern Assignments

### `src/style.css` (CSS dark overrides)

**Analog:** The file's own existing zone chip blocks (lines 48-62) and `.sortable-ghost` block (lines 65-70).

**Existing light-mode zone chip pattern** (lines 48-62 — the blocks to mirror):
```css
[data-zone$="-a"] [data-player-id] {
  background-color: #EFF6FF; /* blue-50 */
  border-color: #BFDBFE;     /* blue-200 */
  color: #1E40AF;            /* blue-800 */
}
[data-zone$="-b"] [data-player-id] {
  background-color: #FFF7ED; /* orange-50 */
  border-color: #FED7AA;     /* orange-200 */
  color: #9A3412;            /* orange-800 */
}
[data-zone="bench"] [data-player-id] {
  background-color: #E5E7EB; /* gray-200 */
  border-color: #D1D5DB;     /* gray-300 */
  color: #374151;            /* gray-700 */
}
```

**Dark overrides to add immediately after** (locked by CONTEXT.md Decision 1):
```css
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
```

**Existing SortableJS ghost pattern** (lines 65-70 — the `!important` must be matched):
```css
.sortable-ghost {
  opacity: 0.35;
  border: 3px dashed #111827 !important; /* gray-900 — visible on any background */
  background-color: transparent !important;
  color: transparent !important;
}
```

**Dark ghost override to add immediately after** (CONTEXT.md Decision 2 + RESEARCH.md Pitfall 3):
```css
.dark .sortable-ghost {
  border: 3px dashed #9ca3af !important; /* gray-400 — visible on dark backgrounds */
}
```

**Key constraint:** The `@custom-variant dark (&:where(.dark, .dark *))` on line 3 enables `dark:` prefix utilities in Tailwind, but for these plain CSS blocks the correct form is the `.dark <selector>` descendant selector — NOT `&:where(.dark, .dark *)` nesting. Use `.dark [data-zone$="-a"] [data-player-id]` as shown above.

---

### `index.html` — Nav bar dark classes

**Analog:** `src/router.js` lines 76-86 (the active class injection site — the planner must touch this JS file too, not just the static HTML).

**Current nav element** (index.html line 40 — light-only):
```html
<nav class="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 h-20 pb-4 flex items-center justify-around px-4 shadow-lg z-50">
```

**Dark classes to add to `<nav>`:**
- `dark:bg-gray-800/90 dark:border-gray-700`

**Current nav link pattern** (index.html lines 41-55 — all three `<a>` elements):
```html
<a href="#/" class="flex flex-col items-center space-y-1 w-1/3 text-gray-400" data-nav="ClubManager">
```

**The static `text-gray-400` is the inactive color — add `dark:text-gray-500` here.**

**Active state injection site** (router.js lines 76-86 — this is where `text-blue-600` and `text-gray-400` are toggled dynamically):
```javascript
document.querySelectorAll('[data-nav]').forEach(link => {
  const navTarget = link.getAttribute('data-nav');
  const hash = window.location.hash;

  const isClubs = (hashIsHome() || hash.startsWith('#/club') || hash.startsWith('#/setup')) && navTarget === 'ClubManager';
  const isSession = (hash.startsWith('#/active') || hash.startsWith('#/edit')) && navTarget === 'RoundDisplay';
  const isSettings = hash.startsWith('#/settings') && navTarget === 'Settings';

  link.classList.toggle('text-blue-600', isClubs || isSession || isSettings);
  link.classList.toggle('text-gray-400', !(isClubs || isSession || isSettings));
});
```

**Dark classes to add in router.js at the toggle site:**
- Replace `'text-blue-600'` toggle with toggling both `'text-blue-600'` and `'dark:text-blue-400'` — OR — add `dark:text-blue-400` to the static HTML on each `<a>` element along with `dark:text-gray-500` so the cascade handles it without JS changes.
- Recommended approach: Add `dark:text-blue-400 dark:text-gray-500` to the static class on each `<a>` in index.html (the `dark:` variant will follow the light class that is toggled by JS because `dark:text-blue-400` only activates in dark mode, and both classes coexist — only one is visible at a time).

---

### `src/views/Settings.js` (new Appearance card + existing card dark overrides)

**Analog:** Itself. The existing card structural pattern (lines 12-84) is the template to follow.

**Existing card pattern** (lines 12-13 — the container to dark-override across all 4 cards):
```javascript
`<div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-6">`
// Becomes:
`<div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">`
```

**Existing h2 pattern** (line 15):
```javascript
`<h2 class="font-bold text-gray-700">Scheduler Optimization</h2>`
// Becomes:
`<h2 class="font-bold text-gray-700 dark:text-gray-200">Scheduler Optimization</h2>`
```

**Existing hint text pattern** (line 17):
```javascript
`<p class="text-xs text-gray-500 italic">...</p>`
// Becomes:
`<p class="text-xs text-gray-500 dark:text-gray-400 italic">...</p>`
```

**Existing range slider pattern** (line 25):
```javascript
`<input type="range" ... class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600">`
// Becomes:
`<input type="range" ... class="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-400">`
```

**Existing slider value span** (line 23):
```javascript
`<span id="val-partner" class="text-blue-600">${...}</span>`
// Becomes:
`<span id="val-partner" class="text-blue-600 dark:text-blue-400">${...}</span>`
```

**Existing secondary button (Backup & Restore card)** (lines 96-101):
```javascript
`<button id="import-btn" class="py-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg font-bold hover:bg-blue-100 transition text-sm">`
// Becomes:
`<button id="import-btn" class="py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800 rounded-lg font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition text-sm">`
```

**Existing danger button** (line 111):
```javascript
`<button id="reset-data" class="w-full py-3 bg-red-50 text-red-600 border border-red-100 rounded-lg font-bold hover:bg-red-100 transition">`
// Becomes:
`<button id="reset-data" class="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800 rounded-lg font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition">`
```

**Build version text** (line 119):
```javascript
`<p class="text-xs text-gray-400 font-mono">Build ${__APP_VERSION__}</p>`
// Becomes:
`<p class="text-xs text-gray-400 dark:text-gray-500 font-mono">Build ${__APP_VERSION__}</p>`
```

**New Appearance card — import addition** (top of file, alongside existing imports):
```javascript
import { ThemeService } from '../services/theme.js';
```

**New Appearance card — HTML template** (insert as FIRST card inside `<div class="space-y-4">`):
```javascript
const currentMode = ThemeService.getMode(); // read before innerHTML assignment

// First card in the space-y-4 container:
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
```

**New Appearance card — event wiring** (after `el.innerHTML = ...`, before existing `querySelector` calls):
```javascript
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

**Note on event delegation pattern:** This follows the same pattern used throughout the codebase (e.g., `ClubManager.js` `data-action` delegation, `RoundDisplay.js` checkbox delegation) — attach one listener to a container, identify the target with `closest()`.

---

### `src/views/RoundDisplay.js` (3 render functions need dark coverage)

**Analog:** Itself. Three distinct render functions: `renderAttendeeManager()` (line 54+), `renderMain()` (called when neither managing nor alternatives), `renderAlternatives()`. All three require independent dark coverage — see RESEARCH.md Pitfall 4.

**Core card container pattern to dark-override** (seen at line 93 in `renderAttendeeManager`):
```javascript
// Existing:
`<label class="flex items-center justify-between p-4 bg-white rounded-xl border ${isAttending ? 'border-blue-500 bg-blue-50' : 'border-gray-100'} cursor-pointer">`
// With dark:
`<label class="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border ${isAttending ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-100 dark:border-gray-700'} cursor-pointer">`
```

**Add member form** (renderAttendeeManager, line 75):
```javascript
// Existing:
`<form id="add-member-form" class="bg-blue-50 p-4 rounded-xl border border-blue-100 flex space-x-2">`
// With dark:
`<form id="add-member-form" class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex space-x-2">`
```

**Sit count sub-text** (renderAttendeeManager, line 96):
```javascript
// Existing:
`<span class="text-[10px] text-gray-400 uppercase font-bold">Sat out ${sitCount}x</span>`
// With dark:
`<span class="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">Sat out ${sitCount}x</span>`
```

**Dark: utilities to apply across renderMain() (planner must read the full function — excerpt for reference only):**
- Round cards `bg-white border-gray-100` (played) → `dark:bg-gray-800 dark:border-gray-700`
- Round header `bg-gray-50` (played) → `dark:bg-gray-700`; `bg-blue-50` (unplayed) → `dark:bg-blue-900/30`
- Header text `text-gray-500` → `dark:text-gray-400`; `text-blue-800` → `dark:text-blue-300`
- Completed badge `text-gray-400 uppercase tracking-widest` → `dark:text-gray-500`
- Team A cell `bg-blue-50 border-blue-100` → `dark:bg-blue-900/30 dark:border-blue-800`
- Team B cell `bg-orange-50 border-orange-100` → `dark:bg-orange-900/20 dark:border-orange-800`
- Sitting-out chips `bg-gray-100 text-gray-600 border-gray-200` → `dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600`
- Sitting-out label `text-gray-400 uppercase` → `dark:text-gray-500`
- Empty state card `bg-white border-gray-100` → `dark:bg-gray-800 dark:border-gray-700`
- Sticky footer bar `bg-white/90 border-gray-100` → `dark:bg-gray-800/90 dark:border-gray-700`

---

### `src/views/MatchEditor.js` (buildHTML function + validateAndUpdateUI)

**Analog:** Itself. The `buildHTML` function (lines 156-238) contains all HTML template class names. The `validateAndUpdateUI` function (lines 39-68) dynamically toggles border classes via `classList.toggle`.

**Court card container pattern** (buildHTML, line 185):
```javascript
// Existing:
`<div data-court="${i}" class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">`
// With dark:
`<div data-court="${i}" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">`
```

**Court header** (buildHTML, line 186):
```javascript
// Existing:
`<div class="p-3 bg-gray-50 flex items-center justify-between">`
// With dark:
`<div class="p-3 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">`
```

**Court label text** (buildHTML, line 187):
```javascript
// Existing:
`<span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Court ${i + 1}</span>`
// With dark:
`<span class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Court ${i + 1}</span>`
```

**Error label** (buildHTML, line 189):
```javascript
// Existing:
`<span data-court-error class="hidden text-xs font-bold text-red-600">needs 2+ players</span>`
// With dark:
`<span data-court-error class="hidden text-xs font-bold text-red-600 dark:text-red-400">needs 2+ players</span>`
```

**Team B zone divider** (buildHTML, line 201):
```javascript
// Existing:
`<div data-zone="court-${i}-b" class="space-y-2 pl-3 border-l border-gray-200 min-h-[96px]">`
// With dark:
`<div data-zone="court-${i}-b" class="space-y-2 pl-3 border-l border-gray-200 dark:border-gray-700 min-h-[96px]">`
```

**Empty slot HTML constant** (buildHTML, line 179):
```javascript
// Existing:
const emptySlotHTML = '<div class="empty-slot min-h-[44px] border-2 border-dashed border-gray-200 rounded-full"></div>';
// With dark:
const emptySlotHTML = '<div class="empty-slot min-h-[44px] border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-full"></div>';
```

**Bench area** (buildHTML, line 222):
```javascript
// Existing:
`<div class="rounded-xl bg-gray-100 border border-gray-200 p-4 space-y-3">`
// With dark:
`<div class="rounded-xl bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-4 space-y-3">`
```

**Bench label** (buildHTML, line 223):
```javascript
// Existing:
`<h2 class="text-xs font-bold text-gray-500 uppercase tracking-widest">Rest Bench</h2>`
// With dark:
`<h2 class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Rest Bench</h2>`
```

**Bottom bar** (buildHTML, line 233):
```javascript
// Existing:
`class="fixed fixed-safe-bottom left-0 right-0 max-w-lg mx-auto z-40 bg-white/90 backdrop-blur-sm border-t border-gray-100"`
// With dark:
`class="fixed fixed-safe-bottom left-0 right-0 max-w-lg mx-auto z-40 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-t border-gray-100 dark:border-gray-700"`
```

**Dynamic border in validateAndUpdateUI** (lines 48-49 — these stay as-is):
```javascript
card.classList.toggle('border-red-400', isInvalid);  // red reads fine on dark
card.classList.toggle('border-gray-200', !isInvalid); // needs dark companion in HTML
```
The `border-gray-200` toggle does not need changing in JS — the `dark:border-gray-700` added to the static HTML class of the court card container covers the dark state via cascade since `border-gray-200` and `dark:border-gray-700` coexist as Tailwind classes.

**makeEmptySlot() function** (lines 100-108 — dynamic DOM creation):
```javascript
// Bench slot existing:
div.className = 'empty-slot min-h-[44px] px-6 border-2 border-dashed border-gray-200 rounded-full flex items-center justify-center text-gray-300 text-lg';
// With dark:
div.className = 'empty-slot min-h-[44px] px-6 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-600 text-lg';

// Court slot existing:
div.className = 'empty-slot min-h-[44px] border-2 border-dashed border-gray-200 rounded-full';
// With dark:
div.className = 'empty-slot min-h-[44px] border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-full';
```

**Toast:** `showToast()` (lines 111-123) uses `bg-gray-900 text-white` — already dark-safe, NO changes needed (CONTEXT.md Decision 5).

---

### `src/views/SessionSetup.js` (renderAttendance function)

**Analog:** Itself. `renderAttendance()` (lines 30-45) and the static `el.innerHTML` template (lines 57-78).

**Member row pattern** (renderAttendance, line 32):
```javascript
// Existing:
`<label class="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm cursor-pointer select-none">`
// With dark:
`<label class="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm cursor-pointer select-none">`
```

**Member name** (renderAttendance, line 34):
```javascript
`<span class="text-lg font-medium">${member.name}</span>`
// With dark (explicit override for safety — body dark:text-gray-100 provides this but explicit is safer):
`<span class="text-lg font-medium dark:text-gray-100">${member.name}</span>`
```

**Last played sub-text** (renderAttendance, line 36):
```javascript
`<span class="text-[10px] text-gray-400 uppercase font-bold">Last: ...</span>`
// With dark:
`<span class="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">Last: ...</span>`
```

**Never played sub-text** (renderAttendance, line 37):
```javascript
`<span class="text-[10px] text-gray-300 uppercase font-bold">Never Played</span>`
// With dark:
`<span class="text-[10px] text-gray-300 dark:text-gray-500 uppercase font-bold">Never Played</span>`
```

**Sticky start button bar** (static template, line 72):
```javascript
// Existing:
`<div class="fixed bottom-16 left-0 right-0 p-4 bg-gray-50/90 backdrop-blur-sm border-t border-gray-100 max-w-lg mx-auto">`
// With dark:
`<div class="fixed bottom-16 left-0 right-0 p-4 bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-sm border-t border-gray-100 dark:border-gray-700 max-w-lg mx-auto">`
```

**Hint text and Invert button** (static template, lines 64-67):
```javascript
`<p class="text-gray-500">Pick attending players from <strong>${club.name}</strong></p>`
// With dark:
`<p class="text-gray-500 dark:text-gray-400">Pick attending players from <strong>${club.name}</strong></p>`

`<button id="toggle-all" class="text-blue-600 font-bold">Invert</button>`
// With dark:
`<button id="toggle-all" class="text-blue-600 dark:text-blue-400 font-bold">Invert</button>`
```

---

### `src/views/ClubManager.js` (renderClubs function)

**Analog:** Itself. `renderClubs()` (lines 7-59) — the club card template at line 32 is the primary target.

**Club card container** (line 32):
```javascript
// Existing:
`<div class="bg-white p-4 rounded-xl shadow-sm border ${isCurrent ? 'border-blue-500 bg-blue-50/30' : 'border-gray-100'} ...>`
// With dark:
`<div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border ${isCurrent ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/20' : 'border-gray-100 dark:border-gray-700'} ...>`
```

**Member count text** (line 39):
```javascript
`<p class="text-sm text-gray-500">${club.members.length} members</p>`
// With dark:
`<p class="text-sm text-gray-500 dark:text-gray-400">${club.members.length} members</p>`
```

**Delete button** (line 52):
```javascript
`<button ... class="p-2 text-gray-400 hover:text-red-600 transition text-xs font-medium">`
// With dark:
`<button ... class="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition text-xs font-medium">`
```

**Empty state card** (lines 18-22 — inside `renderClubs`, shown when no clubs):
```javascript
// Existing:
`<div class="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">`
// With dark:
`<div class="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600">`
```

**New club form** (static template, line 68):
```javascript
// Existing:
`<form id="new-club-form" class="bg-blue-50 p-4 rounded-xl border border-blue-100 flex space-x-2">`
// With dark:
`<form id="new-club-form" class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex space-x-2">`
```

---

### `src/views/MemberEditor.js` (renderMembers function + static template)

**Analog:** Itself. `renderMembers()` (lines 14-39) and static `el.innerHTML` (lines 42-69).

**Member row** (renderMembers, line 32):
```javascript
// Existing:
`<div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group">`
// With dark:
`<div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center group">`
```

**Member name span** (renderMembers, line 33):
```javascript
`<span class="font-medium text-lg">${member.name}</span>`
// With dark:
`<span class="font-medium text-lg dark:text-gray-100">${member.name}</span>`
```

**Empty state** (renderMembers, lines 19-23):
```javascript
// Existing:
`<div class="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">`
// With dark:
`<div class="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600">`

`<p class="text-gray-500 italic mb-2">No members added yet.</p>`
// With dark:
`<p class="text-gray-500 dark:text-gray-400 italic mb-2">No members added yet.</p>`
```

**Start Session card** (static template, lines 49-57):
```javascript
// Existing:
`<div class="bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">`
// With dark:
`<div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex justify-between items-center">`

`<h2 class="font-bold text-blue-800">Start Session</h2>`
// With dark:
`<h2 class="font-bold text-blue-800 dark:text-blue-300">Start Session</h2>`

`<p class="text-xs text-blue-600">Pick attendees and generate rounds</p>`
// With dark:
`<p class="text-xs text-blue-600 dark:text-blue-400">Pick attendees and generate rounds</p>`
```

**Roster section heading** (static template, line 60):
```javascript
`<h2 class="font-bold text-gray-700 uppercase text-xs tracking-wider">Member Roster</h2>`
// With dark:
`<h2 class="font-bold text-gray-700 dark:text-gray-400 uppercase text-xs tracking-wider">Member Roster</h2>`
```

**Name input** (static template, line 62):
```javascript
`<input type="text" id="new-member-name" ... class="flex-grow p-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">`
// With dark:
`<input type="text" id="new-member-name" ... class="flex-grow p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-gray-100 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">`
```

---

### `src/views/Help.js` (static sections)

**Analog:** Itself. The file is fully static template literals (lines 1-60+).

**Section heading pattern** (line 12-14):
```javascript
// Existing:
`<h2 class="text-lg font-bold text-blue-600 flex items-center">`
// With dark:
`<h2 class="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center">`
```

**Section icon badge** (line 13):
```javascript
`<span class="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs mr-2">1</span>`
// With dark:
`<span class="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs mr-2">1</span>`
```

**Content card** (line 16):
```javascript
`<div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3 text-sm leading-relaxed">`
// With dark:
`<div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3 text-sm leading-relaxed dark:text-gray-300">`
```

**Back button** (line 5):
```javascript
`<button onclick="window.history.back()" class="p-2 -ml-2 text-blue-600">`
// With dark:
`<button onclick="window.history.back()" class="p-2 -ml-2 text-blue-600 dark:text-blue-400">`
```

---

## Shared Patterns

### The Standard Card Pattern (applies to all views)

**Source:** `src/views/Settings.js` lines 12-13, `src/views/ClubManager.js` line 32, `src/views/MemberEditor.js` line 32.

**Light-only (current everywhere):**
```
bg-white border border-gray-100
```

**Dark overrides (add to all card containers):**
```
dark:bg-gray-800 dark:border-gray-700
```

### The Standard Hint Text Pattern (applies to all views)

**Source:** Seen in Settings.js line 17, ClubManager.js line 39, SessionSetup.js line 65.

**Light-only:**
```
text-gray-500
```

**Dark override:**
```
dark:text-gray-400
```

### The Standard Secondary/Blue Action Pattern (applies to forms and cards)

**Source:** `src/views/ClubManager.js` line 68, `src/views/MemberEditor.js` line 49.

**Light-only:**
```
bg-blue-50 border border-blue-100
```

**Dark override:**
```
dark:bg-blue-900/20 dark:border-blue-800
```

### The Standard Input Field Pattern (applies to all form inputs)

**Source:** `src/views/ClubManager.js` line 73, `src/views/MemberEditor.js` line 62.

**Light-only:**
```
bg-white border border-blue-200   (or border-gray-200)
```

**Dark override:**
```
dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100
```

### The Nav Active/Inactive State Pattern

**Source:** `src/router.js` lines 84-85 (JS injection site).

The router injects `text-blue-600` (active) and `text-gray-400` (inactive) dynamically. Static `dark:` classes added to the `<a>` elements in `index.html` will be respected by the cascade — `dark:text-blue-400` activates only in dark mode alongside whichever light class is toggled. No JS changes to router.js required.

**Apply to each `<a data-nav>` in index.html:**
```
text-gray-400 dark:text-gray-500   ← static starting state (inactive)
```
Active state (`text-blue-600`) is added dynamically; alongside it add `dark:text-blue-400` to the static class so dark mode always shows a muted blue instead of the vivid `text-blue-600`.

---

## No Analog Found

None — all files are existing project files being modified. No new files are being created.

---

## Critical Pitfalls (for planner reference)

| Pitfall | File | Action |
|---------|------|--------|
| `.sortable-ghost` uses `!important` — dark override must also use `!important` | `src/style.css` | `.dark .sortable-ghost { border: 3px dashed #9ca3af !important }` |
| RoundDisplay has 3 separate render functions — all need dark coverage | `src/views/RoundDisplay.js` | Audit `renderMain()`, `renderAttendeeManager()`, `renderAlternatives()` separately |
| Nav active classes are injected by router.js JS, not static HTML | `index.html` + `src/router.js` | Add `dark:text-blue-400` to static `<a>` class; no router.js change needed |
| Tailwind v4 uses `/` opacity syntax, not `bg-opacity-*` | All views | Use `dark:bg-blue-900/20` not `dark:bg-blue-900 dark:bg-opacity-20` |
| `makeEmptySlot()` creates DOM nodes via JS, not template literals | `src/views/MatchEditor.js` lines 100-108 | Must update `div.className` string in the function body, not just the HTML template |

---

## Metadata

**Analog search scope:** `/Users/hkelly/Dropbox/projects/pbsched/src/` (all view JS files, style.css, router.js, services/theme.js) and `index.html`
**Files read:** 11 (style.css, index.html, router.js, theme.js, Settings.js, RoundDisplay.js, MatchEditor.js, SessionSetup.js, ClubManager.js, MemberEditor.js, Help.js)
**Pattern extraction date:** 2026-04-14
