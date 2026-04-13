# Project State: Pickleball Practice Scheduler

## Current Position

Phase: Phase 8 — Club name editing
Plan: —
Status: Ready to plan
Last activity: 2026-04-13 — Milestone 6 roadmap created

## Milestone: Milestone 6 — UX Polish & Scheduler Improvements

## Accumulated Context

- App is a full-featured, offline-capable PWA with haptic feedback, automated versioning, and a seamless update flow (completed Milestone 5)
- Scheduler uses random-generate + score candidates with penalty-based variety optimization
- localStorage only — no backend
- Mobile-first (organizer's phone)
- Phase 8: inline club name edit in MemberEditor view; 16px minimum font size to prevent iOS Safari auto-zoom
- Phase 9: Vitest tests for mid-session roster changes not mutating played round state
- Phase 10: configurable penalties for singles and 3-way short-sided matches; backward-compatible schema (sessions without penalty values fall back to defaults)
