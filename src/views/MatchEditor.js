import { SessionService } from '../services/session.js';
import { ClubService } from '../services/club.js';
import { navigate } from '../router.js';
import { escapeHTML } from '../utils/html.js';
import { Haptics } from '../services/haptics.js';
import Sortable, { Swap } from 'sortablejs';
Sortable.mount(new Swap());

// Module-scope state — initialized in mount(), nulled in unmount()
let _sortableInstances = [];
let _draft = null;
let _originalRound = null;
let _roundIndex = null;
let _el = null;
let _session = null;
let _club = null;
let _round = null;
let _getPlayerName = null;

// --- Private helpers ---

function readZoneIds(el, zoneKey) {
  const zone = el.querySelector(`[data-zone="${zoneKey}"]`);
  if (!zone) return [];
  return [...zone.querySelectorAll('[data-player-id]')]
    .map(chip => chip.dataset.playerId);
}

function reconcileDraftFromDOM(el) {
  _draft.courts = _draft.courts.map((court, i) => ({
    ...court,
    teamA: readZoneIds(el, `court-${i}-a`),
    teamB: readZoneIds(el, `court-${i}-b`),
  }));
  _draft.sittingOut = readZoneIds(el, 'bench');
}


function validateAndUpdateUI(el) {
  let anyInvalid = false;
  _draft.courts.forEach((court, i) => {
    const total = court.teamA.length + court.teamB.length;
    const oversized = court.teamA.length > 2 || court.teamB.length > 2;
    const imbalanced = total > 1 && (court.teamA.length === 0 || court.teamB.length === 0);
    const isInvalid = total === 1 || oversized || imbalanced;
    if (isInvalid) anyInvalid = true;
    const card = el.querySelector('[data-court="' + i + '"]');
    if (!card) return;
    card.classList.toggle('border-red-400', isInvalid);
    card.classList.toggle('border-gray-200', !isInvalid);
    const errorLabel = card.querySelector('[data-court-error]');
    if (errorLabel) {
      errorLabel.classList.toggle('hidden', !isInvalid);
      if (oversized) errorLabel.textContent = 'max 2 per side';
      else if (imbalanced) errorLabel.textContent = 'players on both sides required';
      else if (total === 1) errorLabel.textContent = 'needs 2+ players';
    }
  });
  const confirmBtn = el.querySelector('#confirm-btn');
  if (confirmBtn) {
    confirmBtn.disabled = anyInvalid;
    confirmBtn.classList.toggle('opacity-50', anyInvalid);
    confirmBtn.classList.toggle('cursor-not-allowed', anyInvalid);
    confirmBtn.classList.toggle('btn-primary', !anyInvalid);
    confirmBtn.classList.toggle('bg-gray-300', anyInvalid);
    confirmBtn.classList.toggle('dark:bg-gray-600', anyInvalid);
  }
}

function hasChanges() {
  return JSON.stringify(_draft) !== JSON.stringify(_originalRound);
}

function handleCancel() {
  if (!hasChanges()) { navigate('/active'); return; }
  _el.querySelector('#discard-modal').classList.remove('hidden');
}

function handleDiscardConfirm() { navigate('/active'); }

function handleDiscardKeep() {
  _el.querySelector('#discard-modal').classList.add('hidden');
}

function handleConfirm() {
  const anyInvalid = _draft.courts.some(c => {
    const total = c.teamA.length + c.teamB.length;
    return total === 1 || c.teamA.length > 2 || c.teamB.length > 2 ||
      (total > 1 && (c.teamA.length === 0 || c.teamB.length === 0));
  });
  if (anyInvalid) return;
  // Phase 14: prune empty courts before save (silent)
  const prunedDraft = {
    ..._draft,
    courts: _draft.courts.filter(c => c.teamA.length > 0 || c.teamB.length > 0),
  };
  SessionService.updateRound(_roundIndex, prunedDraft);
  navigate('/active');
}

function makeEmptySlot({ bench = false } = {}) {
  const div = document.createElement('div');
  if (bench) {
    div.className = 'empty-slot min-h-[44px] px-6 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-600 text-lg';
    div.textContent = '🛋️';
  } else {
    div.className = 'empty-slot min-h-[44px] border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-full';
  }
  return div;
}

function showToast(message) {
  const existing = document.getElementById('gsd-toast');
  if (existing) existing.remove();
  const div = document.createElement('div');
  div.id = 'gsd-toast';
  div.className = 'fixed top-4 left-0 right-0 flex justify-center z-50 animate-bounce-in';
  div.innerHTML = `<div class="bg-gray-900 text-white rounded-xl px-4 py-3 max-w-xs mx-auto text-sm font-medium shadow-lg">${escapeHTML(message)}</div>`;
  document.body.appendChild(div);
  setTimeout(() => {
    div.style.transition = 'opacity 0.2s';
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 200);
  }, 2500);
}

function updateRemoveButtonVisibility(el) {
  _draft.courts.forEach((court, i) => {
    const btn = el.querySelector(`[data-remove-court="${i}"]`);
    if (!btn) return;
    const isEmpty = court.teamA.length === 0 && court.teamB.length === 0;
    const isOnlyOne = _draft.courts.length <= 1;
    btn.classList.toggle('hidden', !isEmpty || isOnlyOne);
  });
}

// Keep exactly (2 - playerCount) empty slots in each court side after each drag.
// Empty slots that drifted to the bench are discarded.
function syncEmptySlots(el) {
  _draft.courts.forEach((court, i) => {
    [['a', court.teamA], ['b', court.teamB]].forEach(([side, team]) => {
      const zone = el.querySelector(`[data-zone="court-${i}-${side}"]`);
      if (!zone) return;
      zone.querySelectorAll('.empty-slot').forEach(s => s.remove());
      const needed = Math.max(0, 2 - team.length);
      for (let k = 0; k < needed; k++) zone.appendChild(makeEmptySlot());
    });
  });
  // Bench always keeps exactly one empty slot so there is always a swap target.
  const bench = el.querySelector('[data-zone="bench"]');
  if (bench) {
    bench.querySelectorAll('.empty-slot').forEach(s => s.remove());
    bench.appendChild(makeEmptySlot({ bench: true }));
  }
}

function buildHTML(draft, round, club, getPlayerName, session) {
  // sitCounts — count sit-outs from ALL session rounds (current draft NOT included)
  const sitCounts = {};
  session.rounds.forEach(r => {
    r.sittingOut.forEach(id => {
      sitCounts[id] = (sitCounts[id] || 0) + 1;
    });
  });

  // Two chip factories — court chips have no badge, bench chips show sit-out count
  const courtChip = (id) =>
    `<div data-player-id="${escapeHTML(id)}"
          class="px-3 py-3 border rounded-full text-sm font-medium text-center min-h-[44px] flex items-center justify-center cursor-grab">
       ${escapeHTML(getPlayerName(id))}
     </div>`;

  const benchChip = (id) =>
    `<div data-player-id="${escapeHTML(id)}"
          class="px-3 py-2 border rounded-full text-sm font-medium text-center min-h-[44px] flex flex-col items-center justify-center cursor-grab">
       <span>${escapeHTML(getPlayerName(id))}</span>
       <span class="sit-badge text-xs font-medium text-gray-500 dark:text-gray-400">${sitCounts[id] || 0}×</span>
     </div>`;

  const emptySlotHTML = '<div class="empty-slot min-h-[44px] border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-full"></div>';
  const courtCol = (players) =>
    players.map(courtChip).join('') +
    Array(Math.max(0, 2 - players.length)).fill(emptySlotHTML).join('');

  const courtsHTML = draft.courts.map((court, i) => `
    <div data-court="${i}" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div class="p-3 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
        <span class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Court ${i + 1}</span>
        <div class="flex items-center gap-2">
          <span data-court-error class="hidden text-xs font-bold text-red-600 dark:text-red-400">needs 2+ players</span>
          <button data-remove-court="${i}"
                  class="text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 ${(court.teamA.length === 0 && court.teamB.length === 0 && draft.courts.length > 1) ? '' : 'hidden'}">
            Remove
          </button>
        </div>
      </div>
      <div class="p-4">
        <div class="grid grid-cols-2">
          <div data-zone="court-${i}-a" class="space-y-2 pr-3 min-h-[96px]">
            ${courtCol(court.teamA)}
          </div>
          <div data-zone="court-${i}-b" class="space-y-2 pl-3 border-l border-gray-200 dark:border-gray-700 min-h-[96px]">
            ${courtCol(court.teamB)}
          </div>
        </div>
      </div>
    </div>
  `).join('');

  const addCourtButtonHTML = `
    <button id="add-court-btn"
            class="flex items-center gap-2 justify-center w-full min-h-[44px] px-4 py-3
                   bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl text-blue-600 dark:text-blue-300 font-medium text-sm">
      <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/>
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v8M8 12h8"/>
      </svg>
      Add court
    </button>
  `;

  const benchHTML = `
    <div class="rounded-xl bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-4 space-y-3">
      <h2 class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Rest Bench</h2>
      <div data-zone="bench" class="flex flex-wrap gap-2 min-h-[52px]">
        ${draft.sittingOut.map(benchChip).join('')}
        <div class="empty-slot min-h-[44px] px-6 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-600 text-lg">🛋️</div>
      </div>
    </div>
  `;

  const bottomBarHTML = `
    <div class="fixed fixed-safe-bottom left-0 right-0 max-w-lg mx-auto z-40
                bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-t border-gray-100 dark:border-gray-700">
      <div class="flex items-center gap-3 p-4">
        <button id="cancel-btn"
                class="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold border border-gray-200 dark:border-gray-600">
          Cancel
        </button>
        <button id="confirm-btn"
                class="flex-1 py-4 btn-primary rounded-xl font-bold text-white">
          Confirm
        </button>
      </div>
    </div>
  `;

  const discardModalHTML = `
    <div id="discard-modal" class="hidden fixed inset-0 z-[200] flex items-end">
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="relative bg-white dark:bg-gray-800 rounded-t-2xl w-full max-w-lg mx-auto p-6 space-y-4 shadow-xl">
        <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">Discard changes?</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">Your edits won't be saved.</p>
        <div class="flex gap-3 pt-2">
          <button id="discard-keep-btn"
                  class="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-sm">
            Keep Editing
          </button>
          <button id="discard-confirm-btn"
                  class="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm">
            Discard
          </button>
        </div>
      </div>
    </div>
  `;

  return `
    <div class="p-4 space-y-6 pb-48">
      <header class="flex items-center space-x-4">
        <h1 class="text-2xl font-bold">Edit Round ${round.index + 1}</h1>
      </header>
      ${courtsHTML}
      ${addCourtButtonHTML}
      ${benchHTML}
      ${bottomBarHTML}
    </div>
    ${discardModalHTML}
  `;
}

function wireListeners(el) {
  el.querySelector('#add-court-btn').addEventListener('click', handleAddCourt);
  el.querySelector('#cancel-btn').addEventListener('click', handleCancel);
  el.querySelector('#confirm-btn').addEventListener('click', handleConfirm);
  el.querySelector('#discard-keep-btn').addEventListener('click', handleDiscardKeep);
  el.querySelector('#discard-confirm-btn').addEventListener('click', handleDiscardConfirm);
  // Event delegation for Remove buttons (one listener on the scroll container)
  el.querySelector('.space-y-6').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-court]');
    if (btn) handleRemoveCourt(parseInt(btn.dataset.removeCourt, 10));
  });
}

function rerender(el) {
  _sortableInstances.forEach(s => s.destroy());
  _sortableInstances = [];
  el.innerHTML = buildHTML(_draft, _round, _club, _getPlayerName, _session);
  initSortables(el);
  validateAndUpdateUI(el);
  wireListeners(el);
}

function handleAddCourt() {
  if (_draft.courts.length >= 55) {
    showToast("Can't be better than Wimbledon!");
    return;
  }
  _draft.courts.push({ teamA: [], teamB: [] });
  if (_draft.courts.length === 20) {
    showToast("Oooh, more than Wimbledon's Championship courts? Fancy");
  }
  rerender(_el);
}

function handleRemoveCourt(courtIndex) {
  if (_draft.courts.length <= 1) return;
  _draft.courts.splice(courtIndex, 1);
  rerender(_el);
}

function syncBenchBadges(el) {
  const sitCounts = {};
  _session.rounds.forEach(r => {
    r.sittingOut.forEach(id => { sitCounts[id] = (sitCounts[id] || 0) + 1; });
  });

  // Court chips — strip badge if one drifted in from bench
  el.querySelectorAll('[data-zone^="court-"] [data-player-id]').forEach(chip => {
    const badge = chip.querySelector('.sit-badge');
    if (!badge) return;
    badge.remove();
    chip.classList.remove('flex-col', 'py-2');
    chip.classList.add('py-3');
  });

  // Bench chips — add badge if missing (chip dragged in from court)
  const bench = el.querySelector('[data-zone="bench"]');
  if (!bench) return;
  bench.querySelectorAll('[data-player-id]').forEach(chip => {
    if (chip.querySelector('.sit-badge')) return;
    const id = chip.dataset.playerId;
    chip.innerHTML = `<span>${escapeHTML(_getPlayerName(id))}</span><span class="sit-badge text-xs font-medium text-gray-500 dark:text-gray-400">${sitCounts[id] || 0}×</span>`;
    chip.classList.add('flex-col', 'py-2');
    chip.classList.remove('py-3');
  });
}

function handleDragEnd(evt) {
  reconcileDraftFromDOM(_el);
  syncEmptySlots(_el);
  syncBenchBadges(_el);
  validateAndUpdateUI(_el);
  updateRemoveButtonVisibility(_el);  // Phase 14: re-evaluate Remove buttons after drag
  Haptics.medium();                    // Phase 14: haptic on successful drop
  if (evt?.item) {
    evt.item.classList.add('drop-pop');
    evt.item.addEventListener('animationend', () => evt.item.classList.remove('drop-pop'), { once: true });
  }
}

function initSortables(el) {
  const zones = el.querySelectorAll('[data-zone]');
  zones.forEach(zone => {
    const instance = new Sortable(zone, {
      group: 'players',
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      swapClass: 'sortable-swap',
      delay: 150,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      emptyInsertThreshold: 20,
      swap: true,
      onMove: (evt) => {
        const toZone = evt.to?.dataset?.zone || '';
        if (toZone.startsWith('court-')) {
          const chipCount = evt.to.querySelectorAll('[data-player-id]').length;
          if (chipCount >= 2) {
            // Only allow if swapping with an actual player chip (not an empty slot).
            const isPlayerSwap = evt.related?.hasAttribute('data-player-id');
            if (!isPlayerSwap) return false;
          }
        }
      },
      onEnd: (evt) => handleDragEnd(evt),
    });
    _sortableInstances.push(instance);
  });
}

export function mount(el, params) {
  const session = SessionService.getActiveSession();

  if (!session) {
    el.innerHTML = `
      <div class="p-8 text-center space-y-4">
        <h1 class="text-2xl font-bold">No Active Session</h1>
        <p class="text-gray-500">Go to your clubs and select members to start a practice.</p>
        <a href="#/" class="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-md">Go to Clubs</a>
      </div>
    `;
    return;
  }

  const roundIndex = parseInt(params.roundIndex, 10);
  const round = session.rounds[roundIndex];

  if (!round) {
    el.innerHTML = `
      <div class="p-8 text-center space-y-4">
        <p class="text-gray-500">Round not found.</p>
        <a href="#/active" class="text-blue-600 font-bold">Return to session.</a>
      </div>
    `;
    return;
  }

  const club = ClubService.getClub(session.clubId);
  if (!club) {
    el.innerHTML = `
      <div class="p-8 text-center space-y-4">
        <h1 class="text-2xl font-bold">Club Not Found</h1>
        <p class="text-gray-500">This session references a club that no longer exists.</p>
        <a href="#/" class="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-md">Go to Clubs</a>
      </div>
    `;
    return;
  }

  const getPlayerName = (id) => club.members.find(m => m.id === id)?.name || 'Unknown';

  // Phase 14: store references for rerender()
  _session = session;
  _club = club;
  _round = round;
  _getPlayerName = getPlayerName;

  // Initialize module-scope state
  _el = el;
  _roundIndex = parseInt(params.roundIndex, 10);
  _draft = JSON.parse(JSON.stringify(round));
  _originalRound = JSON.parse(JSON.stringify(round));

  el.innerHTML = buildHTML(_draft, _round, _club, _getPlayerName, _session);
  initSortables(el);
  validateAndUpdateUI(el);
  wireListeners(el);
}

export function unmount() {
  _sortableInstances.forEach(s => s.destroy());
  _sortableInstances = [];
  _draft = null;
  _originalRound = null;
  _roundIndex = null;
  _el = null;
  _session = null;
  _club = null;
  _round = null;
  _getPlayerName = null;
}
