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
    expect(rawState.schemaVersion).toBe(2)
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
    expect(StorageAdapter.get('schemaVersion')).toBe(2)
  })

  test('migrates from v1 to v2: adds penaltySingles, penaltyThreeWaySolo, penaltyThreeWayPair defaults', () => {
    StorageAdapter.importData({
      schemaVersion: 1,
      settings: {
        penaltyRepeatedPartner: 5,
        penaltyRepeatedOpponent: 10,
        penaltyRepeatedSitOut: 3,
        candidateCount: 200,
        topNToShow: 3,
        oddPlayerFallback: 'three-player-court',
      },
    })
    const state = StorageAdapter.getRawState()
    expect(state.settings.penaltySingles).toBe(15)
    expect(state.settings.penaltyThreeWaySolo).toBe(20)
    expect(state.settings.penaltyThreeWayPair).toBe(15)
  })

  test('migrates from v1 to v2: preserves existing settings keys', () => {
    StorageAdapter.importData({
      schemaVersion: 1,
      settings: {
        penaltyRepeatedPartner: 5,
        penaltyRepeatedOpponent: 10,
        penaltyRepeatedSitOut: 3,
        candidateCount: 200,
        topNToShow: 3,
        oddPlayerFallback: 'three-player-court',
      },
    })
    const state = StorageAdapter.getRawState()
    expect(state.settings.penaltyRepeatedPartner).toBe(5)
  })

  test('migrates from v0 (fresh install) to v2: ends up with all 3 new defaults', () => {
    StorageAdapter.importData({ schemaVersion: 0 })
    const state = StorageAdapter.getRawState()
    expect(state.settings.penaltySingles).toBe(15)
    expect(state.settings.penaltyThreeWaySolo).toBe(20)
    expect(state.settings.penaltyThreeWayPair).toBe(15)
  })

  test('after importData from v1, schemaVersion is 2', () => {
    StorageAdapter.importData({
      schemaVersion: 1,
      settings: { penaltyRepeatedPartner: 5 },
    })
    expect(StorageAdapter.getRawState().schemaVersion).toBe(2)
  })
})
