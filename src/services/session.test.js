import { expect, test, describe, beforeEach } from 'vitest'
import { StorageAdapter } from '../storage.js'
import { SessionService } from './session.js'

const MOCK_SETTINGS = {
  oddPlayerFallback: 'sit-out',
  candidateCount: 1,
  penaltyRepeatedPartner: 5,
  penaltyRepeatedOpponent: 10,
  penaltyRepeatedSitOut: 3,
}

function makeRound(index, playerIds, played = false) {
  return {
    index,
    courts: [{ teamA: [playerIds[0], playerIds[1]], teamB: [playerIds[2], playerIds[3]] }],
    sittingOut: playerIds.slice(4),
    played,
  }
}

function makeSession(overrides = {}) {
  return {
    id: 'session-1',
    clubId: 'club-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    attendeeIds: ['p1', 'p2', 'p3', 'p4'],
    rounds: [],
    settings: { ...MOCK_SETTINGS },
    ...overrides,
  }
}

describe('SessionService — mid-session roster changes', () => {
  beforeEach(() => {
    StorageAdapter.reset()
  })

  describe('TEST-01: adding a player mid-session', () => {
    test('played rounds are unchanged after adding a player and regenerating the unplayed round', () => {
      throw new Error('not implemented')
    })
  })

  describe('TEST-02: removing a player mid-session', () => {
    test('played rounds are unchanged after removing a player (including their ID in played courts)', () => {
      throw new Error('not implemented')
    })
  })

  describe('TEST-03: only unplayed rounds are affected', () => {
    test('played rounds are unchanged AND unplayed round now contains the updated roster', () => {
      throw new Error('not implemented')
    })
  })
})
