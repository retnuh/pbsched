import { expect, test, describe, beforeEach, vi } from 'vitest'
import { StorageAdapter } from '../storage.js'
import { SessionService } from './session.js'

const MOCK_SETTINGS = {
  oddPlayerFallback: 'sit-out',
  candidateCount: 1,
  penaltyRepeatedPartner: 5,
  penaltyRepeatedOpponent: 10,
  penaltyRepeatedSitOut: 3,
}

// Helper: builds a minimal round object
function makeRound(index, playerIds, played = false) {
  return {
    index,
    courts: [{ teamA: [playerIds[0], playerIds[1]], teamB: [playerIds[2], playerIds[3]] }],
    sittingOut: playerIds.slice(4),
    played,
  }
}

// Helper: builds a minimal session with status: 'active'
function makeSession({ attendeeIds, rounds = [], settings = MOCK_SETTINGS }) {
  return {
    id: 'session-1',
    clubId: 'club-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    attendeeIds,
    rounds,
    settings,
  }
}

describe('SessionService — updateRound', () => {
  beforeEach(() => {
    const storage = {}
    vi.stubGlobal('localStorage', {
      getItem: (key) => storage[key] ?? null,
      setItem: (key, value) => { storage[key] = value },
      clear: () => { Object.keys(storage).forEach(k => delete storage[k]) },
    })
    StorageAdapter.reset()
  })

  test('HIST-01: updateRound on unplayed round replaces assignments in place', () => {
    const session = makeSession({
      attendeeIds: ['p1', 'p2', 'p3', 'p4'],
      rounds: [makeRound(0, ['p1', 'p2', 'p3', 'p4'], false)],
    })
    StorageAdapter.set('sessions', [session])

    const editedRound = makeRound(0, ['p3', 'p4', 'p1', 'p2'], false)
    SessionService.updateRound(0, editedRound)

    const updated = SessionService.getActiveSession()
    expect(updated.rounds).toHaveLength(1)
    expect(updated.rounds[0].courts[0].teamA).toContain('p3')
    expect(updated.rounds[0].played).toBe(false)
  })

  test('HIST-02: updateRound on played round sets source: edited and preserves played flag', () => {
    const session = makeSession({
      attendeeIds: ['p1', 'p2', 'p3', 'p4'],
      rounds: [makeRound(0, ['p1', 'p2', 'p3', 'p4'], true)],
    })
    StorageAdapter.set('sessions', [session])

    const editedRound = makeRound(0, ['p3', 'p4', 'p1', 'p2'], true)
    SessionService.updateRound(0, editedRound)

    const updated = SessionService.getActiveSession()
    expect(updated.rounds[0].source).toBe('edited')
    expect(updated.rounds[0].played).toBe(true)
  })

  test('HIST-03: updateRound on played round invalidates subsequent unplayed rounds and regenerates next', () => {
    const session = makeSession({
      attendeeIds: ['p1', 'p2', 'p3', 'p4'],
      rounds: [
        makeRound(0, ['p1', 'p2', 'p3', 'p4'], true),
        makeRound(1, ['p2', 'p3', 'p4', 'p1'], false),
      ],
    })
    StorageAdapter.set('sessions', [session])

    const editedRound = makeRound(0, ['p3', 'p4', 'p1', 'p2'], true)
    SessionService.updateRound(0, editedRound)

    const rounds = SessionService.getActiveSession().rounds
    expect(rounds).toHaveLength(2)
    expect(rounds[0].played).toBe(true)
    expect(rounds[0].source).toBe('edited')
    expect(rounds[1].played).toBe(false)
    expect(rounds[1].index).toBe(1)
  })
})
