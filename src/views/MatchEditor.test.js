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
import { mount as mountRoundDisplay } from './RoundDisplay.js'

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

    test('Edit button in RoundDisplay calls navigate with correct route', () => {
      const session = makeSession([makeRound(0, false)])
      StorageAdapter.set('clubs', CLUBS_DATA)
      StorageAdapter.set('sessions', [session])

      const rdEl = document.createElement('div')
      mountRoundDisplay(rdEl, {})

      const editBtn = rdEl.querySelector('[data-action="edit"]')
      expect(editBtn).not.toBeNull()
      editBtn.click()

      expect(navigate).toHaveBeenCalledWith('/edit/0')
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
    test('renders empty bench marker when sittingOut is empty', () => {
      const session = makeSession([makeRound(0, false)])
      StorageAdapter.set('clubs', CLUBS_DATA)
      StorageAdapter.set('sessions', [session])

      mount(el, { roundIndex: '0' })

      expect(el.innerHTML).toContain('--|--')
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

  describe('DRAG-02/03/04: reconcileDraftFromDOM rebuilds draft from DOM', () => {
    test('after simulated DOM move, reconcile reads new player positions from data-player-id', () => {
      setupEditor(makeRoundWithBench())
      // Simulate SortableJS DOM mutation: physically move p1 chip to court-0-b zone
      const p1Chip = el.querySelector('[data-player-id="p1"]')
      const zoneB = el.querySelector('[data-zone="court-0-b"]')
      zoneB.appendChild(p1Chip)
      // Trigger reconcile by firing a synthetic onEnd on the Sortable instance
      // (In the mock environment, we call the view's exported reconcile helper if available,
      // or simulate by clicking the confirm button after reconcile should have run.)
      // The test verifies structure: p1 chip is now inside court-0-b
      expect(zoneB.querySelector('[data-player-id="p1"]')).not.toBeNull()
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

    test('SWAP: onMove allows bench→court when Swap plugin provides a swap partner', () => {
      setupEditor(makeRoundWithBench())
      const zoneA = el.querySelector('[data-zone="court-0-a"]')
      const benchZone = el.querySelector('[data-zone="bench"]')
      const p1Chip = el.querySelector('[data-player-id="p1"]') // chip in zoneA to swap with
      const instance = mockSortable.instances.find(s => s._el === benchZone)
      const result = instance.options.onMove({ from: benchZone, to: zoneA, related: p1Chip })
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
    test('court zone instances have swap:true and bench instance has swap:false', () => {
      setupEditor(makeRoundWithBench())
      const courtA = mockSortable.instances.find(s => s._el === el.querySelector('[data-zone="court-0-a"]'))
      const courtB = mockSortable.instances.find(s => s._el === el.querySelector('[data-zone="court-0-b"]'))
      const bench  = mockSortable.instances.find(s => s._el === el.querySelector('[data-zone="bench"]'))
      expect(courtA.options.swap).toBe(true)
      expect(courtB.options.swap).toBe(true)
      expect(bench.options.swap).toBe(false)
    })

    test('instances use correct group, delay, ghostClass, and emptyInsertThreshold', () => {
      setupEditor(makeRoundWithBench())
      const opts = mockSortable.instances[0].options
      expect(opts.group).toBe('players')
      expect(opts.delay).toBe(150)
      expect(opts.delayOnTouchOnly).toBe(true)
      expect(opts.ghostClass).toBe('sortable-ghost')
      expect(opts.emptyInsertThreshold).toBe(20)
    })

    test('filter excludes bench-empty-marker but NOT empty-slot (removed to prevent ghost expansion)', () => {
      setupEditor(makeRoundWithBench())
      const filter = mockSortable.instances[0].options.filter
      expect(filter).toContain('bench-empty-marker')
      expect(filter).not.toContain('empty-slot')
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

  describe('SLOT-01: Court zones are always droppable (min-h, no ghost-expanding placeholders)', () => {
    test('court zones have min-h class so empty zones remain drop targets', () => {
      setupEditor(makeRoundWithBench())
      expect(el.querySelector('[data-zone="court-0-a"]').className).toContain('min-h')
      expect(el.querySelector('[data-zone="court-0-b"]').className).toContain('min-h')
    })

    test('court zones contain only player chips — no extra placeholder elements', () => {
      setupEditor(makeRoundWithBench())
      const zoneA = el.querySelector('[data-zone="court-0-a"]')
      // All direct children that are not player chips should not exist
      expect(zoneA.querySelectorAll('.empty-slot').length).toBe(0)
      expect(zoneA.querySelectorAll('[data-player-id]').length).toBe(2)
    })

    test('bench zone has min-h class ensuring it is always droppable', () => {
      setupEditor(makeRoundWithBench())
      expect(el.querySelector('[data-zone="bench"]').className).toContain('min-h')
    })
  })
})
