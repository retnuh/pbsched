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

// Helper: replace window.matchMedia with a controllable mock.
function mockMatchMedia(matchesByQuery) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: matchesByQuery[query] ?? false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
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

  it('Test 3: appinstalled clears stashed event and notifies subscriber', () => {
    InstallPromptService.init()
    const subscriber = vi.fn()
    InstallPromptService.onChange(subscriber)

    const evt = makeBeforeInstallPromptEvent()
    window.dispatchEvent(evt)
    expect(InstallPromptService.getStatus()).toBe('installable')

    window.dispatchEvent(new Event('appinstalled'))
    expect(InstallPromptService.getStatus()).not.toBe('installable')
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
})

describe('InstallPromptService — promptInstall()', () => {
  it('Test 7: accepted path drops stashed event and resolves accepted', async () => {
    InstallPromptService.init()
    const evt = makeBeforeInstallPromptEvent({
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    })
    window.dispatchEvent(evt)
    expect(InstallPromptService.getStatus()).toBe('installable')

    const result = await InstallPromptService.promptInstall()
    expect(result).toEqual({ outcome: 'accepted' })
    expect(evt.prompt).toHaveBeenCalledTimes(1)
    expect(InstallPromptService.getStatus()).not.toBe('installable')
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
