# Phase 18: Documentation & Copy - Pattern Map

**Mapped:** 2026-04-15
**Files analyzed:** 8 (2 rewrites, 6 copy audits)
**Analogs found:** 8 / 8 (all files are self-referential — this phase edits text inside existing files)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/views/Help.js` | view (standalone) | static HTML rewrite | `src/views/Help.js` (current) | self — full rewrite |
| `README.md` | documentation | markdown restructure | `README.md` (current) | self — restructure |
| `src/views/RoundDisplay.js` | view | request-response | `src/views/RoundDisplay.js` (current) | self — surgical text edit |
| `src/views/SessionSetup.js` | view | request-response | `src/views/SessionSetup.js` (current) | self — surgical text edit |
| `src/views/MemberEditor.js` | view | CRUD | `src/views/MemberEditor.js` (current) | self — surgical text edit |
| `src/views/ClubManager.js` | view | CRUD | `src/views/ClubManager.js` (current) | self — surgical text edit |
| `src/views/MatchEditor.js` | view | request-response | `src/views/MatchEditor.js` (current) | self — surgical text edit |
| `src/views/Settings.js` | view | request-response | `src/views/Settings.js` (current) | self — surgical text edit |

---

## Pattern Assignments

### `src/views/Help.js` — full rewrite

**Current structure (lines 1–69):** Single `mount(el, params)` function. Assigns `el.innerHTML` a single template literal. Four `<section>` blocks with numbered headers, then a `<footer>`. No imports, no state, no logic — pure static HTML. `unmount()` is a no-op.

**Section header pattern to reuse** (lines 12–15):
```html
<h2 class="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center">
  <span class="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs mr-2">1</span>
  Getting Started
</h2>
```
Increment the number span per section. Use `dark:text-blue-400` on the h2 and the badge.

**Content card pattern to reuse** (lines 16–21):
```html
<div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3 text-sm leading-relaxed dark:text-gray-300">
  <p><strong>Label:</strong> Body text here.</p>
</div>
```

**Bulleted list pattern to reuse** (lines 30–34):
```html
<ul class="list-disc ml-5 space-y-2">
  <li><strong>Term:</strong> Explanation.</li>
</ul>
```

**Footer pattern to reuse** (lines 62–64):
```html
<footer class="text-center pt-4">
  <p class="text-xs text-gray-400 dark:text-gray-500">Pickleball Practice Scheduler ${__APP_VERSION__}</p>
</footer>
```
`__APP_VERSION__` is a Vite-injected global — keep as-is.

**What to replace:**
- Section titles: "Getting Started", "Odd Player Counts", "Manual Overrides", "Optimization Settings" → new workflow-based titles per D-03.
- Section count: currently 4. New structure targets 4–5 sections (Before You Start, Running a Session, Fixing Things, Settings & Preferences, How It Works).
- "Optimization Settings" section references "penalty" weights by name — replace with plain language. The word "penalty" must not appear (per specifics).
- Missing coverage: match editing (D-06), dark mode mention (D-07) — add both in appropriate new sections.
- The "2v1 / 1v1 / All Sit" strategy description (lines 30–35) is accurate and organizer-friendly — keep the concept, incorporate into the "Running a Session" section.

---

### `README.md` — restructure

**Current shape (56 lines):**
- Opens with badge + developer-oriented paragraph.
- Sections: Features (emoji bullets), Tech Stack, Development (commands), Credits, License.

**Target shape per D-08 through D-10:**
- Open with a single plain sentence (no emoji, no jargon) — see CONTEXT.md specifics for direction.
- Follow with the app URL link.
- One short organizer note directing to in-app Help. No step-by-step instructions in the README.
- Horizontal rule (`---`).
- Developer sections below the rule — Tech Stack, Development commands, Credits, License. These move down but are NOT deleted.

**Markdown patterns to preserve:**
- Badge on line 3 — keep, it belongs with developer content; move below the rule.
- Fenced code block for dev commands (lines 28–40) — keep intact below the rule.
- Credits bulleted list with bold link labels (lines 44–49) — keep intact.
- License line (line 52) — keep.

**What to cut from organizer section:**
- The "Features" section (lines 9–16) — replace with the single-sentence opener + Help pointer.
- Emoji section headings — remove from the organizer portion. Developer sections below the rule may retain emoji or drop them; Claude's discretion.

---

### `src/views/RoundDisplay.js` — copy audit

**D-12 target (line 174):**
```javascript
// CURRENT — developer language leaks "Score":
`Option ${index + 1} (Score: ${Math.round(alt.score)})`

// REPLACE WITH — quality label pattern:
// "Option 1 (Best)", "Option 2 (Good)", "Option 3 (Good)", ...
```
The label lives inside `renderAlternatives()` at line 174, inside a `<h3>` with class `font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-xs`.

**Quality label mapping (Claude's discretion per CONTEXT.md):**
Suggested: index 0 → "Best", index 1 → "Good", index 2+ → "Good" (all remaining alternatives are similarly ranked). The exact label text is within Claude's discretion.

**Other copy in this file — status:**
- "No Active Session" (line 12) — clear to an organizer, keep.
- "Go to your clubs and select members to start a practice." (line 14) — clear, keep.
- "Club Not Found" (line 27) — clear, keep.
- "Manage Players" (line 71) — clear, keep.
- "New Player Name" placeholder (line 79) — clear, keep.
- "Update Practice List" (line 105) — clear, keep.
- "Alternative Matchups" (line 167) — clear, keep.
- "Select" button (line 175) — clear, keep.
- "Sitting:" label (line 200) — clear, keep.
- "Show More Options" (line 209) — clear, keep.
- `alert('You need at least 2 players to schedule a round.')` (line 141) — acceptable; uses plain language.
- "Wait, where did the rounds go?" (line 299) — informal/internal-sounding. Flag for review: consider "Something went wrong — tap to generate a round."
- `'Tap "Mark Played" to advance &bull; Previous Rounds'` (line 373) — functional label; acceptable, keep.
- "End session?" modal (lines 273–278) — clear, keep.
- "Players" button (line 257), "End" button (line 260) — terse but functional in context; keep.

---

### `src/views/SessionSetup.js` — copy audit

**All copy reviewed:**
- "Who is here?" heading (line 61) — conversational, appropriate for organizers. Keep.
- `"Pick attending players from ${club.name}"` (line 65) — clear, keep.
- "Invert" button (line 66) — potentially unclear. Flag: consider "Invert Selection" or "Deselect All / Select All" toggle. Minor; within Claude's discretion.
- `"Select at least 4 (${count})"` (line 51) — clear functional feedback, keep.
- `"Start Session with ${count}"` (line 51) — clear, keep.
- "Never Played" label (line 37) — acceptable status label. Keep.
- `"Last: ${date}"` (line 36) — keep.
- `"Club not found"` (line 12) — keep.

**No developer-jargon flags.** No changes required beyond discretionary "Invert" label.

---

### `src/views/MemberEditor.js` — copy audit

**Toast messages (lines 202, 322):**
```javascript
showToast("Club name can't be empty", input);   // line 202
showToast("Member name can't be empty", input); // line 322
```
Both are clear plain-language validations. Keep as-is.

**Alert (line 267):**
```javascript
alert('You need at least 4 members in the club to start a session.');
```
Clear and functional. Keep.

**Other copy:**
- "Start Session" / "Go →" (lines 105–109) — clear, keep.
- "Member Roster" (line 114) — keep.
- "Name" input placeholder (line 116) — functional; keep. (Could be "Player name" but not a blocker.)
- "Add" button (line 117) — keep.
- "No members added yet." (line 61) — keep.
- "Add your first player →" (line 62) — inviting, appropriate. Keep.
- Remove modal: "Remove member?" / "They'll be removed from the roster. This can't be undone." (lines 128–129) — clear, keep.
- `aria-label="Rename member"` / `aria-label="Remove member"` (lines 75, 80) — accessibility labels, keep.

**No developer-jargon flags.** No changes required.

---

### `src/views/ClubManager.js` — copy audit

**All copy reviewed:**
- "Your Clubs" (line 64) — clear, keep.
- "New Club Name" placeholder (line 72) — keep.
- "No clubs created yet." / "Add a club to manage your rosters." (lines 19–20) — the word "rosters" is acceptable organizer terminology. Keep.
- "Tap to add members →" (line 42) — clear, keep.
- "Active Today" badge (line 36) — keep.
- `"${club.members.length} members"` (line 39) — keep.
- "Resume" button (line 49) — clear, keep.
- "Delete" button (line 52) — keep.
- Delete modal: "Delete club?" / "All members and session history for this club will be permanently deleted." (lines 88–89) — clear, keep.

**No developer-jargon flags.** No changes required.

---

### `src/views/MatchEditor.js` — copy audit

**Error labels set dynamically in `validateAndUpdateUI()` (lines 60–63):**
```javascript
if (oversized)   errorLabel.textContent = 'max 2 per side';
else if (imbalanced) errorLabel.textContent = 'players on both sides required';
else if (total === 1) errorLabel.textContent = 'needs 2+ players';
```
The inline default in `buildHTML()` is also `'needs 2+ players'` (line 210).

**Assessment per D-11:** These are short functional labels that are clear to an organizer in context. Keep per D-11's exception: "Short functional labels that are clear to an organizer ('needs 2+ players') can stay."

**Toast messages (lines 327, 342):**
```javascript
showToast("Can't be better than Wimbledon!");            // line 327 — Easter egg, keep
showToast("Oooh, more than Wimbledon's Championship courts? Fancy"); // line 331 — Easter egg, keep
showToast('Court removed');                             // line 342 — functional feedback, keep
```

**Other copy:**
- "Edit Round N" heading (line 291) — clear, keep.
- "Rest Bench" label (line 244) — the word "Bench" is contextual and understood. Keep.
- `"Court ${i + 1}"` (line 208) — clear, keep.
- "Add court" button (line 238) — clear, keep.
- "Remove" button (line 211) — keep.
- Cancel / Confirm buttons (lines 258, 261) — keep.
- Discard modal: "Discard changes?" / "Your edits won't be saved." (lines 272–273) — clear, keep.
- "Keep Editing" / "Discard" (lines 276, 280) — clear, keep.
- No Active Session error (lines 434–438) — keep.
- "Round not found." (line 449) — keep.

**No developer-jargon flags.** No changes required.

---

### `src/views/Settings.js` — copy audit

**Scheduler section heading (line 32):**
```html
<h2 class="font-bold text-gray-700 dark:text-gray-200">Scheduler Optimization</h2>
```
"Scheduler Optimization" is developer-adjacent. Flag: consider "Fairness Settings" or "Scheduling Preferences". Within Claude's discretion.

**Slider labels — assessment per D-11:**
- "Repeated Partners" (line 41) — borderline technical but describes the outcome clearly. Acceptable.
- "Repeated Opponents" (line 49) — same; acceptable.
- "Fair Sitting Out" (line 56) — organizer-friendly. Keep.
- "Short-Sided Matches" section label (line 65) — developer-ish. Flag: consider "Uneven Courts" or "3-Player & Singles Courts".
- "Singles Match" (line 68) — clear. Keep.
- "3-Way Solo" (line 76) — jargon. Flag: consider "Alone on a 3-Player Court".
- "3-Way Pair" (line 83) — jargon. Flag: consider "Pair on a 3-Player Court".

**Slider description copy (lines 44, 50, 57, 75, 82, 97):**
All use "How strongly to avoid..." — this phrasing references an optimization algorithm implicitly but is readable. Keep.

**Other copy:**
- "Appearance" / "Auto / Light / Dark" (lines 16–26) — clear, keep.
- "Backup & Restore" / "Download or share your data to keep a backup or switch devices." (lines 106–107) — keep.
- "Share Backup" (line 110) — keep.
- "Import File" / "Paste Data" (lines 114, 117) — keep.
- "App Data" heading (line 127) — neutral; keep.
- "Resetting will clear all clubs, members, and session history from this device." (line 128) — clear, keep.
- "Reset All Data" (line 129) — clear, keep.
- "About" / "Pickleball Practice Scheduler" (lines 135–136) — keep.
- Paste modal: "Paste Backup Data" / "Paste your JSON backup below." (lines 146–147) — "JSON" is technical but expected in this context. Keep.
- `'Invalid JSON — make sure you pasted the entire backup.'` (line 151) — acceptable technical feedback for a developer-adjacent data action. Keep.
- Reset modal copy set via `showSettingsModal()` (lines 284–286, 354–356, 389–391) — dynamically assigned via `textContent`; review text inline in the listener callbacks.

**Summary of flagged items in Settings:**
1. "Scheduler Optimization" heading → consider "Scheduling Preferences" or "Fairness Settings"
2. "Short-Sided Matches" subheading → consider "Uneven Courts"
3. "3-Way Solo" label → consider "Alone on a 3-Player Court"
4. "3-Way Pair" label → consider "Pair on a 3-Player Court"

---

## Shared Patterns

### Dark mode class pattern
**Source:** All view files
**Apply to:** All new or modified HTML in Help.js

Standard class pairs used throughout:
```
text-gray-500         → dark:text-gray-400
text-gray-400         → dark:text-gray-500
bg-white              → dark:bg-gray-800
border-gray-100       → dark:border-gray-700
bg-blue-100           → dark:bg-blue-900/30
text-blue-600         → dark:text-blue-400
bg-gray-50            → dark:bg-gray-700
text-gray-300         → dark:text-gray-600   (empty states, ghost elements)
```
Every new `<p>`, `<ul>`, or `<li>` block inside a content card should carry `dark:text-gray-300` on the card container (not individual elements), matching the pattern in Help.js lines 16 and 28.

### Template literal embedding — text-only edits
**Source:** All view files
**Rule:** All user-facing copy is embedded directly in `.innerHTML = \`...\`` template literals. There is no i18n layer, no constants file. Text changes are in-place edits to the string content of those template literals. Use the Edit tool (surgical diff), never the Write tool on existing source files.

### Toast message pattern — two implementations exist
**MemberEditor.js** (lines 5–43): ad-hoc `showToast(message, anchorEl)` — positions near the triggering element, uses fixed inline styles, auto-removes after 2 s.

**MatchEditor.js** (lines 124–142): module-scoped `showToast(message)` — always top-center, uses Tailwind classes + `animate-bounce-in`, auto-removes after 2.7 s. More polished implementation.

Neither is shared. Phase 18 does not introduce a shared toast component (out of scope). Copy edits to toast strings are in-place.

### Modal copy pattern
**Source:** ClubManager.js, MemberEditor.js, RoundDisplay.js, MatchEditor.js, Settings.js
All confirmation modals use the same two-button layout with identical class structure:
```html
<button class="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-sm">Cancel</button>
<button class="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm">Destructive Action</button>
```
Modal heading: `text-lg font-bold text-gray-900 dark:text-gray-100`
Modal body: `text-sm text-gray-500 dark:text-gray-400`

No modal copy changes are required in Phase 18 — all modal text was assessed as clear.

---

## Summary of Required Changes

| File | Change Type | Specific Location | What Changes |
|------|-------------|-------------------|--------------|
| `src/views/Help.js` | Full rewrite | entire `el.innerHTML` template literal | New workflow-based sections; keep `<section>` + header + card structure and footer |
| `README.md` | Restructure | entire file | Organizer opener first; developer content moves below `---` |
| `src/views/RoundDisplay.js` | Surgical edit | line 174, inside `renderAlternatives()` | `"Option ${index + 1} (Score: ${Math.round(alt.score)})"` → quality label |
| `src/views/RoundDisplay.js` | Discretionary | line 299 | "Wait, where did the rounds go?" → clearer fallback message |
| `src/views/Settings.js` | Discretionary | line 32 | "Scheduler Optimization" → "Scheduling Preferences" or similar |
| `src/views/Settings.js` | Discretionary | line 65 | "Short-Sided Matches" → "Uneven Courts" or similar |
| `src/views/Settings.js` | Discretionary | line 76 | "3-Way Solo" label → plain language |
| `src/views/Settings.js` | Discretionary | line 83 | "3-Way Pair" label → plain language |
| `src/views/SessionSetup.js` | Discretionary | line 66 | "Invert" → "Invert Selection" or clearer label |

---

## No Analog Found

Not applicable — this phase only modifies existing files. All files have clear self-referential patterns to follow.

---

## Metadata

**Analog search scope:** `src/views/` (all 8 view files read in full), `README.md`
**Files scanned:** 9
**Pattern extraction date:** 2026-04-15
