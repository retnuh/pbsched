---
created: 2026-04-13T22:10:20.904Z
title: Add scheduling penalties for singles and 3-way solo matches
area: general
files: []
---

## Problem

The scheduler doesn't currently penalize players who have already been in disadvantaged match formats (singles, or being the solo member of a 3-way match). This causes some players to repeatedly get scheduled into these formats even when others haven't experienced them yet.

## Solution

Introduce configurable penalty scores applied to the scheduling cost function:

- **Singles match**: +20 penalty (default) for each player who has played a singles match this session
- **3-way match — solo side**: +25 penalty (default) for the player who was the lone member on one side of a 3-way match
- **3-way match — pair side**: +20 penalty (default) for the two players who were on the pair side of a 3-way match

Penalties accumulate per session so players with more disadvantaged-format experience are increasingly deprioritized for those formats. Penalty values should be configurable (club settings or session settings).
