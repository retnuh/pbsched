---
status: gaps-found
phase: 18-documentation-copy
source: [18-01-SUMMARY.md, 18-02-SUMMARY.md, 18-03-SUMMARY.md]
started: 2026-04-15T13:10:00Z
updated: 2026-04-15T14:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 2
name: Help Screen — Match Editing Covered
expected: |
  In the "Fixing Things" section, look for instructions about editing a round —
  tap Edit, drag players, tap Confirm.
awaiting: user response

## Tests

### 1. Help Screen — 5 Workflow Sections
expected: Open the app and navigate to Help. You should see exactly 5 numbered sections: "Before You Start", "Running a Session", "Fixing Things", "Settings & Preferences", "How It Works" — in that order, each with a blue numbered badge.
result: issue
issues:
  - "Before You Start says '4 players required' — actually only 2 players are needed"
  - "Running a Session has an 'odd number of players' strategy list that doesn't make sense anymore; better to rephrase around editing the matchup"
  - "Fixing Things: 'drag to the bench' needs an explanation that it means the player is sitting out/resting that round"
  - "Fixing Things: 'Change who sits out' paragraph is confusing and unclear"
  - "Fixing Things: missing — should mention you can edit the most recently played round to reflect reality so the app can offer the best future matchups"

### 2. Help Screen — Match Editing Covered
expected: In the "Fixing Things" section, you should see instructions for editing a round: "Tap 'Edit' on any unplayed round. Drag players between courts or to the bench, then tap 'Confirm' to save your changes."
result: pass

### 3. Help Screen — Dark Mode Mentioned
expected: In the "Settings & Preferences" section, you should see a reference to dark mode/light mode — something like "Choose light mode, dark mode, or follow your device's system setting."
result: pass

### 4. Help Screen — No Technical Jargon
expected: Scroll through all 5 Help sections. You should NOT see words like "penalty", "algorithm", "optimization", or "Optimization Settings" anywhere in Help.
result: pass

### 5. Help Screen — Version Footer
expected: At the bottom of Help, there should be a small gray version number line (e.g., "Pickleball Practice Scheduler v1.2.3").
result: pass

### 6. Alternatives Panel — Quality Labels
expected: Generate a round, then tap "Alternatives". The alternative matchup options should be labeled "Best Match", "Good Match", and "Option 3" (for a third option if shown) — NOT "Option 1 (Score: 147)" or any raw numeric score.
result: issue
issues:
  - "Best Match / Good Match work well, but fallback to 'Option 3', 'Option 4' feels inconsistent. User wants a full quality-label sequence: Best Match → Good Match → Okay Match → Meh → Not Great → Bad — no numbered fallback at all"

### 7. RoundDisplay — Empty State Message
expected: If you view the app before any round is generated (or in a fresh session with no rounds), the empty state should read "No rounds yet — tap Generate Round to get started." (Not "Wait, where did the rounds go?")
result: skipped
note: First round is auto-generated on session start — this state is never visible to users in practice.

### 8. Settings — Scheduling Preferences Heading
expected: Open Settings. The section covering partner/opponent fairness sliders should be headed "Scheduling Preferences" — not "Scheduler Optimization".
result: pass
improvement: Help screen blurb about the sliders should note that the specific numbers don't matter much — what matters is how they are relative to each other.

### 9. Settings — Uneven Courts Subheading
expected: In Settings, the subsection about 3-player court strategies should be labeled "Uneven Courts" — not "Short-Sided Matches".
result: pass

### 10. Settings — Plain 3-Player Court Labels
expected: In Settings under the Uneven Courts section, the two radio/option labels should read "Solo on 3-Player Court" and "Pair on 3-Player Court" — not "3-Way Solo" or "3-Way Pair".
result: pass

### 11. SessionSetup — Invert Selection Button
expected: On the player selection screen (where you pick who's playing today), the button that toggles your selection should read "Invert Selection" — not just "Invert".
result: pass

### 12. README — Organizer-First Opening
expected: Visit the GitHub repo page (or open README.md). The very first paragraph after the title should be a plain sentence like "Pickleball Practice Scheduler generates fair, varied round matchups for practice sessions…" — no badge, no bullet list of features at the top.
result: pass

### 13. README — Developer Content Below Rule
expected: In README.md, scrolling down past the organizer content (the plain sentence, launch link, and Help pointer) should reveal a horizontal rule (---), then the CI badge, Tech Stack, Development commands, Credits, and License sections — all intact.
result: issue
issues:
  - "License section is missing a personal note the user had written about not having written the code themselves (AI-assisted), so using the Unlicense felt only fair. Note was not present in the pre-Phase-18 README either — lost in an earlier edit. Should be restored."

## Summary

total: 13
passed: 8
issues: 3
pending: 0
skipped: 1

## Gaps

### GAP-01: Help Screen — "Before You Start" minimum player count
Severity: medium
Source: Test 1
Fix: Change "You need at least 4 players" to reflect the actual minimum (2).

### GAP-02: Help Screen — "Running a Session" odd-player strategy list
Severity: medium
Source: Test 1
Fix: Remove the 3-bullet fallback strategy list. Replace with a note that if the round doesn't look right, tap Edit to rearrange players — same as the Fixing Things section below.

### GAP-03: Help Screen — "Fixing Things" bench explanation
Severity: low
Source: Test 1
Fix: After "drag players between courts or to the bench", add a brief clarification that the bench means the player is sitting out / resting that round.

### GAP-04: Help Screen — "Fixing Things" confusing "Change who sits out" paragraph
Severity: medium
Source: Test 1
Fix: Remove or rewrite the "Tap the sitting-out area on an unplayed round to pick a specific player" paragraph — it's confusing. Consider folding the concept into the Edit workflow or dropping it.

### GAP-05: Help Screen — Missing: editing a played round
Severity: medium
Source: Test 1
Fix: Add a sentence in "Fixing Things" that you can also edit the most recently played round to correct it — so the app can offer the best possible matchups going forward.

### GAP-06: Alternatives Panel — Quality label fallback to "Option N"
Severity: medium
Source: Test 6
Fix: Extend the quality label sequence beyond index 1. Suggested labels: index 0 → "Best Match", 1 → "Good Match", 2 → "Okay Match", 3 → "Meh", 4 → "Not Great", 5+ → "Bad". No numbered fallback.

### GAP-07: Help Screen — Fairness sliders: relative values matter more than absolutes
Severity: low
Source: Test 8
Fix: In the "Settings & Preferences" card, add a note that the exact slider numbers aren't critical — what matters is how they compare to each other.

### GAP-08: README — License section missing personal AI-authorship note
Severity: low
Source: Test 13
Fix: Restore the user's personal note in the License section acknowledging the code was AI-assisted, which is why the Unlicense felt appropriate. User to supply the original wording.
Status: RESOLVED — added "This was entirely vibe coded — I didn't really write any of it, so it felt only fair. (Yes, including this comment.)"
