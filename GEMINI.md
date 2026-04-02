# Project Mandates: Pickleball Practice Scheduler

This file contains foundational instructions for AI agents working on this project. These mandates take absolute precedence over general defaults.

## 📋 Documentation First
- **Mandate:** All planning documents (`ROADMAP.md`, `STATE.md`, `PLAN.md`) **MUST** be updated to reflect current progress and future intent **BEFORE** any code changes are committed or published to GitHub.
- **Rationale:** Ensures the project state remains the "source of truth" for collaborative development and provides clear context for future sessions.

## 🚀 Deployment Discipline
- **Mandate:** Always run `npm run build` locally before pushing to verify the production bundle.
- **Mandate:** Use the `just deploy` command to ensure the `check` (install, test, build) suite passes before pushing to the main branch.

## 📱 Mobile Integrity
- **Mandate:** Prioritize the mobile experience. Any new feature must be verified against the `fixed-safe-bottom` layout and ensure haptic feedback is integrated where appropriate.
