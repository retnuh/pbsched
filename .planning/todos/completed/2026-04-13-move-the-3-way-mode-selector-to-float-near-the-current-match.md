---
created: 2026-04-13T22:10:20.904Z
title: Move the 3-way mode selector to float near the current match proposal
area: ui
files: []
---

## Problem

The 3-way mode selector (used for selecting between match proposal options) is currently anchored at the bottom of the screen. This creates a disconnect between where the user is looking (the current match proposal) and where they interact with the mode selector.

## Solution

Reposition the mode selector to float near/adjacent to the current match proposal, so the control is contextually close to the content it affects. Likely a floating/overlay approach that moves with the active proposal.
