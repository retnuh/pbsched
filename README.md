# Pickleball Practice Scheduler (pbsched)

[![Deploy static content to Pages](https://github.com/retnuh/pbsched/actions/workflows/deploy.yml/badge.svg)](https://github.com/retnuh/pbsched/actions/workflows/deploy.yml)

A lightweight, mobile-first Progressive Web App (PWA) designed to help pickleball organizers manage practice sessions. It handles the "brain-melting" part of rotation—ensuring varied partners and opponents while maintaining fairness for players sitting out.

**[🚀 Launch the Web App](https://retnuh.github.io/pbsched/)**

## ✨ Features

- **Smart Matchups:** Uses an optimization algorithm to minimize repeat partners and back-to-back opponents.
- **Odd-Count Mastery:** Native support for 2v1 (3-player) and 1v1 (2-player) courts to keep everyone playing.
- **Manual Control:** Easily override who sits out or swap a specific round for an optimized alternative.
- **Mobile First:** Optimized for iOS and Android with "Add to Home Screen" support and full offline functionality.
- **Privacy Focused:** Your data stays on your device (localStorage). No servers, no tracking.
- **Backup & Restore:** Share your club data via the native mobile share sheet or a simple JSON paste.

## 🛠 Tech Stack

- **Framework:** Vanilla JavaScript (ES Modules)
- **Bundler:** [Vite 8](https://vitejs.dev/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Testing:** [Vitest](https://vitest.dev/)
- **PWA:** Custom Service Worker implementation for offline caching.

## 🚀 Development

```bash
# Install dependencies
just install

# Start development server
just dev

# Run tests
just test

# Build and Deploy
just deploy
```

## 🙏 Credits

This project was built with a collaborative AI workflow:

- **[GSD (Get Shit Done)](https://github.com/retnuh/gsd):** The foundational methodology and system prompts that orchestrated the development.
- **[Google Gemini](https://gemini.google.com/):** For high-speed context handling, architectural decisions, and the heavy lifting of the initial implementation.
- **[Anthropic Claude](https://claude.ai/):** For the initial project research, UX brainstorming, and high-fidelity project specification.

---
*Built for the love of the game. See you on the courts!*
