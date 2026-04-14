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
