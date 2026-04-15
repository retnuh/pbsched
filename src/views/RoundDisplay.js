import { SessionService } from '../services/session.js';
import { ClubService } from '../services/club.js';
import { navigate } from '../router.js';
import { Haptics } from '../services/haptics.js';
import { escapeHTML } from '../utils/html.js';

export function mount(el, params) {
  const session = SessionService.getActiveSession();

  if (!session) {
    el.innerHTML = `
      <div class="p-8 text-center space-y-4">
        <h1 class="text-2xl font-bold">No Active Session</h1>
        <p class="text-gray-500">Go to your clubs and select members to start a practice.</p>
        <a href="#/" class="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-md">
          Go to Clubs
        </a>
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

  let isManagingAttendees = false;
  let showingAlternativesFor = null; // index
  let numAlternativesToShow = 3;

  function render() {
    if (isManagingAttendees) {
      renderAttendeeManager();
      return;
    }

    if (showingAlternativesFor !== null) {
      renderAlternatives();
      return;
    }

    renderMain();
  }

  function renderAttendeeManager() {
    const attendees = new Set(session.attendeeIds);
    
    // Calculate sit counts for the current session
    const sitCounts = {};
    session.rounds.forEach(round => {
      round.sittingOut.forEach(id => {
        sitCounts[id] = (sitCounts[id] || 0) + 1;
      });
    });

    el.innerHTML = `
      <div class="p-4 space-y-6 pb-48">
        <header class="flex items-center space-x-4">
          <button id="back-to-rounds" class="p-2 -ml-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 class="text-2xl font-bold">Manage Players</h1>
        </header>

        <!-- Add New Player Inline -->
        <form id="add-member-form" class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex space-x-2">
          <input
            id="new-member-name"
            type="text"
            placeholder="New Player Name"
            class="flex-grow bg-white dark:bg-gray-700 border border-blue-200 dark:border-gray-600 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
          <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
            Add
          </button>
        </form>

        <div class="space-y-2">
          ${club.members.map(member => {
            const isAttending = attendees.has(member.id);
            const sitCount = sitCounts[member.id] || 0;
            return `
              <label class="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border ${isAttending ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-100 dark:border-gray-700'} cursor-pointer">
                <div class="flex flex-col">
                  <span class="font-bold">${escapeHTML(member.name)}</span>
                  ${sitCount > 0 ? `<span class="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">Sat out ${sitCount}x</span>` : ''}
                </div>
                <input type="checkbox" data-id="${member.id}" ${isAttending ? 'checked' : ''} class="w-6 h-6 rounded-full border-gray-300 text-blue-600 focus:ring-blue-500">
              </label>
            `;
          }).join('')}
        </div>

        <div class="fixed fixed-safe-bottom left-0 right-0 p-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-t border-gray-100 dark:border-gray-700 max-w-lg mx-auto z-40">
          <button id="save-attendees" class="w-full py-4 btn-primary rounded-xl">
            Update Practice List
          </button>
        </div>
      </div>
    `;

    el.querySelector('#back-to-rounds').addEventListener('click', () => {
      isManagingAttendees = false;
      render();
    });

    el.querySelector('#add-member-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = el.querySelector('#new-member-name');
      const name = input.value.trim();
      if (name) {
        const newMember = ClubService.addMember(club.id, name);
        // Automatically add them to the session attendees too
        session.attendeeIds.push(newMember.id);
        SessionService.updateAttendees(session.attendeeIds);
        Haptics.light();
        renderAttendeeManager(); 
        
        // Return focus to the input for the next player
        const newInput = el.querySelector('#new-member-name');
        if (newInput) newInput.focus();
      }
    });

    el.querySelector('#save-attendees').addEventListener('click', () => {
      const newIds = Array.from(el.querySelectorAll('input[type="checkbox"]:checked'))
        .map(input => input.getAttribute('data-id'));
      
      if (newIds.length < 2) {
        alert('You need at least 2 players to schedule a round.');
        return;
      }

      SessionService.updateAttendees(newIds);
      Haptics.success();
      
      // Regenerate the latest round if it hasn't been played
      const currentRoundIdx = session.rounds.length - 1;
      if (currentRoundIdx >= 0 && !session.rounds[currentRoundIdx].played) {
        SessionService.regenerateRound(currentRoundIdx);
      }

      isManagingAttendees = false;
      render();
    });
  }

  function renderAlternatives() {
    const alternatives = SessionService.getAlternativeRounds(numAlternativesToShow);

    el.innerHTML = `
      <div class="p-4 space-y-6 pb-48">
        <header class="flex items-center space-x-4">
          <button id="back-to-rounds" class="p-2 -ml-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 class="text-2xl font-bold">Alternative Matchups</h1>
        </header>

        <div class="space-y-6">
          ${alternatives.map((alt, index) => `
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div class="p-3 bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
                <h3 class="font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-xs">Option ${index + 1} (Score: ${Math.round(alt.score)})</h3>
                <button data-action="pick-alt" data-index="${index}" class="bg-green-600 text-white px-4 py-1 rounded text-sm font-bold shadow-sm">
                  Select
                </button>
              </div>
              <div class="p-4 space-y-3">
                ${alt.round.courts.map((court, i) => `
                  <div class="flex items-center space-x-3 opacity-80">
                    <div class="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-400 dark:text-gray-300">
                      ${i + 1}
                    </div>
                    <div class="flex-grow grid grid-cols-2 gap-1 text-center">
                      <div class="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-100 dark:border-blue-800 text-xs font-bold">
                        ${escapeHTML(getPlayerName(court.teamA[0]))} / ${court.teamA[1] ? escapeHTML(getPlayerName(court.teamA[1])) : '👻'}
                      </div>
                      <div class="p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-100 dark:border-orange-800 text-xs font-bold">
                        ${escapeHTML(getPlayerName(court.teamB[0]))} / ${court.teamB[1] ? escapeHTML(getPlayerName(court.teamB[1])) : '👻'}
                      </div>
                    </div>
                  </div>
                `).join('')}
                
                ${alt.round.sittingOut.length > 0 ? `
                  <div class="mt-3 pt-3 border-t border-gray-50 flex flex-wrap gap-1.5">
                    <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mr-1">Sitting:</span>
                    ${alt.round.sittingOut.map(id => `
                      <span class="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-600">${escapeHTML(getPlayerName(id))}</span>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>

        <button id="show-more-alts" class="w-full py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
          Show More Options
        </button>
      </div>
    `;

    el.querySelector('#back-to-rounds').addEventListener('click', () => {
      showingAlternativesFor = null;
      numAlternativesToShow = 3; // Reset
      Haptics.light();
      render();
    });

    el.querySelector('#show-more-alts').addEventListener('click', () => {
      numAlternativesToShow += 3;
      Haptics.light();
      render();
    });

    el.querySelectorAll('[data-action="pick-alt"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const altIndex = parseInt(btn.getAttribute('data-index'), 10);
        const newRound = alternatives[altIndex].round;
        SessionService.replaceRound(showingAlternativesFor, newRound);
        Haptics.success();
        showingAlternativesFor = null;
        numAlternativesToShow = 3; // Reset
        render();
      });
    });
  }

  function renderMain() {
    const sessionDate = new Date(session.createdAt).toLocaleDateString(undefined, { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    el.innerHTML = `
      <div class="p-4 space-y-6">
        <header class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold">${sessionDate}</h1>
            <p class="text-xs text-gray-500">${escapeHTML(club.name)}</p>
          </div>
          <div class="flex items-center space-x-2">
            <a href="#/help" class="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 font-bold text-sm">?</a>
            <button id="manage-attendees" class="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-3 py-1 rounded border border-blue-100 dark:border-blue-800">
              Players
            </button>
            <button id="close-session" class="text-sm font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/40 px-3 py-1 rounded border border-red-100 dark:border-red-800">
              End
            </button>
          </div>
        </header>

        <div id="rounds-list" class="space-y-4 pb-8"></div>
      </div>

      <!-- End session confirmation modal -->
      <div id="end-session-modal" class="hidden fixed inset-0 z-[200] flex items-end">
        <div id="end-session-backdrop" class="absolute inset-0 bg-black/40"></div>
        <div class="relative bg-white dark:bg-gray-800 rounded-t-2xl w-full max-w-lg mx-auto p-6 space-y-4 shadow-xl">
          <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">End session?</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">You can always review past sessions in history later.</p>
          <div class="flex gap-3 pt-2">
            <button id="end-session-cancel" class="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-sm">Cancel</button>
            <button id="end-session-confirm" class="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm">End Session</button>
          </div>
        </div>
      </div>
    `;

    const endModal = el.querySelector('#end-session-modal');
    const hideEndModal = () => endModal.classList.add('hidden');
    el.querySelector('#end-session-backdrop').addEventListener('click', hideEndModal);
    el.querySelector('#end-session-cancel').addEventListener('click', hideEndModal);
    el.querySelector('#end-session-confirm').addEventListener('click', () => {
      SessionService.closeActiveSession();
      Haptics.medium();
      navigate('/');
    });

    const rounds = [...session.rounds].reverse(); // Show newest first
    const listEl = el.querySelector('#rounds-list');
    
    if (rounds.length === 0) {
      listEl.innerHTML = `
        <div class="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <p class="text-gray-500 dark:text-gray-400">Wait, where did the rounds go?</p>
          <button id="gen-first" class="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">
            Generate Round
          </button>
        </div>
      `;
      const btn = listEl.querySelector('#gen-first');
      if (btn) btn.addEventListener('click', () => {
        SessionService.generateNextRound();
        Haptics.light();
        render();
      });
    } else {
      const lastPlayedIdx = [...session.rounds].reverse().find(r => r.played)?.index;

      const hasPlayed = rounds.some(r => r.played);
      listEl.innerHTML = rounds.map((round, i) => `
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border ${round.played ? 'border-gray-100 dark:border-gray-700 opacity-60' : 'border-blue-200 dark:border-blue-700'} overflow-hidden">
          <div class="p-3 ${round.played ? 'bg-gray-50 dark:bg-gray-700' : 'bg-blue-50 dark:bg-blue-900/30'} flex justify-between items-center">
            <h3 class="font-bold ${round.played ? 'text-gray-500 dark:text-gray-400' : 'text-blue-800 dark:text-blue-300'}">Round ${round.index + 1}</h3>
            <div class="flex items-center space-x-2">
              ${round.played ? (round.index === lastPlayedIdx ? `
                <button data-action="edit" data-index="${round.index}" class="text-xs font-bold text-blue-600 hover:underline px-2">Edit</button>
                <button data-action="undo" data-index="${round.index}" class="text-xs font-bold text-red-500 hover:underline px-2">Undo</button>
              ` : '<span class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Completed</span>') : ''}
            </div>
          </div>
          
          <div class="p-4 space-y-4">
            ${round.courts.map((court, i) => `
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 dark:text-gray-300">
                  ${i + 1}
                </div>
                <div class="flex-grow grid grid-cols-2 gap-2 text-center">
                  <div class="p-2 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-100 dark:border-blue-800">
                    <p class="text-sm font-bold dark:text-gray-100">${escapeHTML(getPlayerName(court.teamA[0]))}</p>
                    ${court.teamA[1] ? `<p class="text-sm font-bold dark:text-gray-100">${escapeHTML(getPlayerName(court.teamA[1]))}</p>` : ''}
                  </div>
                  <div class="p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-100 dark:border-orange-800">
                    <p class="text-sm font-bold dark:text-gray-100">${escapeHTML(getPlayerName(court.teamB[0]))}</p>
                    ${court.teamB[1] ? `<p class="text-sm font-bold dark:text-gray-100">${escapeHTML(getPlayerName(court.teamB[1]))}</p>` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
            
            ${round.sittingOut.length > 0 ? `
              <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Sitting Out</p>
                <div class="flex flex-wrap gap-2">
                  ${round.sittingOut.map(id => `
                    <span class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">${escapeHTML(getPlayerName(id))}</span>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            ${!round.played ? `
              <div class="flex items-center gap-2 pt-3 border-t border-blue-100 dark:border-gray-600 mt-4">
                <button data-action="alternatives" data-index="${round.index}" class="flex-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 border border-blue-100 dark:border-blue-800 px-3 py-3 rounded-lg min-h-[44px]">
                  Alternatives
                </button>
                <button data-action="edit" data-index="${round.index}" class="flex-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 border border-blue-100 dark:border-blue-800 px-3 py-3 rounded-lg min-h-[44px]">
                  Edit
                </button>
                <button data-action="play" data-index="${round.index}" class="flex-1 text-xs font-bold bg-blue-600 text-white px-3 py-3 rounded-lg shadow-sm min-h-[44px]">
                  Mark Played
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      ` + (!round.played && i === 0 ? `
        <div class="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest py-2">
          ${hasPlayed ? 'Tap "Mark Played" to advance &bull; Previous Rounds' : 'Tap "Mark Played" to advance'}
        </div>
      ` : '')).join('');
    }

    // Attach Listeners
    el.querySelector('#manage-attendees').addEventListener('click', () => {
      isManagingAttendees = true;
      Haptics.light();
      render();
    });

    el.querySelector('#close-session').addEventListener('click', () => {
      endModal.classList.remove('hidden');
    });

    listEl.addEventListener('click', (e) => {
      const playBtn = e.target.closest('[data-action="play"]');
      if (playBtn) {
        const idx = parseInt(playBtn.getAttribute('data-index'), 10);
        SessionService.markRoundPlayed(idx);
        Haptics.success();
        
        // Auto-generate the next round if this was the latest round
        if (idx === session.rounds.length - 1) {
          SessionService.generateNextRound();
        }
        
        render();
        return;
      }

      const undoBtn = e.target.closest('[data-action="undo"]');
      if (undoBtn) {
        const idx = parseInt(undoBtn.getAttribute('data-index'), 10);
        SessionService.markRoundUnplayed(idx);
        SessionService.deleteUnplayedRoundsAfter(idx);
        Haptics.medium();
        render();
        return;
      }

      const altBtn = e.target.closest('[data-action="alternatives"]');
      if (altBtn) {
        const idx = parseInt(altBtn.getAttribute('data-index'), 10);
        showingAlternativesFor = idx;
        Haptics.light();
        render();
        return;
      }

      const editBtn = e.target.closest('[data-action="edit"]');
      if (editBtn) {
        const idx = parseInt(editBtn.getAttribute('data-index'), 10);
        Haptics.light();
        navigate('/edit/' + idx);
        return;
      }

    });
  }

  render();
}

export function unmount() {}
