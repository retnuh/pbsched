/**
 * ThemeService
 * Manages dark/light/auto theme preference — the single point of access for theme operations.
 * Reads and writes preference directly to localStorage at key 'pb:theme'.
 * Callers (Phase 16 Settings toggle) use setMode() and getMode() — never localStorage directly.
 */

const THEME_KEY = 'pb:theme';
const VALID_MODES = ['auto', 'light', 'dark'];

let _mediaQuery = null;
let _mediaListener = null;

export const ThemeService = {
  init() {
    this.applyTheme();
    try {
      _mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      _mediaListener = () => {
        if (this.getMode() === 'auto') {
          this.applyTheme();
        }
      };
      _mediaQuery.addEventListener('change', _mediaListener);
    } catch (e) { /* matchMedia unavailable — do nothing */ }
  },

  setMode(mode) {
    if (!VALID_MODES.includes(mode)) return;
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch (e) { /* quota or private browsing — best effort */ }
    this.applyTheme();
  },

  getMode() {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      return VALID_MODES.includes(stored) ? stored : 'auto';
    } catch (e) {
      return 'auto';
    }
  },

  applyTheme() {
    const mode = this.getMode();
    let isDark;
    if (mode === 'dark') {
      isDark = true;
    } else if (mode === 'light') {
      isDark = false;
    } else {
      // 'auto' or unset — follow system preference
      try {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } catch (e) {
        isDark = false; // safe default: light
      }
    }
    document.documentElement.classList.toggle('dark', isDark);
  },
};
