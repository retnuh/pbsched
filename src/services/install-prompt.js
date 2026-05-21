/**
 * InstallPromptService
 * Single source of truth for "can the user install this PWA?".
 *
 * State machine for getStatus():
 *   'installable'       — beforeinstallprompt fired, app is not in standalone
 *   'ios-instructions'  — iOS Safari, not in standalone, no beforeinstallprompt API
 *   'installed'         — running in standalone (display-mode or navigator.standalone)
 *   'unsupported'       — none of the above
 *
 * The beforeinstallprompt event fires on `window` once per page load when the
 * browser deems the PWA installable. We must call preventDefault() to suppress
 * the built-in mini-infobar so the app can present its own UI later. The event
 * is stashed and later replayed via .prompt() when the user taps the button.
 */

let _stashedEvent = null;
let _subscriber = null;
let _beforeInstallHandler = null;
let _appInstalledHandler = null;
let _displayModeListeners = []; // { mql, handler } for cleanup in destroy()

const DISPLAY_MODE_QUERIES = [
  '(display-mode: standalone)',
  '(display-mode: fullscreen)',
  '(display-mode: minimal-ui)',
  '(display-mode: window-controls-overlay)',
];

// Persisted across reloads: once the user installs (via our button OR the
// browser fires 'appinstalled' OR our prompt resolves 'accepted'), remember
// that so future visits hide the button even if Brave/Chromium re-fires
// beforeinstallprompt or matchMedia('(display-mode: standalone)') reports
// false in the standalone window for whatever reason.
const INSTALLED_KEY = 'pb:install-completed';

function _setInstalled() {
  try { localStorage.setItem(INSTALLED_KEY, '1'); } catch (e) { /* storage unavailable */ }
}

function _wasInstalled() {
  try { return localStorage.getItem(INSTALLED_KEY) === '1'; } catch (e) { return false; }
}

function _notify() {
  if (typeof _subscriber === 'function') {
    try { _subscriber(); } catch (e) { /* subscriber errors must not break the service */ }
  }
}

export const InstallPromptService = {
  init() {
    // Idempotent: remove stale listeners before re-registering (mirror theme.js).
    if (_beforeInstallHandler) {
      try { window.removeEventListener('beforeinstallprompt', _beforeInstallHandler); } catch (e) { /* noop */ }
    }
    if (_appInstalledHandler) {
      try { window.removeEventListener('appinstalled', _appInstalledHandler); } catch (e) { /* noop */ }
    }

    _beforeInstallHandler = (event) => {
      try { event.preventDefault(); } catch (e) { /* some browsers may not require this */ }
      _stashedEvent = event;
      _notify();
    };

    _appInstalledHandler = () => {
      _setInstalled();
      _stashedEvent = null;
      _notify();
    };

    try {
      window.addEventListener('beforeinstallprompt', _beforeInstallHandler);
      window.addEventListener('appinstalled', _appInstalledHandler);
    } catch (e) { /* window unavailable — service is inert */ }

    // Brave (and some Chromium variants) don't set the standalone display
    // mode until AFTER beforeinstallprompt fires, so the initial syncInstallBtn
    // sees status='installable' and shows the button — then no event re-syncs
    // when display-mode finally flips to fullscreen/standalone. Listen for
    // those media query changes so the UI re-evaluates getStatus().
    //
    // Crucially: do NOT persist the install flag from display-mode signals.
    // Brave sometimes reports standalone-ish display modes in regular browser
    // tabs too, which would trap the button hidden forever even when the user
    // genuinely wants to install. Persistence is only triggered by the
    // explicit `appinstalled` event or a 'accepted' promptInstall outcome.
    for (const q of DISPLAY_MODE_QUERIES) {
      try {
        const mql = window.matchMedia(q);
        if (typeof mql.addEventListener === 'function') {
          mql.addEventListener('change', _notify);
          _displayModeListeners.push({ mql, handler: _notify });
        }
      } catch (e) { /* matchMedia or specific query unavailable — skip */ }
    }
  },

  destroy() {
    if (_beforeInstallHandler) {
      try { window.removeEventListener('beforeinstallprompt', _beforeInstallHandler); } catch (e) { /* noop */ }
      _beforeInstallHandler = null;
    }
    if (_appInstalledHandler) {
      try { window.removeEventListener('appinstalled', _appInstalledHandler); } catch (e) { /* noop */ }
      _appInstalledHandler = null;
    }
    for (const { mql, handler } of _displayModeListeners) {
      try { mql.removeEventListener('change', handler); } catch (e) { /* noop */ }
    }
    _displayModeListeners = [];
    _stashedEvent = null;
    _subscriber = null;
  },

  isStandalone() {
    // Only trust '(display-mode: standalone)'. Brave on macOS reports
    // 'fullscreen' for regular browser tabs that have a PWA manifest, which
    // would trap users by hiding the install button in every tab. Real
    // Chromium-launched PWAs match 'standalone' (since our manifest declares
    // display: standalone). The cost: Brave's launched PWA reports fullscreen
    // too and won't be detected here — but after install the appinstalled
    // event sets pb:install-completed and that takes over.
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        return true;
      }
    } catch (e) { /* matchMedia unavailable */ }
    try {
      if (navigator.standalone === true) return true;
    } catch (e) { /* navigator.standalone may not exist */ }
    try {
      // Android Trusted Web Activity launches the page with this referrer.
      if (document.referrer && document.referrer.startsWith('android-app://')) return true;
    } catch (e) { /* document.referrer unavailable */ }
    return false;
  },

  isIOSSafari() {
    try {
      const ua = navigator.userAgent || '';
      const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
      // 'standalone' in navigator distinguishes real iOS Safari from in-app
      // browsers (Instagram, FB) which lack the standalone property entirely.
      const hasStandaloneProp = 'standalone' in navigator;
      const noMSStream = !window.MSStream;
      return isIOSDevice && hasStandaloneProp && noMSStream;
    } catch (e) {
      return false;
    }
  },

  getStatus() {
    if (this.isStandalone() || _wasInstalled()) return 'installed';
    if (_stashedEvent) return 'installable';
    if (this.isIOSSafari()) return 'ios-instructions';
    return 'unsupported';
  },

  async promptInstall() {
    if (!_stashedEvent) {
      return { outcome: 'unavailable' };
    }
    const evt = _stashedEvent;
    try {
      const promptResult = evt.prompt();
      // .prompt() returns a Promise in modern browsers; await it defensively.
      if (promptResult && typeof promptResult.then === 'function') {
        await promptResult;
      }
      const choice = await evt.userChoice;
      const outcome = choice && choice.outcome ? choice.outcome : 'dismissed';
      if (outcome === 'accepted') {
        _setInstalled();
        _stashedEvent = null;
        _notify();
      }
      // On dismissed, keep the stashed event so the user can retry by tapping again.
      return { outcome };
    } catch (e) {
      // If prompt() throws (already used, browser rejected, etc.), drop the event.
      _stashedEvent = null;
      _notify();
      return { outcome: 'unavailable' };
    }
  },

  // Manual dismiss path — sets the persisted install flag so the button stays
  // hidden across reloads. Used as an escape hatch for browsers (Brave) that
  // don't fire appinstalled or report display-mode correctly, leaving the
  // button stuck visible after install.
  markDismissed() {
    _setInstalled();
    _stashedEvent = null;
    _notify();
  },

  onChange(callback) {
    _subscriber = typeof callback === 'function' ? callback : null;
    return () => {
      if (_subscriber === callback) _subscriber = null;
    };
  },
};
