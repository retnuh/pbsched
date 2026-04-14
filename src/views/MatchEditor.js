import { SessionService } from '../services/session.js';
import { ClubService } from '../services/club.js';
import { navigate } from '../router.js';
import { escapeHTML } from '../utils/html.js';
import Sortable, { Swap } from 'sortablejs';

// Mount Swap plugin once at module load (not inside mount())
Sortable.mount(new Swap());

// Module-scope state — initialized in mount(), nulled in unmount()
let _sortableInstances = [];
let _draft = null;
let _originalRound = null;
let _roundIndex = null;
let _el = null;

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
    const isInvalid = total === 1;
    if (isInvalid) anyInvalid = true;
    const card = el.querySelector('[data-court="' + i + '"]');
    if (!card) return;
    card.classList.toggle('border-red-400', isInvalid);
    card.classList.toggle('border-gray-200', !isInvalid);
    const errorLabel = card.querySelector('[data-court-error]');
    if (errorLabel) errorLabel.classList.toggle('hidden', !isInvalid);
  });
  const confirmBtn = el.querySelector('#confirm-btn');
  if (confirmBtn) {
    confirmBtn.disabled = anyInvalid;
    confirmBtn.classList.toggle('opacity-50', anyInvalid);
    confirmBtn.classList.toggle('cursor-not-allowed', anyInvalid);
    confirmBtn.classList.toggle('bg-blue-600', !anyInvalid);
    confirmBtn.classList.toggle('text-white', !anyInvalid);
    confirmBtn.classList.toggle('shadow-lg', !anyInvalid);
    confirmBtn.classList.toggle('shadow-blue-200', !anyInvalid);
    confirmBtn.classList.toggle('bg-gray-300', anyInvalid);
    confirmBtn.classList.toggle('text-gray-500', anyInvalid);
  }
}

function hasChanges() {
  return JSON.stringify(_draft) !== JSON.stringify(_originalRound);
}

function handleCancel() {
  if (!hasChanges()) { navigate('/active'); return; }
  const confirmed = confirm("Discard changes? Your edits won't be saved.");
  if (confirmed) navigate('/active');
}

function handleConfirm() {
  const anyInvalid = _draft.courts.some(c => (c.teamA.length + c.teamB.length) === 1);
  if (anyInvalid) return;
  SessionService.updateRound(_roundIndex, _draft);
  navigate('/active');
}

function handleDragEnd() {
  reconcileDraftFromDOM(_el);
  validateAndUpdateUI(_el);
  // Remove the empty-bench marker once a chip lands there
  const benchZone = _el.querySelector('[data-zone="bench"]');
  const marker = benchZone?.querySelector('.bench-empty-marker');
  if (marker && benchZone.querySelectorAll('[data-player-id]').length > 0) {
    marker.remove();
  }
}

function initSortables(el) {
  const zones = el.querySelectorAll('[data-zone]');
  zones.forEach(zone => {
    const instance = new Sortable(zone, {
      group: 'players',
      swap: true,
      swapClass: 'sortable-swap-highlight',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      delay: 150,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      filter: '.bench-empty-marker',
      onEnd: handleDragEnd,
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

  // Chip helper — color is driven by CSS zone selectors ([data-zone$="-a/b"], [data-zone="bench"])
  // so chips always reflect their current position, not their original team assignment
  const playerChip = (id) =>
    `<div data-player-id="${escapeHTML(id)}"
          class="px-3 py-3 border rounded-full text-sm font-medium text-center min-h-[44px] flex items-center justify-center cursor-grab">
       ${escapeHTML(getPlayerName(id))}
     </div>`;

  // Court zones — data-court for validation, data-zone for SortableJS init
  const courtsHTML = round.courts.map((court, i) => `
    <div data-court="${i}" class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="p-3 bg-gray-50 flex items-center justify-between">
        <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Court ${i + 1}</span>
        <span data-court-error class="hidden text-xs font-bold text-red-600">needs 2+ players</span>
      </div>
      <div class="p-4">
        <div class="grid grid-cols-2">
          <div data-zone="court-${i}-a" class="space-y-2 pr-3">
            ${court.teamA.map(playerChip).join('')}
          </div>
          <div data-zone="court-${i}-b" class="space-y-2 pl-3 border-l border-gray-200">
            ${court.teamB.map(playerChip).join('')}
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // Rest Bench zone — data-zone="bench"; empty-state marker has bench-empty-marker class
  // so SortableJS filter excludes it from being draggable
  const benchHTML = `
    <div class="rounded-xl bg-gray-100 border border-gray-200 p-4 space-y-3">
      <h2 class="text-xs font-bold text-gray-500 uppercase tracking-widest">Rest Bench</h2>
      <div data-zone="bench" class="flex flex-wrap gap-2 min-h-[52px]">
        ${round.sittingOut.length > 0
          ? round.sittingOut.map(playerChip).join('')
          : '<span class="bench-empty-marker text-sm text-gray-400 italic">--|--</span>'}
      </div>
    </div>
  `;

  // Bottom bar — fixed above nav bar, always visible
  const bottomBarHTML = `
    <div class="fixed fixed-safe-bottom left-0 right-0 max-w-lg mx-auto z-40
                bg-white/90 backdrop-blur-sm border-t border-gray-100">
      <div class="flex items-center gap-3 p-4">
        <button id="cancel-btn"
                class="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl
                       font-bold border border-gray-200">
          Cancel
        </button>
        <button id="confirm-btn"
                class="flex-1 py-4 bg-blue-600 text-white rounded-xl
                       font-bold shadow-lg shadow-blue-200">
          Confirm
        </button>
      </div>
    </div>
  `;

  el.innerHTML = `
    <div class="p-4 space-y-6 pb-48">
      <header class="flex items-center space-x-4">
        <h1 class="text-2xl font-bold">Edit Round ${round.index + 1}</h1>
      </header>
      ${courtsHTML}
      ${benchHTML}
      ${bottomBarHTML}
    </div>
  `;

  // Initialize module-scope state
  _el = el;
  _roundIndex = parseInt(params.roundIndex, 10);
  _draft = JSON.parse(JSON.stringify(round));
  _originalRound = JSON.parse(JSON.stringify(round));

  // (initSortables must come after el.innerHTML is set)
  initSortables(el);
  validateAndUpdateUI(el);
  el.querySelector('#cancel-btn').addEventListener('click', handleCancel);
  el.querySelector('#confirm-btn').addEventListener('click', handleConfirm);
}

export function unmount() {
  _sortableInstances.forEach(s => s.destroy());
  _sortableInstances = [];
  _draft = null;
  _originalRound = null;
  _roundIndex = null;
  _el = null;
}
