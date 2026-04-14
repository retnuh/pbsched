import { ClubService } from '../services/club.js';
import { SessionService } from '../services/session.js';
import { navigate } from '../router.js';
import { Haptics } from '../services/haptics.js';

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
              <button data-action="resume-session" class="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm shadow-blue-100">
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
  `;

  renderClubs();

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
      if (confirm('Are you sure you want to delete this club and all its data?')) {
        Haptics.error();
        ClubService.deleteClub(id);
        renderClubs();
      }
    }
  });
}

export function unmount() {
  // Any necessary cleanup
}
