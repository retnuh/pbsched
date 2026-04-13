import { ClubService } from '../services/club.js';
import { navigate } from '../router.js';
import { Haptics } from '../services/haptics.js';

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = [
    'position:fixed',
    'bottom:24px',
    'left:50%',
    'transform:translateX(-50%)',
    'background:#1f2937',
    'color:#fff',
    'padding:10px 20px',
    'border-radius:8px',
    'font-size:14px',
    'z-index:9999',
    'pointer-events:none',
    'opacity:1',
    'transition:opacity 0.4s ease',
  ].join(';');
  document.body.appendChild(toast);
  // Begin fade after 1.6 s, remove after 2 s total
  setTimeout(() => { toast.style.opacity = '0'; }, 1600);
  setTimeout(() => { toast.remove(); }, 2000);
}

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
        <div class="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
          <p class="text-gray-500 italic mb-2">No members added yet.</p>
          <button id="focus-input" class="text-blue-600 font-bold text-sm">Add your first player &rarr;</button>
        </div>
      `;
      memberListEl.querySelector('#focus-input')?.addEventListener('click', () => {
        el.querySelector('#new-member-name').focus();
      });
      return;
    }

    memberListEl.innerHTML = freshClub.members.map(member => `
      <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group">
        <span class="font-medium text-lg">${member.name}</span>
        <div class="flex space-x-1">
          <button data-id="${member.id}" data-action="rename-member" class="px-3 py-1 text-sm text-blue-600 font-medium">Rename</button>
          <button data-id="${member.id}" data-action="remove-member" class="px-3 py-1 text-sm text-red-500 font-medium">Remove</button>
        </div>
      </div>
    `).join('');
  }

  el.innerHTML = `
    <div class="p-4 space-y-6">
      <header class="flex items-center space-x-4">
        <a href="#/" class="text-blue-600 font-medium text-lg">&larr;</a>
        <div id="club-name-display" class="flex items-center gap-2 flex-grow min-w-0">
          <h1 id="club-name-heading" class="text-2xl font-bold truncate">${club.name}</h1>
          <button id="edit-club-name" aria-label="Edit club name"
            class="text-gray-400 text-lg leading-none flex-shrink-0"
            style="background:none;border:none;cursor:pointer;padding:2px 4px;">✏️</button>
        </div>
      </header>

      <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
        <div>
          <h2 class="font-bold text-blue-800">Start Session</h2>
          <p class="text-xs text-blue-600">Pick attendees and generate rounds</p>
        </div>
        <button id="start-session" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm">
          Go &rarr;
        </button>
      </div>

      <div class="space-y-4">
        <h2 class="font-bold text-gray-700 uppercase text-xs tracking-wider">Member Roster</h2>
        <div class="flex space-x-2">
          <input type="text" id="new-member-name" placeholder="Name" class="flex-grow p-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <button id="add-member" class="bg-gray-800 text-white px-6 rounded-xl font-bold">Add</button>
        </div>
        
        <div id="member-list" class="space-y-2"></div>
      </div>
    </div>
  `;

  renderMembers();

  // ── Inline club name editing ──────────────────────────────────────────────
  const nameDisplay  = el.querySelector('#club-name-display');
  const nameHeading  = el.querySelector('#club-name-heading');
  const editBtn      = el.querySelector('#edit-club-name');

  function activateEdit() {
    const currentName = ClubService.getClub(clubId).name;

    // Build input that visually matches the h1
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.setAttribute('aria-label', 'Club name');
    // Match h1 styling; font-size 1.5rem = 24px — satisfies iOS ≥16px requirement (CLUB-09)
    input.className = 'flex-grow min-w-0 font-bold bg-transparent outline-none';
    input.style.cssText = [
      'font-size:1.5rem',       // text-2xl = 24px
      'font-weight:700',
      'border:none',
      'border-bottom:2px solid #6b7280',
      'padding-bottom:2px',
      'width:100%',
    ].join(';');

    // Swap heading + button for input
    nameDisplay.innerHTML = '';
    nameDisplay.appendChild(input);
    input.focus();
    input.select();

    let saved = false;

    function save() {
      if (saved) return;
      saved = true;
      const newName = input.value.trim();
      if (!newName) {
        showToast("Club name can't be empty");
        restore(currentName);
        return;
      }
      ClubService.updateClub(clubId, { name: newName });
      Haptics.light();
      restore(newName);
    }

    function cancel() {
      if (saved) return;
      saved = true;
      restore(currentName);
    }

    function restore(displayName) {
      nameDisplay.innerHTML = `
        <h1 id="club-name-heading" class="text-2xl font-bold truncate"></h1>
        <button id="edit-club-name" aria-label="Edit club name"
          class="text-gray-400 text-lg leading-none flex-shrink-0"
          style="background:none;border:none;cursor:pointer;padding:2px 4px;">✏️</button>
      `;
      // T-08-02: set text via textContent to prevent XSS from crafted localStorage values
      nameDisplay.querySelector('#club-name-heading').textContent = displayName;
      // Re-bind the edit button after innerHTML replacement
      nameDisplay.querySelector('#edit-club-name').addEventListener('click', activateEdit);
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter')  { e.preventDefault(); save(); }
      if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    });

    // blur fires after keydown, so the saved flag prevents double-fire
    input.addEventListener('blur', save);
  }

  // Initial bind
  editBtn.addEventListener('click', activateEdit);
  // Also allow tapping the heading text itself to activate edit
  nameHeading.addEventListener('click', activateEdit);
  // ─────────────────────────────────────────────────────────────────────────

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
