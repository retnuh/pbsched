# Phase 7 Plan: PWA & Offline Support

## Goal
Ensure the app works perfectly at courts with zero connectivity.

## Tasks

### 1. Service Worker Implementation
- [x] Install `vite-plugin-pwa` (Note: Manual SW used due to Vite 8 compat)
- [x] Configure Vite to cache all assets (JS, CSS, HTML, SVG).
- [x] Add update logic to `main.js` to notify users when a new version is available.

### 2. PWA Manifest Refinement
- [x] Ensure `manifest.json` has all required fields for "Install" prompt.
- [x] Verify icons and theme colors.

### 3. State Robustness
- [x] Audit `StorageAdapter` to ensure data is saved immediately on every change.
- [x] (Optional) Add a visual "Saved" or "Syncing" indicator if helpful.

## Verification Plan
- [x] Build the app (`npm run build`).
- [x] Serve the build (`npm run preview`).
- [x] Use Chrome DevTools to go "Offline".
- [x] Refresh the page; verify the app still loads and functions completely.
