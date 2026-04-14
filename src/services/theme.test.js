import { describe, it, vi, expect, beforeEach } from 'vitest'
import { ThemeService } from './theme.js'

// Helper: sets up a matchMedia mock on window.
// matches: true  → system prefers dark
// matches: false → system prefers light
function mockMatchMedia(matches) {
  const addListenerMock = vi.fn()
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: addListenerMock,
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  return addListenerMock
}

describe('ThemeService — DARK-01: system preference detection', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
    mockMatchMedia(false)
    localStorage.removeItem('pb:theme')
  })

  it('adds dark class when mode is auto and system prefers dark', () => {
    mockMatchMedia(true)
    ThemeService.setMode('auto')
    ThemeService.applyTheme()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('does not add dark class when mode is auto and system prefers light', () => {
    mockMatchMedia(false)
    ThemeService.setMode('auto')
    ThemeService.applyTheme()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('calls applyTheme when OS changes to dark in auto mode', () => {
    const addListenerMock = vi.fn()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: addListenerMock,
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    ThemeService.setMode('auto')
    ThemeService.init()
    // get the change callback registered by init()
    const [eventName, callback] = addListenerMock.mock.calls[0]
    expect(eventName).toBe('change')
    // simulate OS switching to dark
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    })
    callback()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('does not toggle class when mode is light and OS changes to dark', () => {
    const addListenerMock = vi.fn()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: addListenerMock,
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    ThemeService.setMode('light')
    ThemeService.init()
    // get the change callback registered by init() if any
    // even if no listener registered, simulate the OS change
    if (addListenerMock.mock.calls.length > 0) {
      const [, callback] = addListenerMock.mock.calls[0]
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
      })
      callback()
    }
    // manual override (light) should win — no dark class
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})

describe('ThemeService — DARK-04: persistence', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
    mockMatchMedia(false)
    localStorage.removeItem('pb:theme')
  })

  it('setMode("dark") writes "dark" to localStorage key pb:theme', () => {
    ThemeService.setMode('dark')
    expect(localStorage.getItem('pb:theme')).toBe('dark')
  })

  it('setMode("light") writes "light" to localStorage key pb:theme', () => {
    ThemeService.setMode('light')
    expect(localStorage.getItem('pb:theme')).toBe('light')
  })

  it('setMode("auto") writes "auto" to localStorage key pb:theme', () => {
    ThemeService.setMode('auto')
    expect(localStorage.getItem('pb:theme')).toBe('auto')
  })

  it('getMode() returns "auto" when pb:theme key is absent from localStorage', () => {
    localStorage.removeItem('pb:theme')
    expect(ThemeService.getMode()).toBe('auto')
  })

  it('getMode() returns the stored value when pb:theme is set to "dark"', () => {
    localStorage.setItem('pb:theme', 'dark')
    expect(ThemeService.getMode()).toBe('dark')
  })

  it('setMode with invalid value does NOT write to localStorage', () => {
    localStorage.removeItem('pb:theme')
    ThemeService.setMode('invalid')
    expect(localStorage.getItem('pb:theme')).toBeNull()
  })
})

describe('ThemeService — DARK-01 + DARK-04: applyTheme()', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
    mockMatchMedia(false)
    localStorage.removeItem('pb:theme')
  })

  it('adds dark class when stored mode is "dark" regardless of system pref', () => {
    mockMatchMedia(false) // system prefers light
    ThemeService.setMode('dark')
    ThemeService.applyTheme()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes dark class when stored mode is "light" regardless of system pref', () => {
    mockMatchMedia(true) // system prefers dark
    document.documentElement.classList.add('dark') // start with dark
    ThemeService.setMode('light')
    ThemeService.applyTheme()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
