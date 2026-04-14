import { ClubService } from '../services/club.js';
import { navigate } from '../router.js';
import { Haptics } from '../services/haptics.js';

export function mount(el, params) {
  const { clubId } = params;
  const club = ClubService.getClub(clubId);

  if (!club) {
    el.innerHTML = '<div class="p-4 text-red-500">Club not found.</div>';
    return;
  }

  function renderMembers() {
    const freshClub = ClubService.getClub(clubId);
    const memberListEl = el.querySelector('#member-list');
    
    if (freshClub.members.length === 0) {
      memberListEl.innerHTML = `
        <div class="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600">
          <p class="text-gray-500 dark:text-gray-400 italic mb-2">No members added yet.</p>
          <button id="focus-input" class="text-blue-600 font-bold text-sm">Add your first player &rarr;</button>
        </div>
      `;
      memberListEl.querySelector('#focus-input')?.addEventListener('click', () => {
        el.querySelector('#new-member-name').focus();
      });
      return;
    }

    memberListEl.innerHTML = freshClub.members.map(member => `
      <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center group">
        <span class="font-medium text-lg dark:text-gray-100">${member.name}</span>
        <div class="flex space-x-1">
          <button data-id="${member.id}" data-action="rename-member" class="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 font-medium">Rename</button>
          <button data-id="${member.id}" data-action="remove-member" class="px-3 py-1 text-sm text-red-500 dark:text-red-400 font-medium">Remove</button>
        </div>
      </div>
    `).join('');
  }

  el.innerHTML = `
    <div class="p-4 space-y-6">
      <header class="flex items-center space-x-4">
        <a href="#/" class="text-blue-600 font-medium text-lg">&larr;</a>
        <h1 class="text-2xl font-bold flex-grow truncate">${club.name}</h1>
      </header>

      <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex justify-between items-center">
        <div>
          <h2 class="font-bold text-blue-800 dark:text-blue-300">Start Session</h2>
          <p class="text-xs text-blue-600 dark:text-blue-400">Pick attendees and generate rounds</p>
        </div>
        <button id="start-session" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm">
          Go &rarr;
        </button>
      </div>

      <div class="space-y-4">
        <h2 class="font-bold text-gray-700 dark:text-gray-400 uppercase text-xs tracking-wider">Member Roster</h2>
        <div class="flex space-x-2">
          <input type="text" id="new-member-name" placeholder="Name" class="flex-grow p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <button id="add-member" class="bg-gray-800 text-white px-6 rounded-xl font-bold">Add</button>
        </div>
        
        <div id="member-list" class="space-y-2"></div>
      </div>
    </div>
  `;

  renderMembers();

  // Add Member
  const addBtn = el.querySelector('#add-member');
  const nameInput = el.querySelector('#new-member-name');
  const handleAdd = () => {
    const name = nameInput.value.trim();
    if (name) {
      ClubService.addMember(clubId, name);
      Haptics.light();
      nameInput.value = '';
      renderMembers();
    }
  };
  addBtn.addEventListener('click', handleAdd);
  nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAdd();
  });

  // Start Session
  el.querySelector('#start-session').addEventListener('click', () => {
    if (ClubService.getClub(clubId).members.length < 4) {
      Haptics.error();
      alert('You need at least 4 members in the club to start a session.');
      return;
    }
    Haptics.success();
    navigate(`/setup/${clubId}`);
  });

  // Rename/Remove Member
  el.querySelector('#member-list').addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.getAttribute('data-action');
    const memberId = target.getAttribute('data-id');

    if (action === 'remove-member') {
      if (confirm('Remove this member from the roster?')) {
        ClubService.removeMember(clubId, memberId);
        Haptics.medium();
        renderMembers();
      }
    } else if (action === 'rename-member') {
      const currentClub = ClubService.getClub(clubId);
      const member = currentClub.members.find(m => m.id === memberId);
      if (!member) return;
      const newName = prompt('Rename member:', member.name);
      if (newName && newName.trim()) {
        ClubService.renameMember(clubId, memberId, newName.trim());
        Haptics.light();
        renderMembers();
      }
    }
  });
}

export function unmount() {}
