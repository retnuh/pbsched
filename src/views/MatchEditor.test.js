import { expect, test, describe, beforeEach, vi } from 'vitest'
import { StorageAdapter } from '../storage.js'
import { SessionService } from '../services/session.js'

// Mock navigate so tests do not trigger actual hash routing
vi.mock('../router.js', () => ({
  navigate: vi.fn(),
}))

// Mock Haptics to avoid DOM dependency
vi.mock('../services/haptics.js', () => ({
  Haptics: { light: vi.fn(), medium: vi.fn(), success: vi.fn() },
}))

// Shared state for Sortable instances — vi.hoisted runs before mock factories
const mockSortable = vi.hoisted(() => ({ instances: [] }))

// Mock SortableJS to avoid DOM drag API dependency in happy-dom
vi.mock('sortablejs', () => ({
  default: class MockSortable {
    constructor(el, options) {
      this._el = el
      this.options = options || {}
      mockSortable.instances.push(this)
    }
    destroy() {}
    static mount() {} // no-op for Swap plugin registration
  },
  Swap: class MockSwap {},
}))

// Import mocked navigate for assertions
import { navigate } from '../router.js'
import { mount, unmount } from './MatchEditor.js'
import { Haptics } from '../services/haptics.js'

function makeSession(rounds = []) {
  return {
    id: 'session-1',
    clubId: 'club-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    attendeeIds: ['p1', 'p2', 'p3', 'p4'],
    rounds,
    settings: {
      oddPlayerFallback: 'sit-out',
      candidateCount: 1,
      penaltyRepeatedPartner: 5,
      penaltyRepeatedOpponent: 10,
      penaltyRepeatedSitOut: 3,
    },
  }
}

function makeRound(index, played = false) {
  return {
    index,
    played,
    courts: [{ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] }],
    sittingOut: [],
  }
}

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

describe('MatchEditor', () => {
  let el

  beforeEach(() => {
    StorageAdapter.reset()
    vi.clearAllMocks()
    el = document.createElement('div')
  })

  describe('MEDIT-01: Editor mounts with court layout for a proposed round', () => {
    test('renders Court 1 label and player names when valid roundIndex provided', () => {
      const session = makeSession([makeRound(0, false)])
      StorageAdapter.set('clubs', CLUBS_DATA)
      StorageAdapter.set('sessions', [session])

      mount(el, { roundIndex: '0' })

      expect(el.innerHTML).toContain('Court 1')
      expect(el.innerHTML).toContain('Alice')
      expect(el.innerHTML).toContain('Bob')
    })

  })

  describe('MEDIT-02: Editor mounts for a played round', () => {
    test('renders court layout for a played=true round', () => {
      const session = makeSession([makeRound(0, true)])
      StorageAdapter.set('clubs', CLUBS_DATA)
      StorageAdapter.set('sessions', [session])

      mount(el, { roundIndex: '0' })

      expect(el.innerHTML).toContain('Court 1')
      expect(el.innerHTML).toContain('Alice')
    })
  })

  describe('Back navigation', () => {
    test('Cancel button calls navigate(/active)', () => {
      const session = makeSession([makeRound(0, false)])
      StorageAdapter.set('clubs', CLUBS_DATA)
      StorageAdapter.set('sessions', [session])
      mount(el, { roundIndex: '0' })
      vi.spyOn(SessionService, 'updateRound').mockImplementation(() => {})
      el.querySelector('#cancel-btn').click()
      expect(navigate).toHaveBeenCalledWith('/active')
    })
  })

  describe('Error states', () => {
    test('renders No Active Session when no session exists', () => {
      // No session seeded
      mount(el, { roundIndex: '0' })

      expect(el.innerHTML).toContain('No Active Session')
    })

    test('renders Round not found for invalid roundIndex', () => {
      const session = makeSession([]) // 0 rounds
      StorageAdapter.set('clubs', CLUBS_DATA)
      StorageAdapter.set('sessions', [session])

      mount(el, { roundIndex: '5' })

      expect(el.innerHTML).toContain('Round not found')
    })

    test('renders error when club is not found', () => {
      const session = makeSession([makeRound(0, false)])
      // Seed session with a clubId that has no matching club
      StorageAdapter.set('sessions', [session])
      // Do NOT seed clubs data

      mount(el, { roundIndex: '0' })

      expect(el.innerHTML).toContain('Club Not Found')
    })
  })

  describe('Rest Bench zone', () => {
    test('renders an empty slot chip in the bench when sittingOut is empty', () => {
      const session = makeSession([makeRound(0, false)])
      StorageAdapter.set('clubs', CLUBS_DATA)
      StorageAdapter.set('sessions', [session])

      mount(el, { roundIndex: '0' })

      const bench = el.querySelector('[data-zone="bench"]')
      expect(bench.querySelector('.empty-slot')).not.toBeNull()
    })

    test('renders sitting-out player names in bench zone', () => {
      const round = {
        index: 0,
        played: false,
        courts: [{ teamA: ['p1', 'p2'], teamB: ['p3'] }],
        sittingOut: ['p4'],
      }
      const session = makeSession([round])
      StorageAdapter.set('clubs', CLUBS_DATA)
      StorageAdapter.set('sessions', [session])

      mount(el, { roundIndex: '0' })

      expect(el.innerHTML).toContain('Dave')
      expect(el.innerHTML).toContain('Rest Bench')
    })

    test('bench always has exactly one empty slot even when players are present', () => {
      const round = {
        index: 0,
        played: false,
        courts: [{ teamA: ['p1', 'p2'], teamB: ['p3'] }],
        sittingOut: ['p4'],
      }
      const session = makeSession([round])
      StorageAdapter.set('clubs', CLUBS_DATA)
      StorageAdapter.set('sessions', [session])

      mount(el, { roundIndex: '0' })

      const bench = el.querySelector('[data-zone="bench"]')
      expect(bench.querySelectorAll('.empty-slot').length).toBe(1)
    })

    test('bench empty slot shows couch emoji', () => {
      const session = makeSession([makeRound(0, false)])
      StorageAdapter.set('clubs', CLUBS_DATA)
      StorageAdapter.set('sessions', [session])

      mount(el, { roundIndex: '0' })

      const bench = el.querySelector('[data-zone="bench"]')
      const slot = bench.querySelector('.empty-slot')
      expect(slot.textContent.trim()).toBe('🛋️')
    })

    test('court empty slots do not show the couch emoji', () => {
      const round = { index: 0, played: false, courts: [{ teamA: ['p1', 'p2'], teamB: ['p3'] }], sittingOut: [] }
      const session = makeSession([round])
      StorageAdapter.set('clubs', CLUBS_DATA)
      StorageAdapter.set('sessions', [session])

      mount(el, { roundIndex: '0' })

      const courtSlot = el.querySelector('[data-zone="court-0-b"] .empty-slot')
      expect(courtSlot).not.toBeNull()
      expect(courtSlot.textContent.trim()).toBe('')
    })
  })
})

describe('Phase 13: Drag interactions', () => {
  let el

  beforeEach(() => {
    StorageAdapter.reset()
    vi.clearAllMocks()
    mockSortable.instances = []
    el = document.createElement('div')
  })

  function makeRoundWithBench() {
    return {
      index: 0,
      played: false,
      courts: [{ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] }],
      sittingOut: [],
    }
  }

  function setupEditor(round) {
    const session = makeSession([round])
    StorageAdapter.set('clubs', CLUBS_DATA)
    StorageAdapter.set('sessions', [session])
    mount(el, { roundIndex: '0' })
  }

  describe('DRAG-01: chips have data-player-id attributes', () => {
    test('each chip rendered for a court player has data-player-id set to the player id', () => {
      setupEditor(makeRoundWithBench())
      const chips = el.querySelectorAll('[data-player-id]')
      expect(chips.length).toBeGreaterThan(0)
      const ids = [...chips].map(c => c.dataset.playerId)
      expect(ids).toContain('p1')
      expect(ids).toContain('p2')
      expect(ids).toContain('p3')
      expect(ids).toContain('p4')
    })

    test('each zone has data-zone attribute', () => {
      setupEditor(makeRoundWithBench())
      expect(el.querySelector('[data-zone="court-0-a"]')).not.toBeNull()
      expect(el.querySelector('[data-zone="court-0-b"]')).not.toBeNull()
      expect(el.querySelector('[data-zone="bench"]')).not.toBeNull()
    })
  })

  describe('Confirm and Cancel buttons render', () => {
    test('renders #confirm-btn and #cancel-btn', () => {
      setupEditor(makeRoundWithBench())
      expect(el.querySelector('#confirm-btn')).not.toBeNull()
      expect(el.querySelector('#cancel-btn')).not.toBeNull()
    })
  })

  describe('VALID-01 + VALID-02: Validation state', () => {
    test('confirm button is enabled when all courts have 2+ players', () => {
      setupEditor(makeRoundWithBench())
      const confirmBtn = el.querySelector('#confirm-btn')
      expect(confirmBtn.disabled).toBe(false)
      expect(confirmBtn.className).toContain('bg-blue-600')
    })

    test('confirm button is disabled when a court has exactly 1 player', () => {
      const round = { index: 0, played: false, courts: [{ teamA: ['p1'], teamB: [] }], sittingOut: ['p2', 'p3', 'p4'] }
      setupEditor(round)
      const confirmBtn = el.querySelector('#confirm-btn')
      expect(confirmBtn.disabled).toBe(true)
      expect(confirmBtn.className).toContain('bg-gray-300')
    })

    test('invalid court card has border-red-400 class', () => {
      const round = { index: 0, played: false, courts: [{ teamA: ['p1'], teamB: [] }], sittingOut: ['p2', 'p3', 'p4'] }
      setupEditor(round)
      const courtCard = el.querySelector('[data-court="0"]')
      expect(courtCard.className).toContain('border-red-400')
    })

    test('invalid court shows error label (not hidden)', () => {
      const round = { index: 0, played: false, courts: [{ teamA: ['p1'], teamB: [] }], sittingOut: ['p2', 'p3', 'p4'] }
      setupEditor(round)
      const errorLabel = el.querySelector('[data-court-error]')
      expect(errorLabel.className).not.toContain('hidden')
      expect(errorLabel.textContent.trim()).toBe('needs 2+ players')
    })

    test('valid court (0 players) has border-gray-200 and error hidden', () => {
      const round = { index: 0, played: false, courts: [{ teamA: [], teamB: [] }], sittingOut: ['p1', 'p2', 'p3', 'p4'] }
      setupEditor(round)
      const courtCard = el.querySelector('[data-court="0"]')
      expect(courtCard.className).toContain('border-gray-200')
      const errorLabel = el.querySelector('[data-court-error]')
      expect(errorLabel.className).toContain('hidden')
    })
  })

  describe('DRAG-05: Confirm and Cancel wiring', () => {
    test('clicking Confirm (when valid) calls SessionService.updateRound and navigate(/active)', () => {
      vi.spyOn(SessionService, 'updateRound').mockImplementation(() => {})
      setupEditor(makeRoundWithBench())
      el.querySelector('#confirm-btn').click()
      expect(SessionService.updateRound).toHaveBeenCalledWith(0, expect.any(Object))
      expect(navigate).toHaveBeenCalledWith('/active')
    })

    test('clicking Cancel with no changes navigates directly to /active', () => {
      setupEditor(makeRoundWithBench())
      el.querySelector('#cancel-btn').click()
      expect(navigate).toHaveBeenCalledWith('/active')
    })
  })

  describe('MAXPLAYERS-01: Max 2 players per court side', () => {
    test('onMove blocks any chip dropped onto empty space in a full court zone (no swap partner)', () => {
      setupEditor(makeRoundWithBench())
      const zoneA = el.querySelector('[data-zone="court-0-a"]')
      const zoneB = el.querySelector('[data-zone="court-0-b"]')
      expect(zoneB.querySelectorAll('[data-player-id]').length).toBe(2)
      const instance = mockSortable.instances.find(s => s._el === zoneA)
      // No evt.related = dropping into empty space, not onto a chip — must be blocked
      const result = instance.options.onMove({ from: zoneA, to: zoneB, related: null })
      expect(result).toBe(false)
    })

    test('onMove blocks a bench chip dropped onto empty space in a full court zone', () => {
      setupEditor(makeRoundWithBench())
      const zoneA = el.querySelector('[data-zone="court-0-a"]')
      const benchZone = el.querySelector('[data-zone="bench"]')
      expect(zoneA.querySelectorAll('[data-player-id]').length).toBe(2)
      const instance = mockSortable.instances.find(s => s._el === benchZone)
      const result = instance.options.onMove({ from: benchZone, to: zoneA, related: null })
      expect(result).toBe(false)
    })

    test('SWAP: onMove allows court→court when Swap plugin provides a swap partner (evt.related)', () => {
      // Swap plugin sets evt.related to the chip being swapped — this is the real swap path
      setupEditor(makeRoundWithBench())
      const zoneA = el.querySelector('[data-zone="court-0-a"]')
      const zoneB = el.querySelector('[data-zone="court-0-b"]')
      const p3Chip = el.querySelector('[data-player-id="p3"]') // chip in zoneB to swap with
      const instance = mockSortable.instances.find(s => s._el === zoneA)
      const result = instance.options.onMove({ from: zoneA, to: zoneB, related: p3Chip })
      expect(result).not.toBe(false)
    })

    test('onMove allows bench chip swapped with a player in a full court zone', () => {
      // Bench now uses swap mode — bench→full-court swaps a player out (no overflow).
      setupEditor(makeRoundWithBench())
      const zoneA = el.querySelector('[data-zone="court-0-a"]') // has 2 players
      const benchZone = el.querySelector('[data-zone="bench"]')
      const p1Chip = el.querySelector('[data-player-id="p1"]')
      const instance = mockSortable.instances.find(s => s._el === benchZone)
      const result = instance.options.onMove({ from: benchZone, to: zoneA, related: p1Chip })
      expect(result).not.toBe(false)
    })

    test('onMove blocks bench chip dropped onto empty space in a full court zone', () => {
      setupEditor(makeRoundWithBench())
      const zoneA = el.querySelector('[data-zone="court-0-a"]') // has 2 players
      const benchZone = el.querySelector('[data-zone="bench"]')
      const instance = mockSortable.instances.find(s => s._el === benchZone)
      const result = instance.options.onMove({ from: benchZone, to: zoneA, related: null })
      expect(result).toBe(false)
    })

    test('onMove allows bench chip dropped into a partial court zone', () => {
      const round = { index: 0, played: false, courts: [{ teamA: ['p1', 'p2'], teamB: ['p3'] }], sittingOut: ['p4'] }
      setupEditor(round)
      const zoneB = el.querySelector('[data-zone="court-0-b"]') // has 1 player
      const benchZone = el.querySelector('[data-zone="bench"]')
      const instance = mockSortable.instances.find(s => s._el === benchZone)
      const result = instance.options.onMove({ from: benchZone, to: zoneB, related: null })
      expect(result).not.toBe(false)
    })

    test('onMove allows a chip into a court zone with only 1 player (no cap)', () => {
      const round = { index: 0, played: false, courts: [{ teamA: ['p1'], teamB: ['p3', 'p4'] }], sittingOut: ['p2'] }
      setupEditor(round)
      const zoneA = el.querySelector('[data-zone="court-0-a"]')
      const instance = mockSortable.instances.find(s => s._el === zoneA)
      const result = instance.options.onMove({ to: zoneA, related: null })
      expect(result).not.toBe(false)
    })

    test('onMove always allows drops onto the bench (bench uses insertion mode)', () => {
      setupEditor(makeRoundWithBench())
      const benchZone = el.querySelector('[data-zone="bench"]')
      const zoneA = el.querySelector('[data-zone="court-0-a"]')
      const instance = mockSortable.instances.find(s => s._el === zoneA)
      const result = instance.options.onMove({ from: zoneA, to: benchZone })
      expect(result).not.toBe(false)
    })
  })

  describe('VALID-03: Oversized side (>2 players) is flagged as invalid', () => {
    test('confirm button is disabled when a court side has 3 players', () => {
      const round = { index: 0, played: false, courts: [{ teamA: ['p1', 'p2', 'p3'], teamB: ['p4'] }], sittingOut: [] }
      setupEditor(round)
      expect(el.querySelector('#confirm-btn').disabled).toBe(true)
    })

    test('invalid court shows "max 2 per side" error when side is oversized', () => {
      const round = { index: 0, played: false, courts: [{ teamA: ['p1', 'p2', 'p3'], teamB: ['p4'] }], sittingOut: [] }
      setupEditor(round)
      const errorLabel = el.querySelector('[data-court-error]')
      expect(errorLabel.className).not.toContain('hidden')
      expect(errorLabel.textContent.trim()).toBe('max 2 per side')
    })

    test('after simulated drag creating oversized side, validateAndUpdateUI disables Confirm', () => {
      setupEditor(makeRoundWithBench())
      // Physically move p3 into court-0-a (now 3 players) and fire onEnd
      const p3Chip = el.querySelector('[data-player-id="p3"]')
      const zoneA = el.querySelector('[data-zone="court-0-a"]')
      zoneA.appendChild(p3Chip)
      mockSortable.instances[0].options.onEnd({ item: p3Chip })
      expect(el.querySelector('#confirm-btn').disabled).toBe(true)
    })
  })

  describe('DISCARD-01: In-app discard modal replaces browser confirm()', () => {
    function simulateDragChange() {
      // Move p3 chip to court-0-a (already has p1+p2) in DOM only, then fire onEnd
      // so reconcileDraftFromDOM sees a different state → hasChanges() returns true
      const p3Chip = el.querySelector('[data-player-id="p3"]')
      const zoneA = el.querySelector('[data-zone="court-0-a"]')
      zoneA.appendChild(p3Chip)
      mockSortable.instances[0].options.onEnd({ item: p3Chip })
    }

    test('Cancel with changes shows discard modal (no browser confirm call)', () => {
      setupEditor(makeRoundWithBench())
      simulateDragChange()
      el.querySelector('#cancel-btn').click()
      // Modal must be visible — if code called window.confirm() it would throw in happy-dom
      expect(el.querySelector('#discard-modal').classList.contains('hidden')).toBe(false)
    })

    test('clicking Discard in modal navigates to /active', () => {
      setupEditor(makeRoundWithBench())
      simulateDragChange()
      el.querySelector('#cancel-btn').click()
      el.querySelector('#discard-confirm-btn').click()
      expect(navigate).toHaveBeenCalledWith('/active')
    })

    test('clicking Keep Editing hides modal without navigating', () => {
      setupEditor(makeRoundWithBench())
      simulateDragChange()
      el.querySelector('#cancel-btn').click()
      el.querySelector('#discard-keep-btn').click()
      expect(navigate).not.toHaveBeenCalled()
      expect(el.querySelector('#discard-modal').classList.contains('hidden')).toBe(true)
    })
  })

  describe('DRAG-FLOW: Full drag flow — draft updates after onEnd', () => {
    test('court→bench: player leaves court and appears in sittingOut in saved draft', () => {
      vi.spyOn(SessionService, 'updateRound').mockImplementation(() => {})
      setupEditor(makeRoundWithBench()) // p1+p2 vs p3+p4
      // Move p4 from court-0-b to bench
      const p4Chip = el.querySelector('[data-player-id="p4"]')
      const benchZone = el.querySelector('[data-zone="bench"]')
      benchZone.appendChild(p4Chip)
      mockSortable.instances[0].options.onEnd({ item: p4Chip })
      // court-0-b now has [p3] only — total=3, valid
      el.querySelector('#confirm-btn').click()
      expect(SessionService.updateRound).toHaveBeenCalledWith(0, expect.objectContaining({
        sittingOut: ['p4'],
        courts: [expect.objectContaining({ teamB: ['p3'] })],
      }))
    })

    test('bench→court: player leaves bench and appears in court zone in saved draft', () => {
      vi.spyOn(SessionService, 'updateRound').mockImplementation(() => {})
      const round = { index: 0, played: false, courts: [{ teamA: ['p1', 'p2'], teamB: ['p3'] }], sittingOut: ['p4'] }
      setupEditor(round)
      // Move p4 from bench to court-0-b (which has 1 player — allowed)
      const p4Chip = el.querySelector('[data-player-id="p4"]')
      const zoneB = el.querySelector('[data-zone="court-0-b"]')
      zoneB.appendChild(p4Chip)
      mockSortable.instances[0].options.onEnd({ item: p4Chip })
      el.querySelector('#confirm-btn').click()
      expect(SessionService.updateRound).toHaveBeenCalledWith(0, expect.objectContaining({
        sittingOut: [],
        courts: [expect.objectContaining({ teamB: ['p3', 'p4'] })],
      }))
    })

    test('court→court: player moves between sides and draft reflects new positions', () => {
      vi.spyOn(SessionService, 'updateRound').mockImplementation(() => {})
      const round = { index: 0, played: false, courts: [{ teamA: ['p1', 'p2'], teamB: [] }], sittingOut: ['p3', 'p4'] }
      setupEditor(round)
      // Move p1 from zone-a to zone-b: result is teamA=[p2], teamB=[p1]
      const p1Chip = el.querySelector('[data-player-id="p1"]')
      const zoneB = el.querySelector('[data-zone="court-0-b"]')
      zoneB.appendChild(p1Chip)
      mockSortable.instances[0].options.onEnd({ item: p1Chip })
      el.querySelector('#confirm-btn').click()
      expect(SessionService.updateRound).toHaveBeenCalledWith(0, expect.objectContaining({
        courts: [expect.objectContaining({ teamA: ['p2'], teamB: ['p1'] })],
      }))
    })
  })

  describe('DRAG-06: Confirm guard — updateRound never called when invalid', () => {
    test('does not call updateRound when court has exactly 1 player', () => {
      vi.spyOn(SessionService, 'updateRound').mockImplementation(() => {})
      const round = { index: 0, played: false, courts: [{ teamA: ['p1'], teamB: [] }], sittingOut: ['p2', 'p3', 'p4'] }
      setupEditor(round)
      el.querySelector('#confirm-btn').click()
      expect(SessionService.updateRound).not.toHaveBeenCalled()
    })

    test('does not call updateRound when a court side is oversized (>2)', () => {
      vi.spyOn(SessionService, 'updateRound').mockImplementation(() => {})
      const round = { index: 0, played: false, courts: [{ teamA: ['p1', 'p2', 'p3'], teamB: ['p4'] }], sittingOut: [] }
      setupEditor(round)
      el.querySelector('#confirm-btn').click()
      expect(SessionService.updateRound).not.toHaveBeenCalled()
    })

    test('confirm button is disabled when all players are on one side (imbalanced)', () => {
      const round = { index: 0, played: false, courts: [{ teamA: ['p1', 'p2'], teamB: [] }], sittingOut: ['p3', 'p4'] }
      setupEditor(round)
      expect(el.querySelector('#confirm-btn').disabled).toBe(true)
    })

    test('imbalanced court shows "players on both sides required" error', () => {
      const round = { index: 0, played: false, courts: [{ teamA: ['p1', 'p2'], teamB: [] }], sittingOut: ['p3', 'p4'] }
      setupEditor(round)
      const errorLabel = el.querySelector('[data-court-error]')
      expect(errorLabel.className).not.toContain('hidden')
      expect(errorLabel.textContent.trim()).toBe('players on both sides required')
    })

    test('does not call updateRound when all players are on one side', () => {
      vi.spyOn(SessionService, 'updateRound').mockImplementation(() => {})
      const round = { index: 0, played: false, courts: [{ teamA: ['p1', 'p2'], teamB: [] }], sittingOut: ['p3', 'p4'] }
      setupEditor(round)
      el.querySelector('#confirm-btn').click()
      expect(SessionService.updateRound).not.toHaveBeenCalled()
    })
  })

  describe('RENDER: Layout, zones, and round display', () => {
    test('header shows correct round number (1-based from round.index)', () => {
      setupEditor(makeRoundWithBench()) // round.index = 0
      expect(el.innerHTML).toContain('Edit Round 1')
    })

    test('players are rendered inside their correct court zones', () => {
      setupEditor(makeRoundWithBench())
      const zoneA = el.querySelector('[data-zone="court-0-a"]')
      const zoneB = el.querySelector('[data-zone="court-0-b"]')
      expect(zoneA.querySelector('[data-player-id="p1"]')).not.toBeNull()
      expect(zoneA.querySelector('[data-player-id="p2"]')).not.toBeNull()
      expect(zoneB.querySelector('[data-player-id="p3"]')).not.toBeNull()
      expect(zoneB.querySelector('[data-player-id="p4"]')).not.toBeNull()
    })

    test('round with 2 courts renders Court 1 and Court 2 with correct data-court attributes', () => {
      const round = {
        index: 0,
        played: false,
        courts: [
          { teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] },
          { teamA: [], teamB: [] },
        ],
        sittingOut: [],
      }
      setupEditor(round)
      expect(el.innerHTML).toContain('Court 1')
      expect(el.innerHTML).toContain('Court 2')
      expect(el.querySelector('[data-court="0"]')).not.toBeNull()
      expect(el.querySelector('[data-court="1"]')).not.toBeNull()
    })

    test('Sortable is initialised for every zone (2 court zones + bench per court, plus bench)', () => {
      const round = {
        index: 0,
        played: false,
        courts: [
          { teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] },
          { teamA: [], teamB: [] },
        ],
        sittingOut: [],
      }
      setupEditor(round)
      // 2 courts × 2 sides + 1 bench = 5 zones
      expect(mockSortable.instances.length).toBe(5)
    })

    test('discard modal is hidden on initial mount', () => {
      setupEditor(makeRoundWithBench())
      expect(el.querySelector('#discard-modal').classList.contains('hidden')).toBe(true)
    })
  })

  describe('SORTABLE-CONFIG: SortableJS is configured correctly', () => {
    test('all zones use swap:true — bench and courts behave identically', () => {
      setupEditor(makeRoundWithBench())
      mockSortable.instances.forEach(inst => {
        expect(inst.options.swap).toBe(true)
      })
    })
  })

  describe('UNMOUNT: cleanup on navigation away', () => {
    test('unmount() calls destroy() on every Sortable instance', () => {
      setupEditor(makeRoundWithBench())
      const destroySpies = mockSortable.instances.map(inst => vi.spyOn(inst, 'destroy'))
      unmount()
      destroySpies.forEach(spy => expect(spy).toHaveBeenCalledOnce())
    })
  })

  describe('EMPTY-SLOT: swap targets for partial court zones', () => {
    test('a partial side renders an empty slot as a swap target', () => {
      const round = { index: 0, played: false, courts: [{ teamA: ['p1', 'p2'], teamB: ['p3'] }], sittingOut: ['p4'] }
      setupEditor(round)
      const zoneB = el.querySelector('[data-zone="court-0-b"]')
      expect(zoneB.querySelectorAll('.empty-slot').length).toBe(1)
      expect(zoneB.querySelectorAll('[data-player-id]').length).toBe(1)
    })

    test('a full side has no empty slots', () => {
      setupEditor(makeRoundWithBench()) // both sides have 2 players
      expect(el.querySelector('[data-zone="court-0-a"]').querySelectorAll('.empty-slot').length).toBe(0)
      expect(el.querySelector('[data-zone="court-0-b"]').querySelectorAll('.empty-slot').length).toBe(0)
    })

    test('onMove allows a court chip dropped onto an empty slot in a partial zone', () => {
      const round = { index: 0, played: false, courts: [{ teamA: ['p1', 'p2'], teamB: ['p3'] }], sittingOut: ['p4'] }
      setupEditor(round)
      const zoneA = el.querySelector('[data-zone="court-0-a"]')
      const zoneB = el.querySelector('[data-zone="court-0-b"]')
      const emptySlot = zoneB.querySelector('.empty-slot')
      const instance = mockSortable.instances.find(s => s._el === zoneA)
      // Empty slot is the swap target — chipCount in zoneB is 1, so not blocked
      const result = instance.options.onMove({ from: zoneA, to: zoneB, related: emptySlot })
      expect(result).not.toBe(false)
    })

    test('after court→empty-slot swap: draft updates and slots rebalance', () => {
      vi.spyOn(SessionService, 'updateRound').mockImplementation(() => {})
      const round = { index: 0, played: false, courts: [{ teamA: ['p1', 'p2'], teamB: ['p3'] }], sittingOut: ['p4'] }
      setupEditor(round)
      // Simulate Swap plugin: p1 moves to zoneB, empty slot migrates to zoneA
      const p1Chip = el.querySelector('[data-player-id="p1"]')
      const zoneA = el.querySelector('[data-zone="court-0-a"]')
      const zoneB = el.querySelector('[data-zone="court-0-b"]')
      const emptySlot = zoneB.querySelector('.empty-slot')
      zoneB.appendChild(p1Chip)   // p1 moves to Court B
      zoneA.appendChild(emptySlot) // empty slot migrates to Court A
      mockSortable.instances[0].options.onEnd({ item: p1Chip })
      el.querySelector('#confirm-btn').click()
      expect(SessionService.updateRound).toHaveBeenCalledWith(0, expect.objectContaining({
        courts: [expect.objectContaining({ teamA: ['p2'], teamB: ['p3', 'p1'] })],
        sittingOut: ['p4'],
      }))
      // Slots rebalanced: Court A now has 1 player → 1 slot; Court B has 2 → 0 slots
      expect(zoneA.querySelectorAll('.empty-slot').length).toBe(1)
      expect(zoneB.querySelectorAll('.empty-slot').length).toBe(0)
    })

    test('bench still has exactly one empty slot after a drag ends', () => {
      vi.spyOn(SessionService, 'updateRound').mockImplementation(() => {})
      const round = { index: 0, played: false, courts: [{ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] }], sittingOut: [] }
      setupEditor(round)
      const p1Chip = el.querySelector('[data-player-id="p1"]')
      const bench = el.querySelector('[data-zone="bench"]')
      bench.appendChild(p1Chip)
      mockSortable.instances[0].options.onEnd({ item: p1Chip })
      el.querySelector('#confirm-btn').click()
      expect(bench.querySelectorAll('.empty-slot').length).toBe(1)
    })
  })
})

// ---------------------------------------------------------------------------
// Phase 14: Court Management & Polish
// ---------------------------------------------------------------------------

const CLUBS_DATA_5P = [
  {
    id: 'club-1',
    name: 'Test Club',
    members: [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Carol' },
      { id: 'p4', name: 'Dave' },
      { id: 'p5', name: 'Eve' },
    ],
  },
]

function makeSessionWithHistory() {
  // p5 sits out in 2 played rounds; round 2 is the unplayed draft being edited.
  // session.rounds[2].sittingOut = ['p5'] so the total stored sit-out count for p5 is 3.
  const rounds = [
    { index: 0, played: true,  courts: [{ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] }], sittingOut: ['p5'] },
    { index: 1, played: true,  courts: [{ teamA: ['p1', 'p3'], teamB: ['p2', 'p4'] }], sittingOut: ['p5'] },
    { index: 2, played: false, courts: [{ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] }], sittingOut: ['p5'] },
  ]
  return {
    id: 'session-1',
    clubId: 'club-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    attendeeIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
    rounds,
    settings: {
      oddPlayerFallback: 'sit-out',
      candidateCount: 1,
      penaltyRepeatedPartner: 5,
      penaltyRepeatedOpponent: 10,
      penaltyRepeatedSitOut: 3,
    },
  }
}

describe('Phase 14: Court Management & Polish', () => {
  let el

  beforeEach(() => {
    StorageAdapter.reset()
    vi.clearAllMocks()
    mockSortable.instances = []
    el = document.createElement('div')
  })

  function setupEditor(round, session) {
    const sess = session || makeSession([round])
    StorageAdapter.set('clubs', CLUBS_DATA)
    StorageAdapter.set('sessions', [sess])
    mount(el, { roundIndex: String(sess.rounds.indexOf(round) >= 0 ? sess.rounds.indexOf(round) : 0) })
  }

  function setupEditorWithSession(session, roundIndex) {
    StorageAdapter.set('clubs', CLUBS_DATA_5P)
    StorageAdapter.set('sessions', [session])
    mount(el, { roundIndex: String(roundIndex) })
  }

  // ---------------------------------------------------------------------------
  describe('COURT-01: Add court button', () => {
    test('clicking #add-court-btn when 1 court exists results in 2 courts rendered', () => {
      const round = { index: 0, played: false, courts: [{ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] }], sittingOut: [] }
      setupEditor(round)
      expect(el.querySelector('[data-court="0"]')).not.toBeNull()
      expect(el.querySelector('[data-court="1"]')).toBeNull()
      el.querySelector('#add-court-btn').click()
      expect(el.querySelector('[data-court="0"]')).not.toBeNull()
      expect(el.querySelector('[data-court="1"]')).not.toBeNull()
    })

    test('after clicking #add-court-btn, SortableJS instances increase (new zones initialized)', () => {
      const round = { index: 0, played: false, courts: [{ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] }], sittingOut: [] }
      setupEditor(round)
      const before = mockSortable.instances.length
      el.querySelector('#add-court-btn').click()
      expect(mockSortable.instances.length).toBeGreaterThan(before)
    })
  })

  // ---------------------------------------------------------------------------
  describe('COURT-02: Remove court button visibility', () => {
    test('remove button [data-remove-court="0"] is hidden when court 0 has players', () => {
      const round = { index: 0, played: false, courts: [{ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] }], sittingOut: [] }
      setupEditor(round)
      const btn = el.querySelector('[data-remove-court="0"]')
      expect(btn).not.toBeNull()
      expect(btn.className).toContain('hidden')
    })

    test('remove button is visible (no hidden class) when court is empty and >1 court remains', () => {
      const round = {
        index: 0,
        played: false,
        courts: [
          { teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] },
          { teamA: [], teamB: [] },
        ],
        sittingOut: [],
      }
      setupEditor(round)
      const btn = el.querySelector('[data-remove-court="1"]')
      expect(btn).not.toBeNull()
      expect(btn.className).not.toContain('hidden')
    })

    test('remove button is hidden when only 1 court remains (even if empty)', () => {
      const round = { index: 0, played: false, courts: [{ teamA: [], teamB: [] }], sittingOut: ['p1', 'p2', 'p3', 'p4'] }
      setupEditor(round)
      const btn = el.querySelector('[data-remove-court="0"]')
      expect(btn).not.toBeNull()
      expect(btn.className).toContain('hidden')
    })

    test('after clicking Remove on an empty court, that court is removed from the DOM', () => {
      const round = {
        index: 0,
        played: false,
        courts: [
          { teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] },
          { teamA: [], teamB: [] },
        ],
        sittingOut: [],
      }
      setupEditor(round)
      expect(el.querySelector('[data-court="1"]')).not.toBeNull()
      el.querySelector('[data-remove-court="1"]').click()
      expect(el.querySelector('[data-court="1"]')).toBeNull()
    })

    test('after removing court 1, Court 1 label still present and Court 2 absent', () => {
      const round = {
        index: 0,
        played: false,
        courts: [
          { teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] },
          { teamA: [], teamB: [] },
        ],
        sittingOut: [],
      }
      setupEditor(round)
      el.querySelector('[data-remove-court="1"]').click()
      expect(el.innerHTML).toContain('Court 1')
      expect(el.innerHTML).not.toContain('Court 2')
    })

    test('remove button reappears on a court after all players are dragged away', () => {
      // Start with 2 courts: court 0 has players, court 1 is empty (remove visible)
      // Then add court 0 players making court 0 empty — remove button should appear
      const round = {
        index: 0,
        played: false,
        courts: [
          { teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] },
          { teamA: [], teamB: [] },
        ],
        sittingOut: [],
      }
      setupEditor(round)
      // Drag p1 to bench
      const p1Chip = el.querySelector('[data-player-id="p1"]')
      const bench = el.querySelector('[data-zone="bench"]')
      bench.appendChild(p1Chip)
      mockSortable.instances[0].options.onEnd({ item: p1Chip })
      // After drag, updateRemoveButtonVisibility is called — court 0 still has 3 players
      // so its remove btn stays hidden
      expect(el.querySelector('[data-remove-court="0"]').className).toContain('hidden')
    })
  })

  // ---------------------------------------------------------------------------
  describe('COURT-03: Empty-court pruning on Confirm', () => {
    test('Confirm with 1 populated + 1 empty court calls updateRound with courts length 1', () => {
      vi.spyOn(SessionService, 'updateRound').mockImplementation(() => {})
      const round = {
        index: 0,
        played: false,
        courts: [
          { teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] },
          { teamA: [], teamB: [] },
        ],
        sittingOut: [],
      }
      setupEditor(round)
      el.querySelector('#confirm-btn').click()
      expect(SessionService.updateRound).toHaveBeenCalledWith(
        0,
        expect.objectContaining({ courts: expect.arrayContaining([expect.objectContaining({ teamA: ['p1', 'p2'] })]) })
      )
      const [, savedRound] = SessionService.updateRound.mock.calls[0]
      expect(savedRound.courts.length).toBe(1)
    })

    test('empty-court pruning is silent — no toast fires during Confirm', () => {
      vi.spyOn(SessionService, 'updateRound').mockImplementation(() => {})
      const round = {
        index: 0,
        played: false,
        courts: [
          { teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] },
          { teamA: [], teamB: [] },
        ],
        sittingOut: [],
      }
      setupEditor(round)
      // Remove any pre-existing toast
      const existing = document.getElementById('gsd-toast')
      if (existing) existing.remove()
      el.querySelector('#confirm-btn').click()
      expect(document.getElementById('gsd-toast')).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  describe('BENCH-01: Sit-out count badges on bench chips', () => {
    test('bench chip for p5 shows sit-out count from all session rounds (including current draft)', () => {
      // makeSessionWithHistory: p5 sits out in rounds 0, 1, and 2 — count = 3
      const session = makeSessionWithHistory()
      setupEditorWithSession(session, 2)
      const bench = el.querySelector('[data-zone="bench"]')
      const p5Chip = bench.querySelector('[data-player-id="p5"]')
      expect(p5Chip).not.toBeNull()
      // Implementation counts all session.rounds (including draft round) → 3×
      expect(p5Chip.textContent).toContain('3×')
    })

    test('bench chip for p1 (never sat out) shows 0×', () => {
      // p1 is always on court in makeSessionWithHistory — but we need p1 on bench
      // Set up a custom session where p1 sits out in the current draft only
      const session = {
        id: 'session-1',
        clubId: 'club-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        status: 'active',
        attendeeIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
        rounds: [
          { index: 0, played: false, courts: [{ teamA: ['p2', 'p3'], teamB: ['p4', 'p5'] }], sittingOut: ['p1'] },
        ],
        settings: {
          oddPlayerFallback: 'sit-out',
          candidateCount: 1,
          penaltyRepeatedPartner: 5,
          penaltyRepeatedOpponent: 10,
          penaltyRepeatedSitOut: 3,
        },
      }
      StorageAdapter.set('clubs', CLUBS_DATA_5P)
      StorageAdapter.set('sessions', [session])
      mount(el, { roundIndex: '0' })
      const bench = el.querySelector('[data-zone="bench"]')
      const p1Chip = bench.querySelector('[data-player-id="p1"]')
      expect(p1Chip).not.toBeNull()
      // p1 sits out in this round only (count=1 in session.rounds, but draft is included)
      expect(p1Chip.textContent).toContain('1×')
    })

    test('bench chip for p5 (2 played sit-outs, not in current draft bench) shows played count', () => {
      // Set up session where round 2 (draft) does NOT have p5 sitting out
      // so p5 is in court, not bench — this tests that sitCounts includes played rounds
      const session = {
        id: 'session-1',
        clubId: 'club-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        status: 'active',
        attendeeIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
        rounds: [
          { index: 0, played: true,  courts: [{ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] }], sittingOut: ['p5'] },
          { index: 1, played: true,  courts: [{ teamA: ['p1', 'p3'], teamB: ['p2', 'p4'] }], sittingOut: ['p5'] },
          // Round 2: p5 is in court, p1 is on bench (so we can check p5 badge indirectly)
          { index: 2, played: false, courts: [{ teamA: ['p2', 'p3'], teamB: ['p4', 'p5'] }], sittingOut: ['p1'] },
        ],
        settings: {
          oddPlayerFallback: 'sit-out',
          candidateCount: 1,
          penaltyRepeatedPartner: 5,
          penaltyRepeatedOpponent: 10,
          penaltyRepeatedSitOut: 3,
        },
      }
      StorageAdapter.set('clubs', CLUBS_DATA_5P)
      StorageAdapter.set('sessions', [session])
      mount(el, { roundIndex: '2' })
      // p1 is on bench; check p1's badge = 0 (never sat out in any stored round)
      const bench = el.querySelector('[data-zone="bench"]')
      const p1Chip = bench.querySelector('[data-player-id="p1"]')
      expect(p1Chip).not.toBeNull()
      expect(p1Chip.textContent).toContain('1×')
    })

    test('court chips (in data-zone="court-0-a") do NOT contain the "×" badge text', () => {
      const session = makeSessionWithHistory()
      setupEditorWithSession(session, 2)
      const courtZoneA = el.querySelector('[data-zone="court-0-a"]')
      // Court chips should NOT have the × badge
      const chips = courtZoneA.querySelectorAll('[data-player-id]')
      chips.forEach(chip => {
        expect(chip.textContent).not.toContain('×')
      })
    })
  })

  // ---------------------------------------------------------------------------
  describe('BENCH-02: Haptic feedback on drop', () => {
    test('Haptics.medium is called once after simulated drag-end', () => {
      const round = { index: 0, played: false, courts: [{ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] }], sittingOut: [] }
      setupEditor(round)
      const p4Chip = el.querySelector('[data-player-id="p4"]')
      const bench = el.querySelector('[data-zone="bench"]')
      bench.appendChild(p4Chip)
      mockSortable.instances[0].options.onEnd({ item: p4Chip })
      expect(Haptics.medium).toHaveBeenCalledOnce()
    })

    test('Haptics.medium is called on every drag-end (multiple drags = multiple calls)', () => {
      const round = { index: 0, played: false, courts: [{ teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] }], sittingOut: [] }
      setupEditor(round)
      const p4Chip = el.querySelector('[data-player-id="p4"]')
      const bench = el.querySelector('[data-zone="bench"]')
      bench.appendChild(p4Chip)
      mockSortable.instances[0].options.onEnd({ item: p4Chip })
      mockSortable.instances[0].options.onEnd({ item: p4Chip })
      expect(Haptics.medium).toHaveBeenCalledTimes(2)
    })
  })

  // ---------------------------------------------------------------------------
  describe('Court limit guardrails', () => {
    test('cannot add court when 55 courts already exist — [data-court="55"] absent', () => {
      // Build a round with 55 courts
      const courts = Array.from({ length: 55 }, () => ({ teamA: [], teamB: [] }))
      const round = { index: 0, played: false, courts, sittingOut: ['p1', 'p2', 'p3', 'p4'] }
      setupEditor(round)
      el.querySelector('#add-court-btn').click()
      expect(el.querySelector('[data-court="55"]')).toBeNull()
    })

    test('adding the 20th court triggers a toast (gsd-toast in document.body)', () => {
      // Build a round with 19 courts
      const courts = Array.from({ length: 19 }, () => ({ teamA: [], teamB: [] }))
      const round = { index: 0, played: false, courts, sittingOut: ['p1', 'p2', 'p3', 'p4'] }
      setupEditor(round)
      // Remove any pre-existing toast
      const existing = document.getElementById('gsd-toast')
      if (existing) existing.remove()
      el.querySelector('#add-court-btn').click()
      // 20th court should be added
      expect(el.querySelector('[data-court="19"]')).not.toBeNull()
      // Toast should have fired
      expect(document.getElementById('gsd-toast')).not.toBeNull()
    })
  })
})
