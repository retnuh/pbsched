import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest'
import { InstallPromptService } from './install-prompt.js'

// Helper: build a synthetic beforeinstallprompt event with stubbed methods.
function makeBeforeInstallPromptEvent({ userChoice } = {}) {
  const evt = new Event('beforeinstallprompt')
  evt.preventDefault = vi.fn()
  evt.prompt = vi.fn(() => Promise.resolve())
  evt.userChoice = userChoice ?? Promise.resolve({ outcome: 'dismissed', platform: 'web' })
  return evt
}

// Helper: replace window.matchMedia with a controllable mock. Returns a
// `fire(query)` helper to simulate display-mode change events arriving after
// the page has loaded (the Brave-on-macOS scenario).
function mockMatchMedia(matchesByQuery) {
  const matchesRef = { ...matchesByQuery }
  const listeners = new Map() // query -> Set<handler>
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query) => ({
      get matches() { return matchesRef[query] ?? false },
      media: query,
      onchange: null,
      addEventListener: vi.fn((event, handler) => {
        if (event !== 'change') return
        if (!listeners.has(query)) listeners.set(query, new Set())
        listeners.get(query).add(handler)
      }),
      removeEventListener: vi.fn((event, handler) => {
        if (event !== 'change') return
        listeners.get(query)?.delete(handler)
      }),
      dispatchEvent: vi.fn(),
    })),
  })
  return {
    set(query, value) { matchesRef[query] = value },
    fire(query) { listeners.get(query)?.forEach(h => h()) },
  }
}

// Snapshot navigator properties we may mutate so we can restore them between tests.
const originalUserAgentDescriptor = Object.getOwnPropertyDescriptor(navigator, 'userAgent')
const originalStandaloneDescriptor = Object.getOwnPropertyDescriptor(navigator, 'standalone')
const originalMSStreamDescriptor = Object.getOwnPropertyDescriptor(window, 'MSStream')

function setUserAgent(ua) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
}

function setNavigatorStandalone(value) {
  Object.defineProperty(navigator, 'standalone', { value, configurable: true, writable: true })
}

function clearNavigatorStandalone() {
  // Delete to make `'standalone' in navigator` false (non-iOS environment).
  try { delete navigator.standalone } catch (e) { /* ignore */ }
}

beforeEach(() => {
  InstallPromptService.destroy()
  // Default: non-iOS, non-standalone, default desktop UA, no matchMedia matches.
  mockMatchMedia({ '(display-mode: standalone)': false })
  setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36')
  clearNavigatorStandalone()
  try { delete window.MSStream } catch (e) { /* ignore */ }
  try { localStorage.removeItem('pb:install-completed') } catch (e) { /* ignore */ }
})

afterEach(() => {
  InstallPromptService.destroy()
  // Restore navigator/window mutations.
  if (originalUserAgentDescriptor) Object.defineProperty(navigator, 'userAgent', originalUserAgentDescriptor)
  if (originalStandaloneDescriptor) {
    Object.defineProperty(navigator, 'standalone', originalStandaloneDescriptor)
  } else {
    try { delete navigator.standalone } catch (e) { /* ignore */ }
  }
  if (originalMSStreamDescriptor) {
    Object.defineProperty(window, 'MSStream', originalMSStreamDescriptor)
  } else {
    try { delete window.MSStream } catch (e) { /* ignore */ }
  }
})

describe('InstallPromptService — beforeinstallprompt capture', () => {
  it('Test 1: captures beforeinstallprompt and reports installable status', () => {
    InstallPromptService.init()
    const evt = makeBeforeInstallPromptEvent()
    window.dispatchEvent(evt)
    expect(InstallPromptService.getStatus()).toBe('installable')
  })

  it('Test 2: calls preventDefault() when beforeinstallprompt fires', () => {
    InstallPromptService.init()
    const evt = makeBeforeInstallPromptEvent()
    window.dispatchEvent(evt)
    expect(evt.preventDefault).toHaveBeenCalledTimes(1)
  })

  it('Test 3: appinstalled clears stashed event, persists flag, and notifies subscriber', () => {
    InstallPromptService.init()
    const subscriber = vi.fn()
    InstallPromptService.onChange(subscriber)

    const evt = makeBeforeInstallPromptEvent()
    window.dispatchEvent(evt)
    expect(InstallPromptService.getStatus()).toBe('installable')

    window.dispatchEvent(new Event('appinstalled'))
    expect(InstallPromptService.getStatus()).toBe('installed')
    expect(localStorage.getItem('pb:install-completed')).toBe('1')
    // Subscriber was called for both capture and install events.
    expect(subscriber).toHaveBeenCalledTimes(2)
  })
})

describe('InstallPromptService — iOS Safari branching', () => {
  it('Test 4: returns "ios-instructions" on iOS Safari without beforeinstallprompt', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
    setNavigatorStandalone(false)
    InstallPromptService.init()
    expect(InstallPromptService.getStatus()).toBe('ios-instructions')
  })
})

describe('InstallPromptService — standalone detection', () => {
  it('Test 5: returns "installed" when matchMedia(display-mode: standalone) matches', () => {
    mockMatchMedia({ '(display-mode: standalone)': true })
    InstallPromptService.init()
    expect(InstallPromptService.getStatus()).toBe('installed')
    expect(InstallPromptService.isStandalone()).toBe(true)
  })

  it('Test 6: returns "installed" when navigator.standalone is true (iOS installed)', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1')
    setNavigatorStandalone(true)
    InstallPromptService.init()
    expect(InstallPromptService.getStatus()).toBe('installed')
  })

  it('Test 6b: does NOT treat fullscreen/minimal-ui/wco as standalone (Brave reports these for regular tabs)', () => {
    // Brave on macOS reports display-mode: fullscreen even for regular browser
    // tabs that have a PWA manifest. If we treated those as standalone we'd
    // hide the install button in every tab and trap users. Only the explicit
    // 'standalone' media query (or navigator.standalone for iOS) counts.
    for (const mode of [
      '(display-mode: fullscreen)',
      '(display-mode: minimal-ui)',
      '(display-mode: window-controls-overlay)',
    ]) {
      InstallPromptService.destroy()
      mockMatchMedia({ [mode]: true })
      InstallPromptService.init()
      expect(InstallPromptService.isStandalone(), `display mode ${mode}`).toBe(false)
    }
  })

  it('Test 6c: returns "installed" when persisted install flag is set (Brave standalone reports false)', () => {
    // Even if matchMedia and navigator.standalone both report false (Brave quirk),
    // a previously-stored install flag should still hide the button.
    localStorage.setItem('pb:install-completed', '1')
    InstallPromptService.init()
    // beforeinstallprompt may even re-fire inside the standalone window
    window.dispatchEvent(makeBeforeInstallPromptEvent())
    expect(InstallPromptService.getStatus()).toBe('installed')
  })

  it('Test 6d: re-syncs (without persisting) when display-mode flips to standalone AFTER beforeinstallprompt', () => {
    // Race: page loads with display-mode unset, beforeinstallprompt fires
    // (status='installable'), then display-mode flips to standalone. The
    // media-query listener must re-notify so the UI re-evaluates.
    const mm = mockMatchMedia({})
    InstallPromptService.init()
    const subscriber = vi.fn()
    InstallPromptService.onChange(subscriber)

    window.dispatchEvent(makeBeforeInstallPromptEvent())
    expect(InstallPromptService.getStatus()).toBe('installable')

    mm.set('(display-mode: standalone)', true)
    mm.fire('(display-mode: standalone)')

    expect(InstallPromptService.getStatus()).toBe('installed')
    expect(subscriber).toHaveBeenCalledTimes(2)
    // Display-mode signals never persist — only appinstalled / accepted prompt.
    expect(localStorage.getItem('pb:install-completed')).toBeNull()
  })

  it('Test 6e: display-mode-only signal does NOT persist the install flag', () => {
    mockMatchMedia({ '(display-mode: standalone)': true })
    InstallPromptService.init()
    InstallPromptService.getStatus()
    expect(localStorage.getItem('pb:install-completed')).toBeNull()
  })
})

describe('InstallPromptService — promptInstall()', () => {
  it('Test 7: accepted path drops stashed event, persists flag, and resolves accepted', async () => {
    InstallPromptService.init()
    const evt = makeBeforeInstallPromptEvent({
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    })
    window.dispatchEvent(evt)
    expect(InstallPromptService.getStatus()).toBe('installable')

    const result = await InstallPromptService.promptInstall()
    expect(result).toEqual({ outcome: 'accepted' })
    expect(evt.prompt).toHaveBeenCalledTimes(1)
    expect(InstallPromptService.getStatus()).toBe('installed')
    expect(localStorage.getItem('pb:install-completed')).toBe('1')
  })

  it('Test 8: dismissed path preserves stashed event for a retry', async () => {
    InstallPromptService.init()
    const evt = makeBeforeInstallPromptEvent({
      userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
    })
    window.dispatchEvent(evt)

    const result = await InstallPromptService.promptInstall()
    expect(result).toEqual({ outcome: 'dismissed' })
    expect(InstallPromptService.getStatus()).toBe('installable')
  })

  it('Test 9: resolves "unavailable" when no event has been captured', async () => {
    InstallPromptService.init()
    const result = await InstallPromptService.promptInstall()
    expect(result).toEqual({ outcome: 'unavailable' })
  })
})

describe('InstallPromptService — subscriber lifecycle', () => {
  it('Test 10: onChange subscriber fires on capture and install events', () => {
    InstallPromptService.init()
    const subscriber = vi.fn()
    InstallPromptService.onChange(subscriber)

    window.dispatchEvent(makeBeforeInstallPromptEvent())
    expect(subscriber).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new Event('appinstalled'))
    expect(subscriber).toHaveBeenCalledTimes(2)
  })

  it('Test 11: init() is idempotent — no double-handling of a single event', () => {
    InstallPromptService.init()
    InstallPromptService.init()
    const subscriber = vi.fn()
    InstallPromptService.onChange(subscriber)

    window.dispatchEvent(makeBeforeInstallPromptEvent())
    expect(subscriber).toHaveBeenCalledTimes(1)
  })
})
