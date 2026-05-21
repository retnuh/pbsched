import { ClubService } from '../services/club.js';
import { SessionService } from '../services/session.js';
import { navigate } from '../router.js';
import { Haptics } from '../services/haptics.js';
import { InstallPromptService } from '../services/install-prompt.js';

// Module-scoped holder for the install-prompt subscriber so unmount() can release it.
let _unsubscribeInstall = null;

export function mount(el, params) {
  function renderClubs() {
    const clubs = ClubService.getClubs();
    const clubListEl = el.querySelector('#club-list');
    const activeSession = SessionService.getActiveSession();
    
    const today = new Date().toISOString().split('T')[0];
    const activeClubId = (activeSession && activeSession.createdAt.startsWith(today)) 
      ? activeSession.clubId 
      : null;

    if (clubs.length === 0) {
      clubListEl.innerHTML = `
        <div class="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600">
          <p class="text-gray-500 dark:text-gray-400">No clubs created yet.</p>
          <p class="text-sm text-gray-400 dark:text-gray-500">Add a club to manage your rosters.</p>
        </div>
      `;
      return;
    }

    clubListEl.innerHTML = clubs.map(club => {
      const isCurrent = club.id === activeClubId;
      const hasMembers = club.members.length > 0;

      return `
        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border ${isCurrent ? 'border-blue-500 bg-blue-50/30 dark:border-blue-400 dark:bg-blue-900/20' : 'border-gray-100 dark:border-gray-700'} ${!hasMembers ? 'ring-2 ring-blue-100 animate-pulse-subtle' : ''} flex justify-between items-center group">
          <div class="flex-grow cursor-pointer" data-id="${club.id}" data-action="view-club">
            <div class="flex items-center space-x-2">
              <h3 class="font-bold text-lg dark:text-gray-100">${club.name}</h3>
              ${isCurrent ? '<span class="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">Active Today</span>' : ''}
            </div>
            ${hasMembers ? 
              `<p class="text-sm text-gray-500 dark:text-gray-400">${club.members.length} members</p>` :
              `<p class="text-sm text-blue-600 font-bold flex items-center">
                <span class="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                Tap to add members &rarr;
              </p>`
            }
          </div>
          <div class="flex items-center space-x-2">
            ${isCurrent ? `
              <button data-action="resume-session" class="btn-primary px-3 py-1.5 rounded-lg text-xs">
                Resume
              </button>
            ` : ''}
            <button data-id="${club.id}" data-action="delete-club" class="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition text-xs font-medium">
               Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  el.innerHTML = `
    <div class="p-4 space-y-6">
      <header class="flex justify-between items-center">
        <h1 class="text-2xl font-bold">Your Clubs</h1>
        <button id="install-app-btn" type="button" class="hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Install App
        </button>
      </header>
      
      <!-- New Club Form -->
      <form id="new-club-form" class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex space-x-2">
        <input
          id="club-name-input"
          type="text"
          placeholder="New Club Name"
          class="flex-grow bg-white dark:bg-gray-700 border border-blue-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
        <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
          Add
        </button>
      </form>

      <div id="club-list" class="space-y-3"></div>
    </div>

    <!-- Delete club confirmation modal -->
    <div id="delete-club-modal" class="hidden fixed inset-0 z-[200] flex items-end">
      <div id="delete-club-backdrop" class="absolute inset-0 bg-black/40"></div>
      <div class="relative bg-white dark:bg-gray-800 rounded-t-2xl w-full max-w-lg mx-auto p-6 space-y-4 shadow-xl">
        <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">Delete club?</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">All members and session history for this club will be permanently deleted.</p>
        <div class="flex gap-3 pt-2">
          <button id="delete-club-cancel" class="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-sm">Cancel</button>
          <button id="delete-club-confirm" class="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm">Delete</button>
        </div>
      </div>
    </div>

    <!-- iOS "Add to Home Screen" instructions modal -->
    <div id="ios-install-modal" class="hidden fixed inset-0 z-[200] flex items-end">
      <div id="ios-install-backdrop" class="absolute inset-0 bg-black/40"></div>
      <div class="relative bg-white dark:bg-gray-800 rounded-t-2xl w-full max-w-lg mx-auto p-6 space-y-4 shadow-xl">
        <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">Install Pickleball Practice Scheduler</h2>
        <ol class="text-sm text-gray-600 dark:text-gray-300 space-y-3">
          <li class="flex items-start gap-2">
            <span class="font-bold text-blue-600 dark:text-blue-400">1.</span>
            <span class="flex items-center gap-1 flex-wrap">
              Tap the Share button
              <svg xmlns="http://www.w3.org/2000/svg" class="inline w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
              at the bottom of Safari.
            </span>
          </li>
          <li class="flex items-start gap-2">
            <span class="font-bold text-blue-600 dark:text-blue-400">2.</span>
            <span>Scroll down and tap <strong class="text-gray-900 dark:text-gray-100">Add to Home Screen</strong>.</span>
          </li>
        </ol>
        <button id="ios-install-close" class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm">Got it</button>
      </div>
    </div>
  `;

  renderClubs();

  let pendingDeleteClubId = null;
  const deleteModal = el.querySelector('#delete-club-modal');
  const showDeleteModal = (id) => { pendingDeleteClubId = id; deleteModal.classList.remove('hidden'); };
  const hideDeleteModal = () => { pendingDeleteClubId = null; deleteModal.classList.add('hidden'); };
  el.querySelector('#delete-club-backdrop').addEventListener('click', hideDeleteModal);
  el.querySelector('#delete-club-cancel').addEventListener('click', hideDeleteModal);
  el.querySelector('#delete-club-confirm').addEventListener('click', () => {
    if (!pendingDeleteClubId) return;
    Haptics.error();
    ClubService.deleteClub(pendingDeleteClubId);
    hideDeleteModal();
    renderClubs();
  });

  // Event Listeners
  const form = el.querySelector('#new-club-form');
  const input = el.querySelector('#club-name-input');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (name) {
      ClubService.createClub(name);
      Haptics.success();
      input.value = '';
      renderClubs();
    }
  });

  el.querySelector('#club-list').addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.getAttribute('data-action');
    const id = target.getAttribute('data-id');

    if (action === 'view-club') {
      Haptics.light();
      navigate(`/club/${id}`);
    } else if (action === 'resume-session') {
      Haptics.success();
      navigate('/active');
    } else if (action === 'delete-club') {
      showDeleteModal(id);
    }
  });

  // Install-app button + iOS instructions modal wiring
  const installBtn = el.querySelector('#install-app-btn');
  const iosModal = el.querySelector('#ios-install-modal');
  const showIosModal = () => iosModal.classList.remove('hidden');
  const hideIosModal = () => iosModal.classList.add('hidden');
  el.querySelector('#ios-install-backdrop').addEventListener('click', hideIosModal);
  el.querySelector('#ios-install-close').addEventListener('click', hideIosModal);

  function syncInstallBtn() {
    const status = InstallPromptService.getStatus();
    if (status === 'installable' || status === 'ios-instructions') {
      installBtn.classList.remove('hidden');
    } else {
      installBtn.classList.add('hidden');
    }
  }

  installBtn.addEventListener('click', async () => {
    const status = InstallPromptService.getStatus();
    Haptics.light();
    if (status === 'ios-instructions') {
      showIosModal();
    } else if (status === 'installable') {
      await InstallPromptService.promptInstall();
      syncInstallBtn();
    }
  });

  syncInstallBtn();
  // Release any previous subscription before re-binding (mount may be called repeatedly via routing).
  if (typeof _unsubscribeInstall === 'function') _unsubscribeInstall();
  _unsubscribeInstall = InstallPromptService.onChange(syncInstallBtn);
}

export function unmount() {
  if (typeof _unsubscribeInstall === 'function') {
    _unsubscribeInstall();
    _unsubscribeInstall = null;
  }
}
