# Phase 18: Documentation & Copy - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the app legible for non-developer organizers through three deliverables: (1) rewrite the in-app Help screen to accurately cover all current features, (2) rewrite the GitHub README to open with organizer-appropriate content, (3) audit and fix user-facing copy across all views. Scope is text and documentation only — no feature changes.

</domain>

<decisions>
## Implementation Decisions

### Help screen — structure
- **D-01:** Reorganize from scratch — do not just append to the existing 4-section structure
- **D-02:** Use a workflow-based structure that follows the organizer's journey at a court, not a feature-by-feature list
- **D-03:** Suggested section flow: Before You Start → Running a Session → Fixing Things → Settings & Preferences
- **D-04:** Features appear contextually where the organizer encounters them, not in their own isolated sections
- **D-05:** End with a "How It Works" section that briefly explains the weight/penalty system — why matches are varied and fair, without technical details

### Help screen — match editing
- **D-06:** Brief description only — tap Edit on a round, drag players between courts, tap Save. No step-by-step walkthrough or explanation of validation rules.

### Help screen — dark mode
- **D-07:** Mention dark mode contextually within the appropriate section (Settings & Preferences or similar). Do not create a dedicated dark mode section.

### README — shape
- **D-08:** Organizer content first: one plain sentence describing what the app does, followed by a pointer to the in-app Help screen for instructions
- **D-09:** Developer content (Tech Stack, Development commands, Credits) stays in the README but moves below a horizontal rule — not deleted, not moved to a separate file
- **D-10:** No step-by-step instructions in the README itself — direct organizers to the in-app Help screen

### Copy audit — scope and fixes
- **D-11:** Flag developer terms only — technical jargon, internal implementation language, placeholder-ish text. Short functional labels that are clear to an organizer ("needs 2+ players") can stay.
- **D-12:** Alternatives view: replace "Option N (Score: 234)" with quality labels — "Option 1 (Best)", "Option 2 (Good)", etc. Do not remove the ranking signal, just replace the raw number.
- **D-13:** Audit all views: SessionSetup, RoundDisplay, MemberEditor, ClubManager, MatchEditor, Help, Settings. Toast messages and error states included.

### Claude's Discretion
- Exact section titles and wording within the Help screen
- How to label "Good" / "Best" — exact label text for option quality tiers
- Minor phrasing improvements to existing copy that are unambiguously clearer

</decisions>

<specifics>
## Specific Ideas

- The Help screen "How It Works" section should be brief and accessible — something like "The app runs hundreds of simulations and picks the matchup where everyone plays with the most different people." The word "penalty" and "weight" should not appear.
- README plain opener example direction: "Pickleball Practice Scheduler generates fair, varied round matchups for practice sessions — so you can focus on the game, not the math."

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §DOCS-01, DOCS-02, DOCS-03 — Acceptance criteria for Help screen, README, and copy audit

### Existing files to rewrite
- `src/views/Help.js` — Current Help screen (4 sections; missing dark mode and match editing)
- `README.md` — Current README (developer-facing; needs organizer-first rewrite)

### Views to audit for copy (DOCS-03)
- `src/views/RoundDisplay.js` — Main session view; includes Alternatives panel with "Option N (Score: X)"
- `src/views/SessionSetup.js` — Session start; player selection UI
- `src/views/MemberEditor.js` — Player management; toast messages
- `src/views/ClubManager.js` — Club management
- `src/views/MatchEditor.js` — Match editing; error labels like "needs 2+ players", "max 2 per side"
- `src/views/Settings.js` — Settings view

No external specs or ADRs beyond the files listed above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/views/Help.js` — Full content to be replaced; existing section structure (numbered sections in `<section>` tags with blue headers) can be reused or discarded
- Tailwind dark mode classes (`dark:text-*`, `dark:bg-*`) are used consistently across all views — any new Help content should follow the same pattern

### Established Patterns
- User-facing text is inline in `.innerHTML` template literals — no separate i18n layer, no constants file. Copy changes are edits to the HTML strings in place.
- Toast messages are implemented ad-hoc in MemberEditor.js (no shared toast component)

### Integration Points
- Help screen is a standalone view mounted at `#/help` — no shared state, pure HTML rewrite
- README is a standalone Markdown file — no build pipeline dependency

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 18-documentation-copy*
*Context gathered: 2026-04-15*
