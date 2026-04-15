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
    // Remove stale listener before re-registering to avoid duplicates on repeated init() calls
    if (_mediaQuery && _mediaListener) {
      _mediaQuery.removeEventListener('change', _mediaListener);
    }
    this.applyTheme();
    try {
      _mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      _mediaListener = (evt) => {
        if (this.getMode() === 'auto') {
          // Use the event's matches value when available (avoids a redundant matchMedia() call);
          // fall back to applyTheme() for environments that don't pass the event.
          if (evt && typeof evt.matches === 'boolean') {
            document.documentElement.classList.toggle('dark', evt.matches);
          } else {
            this.applyTheme();
          }
        }
      };
      _mediaQuery.addEventListener('change', _mediaListener);
    } catch (e) { /* matchMedia unavailable — do nothing */ }
  },

  /**
   * Sets the theme mode and applies it immediately.
   *
   * NOTE (15-MD-02): If localStorage.setItem throws (private browsing or quota exceeded),
   * applyTheme() is still called so the UI reflects the choice for this session.
   * However, getMode() will return 'auto' on the next call since the value was not persisted.
   */
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

  destroy() {
    if (_mediaQuery && _mediaListener) {
      _mediaQuery.removeEventListener('change', _mediaListener);
      _mediaQuery = null;
      _mediaListener = null;
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
        isDark = (_mediaQuery ?? window.matchMedia('(prefers-color-scheme: dark)')).matches;
      } catch (e) {
        isDark = false; // safe default: light
      }
    }
    document.documentElement.classList.toggle('dark', isDark);
  },
};
