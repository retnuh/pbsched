---
created: 2026-04-13T22:10:20.904Z
title: Add tests for player changes preserving played match state
area: testing
files: []
---

## Problem

When players are added or removed after some matches have already been played in a session, the current state of those played matches (scores, results) should be preserved. There are no tests verifying this invariant, leaving it vulnerable to regression.

## Solution

Add tests that:
1. Start a session and play/record some matches
2. Modify the player roster (add and/or remove players)
3. Assert that previously played matches retain their recorded state (scores, winners, etc.)
4. Assert that only unplayed matches are affected by the roster change
