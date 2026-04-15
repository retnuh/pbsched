import { expect, test, describe, beforeEach, vi } from 'vitest'
import { StorageAdapter } from '../storage.js'
import { SessionService } from './session.js'
import * as schedulerModule from '../scheduler.js'

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

describe('SessionService — WR-01: generateNextRound empty-result guard', () => {
  beforeEach(() => {
    StorageAdapter.reset()
  })

  test('returns null and does not corrupt rounds when scheduler returns no candidates', () => {
    const session = makeSession({
      attendeeIds: ['p1', 'p2', 'p3', 'p4'],
      rounds: [makeRound(0, ['p1', 'p2', 'p3', 'p4'], true)],
    })
    StorageAdapter.set('sessions', [session])

    vi.spyOn(schedulerModule, 'generateRounds').mockReturnValueOnce([])
    const result = SessionService.generateNextRound()
    vi.restoreAllMocks()

    expect(result).toBeNull()
    const rounds = SessionService.getActiveSession().rounds
    expect(rounds).toHaveLength(1)
    expect(rounds[0]).toBeDefined()
  })
})

describe('SessionService — WR-02: updateSession index re-stamping', () => {
  beforeEach(() => {
    StorageAdapter.reset()
  })

  test('corrects stale index fields on any write', () => {
    const session = makeSession({
      attendeeIds: ['p1', 'p2', 'p3', 'p4'],
      rounds: [
        { ...makeRound(0, ['p1', 'p2', 'p3', 'p4'], true), index: 99 },
        { ...makeRound(1, ['p2', 'p3', 'p4', 'p1'], false), index: 99 },
      ],
    })
    StorageAdapter.set('sessions', [session])

    SessionService.markRoundUnplayed(0)

    const rounds = SessionService.getActiveSession().rounds
    expect(rounds[0].index).toBe(0)
    expect(rounds[1].index).toBe(1)
  })
})

describe('SessionService — WR-03: morphRoundStrategy player accounting', () => {
  beforeEach(() => {
    StorageAdapter.reset()
  })

  test('no player is lost or duplicated after strategy change', () => {
    const players = ['p1', 'p2', 'p3', 'p4', 'p5']
    const session = makeSession({
      attendeeIds: players,
      rounds: [{
        index: 0,
        courts: [{ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] }],
        sittingOut: ['p5'],
        played: false,
      }],
      settings: { ...MOCK_SETTINGS, oddPlayerFallback: 'sit-out' },
    })
    StorageAdapter.set('sessions', [session])

    SessionService.updateSettings({ oddPlayerFallback: 'three-player-court' })

    const round = SessionService.getActiveSession().rounds[0]
    const assigned = [...round.courts.flatMap(c => [...c.teamA, ...c.teamB]), ...round.sittingOut]
    expect(assigned.sort()).toEqual([...players].sort())
  })
})

describe('SessionService — 11-IN-02: updateRound with empty scheduler result', () => {
  beforeEach(() => {
    StorageAdapter.reset()
  })

  test('session remains valid (no null round appended) when scheduler returns []', () => {
    const session = makeSession({
      attendeeIds: ['p1', 'p2', 'p3', 'p4'],
      rounds: [makeRound(0, ['p1', 'p2', 'p3', 'p4'], true)],
    })
    StorageAdapter.set('sessions', [session])

    vi.spyOn(schedulerModule, 'generateRounds').mockReturnValueOnce([])
    const editedRound = makeRound(0, ['p3', 'p4', 'p1', 'p2'], true)
    SessionService.updateRound(0, editedRound)
    vi.restoreAllMocks()

    const rounds = SessionService.getActiveSession().rounds
    expect(rounds.every(r => r !== null && r !== undefined)).toBe(true)
    expect(rounds[0].played).toBe(true)
  })
})

describe('SessionService — updateRound', () => {
  beforeEach(() => {
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
    expect(updated.rounds[0].courts[0].teamA).toContain('p3') // courts from editedRound
  })

  test('11-L-02: updateRound on played round with a sitter correctly records sitter path', () => {
    function makeRoundWithSitter(index, playerIds, sitterId, played = false) {
      return {
        index,
        courts: [{ teamA: [playerIds[0], playerIds[1]], teamB: [playerIds[2], playerIds[3]] }],
        sittingOut: [sitterId],
        played,
      }
    }
    const session = makeSession({
      attendeeIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
      rounds: [makeRoundWithSitter(0, ['p1', 'p2', 'p3', 'p4'], 'p5', true)],
    })
    StorageAdapter.set('sessions', [session])

    const editedRound = makeRoundWithSitter(0, ['p2', 'p3', 'p4', 'p1'], 'p5', true)
    SessionService.updateRound(0, editedRound)

    const updated = SessionService.getActiveSession()
    expect(updated.rounds[0].source).toBe('edited')
    expect(updated.rounds[0].sittingOut).toContain('p5')
  })

  test('11-IN-03: re-editing an already-edited round keeps source: edited', () => {
    const session = makeSession({
      attendeeIds: ['p1', 'p2', 'p3', 'p4'],
      rounds: [{ ...makeRound(0, ['p1', 'p2', 'p3', 'p4'], true), source: 'edited' }],
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
