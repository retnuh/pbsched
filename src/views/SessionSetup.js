import { ClubService } from '../services/club.js';
import { SessionService } from '../services/session.js';
import { navigate } from '../router.js';
import { Haptics } from '../services/haptics.js';

export function mount(el, params) {
  const { clubId } = params;
  const club = ClubService.getClub(clubId);

  if (!club) {
    el.innerHTML = `
      <div class="p-8 text-center space-y-4">
        <h1 class="text-xl font-bold">Club not found</h1>
        <a href="#/" class="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">Back to Clubs</a>
      </div>
    `;
    return;
  }

  // Sort members: most recent first, never played last
  const sortedMembers = [...club.members].sort((a, b) => {
    const timeA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
    const timeB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
    return timeB - timeA;
  });

  let selectedIds = new Set(club.members.map(m => m.id)); // Default to all

  function renderAttendance() {
    const attendeesEl = el.querySelector('#attendees-list');
    attendeesEl.innerHTML = sortedMembers.map(member => `
      <label class="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm cursor-pointer select-none">
        <div class="flex flex-col">
          <span class="text-lg font-medium">${member.name}</span>
          ${member.lastPlayed ? 
            `<span class="text-[10px] text-gray-400 uppercase font-bold">Last: ${new Date(member.lastPlayed).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>` 
            : '<span class="text-[10px] text-gray-300 uppercase font-bold">Never Played</span>'}
        </div>
        <input type="checkbox" value="${member.id}" ${selectedIds.has(member.id) ? 'checked' : ''} 
               class="w-6 h-6 rounded-lg text-blue-600 border-gray-300 focus:ring-blue-500">
      </label>
    `).join('');

    updateStartButton();
  }

  function updateStartButton() {
    const startBtn = el.querySelector('#start-btn');
    const count = selectedIds.size;
    startBtn.disabled = count < 4;
    startBtn.innerText = count < 4 ? `Select at least 4 (${count})` : `Start Session with ${count}`;
    startBtn.classList.toggle('opacity-50', count < 4);
    startBtn.classList.toggle('bg-blue-600', count >= 4);
    startBtn.classList.toggle('bg-gray-400', count < 4);
  }

  el.innerHTML = `
    <div class="p-4 space-y-6">
      <header class="flex items-center space-x-4">
        <a href="#/club/${clubId}" class="text-blue-600 font-medium text-lg">&larr;</a>
        <h1 class="text-2xl font-bold flex-grow truncate">Who is here?</h1>
      </header>

      <div class="flex justify-between items-center text-sm">
        <p class="text-gray-500">Pick attending players from <strong>${club.name}</strong></p>
        <button id="toggle-all" class="text-blue-600 font-bold">Invert</button>
      </div>

      <div id="attendees-list" class="space-y-2 pb-24"></div>

      <!-- Sticky Start Button -->
      <div class="fixed bottom-16 left-0 right-0 p-4 bg-gray-50/90 backdrop-blur-sm border-t border-gray-100 max-w-lg mx-auto">
        <button id="start-btn" class="w-full py-4 rounded-xl text-white font-bold shadow-lg transition transform active:scale-95 disabled:active:scale-100">
          Start Session
        </button>
      </div>
    </div>
  `;

  renderAttendance();

  // Event Listeners
  el.querySelector('#attendees-list').addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') {
      const id = e.target.value;
      if (e.target.checked) selectedIds.add(id);
      else selectedIds.delete(id);
      Haptics.light();
      updateStartButton();
    }
  });

  el.querySelector('#toggle-all').addEventListener('click', () => {
    const allIds = club.members.map(m => m.id);
    const newSelection = new Set();
    allIds.forEach(id => {
      if (!selectedIds.has(id)) newSelection.add(id);
    });
    selectedIds = newSelection;
    Haptics.medium();
    renderAttendance();
  });

  el.querySelector('#start-btn').addEventListener('click', () => {
    if (selectedIds.size >= 4) {
      SessionService.createSession(clubId, Array.from(selectedIds));
      SessionService.generateNextRound(); 
      Haptics.success();
      navigate('/active');
    } else {
      Haptics.error();
    }
  });
}

export function unmount() {}
