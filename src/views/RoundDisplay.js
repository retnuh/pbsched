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
  let pickingSitterFor = null; // index
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

    if (pickingSitterFor !== null) {
      renderSitterPicker();
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
        <form id="add-member-form" class="bg-blue-50 p-4 rounded-xl border border-blue-100 flex space-x-2">
          <input 
            id="new-member-name" 
            type="text" 
            placeholder="New Player Name" 
            class="flex-grow bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label class="flex items-center justify-between p-4 bg-white rounded-xl border ${isAttending ? 'border-blue-500 bg-blue-50' : 'border-gray-100'} cursor-pointer">
                <div class="flex flex-col">
                  <span class="font-bold">${member.name}</span>
                  ${sitCount > 0 ? `<span class="text-[10px] text-gray-400 uppercase font-bold">Sat out ${sitCount}x</span>` : ''}
                </div>
                <input type="checkbox" data-id="${member.id}" ${isAttending ? 'checked' : ''} class="w-6 h-6 rounded-full border-gray-300 text-blue-600 focus:ring-blue-500">
              </label>
            `;
          }).join('')}
        </div>

        <div class="fixed-safe-bottom left-0 right-0 p-4 bg-white/90 backdrop-blur-sm border-t border-gray-100 max-w-lg mx-auto z-40">
          <button id="save-attendees" class="w-full py-4 bg-blue-600 rounded-xl text-white font-bold shadow-lg shadow-blue-200">
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

  function renderSitterPicker() {
    const round = session.rounds[pickingSitterFor];
    const attendees = session.attendeeIds;
    
    // Calculate sit counts for the current session up to this round
    const sitCounts = {};
    session.rounds.forEach(r => {
      if (r.index < pickingSitterFor && r.played) {
        r.sittingOut.forEach(id => {
          sitCounts[id] = (sitCounts[id] || 0) + 1;
        });
      }
    });

    // Calculate how many people MUST sit out based on current strategy
    const oddCount = attendees.length % 4;
    const strat = session.settings.oddPlayerFallback;
    let requiredSitOutCount = oddCount; 
    if (strat === 'two-player-court' && oddCount === 3) requiredSitOutCount = 1;
    if (strat === 'two-player-court' && oddCount === 2) requiredSitOutCount = 0;
    if (strat === 'three-player-court' && oddCount === 3) requiredSitOutCount = 0;

    let sitters = new Set(round.sittingOut);

    function updateSitterUI() {
      const sitterListEl = el.querySelector('#sitter-list');
      const limitReached = sitters.size >= requiredSitOutCount;
      const isSingle = requiredSitOutCount === 1;

      sitterListEl.innerHTML = attendees.map(id => {
        const isChecked = sitters.has(id);
        const isDisabled = !isSingle && !isChecked && limitReached;
        const inputType = isSingle ? 'radio' : 'checkbox';
        const sitCount = sitCounts[id] || 0;
        
        return `
          <label class="flex items-center justify-between p-4 bg-white rounded-xl border ${isChecked ? 'border-blue-500 bg-blue-50' : 'border-gray-100'} ${isDisabled ? 'opacity-40 grayscale' : 'cursor-pointer'}">
            <div class="flex flex-col">
              <span class="font-bold ${isDisabled ? 'text-gray-400' : ''}">${escapeHTML(getPlayerName(id))}</span>
              ${sitCount > 0 ? `<span class="text-[10px] text-gray-400 uppercase font-bold">Sat out ${sitCount}x</span>` : ''}
            </div>
            <input type="${inputType}" name="sitter" value="${id}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''} class="w-6 h-6 rounded-full border-gray-300 text-blue-600 focus:ring-blue-500">
          </label>
        `;
      }).join('');

      const saveBtn = el.querySelector('#confirm-sitters');
      const diff = requiredSitOutCount - sitters.size;
      
      if (diff > 0) {
        saveBtn.innerText = `Select ${diff} more...`;
        saveBtn.disabled = true;
        saveBtn.classList.add('opacity-50');
      } else {
        saveBtn.innerText = `Regenerate Round`;
        saveBtn.disabled = false;
        saveBtn.classList.remove('opacity-50');
      }
    }

    el.innerHTML = `
      <div class="p-4 space-y-6 pb-48">
        <header class="flex items-center space-x-4">
          <button id="back-to-rounds" class="p-2 -ml-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 class="text-2xl font-bold">Pick Sitters</h1>
        </header>

        <p class="text-gray-500 text-sm italic">Select exactly ${requiredSitOutCount} player${requiredSitOutCount === 1 ? '' : 's'} to sit out.</p>

        <div id="sitter-list" class="space-y-2"></div>

        <div class="fixed-safe-bottom left-0 right-0 p-4 bg-white/90 backdrop-blur-sm border-t border-gray-100 max-w-lg mx-auto z-40">
          <button id="confirm-sitters" class="w-full py-4 bg-blue-600 rounded-xl text-white font-bold shadow-lg shadow-blue-200">
            Regenerate Round
          </button>
        </div>
      </div>
    `;

    updateSitterUI();

    el.querySelector('#back-to-rounds').addEventListener('click', () => {
      pickingSitterFor = null;
      render();
    });

    el.querySelector('#sitter-list').addEventListener('change', (e) => {
      const isSingle = requiredSitOutCount === 1;
      if (isSingle) {
        sitters = new Set([e.target.value]);
        Haptics.light();
      } else {
        if (e.target.checked) {
          sitters.add(e.target.value);
          Haptics.light();
        }
        else {
          sitters.delete(e.target.value);
          Haptics.light();
        }
      }
      updateSitterUI();
    });

    el.querySelector('#confirm-sitters').addEventListener('click', () => {
      SessionService.regenerateRound(pickingSitterFor, Array.from(sitters));
      Haptics.success();
      pickingSitterFor = null;
      render();
    });
  }

  function renderAlternatives() {
    const alternatives = SessionService.getAlternativeRounds(numAlternativesToShow, showingAlternativesFor);

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
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div class="p-3 bg-gray-50 flex justify-between items-center">
                <h3 class="font-bold text-gray-500 uppercase tracking-widest text-xs">Option ${index + 1} (Score: ${Math.round(alt.score)})</h3>
                <button data-action="pick-alt" data-index="${index}" class="bg-green-600 text-white px-4 py-1 rounded text-sm font-bold shadow-sm shadow-green-100">
                  Select
                </button>
              </div>
              <div class="p-4 space-y-3">
                ${alt.round.courts.map((court, i) => `
                  <div class="flex items-center space-x-3 opacity-80">
                    <div class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                      ${i + 1}
                    </div>
                    <div class="flex-grow grid grid-cols-2 gap-1 text-center">
                      <div class="p-1.5 bg-blue-50 rounded border border-blue-100 text-xs font-bold">
                        ${escapeHTML(getPlayerName(court.teamA[0]))} / ${court.teamA[1] ? escapeHTML(getPlayerName(court.teamA[1])) : '—'}
                      </div>
                      <div class="p-1.5 bg-orange-50 rounded border border-orange-100 text-xs font-bold">
                        ${escapeHTML(getPlayerName(court.teamB[0]))} / ${court.teamB[1] ? escapeHTML(getPlayerName(court.teamB[1])) : '—'}
                      </div>
                    </div>
                  </div>
                `).join('')}
                
                ${alt.round.sittingOut.length > 0 ? `
                  <div class="mt-3 pt-3 border-t border-gray-50 flex flex-wrap gap-1.5">
                    <span class="text-[10px] font-bold text-gray-400 uppercase mr-1">Sitting:</span>
                    ${alt.round.sittingOut.map(id => `
                      <span class="text-[10px] font-bold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">${escapeHTML(getPlayerName(id))}</span>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>

        <button id="show-more-alts" class="w-full py-4 bg-gray-100 text-gray-600 rounded-xl font-bold border border-gray-200 hover:bg-gray-200 transition">
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
        const altIndex = parseInt(btn.getAttribute('data-index'));
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

    const oddCount = session.attendeeIds.length % 4;
    
    // Determine effective strategy of the LATEST round to sync UI
    const latestRound = session.rounds[session.rounds.length - 1];
    let effectiveStrat = session.settings?.oddPlayerFallback || 'three-player-court';
    
    if (latestRound && !latestRound.played && oddCount > 0) {
      const num4Packs = Math.floor(session.attendeeIds.length / 4);
      const standardCourts = latestRound.courts.filter(c => c.teamA.length === 2 && c.teamB.length === 2).length;
      
      if (standardCourts === num4Packs) {
        const extraCourt = latestRound.courts.find(c => c.teamA.length < 2 || c.teamB.length < 2);
        if (extraCourt) {
          if (extraCourt.teamA.length === 2 || extraCourt.teamB.length === 2) effectiveStrat = 'three-player-court';
          else effectiveStrat = 'two-player-court';
        } else {
          effectiveStrat = 'sit-out';
        }
      }
    }

    el.innerHTML = `
      <div class="p-4 space-y-6">
        <header class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold">${sessionDate}</h1>
            <p class="text-xs text-gray-500">${club.name}</p>
          </div>
          <div class="flex items-center space-x-2">
            <a href="#/help" class="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-bold text-sm">?</a>
            <button id="manage-attendees" class="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded border border-blue-100">
              Players
            </button>
            <button id="close-session" class="text-sm font-bold text-red-500 bg-red-50 px-3 py-1 rounded border border-red-100">
              End
            </button>
          </div>
        </header>

        <div id="rounds-list" class="space-y-4 pb-48"></div>

        <!-- Sticky Bottom Controls -->
        <div class="fixed-safe-bottom left-0 right-0 p-4 bg-gray-50/90 backdrop-blur-sm border-t border-gray-100 max-w-lg mx-auto space-y-3 z-40">
          ${oddCount > 1 ? `
            <!-- Strategy Quick Toggle -->
            <div class="flex items-center justify-between bg-white p-1 rounded-xl border border-gray-200 shadow-sm mb-4">
              ${oddCount === 3 ? `
                <button data-strat="three-player-court" class="flex-1 py-2 px-1 text-[10px] font-bold uppercase tracking-tight rounded-lg transition ${effectiveStrat === 'three-player-court' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400'}">
                  Play 2v1
                </button>
                <button data-strat="two-player-court" class="flex-1 py-2 px-1 text-[10px] font-bold uppercase tracking-tight rounded-lg transition ${effectiveStrat === 'two-player-court' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400'}">
                  Play 1v1 (+1 Sit)
                </button>
              ` : ''}
              ${oddCount === 2 ? `
                <button data-strat="two-player-court" class="flex-1 py-2 px-1 text-[10px] font-bold uppercase tracking-tight rounded-lg transition ${effectiveStrat === 'two-player-court' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400'}">
                  Play 1v1
                </button>
              ` : ''}
              <button data-strat="sit-out" class="flex-1 py-2 px-1 text-[10px] font-bold uppercase tracking-tight rounded-lg transition ${effectiveStrat === 'sit-out' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400'}">
                All Sit
              </button>
            </div>
          ` : ''}
          <div class="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest pb-2">
            Tap "Mark Played" to advance
          </div>
        </div>
      </div>
    `;

    const rounds = [...session.rounds].reverse(); // Show newest first
    const listEl = el.querySelector('#rounds-list');
    
    if (rounds.length === 0) {
      listEl.innerHTML = `
        <div class="text-center py-12 bg-white rounded-xl border border-gray-100">
          <p class="text-gray-500">Wait, where did the rounds go?</p>
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

      listEl.innerHTML = rounds.map(round => `
        <div class="bg-white rounded-xl shadow-sm border ${round.played ? 'border-gray-100 opacity-60' : 'border-blue-200'} overflow-hidden">
          <div class="p-3 ${round.played ? 'bg-gray-50' : 'bg-blue-50'} flex justify-between items-center">
            <h3 class="font-bold ${round.played ? 'text-gray-500' : 'text-blue-800'}">Round ${round.index + 1}</h3>
            <div class="flex items-center space-x-2">
              ${round.played ? (round.index === lastPlayedIdx ? `
                <button data-action="edit" data-index="${round.index}" class="text-xs font-bold text-blue-600 hover:underline px-2">Edit</button>
                <button data-action="undo" data-index="${round.index}" class="text-xs font-bold text-red-500 hover:underline px-2">Undo</button>
              ` : '<span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Completed</span>') : ''}
            </div>
          </div>
          
          <div class="p-4 space-y-4">
            ${round.courts.map((court, i) => `
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">
                  ${i + 1}
                </div>
                <div class="flex-grow grid grid-cols-2 gap-2 text-center">
                  <div class="p-2 bg-blue-50 rounded border border-blue-100">
                    <p class="text-sm font-bold">${escapeHTML(getPlayerName(court.teamA[0]))}</p>
                    ${court.teamA[1] ? `<p class="text-sm font-bold">${escapeHTML(getPlayerName(court.teamA[1]))}</p>` : ''}
                  </div>
                  <div class="p-2 bg-orange-50 rounded border border-orange-100">
                    <p class="text-sm font-bold">${escapeHTML(getPlayerName(court.teamB[0]))}</p>
                    ${court.teamB[1] ? `<p class="text-sm font-bold">${escapeHTML(getPlayerName(court.teamB[1]))}</p>` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
            
            <div data-action="pick-sitter" data-index="${round.index}" class="mt-4 pt-4 border-t border-gray-100 ${!round.played && round.sittingOut.length > 0 ? 'cursor-pointer group active:bg-gray-50' : ''} -mx-4 px-4">
              <div class="flex justify-between items-center mb-2">
                <p class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
                  Sitting Out
                  ${!round.played && round.sittingOut.length > 0 ? `<span class="ml-2 bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-100">Tap to Change</span>` : ''}
                </p>
                ${!round.played && round.sittingOut.length > 0 ? `
                  <div class="text-blue-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </div>
                ` : ''}
              </div>
              <div class="flex flex-wrap gap-2">
                ${round.sittingOut.length > 0 ? round.sittingOut.map(id => `
                  <span class="px-2 py-1 bg-gray-100 rounded text-sm font-medium text-gray-600 border border-gray-200">${escapeHTML(getPlayerName(id))}</span>
                `).join('') : '<span class="text-sm text-gray-300 italic">None</span>'}
              </div>
            </div>
            ${!round.played ? `
              <div class="flex items-center gap-2 pt-3 border-t border-blue-100 mt-4">
                <button data-action="alternatives" data-index="${round.index}" class="flex-1 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-3 rounded-lg min-h-[44px]">
                  Alternatives
                </button>
                <button data-action="edit" data-index="${round.index}" class="flex-1 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-3 rounded-lg min-h-[44px]">
                  Edit
                </button>
                <button data-action="play" data-index="${round.index}" class="flex-1 text-xs font-bold bg-blue-600 text-white px-3 py-3 rounded-lg shadow-sm min-h-[44px]">
                  Mark Played
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      `).join('');
    }

    // Attach Listeners
    el.querySelectorAll('[data-strat]').forEach(btn => {
      btn.addEventListener('click', () => {
        const strategy = btn.getAttribute('data-strat');
        if (effectiveStrat === strategy) return; // Sync logic here too

        SessionService.updateSettings({ oddPlayerFallback: strategy });
        Haptics.medium();
        render();
      });
    });

    el.querySelector('#manage-attendees').addEventListener('click', () => {
      isManagingAttendees = true;
      Haptics.light();
      render();
    });

    el.querySelector('#close-session').addEventListener('click', () => {
      if (confirm('End this session? You can always review past sessions in history later.')) {
        SessionService.closeActiveSession();
        Haptics.medium();
        navigate('/');
      }
    });

    listEl.addEventListener('click', (e) => {
      const playBtn = e.target.closest('[data-action="play"]');
      if (playBtn) {
        const idx = parseInt(playBtn.getAttribute('data-index'));
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
        const idx = parseInt(undoBtn.getAttribute('data-index'));
        SessionService.markRoundUnplayed(idx);
        SessionService.deleteUnplayedRoundsAfter(idx);
        Haptics.medium();
        render();
        return;
      }

      const altBtn = e.target.closest('[data-action="alternatives"]');
      if (altBtn) {
        const idx = parseInt(altBtn.getAttribute('data-index'));
        showingAlternativesFor = idx;
        Haptics.light();
        render();
        return;
      }

      const editBtn = e.target.closest('[data-action="edit"]');
      if (editBtn) {
        const idx = parseInt(editBtn.getAttribute('data-index'));
        Haptics.light();
        navigate('/edit/' + idx);
        return;
      }

      const sitterBtn = e.target.closest('[data-action="pick-sitter"]');
      if (sitterBtn) {
        const idx = parseInt(sitterBtn.getAttribute('data-index'));
        const round = session.rounds[idx];
        if (!round.played && round.sittingOut.length > 0) {
          pickingSitterFor = idx;
          Haptics.light();
          render();
        }
        return;
      }
    });
  }

  render();
}

export function unmount() {}
