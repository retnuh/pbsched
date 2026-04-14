import { expect, test, describe, beforeEach, vi } from 'vitest'
import { StorageAdapter } from './storage.js'

describe('StorageAdapter', () => {
  beforeEach(() => {
    // Mock localStorage
    const storage = {}
    vi.stubGlobal('localStorage', {
      getItem: (key) => storage[key] || null,
      setItem: (key, value) => { storage[key] = value },
      clear: () => { Object.keys(storage).forEach(k => delete storage[k]) }
    })
  })

  test('initializes with default state if empty', () => {
    const rawState = StorageAdapter.getRawState()
    expect(rawState.schemaVersion).toBe(1)
    expect(rawState.clubs).toEqual([])
    expect(rawState.sessions).toEqual([])
    expect(rawState.settings.candidateCount).toBe(200)
  })

  test('get and set work as expected', () => {
    StorageAdapter.set('testKey', 'testValue')
    expect(StorageAdapter.get('testKey')).toBe('testValue')
  })

  test('reset works', () => {
    StorageAdapter.set('clubs', ['my club'])
    StorageAdapter.reset()
    expect(StorageAdapter.get('clubs')).toEqual([])
    expect(StorageAdapter.get('schemaVersion')).toBe(1)
  })
})
