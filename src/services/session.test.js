import { StorageAdapter } from '../storage.js'
import { SessionService } from './session.js'

// candidateCount: 1 makes generateRounds deterministic (only one candidate evaluated).
// This is intentional for roster-change integration tests but means the scheduler's
// candidate-selection and scoring paths are not exercised here.
const MOCK_SETTINGS = {
  oddPlayerFallback: 'sit-out',
  candidateCount: 1,
  penaltyRepeatedPartner: 5,
  penaltyRepeatedOpponent: 10,
  penaltyRepeatedSitOut: 3,
}

// NOTE: makeRound sets the index field manually. regenerateRound (session.js) overwrites
// newRound.index after generation, so the hardcoded value is safe today. If generateRounds
// ever uses index internally (e.g. for penalty look-up), fixtures must be updated accordingly.
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

  describe('TEST-01: adding a player before any round has been played', () => {
    test('regenerated round 0 contains the new player when no rounds are played yet', () => {
      // Distinct from TEST-03: zero played rounds — the entire round list is unplayed.
      // This exercises the boundary where playedRounds is empty and regenerateRound
      // must still produce a valid round using the updated attendee list.
      const session = makeSession({
        attendeeIds: ['p1', 'p2', 'p3', 'p4'],
        rounds: [
          makeRound(0, ['p1', 'p2', 'p3', 'p4'], false),
        ],
      })
      StorageAdapter.set('sessions', [session])

      // Add p5 before any round has been played, then regenerate round 0
      SessionService.updateAttendees(['p1', 'p2', 'p3', 'p4', 'p5'])
      SessionService.regenerateRound(0)

      const sessionAfter = SessionService.getActiveSession()

      // No played rounds exist, so none should appear in the result either
      expect(sessionAfter.rounds.filter(r => r.played)).toHaveLength(0)

      // The regenerated round must include p5 and carry the correct index
      const regenerated = sessionAfter.rounds[0]
      expect(regenerated.index).toBe(0)
      const allPlayers = [
        ...regenerated.courts.flatMap(c => [...c.teamA, ...c.teamB]),
        ...regenerated.sittingOut,
      ]
      expect(allPlayers).toContain('p5')
    })
  })

  describe('TEST-02: removing a player mid-session', () => {
    test('played rounds are unchanged after removing a player (including their ID in played courts)', () => {
      // p1 appeared in both played rounds — removing p1 from attendees must not alter those rounds
      const session = makeSession({
        attendeeIds: ['p1', 'p2', 'p3', 'p4'],
        rounds: [
          makeRound(0, ['p1', 'p2', 'p3', 'p4'], true),
          makeRound(1, ['p2', 'p4', 'p1', 'p3'], true),
          makeRound(2, ['p1', 'p2', 'p3', 'p4'], false),
        ],
      })
      StorageAdapter.set('sessions', [session])

      const playedBefore = JSON.parse(JSON.stringify(
        SessionService.getActiveSession().rounds.filter(r => r.played)
      ))

      // Remove p1 mid-session, regenerate the pending unplayed round
      SessionService.updateAttendees(['p2', 'p3', 'p4'])
      SessionService.regenerateRound(2)

      const playedAfter = JSON.parse(JSON.stringify(
        SessionService.getActiveSession().rounds.filter(r => r.played)
      ))

      // p1's ID must still appear in played round history — removal does not rewrite history
      expect(playedAfter).toEqual(playedBefore)

      // p1 must NOT appear in any regenerated unplayed round — proves attendeeIds was
      // persisted before regenerateRound read it
      const unplayedAfter02 = SessionService.getActiveSession().rounds.filter(r => !r.played)
      const allPlayersInUnplayed02 = unplayedAfter02.flatMap(r => [
        ...r.courts.flatMap(c => [...c.teamA, ...c.teamB]),
        ...r.sittingOut,
      ])
      expect(allPlayersInUnplayed02).not.toContain('p1')

      // Only the three remaining players must appear — guards against stale or missing players
      const sortedPlayers = [...allPlayersInUnplayed02].sort()
      expect(sortedPlayers).toEqual(['p2', 'p3', 'p4'])
    })
  })

  describe('TEST-03: only unplayed rounds are affected', () => {
    test('played rounds are unchanged AND unplayed round now contains the updated roster', () => {
      const session = makeSession({
        attendeeIds: ['p1', 'p2', 'p3', 'p4'],
        rounds: [
          makeRound(0, ['p1', 'p2', 'p3', 'p4'], true),
          makeRound(1, ['p2', 'p4', 'p1', 'p3'], true),
          makeRound(2, ['p1', 'p2', 'p3', 'p4'], false),
        ],
      })
      StorageAdapter.set('sessions', [session])

      const playedBefore = JSON.parse(JSON.stringify(
        SessionService.getActiveSession().rounds.filter(r => r.played)
      ))

      // Add p5 and regenerate the unplayed round
      SessionService.updateAttendees(['p1', 'p2', 'p3', 'p4', 'p5'])
      SessionService.regenerateRound(2)

      const sessionAfter = SessionService.getActiveSession()
      const playedAfter = JSON.parse(JSON.stringify(sessionAfter.rounds.filter(r => r.played)))
      const unplayedAfter = sessionAfter.rounds.filter(r => !r.played)

      // Played rounds must be byte-for-byte identical
      expect(playedAfter).toEqual(playedBefore)

      // Unplayed round must now include p5 (proves it was actually regenerated with the new roster)
      const allPlayersInUnplayed = unplayedAfter.flatMap(r => [
        ...r.courts.flatMap(c => [...c.teamA, ...c.teamB]),
        ...r.sittingOut,
      ])
      expect(allPlayersInUnplayed).toContain('p5')

      // Regenerated round must retain its correct index (guards against index reset to 0)
      const regenerated = SessionService.getActiveSession().rounds[2]
      expect(regenerated.index).toBe(2)
    })
  })
})
