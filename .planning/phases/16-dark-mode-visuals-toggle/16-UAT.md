---
status: testing
phase: 16-dark-mode-visuals-toggle
source: [16-01-SUMMARY.md, 16-02-SUMMARY.md, 16-03-SUMMARY.md, 16-04-SUMMARY.md, 16-05-SUMMARY.md]
started: 2026-04-15T01:45:00Z
updated: 2026-04-15T01:45:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 2
name: Settings Page in Dark Mode
expected: |
  With dark mode active, scroll through the Settings page.
  All four existing cards (Scheduler Optimization, Backup & Restore, App Data, About)
  should have dark backgrounds (dark gray, not white) and readable text.
  Range slider tracks should appear dark. The "Import File" and "Paste Data" buttons
  should have a dark blue tint. The reset/danger button should have a dark red tint.
awaiting: user response

## Tests

### 1. Dark Mode Toggle in Settings
expected: |
  Open the app → tap the hamburger/settings icon to reach Settings.
  You should see an "Appearance" card at the very top (above Scheduler Optimization).
  It has three buttons: Auto | Light | Dark.
  The button matching the current system preference should be highlighted/active.
  Tap "Dark" — the entire app should switch to dark immediately with no page reload.
  Tap "Light" — it should switch back to a white/light background immediately.
  Tap "Auto" — it should follow your system's preference.
result: pass

### 2. Settings Page in Dark Mode
expected: |
  With dark mode active, scroll through the Settings page.
  All four existing cards (Scheduler Optimization, Backup & Restore, App Data, About)
  should have dark backgrounds (dark gray, not white) and readable text.
  Range slider tracks should appear dark. The "Import File" and "Paste Data" buttons
  should have a dark blue tint. The reset/danger button should have a dark red tint.
result: pass

### 3. Nav Bar in Dark Mode
expected: |
  With dark mode active, the bottom nav bar should have a dark gray background.
  The active nav icon should appear in blue. Inactive icons should appear muted/gray.
  No white bar visible at the bottom.
result: pending

### 4. Zone Chips in Dark Mode (Round View)
expected: |
  Start or load a session with active rounds. With dark mode on, go to the round display.
  Team A player chips should have a dark navy background with blue border and light blue text.
  Team B player chips should have a dark orange/rust background with orange border and peach text.
  Sitting-out (bench) chips should have a dark gray background with gray text.
  All chip text should be clearly readable — not washed out or invisible.
result: pending

### 5. Round Display in Dark Mode
expected: |
  With dark mode on, view the Rounds screen.
  Round cards should have a dark gray background (not white).
  Unplayed round headers should be a dark blue tint; played round headers should be darker gray.
  Player names should appear in near-white text. Court number badges should be dark with light text.
  The "sitting out" section and its label should be visible and readable.
result: pending

### 6. Match Editor in Dark Mode
expected: |
  During an active round, open the Match Editor (drag/drop court view).
  Court cards should have dark gray backgrounds and visible borders.
  Player name chips in courts should be readable. Bench area should have a dark tint.
  Empty court slots should show as dark dashed-border boxes.
  The "Add Court" button should have a dark blue tint. The bottom bar should be dark.
result: pending

### 7. Bottom-Sheet Modals in Dark Mode
expected: |
  Trigger any confirmation modal (e.g., try to end the session, or delete something).
  The modal sheet should have a dark background — not white.
  It should be centered/capped in width (not stretch edge-to-edge on tablet/wide screens).
  Modal text and buttons should be readable against the dark background.
result: pending

### 8. Bench Badge Sync (MatchEditor)
expected: |
  In the Match Editor, drag a player from a court slot to the bench.
  The sitting-out count badge should appear/update to reflect the bench count.
  Drag that player back to a court slot — the badge should decrement or disappear.
  The badge should stay in sync after multiple drags without refreshing.
result: pending

### 9. Club Manager in Dark Mode
expected: |
  Navigate to Club Manager with dark mode on.
  Club cards should have dark backgrounds. The active/selected club should show a blue border.
  Club names should be in near-white text. The member count should be readable.
  The "New club" form at the bottom should have a dark blue tint with a dark input field.
result: pending

### 10. Member Editor & Session Setup in Dark Mode
expected: |
  Open Member Editor — member rows should have dark backgrounds with readable text.
  The rename (pencil) and remove (trash) icon buttons should be visible.
  Open Session Setup — attendee rows should have dark backgrounds.
  Member names should appear in near-white; "last played" sub-text should be muted gray.
  The sticky "Start Session" button bar at the bottom should be dark.
result: pending

### 11. Paste Data Uses Inline Modal (No Browser Prompt)
expected: |
  In Settings → Backup & Restore, tap "Paste Data".
  A bottom-sheet modal should appear with a textarea and a Confirm button.
  No native browser prompt dialog should appear. If you cancel/dismiss, the sheet closes.
result: pending

## Summary

total: 11
passed: 0
issues: 0
pending: 11
skipped: 0

## Gaps

[none yet]
