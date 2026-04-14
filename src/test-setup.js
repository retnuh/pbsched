// src/test-setup.js
// Patches globalThis.localStorage before any ES module runs.
// Required: happy-dom 20.x / vitest 4.x provides localStorage as a plain object
// with no method implementations (getItem, setItem are undefined).
// storage.js calls initStorage() at module scope (line 85), so beforeEach stubs are too late.
const _store = {}
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key) => _store[key] ?? null,
    setItem: (key, value) => { _store[key] = String(value) },
    removeItem: (key) => { delete _store[key] },
    clear: () => { Object.keys(_store).forEach(k => delete _store[k]) },
    get length() { return Object.keys(_store).length },
  },
  writable: true,
  configurable: true,
})

// Clear _store before every test to prevent state bleeding across test files.
// StorageAdapter.reset() is called per-suite (e.g. session.test.js) after this wipe.
// Do NOT import StorageAdapter here — storage.js runs initStorage() at module scope,
// which would execute before the localStorage patch above is applied.
import { beforeEach } from 'vitest'
beforeEach(() => {
  Object.keys(_store).forEach(k => delete _store[k])
})

// window.matchMedia is not implemented in happy-dom 20.x — mock it globally.
// Default: system prefers light (matches: false).
// Individual tests that need system-dark behavior override with:
//   Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(...) })
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})
