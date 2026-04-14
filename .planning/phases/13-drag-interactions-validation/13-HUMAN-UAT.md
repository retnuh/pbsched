---
status: partial
phase: 13-drag-interactions-validation
source: [13-VERIFICATION.md]
started: 2026-04-14T00:00:00Z
updated: 2026-04-14T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Drag chip to empty slot
expected: long-press 150ms delay, then drag player chip to an empty column slot — chip moves to new position
result: [pending]

### 2. Swap on occupied slot
expected: drag chip onto another occupied chip — instant swap, both players switch positions
result: [pending]

### 3. Drag court chip to bench
expected: drag a court chip to the Rest Bench zone — chip appears in bench, court slot empties
result: [pending]

### 4. Drag bench chip to court
expected: drag a bench chip into a court slot — chip moves from bench into court position
result: [pending]

### 5. Confirm/Cancel full paths
expected: 
  - Confirm (valid): saves round via SessionService.updateRound and navigates to /active
  - Cancel (no changes): navigates directly to /active, no dialog
  - Cancel (with changes): shows browser confirm() dialog before discarding
result: [pending]

### 6. Visual drag highlight
expected: dragged chip is semi-transparent with dashed blue border (ghost); destination slot highlights during hover
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
