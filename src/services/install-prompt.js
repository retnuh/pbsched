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
      _stashedEvent = null;
      _notify();
    };

    try {
      window.addEventListener('beforeinstallprompt', _beforeInstallHandler);
      window.addEventListener('appinstalled', _appInstalledHandler);
    } catch (e) { /* window unavailable — service is inert */ }
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
    _stashedEvent = null;
    _subscriber = null;
  },

  isStandalone() {
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        return true;
      }
    } catch (e) { /* matchMedia unavailable */ }
    try {
      if (navigator.standalone === true) return true;
    } catch (e) { /* navigator.standalone may not exist */ }
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
    if (this.isStandalone()) return 'installed';
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

  onChange(callback) {
    _subscriber = typeof callback === 'function' ? callback : null;
    return () => {
      if (_subscriber === callback) _subscriber = null;
    };
  },
};
