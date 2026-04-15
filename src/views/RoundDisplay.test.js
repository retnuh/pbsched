import { expect, test, describe, beforeEach, vi } from 'vitest'
import { StorageAdapter } from '../storage.js'
import { SessionService } from '../services/session.js'

vi.mock('../router.js', () => ({ navigate: vi.fn() }))
vi.mock('../services/haptics.js', () => ({
  Haptics: { light: vi.fn(), medium: vi.fn(), success: vi.fn() },
}))

import { navigate } from '../router.js'
import { mount } from './RoundDisplay.js'

const CLUBS_DATA = [
  {
    id: 'club-1',
    name: 'Test Club',
    members: [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Carol' },
      { id: 'p4', name: 'Dave' },
    ],
  },
]

function makeSession(rounds = []) {
  return {
    id: 'session-1',
    clubId: 'club-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    attendeeIds: ['p1', 'p2', 'p3', 'p4'],
    rounds,
    settings: { oddPlayerFallback: 'sit-out', candidateCount: 1,
      penaltyRepeatedPartner: 5, penaltyRepeatedOpponent: 10, penaltyRepeatedSitOut: 3 },
  }
}

function makeRound(index, played = false) {
  return { index, played, courts: [{ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] }], sittingOut: [] }
}

function setup(rounds) {
  const session = makeSession(rounds)
  StorageAdapter.set('clubs', CLUBS_DATA)
  StorageAdapter.set('sessions', [session])
  const el = document.createElement('div')
  mount(el, {})
  return el
}

describe('RoundDisplay', () => {
  beforeEach(() => {
    StorageAdapter.reset()
    vi.clearAllMocks()
  })

  describe('Error states', () => {
    test('renders No Active Session when no session exists', () => {
      const el = document.createElement('div')
      mount(el, {})
      expect(el.innerHTML).toContain('No Active Session')
    })
  })

  describe('Edit button — unplayed round', () => {
    test('Edit button is rendered for an unplayed round', () => {
      const el = setup([makeRound(0, false)])
      const editBtn = el.querySelector('[data-action="edit"]')
      expect(editBtn).not.toBeNull()
    })

    test('clicking Edit on an unplayed round navigates to /edit/{index}', () => {
      const el = setup([makeRound(0, false)])
      el.querySelector('[data-action="edit"]').click()
      expect(navigate).toHaveBeenCalledWith('/edit/0')
    })

    test('Edit navigates with correct index for a later round', () => {
      const el = setup([makeRound(0, true), makeRound(1, true), makeRound(2, false)])
      // Only one edit button should be present for the unplayed round (index 2)
      const editBtns = el.querySelectorAll('[data-action="edit"]')
      // Find the one in the unplayed footer row
      const unplayedEdit = [...editBtns].find(b => {
        const idx = parseInt(b.dataset.index)
        return idx === 2
      })
      expect(unplayedEdit).not.toBeNull()
      unplayedEdit.click()
      expect(navigate).toHaveBeenCalledWith('/edit/2')
    })
  })

  describe('Edit button — played round', () => {
    test('Edit button is shown on the last played round header', () => {
      const el = setup([makeRound(0, true)])
      const editBtns = [...el.querySelectorAll('[data-action="edit"]')]
      const playedEdit = editBtns.find(b => parseInt(b.dataset.index) === 0)
      expect(playedEdit).not.toBeNull()
    })

    test('clicking Edit on the last played round navigates to /edit/{index}', () => {
      const el = setup([makeRound(0, true)])
      const editBtns = [...el.querySelectorAll('[data-action="edit"]')]
      const playedEdit = editBtns.find(b => parseInt(b.dataset.index) === 0)
      playedEdit.click()
      expect(navigate).toHaveBeenCalledWith('/edit/0')
    })

    test('older played rounds do not show an Edit button', () => {
      // R0 played, R1 played (last played), R2 unplayed
      const el = setup([makeRound(0, true), makeRound(1, true), makeRound(2, false)])
      const editBtns = [...el.querySelectorAll('[data-action="edit"]')]
      const r0Edit = editBtns.find(b => parseInt(b.dataset.index) === 0)
      expect(r0Edit).toBeUndefined()
    })
  })

  describe('Mark Played', () => {
    test('clicking Mark Played calls SessionService.markRoundPlayed', () => {
      vi.spyOn(SessionService, 'markRoundPlayed').mockImplementation(() => {})
      vi.spyOn(SessionService, 'generateNextRound').mockImplementation(() => {})
      const el = setup([makeRound(0, false)])
      el.querySelector('[data-action="play"]').click()
      expect(SessionService.markRoundPlayed).toHaveBeenCalledWith(0)
    })
  })
})
