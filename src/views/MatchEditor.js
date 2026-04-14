import { SessionService } from '../services/session.js';
import { ClubService } from '../services/club.js';
import { navigate } from '../router.js';

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
  const getPlayerName = (id) => club.members.find(m => m.id === id)?.name || 'Unknown';

  // Render Team A pill chip (blue)
  const teamAChip = (id) =>
    `<div class="px-3 py-3 bg-blue-50 border border-blue-200 rounded-full text-sm font-medium text-blue-800 text-center min-h-[44px] flex items-center justify-center">${getPlayerName(id)}</div>`;

  // Render Team B pill chip (orange)
  const teamBChip = (id) =>
    `<div class="px-3 py-3 bg-orange-50 border border-orange-200 rounded-full text-sm font-medium text-orange-800 text-center min-h-[44px] flex items-center justify-center">${getPlayerName(id)}</div>`;

  // Render bench chip (neutral gray)
  const benchChip = (id) =>
    `<div class="px-3 py-3 bg-gray-200 border border-gray-300 rounded-full text-sm font-medium text-gray-700 min-h-[44px] flex items-center justify-center">${getPlayerName(id)}</div>`;

  // Court zones
  const courtsHTML = round.courts.map((court, i) => `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="p-3 bg-gray-50 flex items-center">
        <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Court ${i + 1}</span>
      </div>
      <div class="p-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-2">
            ${court.teamA.map(teamAChip).join('')}
          </div>
          <div class="space-y-2">
            ${court.teamB.map(teamBChip).join('')}
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // Rest Bench zone
  const benchHTML = `
    <div class="rounded-xl bg-gray-100 border border-gray-200 p-4 space-y-3">
      <h2 class="text-xs font-bold text-gray-500 uppercase tracking-widest">Rest Bench</h2>
      <div class="flex flex-wrap gap-2">
        ${round.sittingOut.length > 0
          ? round.sittingOut.map(benchChip).join('')
          : '<span class="text-sm text-gray-400 italic">--|--</span>'}
      </div>
    </div>
  `;

  // Back button SVG — same chevron as MemberEditor and RoundDisplay sub-views
  const backSVG = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>`;

  el.innerHTML = `
    <div class="p-4 space-y-6 pb-48">
      <header class="flex items-center space-x-4">
        <button id="back-btn" class="p-2 -ml-2">${backSVG}</button>
        <h1 class="text-2xl font-bold">Edit Round ${round.index + 1}</h1>
      </header>
      ${courtsHTML}
      ${benchHTML}
    </div>
  `;

  el.querySelector('#back-btn').addEventListener('click', () => {
    navigate('/active');
  });
}

export function unmount() {}
