import { StorageAdapter } from '../storage.js';
import { Haptics } from '../services/haptics.js';
import { ThemeService } from '../services/theme.js';

export function mount(el, params) {
  const settings = StorageAdapter.get('settings') || {};
  const currentMode = ThemeService.getMode();

  el.innerHTML = `
    <div class="p-4 space-y-6 pb-24">
      <h1 class="text-2xl font-bold">Settings</h1>

      <div class="space-y-4">
        <!-- Appearance -->
        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
          <h2 class="font-bold text-gray-700 dark:text-gray-200">Appearance</h2>
          <div id="theme-toggle" class="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
            ${['auto', 'light', 'dark'].map(mode => `
              <button data-mode="${mode}"
                class="flex-1 py-3 text-sm font-bold transition ${currentMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }">
                ${ mode === 'auto' ? 'Auto' : mode === 'light' ? 'Light' : 'Dark' }
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Scheduler Optimization -->
        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
          <div>
            <h2 class="font-bold text-gray-700 dark:text-gray-200">Scheduler Optimization</h2>
            <p class="text-xs text-gray-500 dark:text-gray-400 italic">Control how strongly the scheduler avoids repeating matchups. Drag to 0 to turn off a preference entirely.</p>
          </div>

          <div class="space-y-4">
            <div class="space-y-2">
              <div class="flex justify-between text-sm font-bold">
                <label>Repeated Partners</label>
                <span id="val-partner" class="text-blue-600 dark:text-blue-400">${settings.penaltyRepeatedPartner || 5}</span>
              </div>
              <input type="range" id="weight-partner" min="0" max="50" value="${settings.penaltyRepeatedPartner || 5}" class="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-400">
              <p class="text-[10px] text-gray-400 dark:text-gray-500">How strongly to avoid scheduling the same two players as partners again.</p>
            </div>

            <div class="space-y-2">
              <div class="flex justify-between text-sm font-bold">
                <label>Repeated Opponents</label>
                <span id="val-opponent" class="text-blue-600 dark:text-blue-400">${settings.penaltyRepeatedOpponent || 10}</span>
              </div>
              <input type="range" id="weight-opponent" min="0" max="50" value="${settings.penaltyRepeatedOpponent || 10}" class="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-400">
              <p class="text-[10px] text-gray-400 dark:text-gray-500">How strongly to avoid scheduling the same two players against each other again.</p>
            </div>

            <div class="space-y-2">
              <div class="flex justify-between text-sm font-bold">
                <label>Fair Sitting Out</label>
                <span id="val-sitout" class="text-blue-600 dark:text-blue-400">${settings.penaltyRepeatedSitOut || 3}</span>
              </div>
              <input type="range" id="weight-sitout" min="0" max="50" value="${settings.penaltyRepeatedSitOut || 3}" class="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-400">
              <p class="text-[10px] text-gray-400 dark:text-gray-500">How strongly to avoid making the same player sit out again before others have had a turn.</p>
            </div>

            <p class="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mt-2">Short-Sided Matches</p>

            <div class="space-y-2">
              <div class="flex justify-between text-sm font-bold">
                <label>Singles Match</label>
                <span id="val-singles" class="text-blue-600 dark:text-blue-400">${settings.penaltySingles || 15}</span>
              </div>
              <input type="range" id="weight-singles" min="0" max="50"
                value="${settings.penaltySingles || 15}"
                class="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-400">
              <p class="text-[10px] text-gray-400 dark:text-gray-500">How strongly to avoid scheduling the same players in a 1v1 singles match again.</p>
            </div>

            <div class="space-y-2">
              <div class="flex justify-between text-sm font-bold">
                <label>3-Way Solo</label>
                <span id="val-threeway-solo" class="text-blue-600 dark:text-blue-400">${settings.penaltyThreeWaySolo || 20}</span>
              </div>
              <input type="range" id="weight-threeway-solo" min="0" max="50"
                value="${settings.penaltyThreeWaySolo || 20}"
                class="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-400">
              <p class="text-[10px] text-gray-400 dark:text-gray-500">How strongly to avoid putting the same player alone on a 3-player court again.</p>
            </div>

            <div class="space-y-2">
              <div class="flex justify-between text-sm font-bold">
                <label>3-Way Pair</label>
                <span id="val-threeway-pair" class="text-blue-600 dark:text-blue-400">${settings.penaltyThreeWayPair || 15}</span>
              </div>
              <input type="range" id="weight-threeway-pair" min="0" max="50"
                value="${settings.penaltyThreeWayPair || 15}"
                class="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-400">
              <p class="text-[10px] text-gray-400 dark:text-gray-500">How strongly to avoid repeating the same pair on the full-side of a 3-player court again.</p>
            </div>

            <button id="reset-weights" class="text-xs font-bold text-blue-600 hover:underline">Reset to Defaults</button>
          </div>
        </div>

        <!-- Backup & Restore -->
        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
          <h2 class="font-bold text-gray-700 dark:text-gray-200">Backup & Restore</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 italic">Download or share your data to keep a backup or switch devices.</p>

          <div class="space-y-3">
            <button id="export-data" class="w-full py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md shadow-blue-100 transition">
              Share Backup
            </button>
            <div class="grid grid-cols-2 gap-3">
              <button id="import-btn" class="py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800 rounded-lg font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition text-sm">
                Import File
              </button>
              <button id="paste-btn" class="py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800 rounded-lg font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition text-sm">
                Paste Data
              </button>
            </div>
          </div>
          <input type="file" id="import-file" class="hidden" accept=".json,application/json">
        </div>

        <!-- Danger Zone -->
        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
          <h2 class="font-bold text-gray-700 dark:text-gray-200">App Data</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Resetting will clear all clubs, members, and session history from this device.</p>
          <button id="reset-data" class="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800 rounded-lg font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition">
            Reset All Data
          </button>
        </div>

        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-2">
          <h2 class="font-bold text-gray-700 dark:text-gray-200">About</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Pickleball Practice Scheduler</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 font-mono">Build ${__APP_VERSION__}</p>
        </div>
      </div>
    </div>

    <!-- Settings confirmation modal -->
    <div id="settings-modal" class="hidden fixed inset-0 z-[200] flex items-end">
      <div id="settings-modal-backdrop" class="absolute inset-0 bg-black/40"></div>
      <div class="relative bg-white dark:bg-gray-800 rounded-t-2xl w-full p-6 space-y-4 shadow-xl">
        <h2 id="settings-modal-title" class="text-lg font-bold text-gray-900 dark:text-gray-100"></h2>
        <p id="settings-modal-body" class="text-sm text-gray-500 dark:text-gray-400"></p>
        <div class="flex gap-3 pt-2">
          <button id="settings-modal-cancel" class="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-sm">Cancel</button>
          <button id="settings-modal-confirm" class="flex-1 py-3 rounded-xl font-bold text-sm text-white">Confirm</button>
        </div>
      </div>
    </div>
  `;

  // --- Theme Toggle ---

  // ── Settings confirmation modal ───────────────────────────────────────────
  let pendingSettingsAction = null;
  const settingsModal = el.querySelector('#settings-modal');
  const settingsModalTitle = el.querySelector('#settings-modal-title');
  const settingsModalBody = el.querySelector('#settings-modal-body');
  const settingsModalConfirm = el.querySelector('#settings-modal-confirm');
  const hideSettingsModal = () => { pendingSettingsAction = null; settingsModal.classList.add('hidden'); };
  const showSettingsModal = (title, body, destructive, onConfirm) => {
    settingsModalTitle.textContent = title;
    settingsModalBody.textContent = body;
    settingsModalConfirm.className = `flex-1 py-3 rounded-xl font-bold text-sm text-white ${destructive ? 'bg-red-600' : 'bg-blue-600'}`;
    pendingSettingsAction = onConfirm;
    settingsModal.classList.remove('hidden');
  };
  el.querySelector('#settings-modal-backdrop').addEventListener('click', hideSettingsModal);
  el.querySelector('#settings-modal-cancel').addEventListener('click', hideSettingsModal);
  settingsModalConfirm.addEventListener('click', () => {
    if (pendingSettingsAction) pendingSettingsAction();
    hideSettingsModal();
  });
  // ─────────────────────────────────────────────────────────────────────────

  el.querySelector('#theme-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    const mode = btn.getAttribute('data-mode');
    ThemeService.setMode(mode);
    el.querySelectorAll('[data-mode]').forEach(b => {
      const isActive = b.getAttribute('data-mode') === mode;
      b.className = `flex-1 py-3 text-sm font-bold transition ${
        isActive ? 'bg-blue-600 text-white'
                 : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
      }`;
    });
  });

  // --- Logic ---

  const partnerInput = el.querySelector('#weight-partner');
  const opponentInput = el.querySelector('#weight-opponent');
  const sitoutInput = el.querySelector('#weight-sitout');

  const partnerVal = el.querySelector('#val-partner');
  const opponentVal = el.querySelector('#val-opponent');
  const sitoutVal = el.querySelector('#val-sitout');

  const singlesInput = el.querySelector('#weight-singles');
  const threeWaySoloInput = el.querySelector('#weight-threeway-solo');
  const threeWayPairInput = el.querySelector('#weight-threeway-pair');

  const singlesVal = el.querySelector('#val-singles');
  const threeWaySoloVal = el.querySelector('#val-threeway-solo');
  const threeWayPairVal = el.querySelector('#val-threeway-pair');

  function updateWeights() {
    settings.penaltyRepeatedPartner = parseInt(partnerInput.value);
    settings.penaltyRepeatedOpponent = parseInt(opponentInput.value);
    settings.penaltyRepeatedSitOut = parseInt(sitoutInput.value);
    settings.penaltySingles = parseInt(singlesInput.value);
    settings.penaltyThreeWaySolo = parseInt(threeWaySoloInput.value);
    settings.penaltyThreeWayPair = parseInt(threeWayPairInput.value);

    partnerVal.innerText = partnerInput.value;
    opponentVal.innerText = opponentInput.value;
    sitoutVal.innerText = sitoutInput.value;
    singlesVal.innerText = singlesInput.value;
    threeWaySoloVal.innerText = threeWaySoloInput.value;
    threeWayPairVal.innerText = threeWayPairInput.value;

    StorageAdapter.set('settings', settings);
  }

  partnerInput.addEventListener('input', () => {
    updateWeights();
    Haptics.light();
  });
  opponentInput.addEventListener('input', () => {
    updateWeights();
    Haptics.light();
  });
  sitoutInput.addEventListener('input', () => {
    updateWeights();
    Haptics.light();
  });
  singlesInput.addEventListener('input', () => {
    updateWeights();
    Haptics.light();
  });
  threeWaySoloInput.addEventListener('input', () => {
    updateWeights();
    Haptics.light();
  });
  threeWayPairInput.addEventListener('input', () => {
    updateWeights();
    Haptics.light();
  });

  el.querySelector('#reset-weights').addEventListener('click', () => {
    partnerInput.value = 5;
    opponentInput.value = 10;
    sitoutInput.value = 3;
    singlesInput.value = 15;
    threeWaySoloInput.value = 20;
    threeWayPairInput.value = 15;
    Haptics.medium();
    updateWeights();
  });

  el.querySelector('#reset-data').addEventListener('click', () => {
    showSettingsModal(
      'Delete all data?',
      'This will permanently delete all your clubs and sessions. This cannot be undone.',
      true,
      () => {
        Haptics.error();
        StorageAdapter.reset();
        window.location.hash = '#/';
        window.location.reload();
      }
    );
  });

  // Export / Share
  el.querySelector('#export-data').addEventListener('click', async () => {
    const data = StorageAdapter.getRawState();
    const jsonString = JSON.stringify(data, null, 2);
    const fileName = `pbsched-backup-${new Date().toISOString().split('T')[0]}.json`;

    if (navigator.share) {
      try {
        const file = new File([jsonString], fileName, { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Pickleball Scheduler Backup',
            text: 'Here is my Pickleball Practice Scheduler data backup.'
          });
          Haptics.success();
          return;
        } else {
          await navigator.share({
            title: 'Pickleball Scheduler Backup',
            text: jsonString
          });
          Haptics.success();
          return;
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Share failed:', err);
        else return;
      }
    }

    // Fallback: Standard Download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    Haptics.light();
  });

  // Import File
  const importBtn = el.querySelector('#import-btn');
  const importFile = el.querySelector('#import-file');

  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => importFile.click());

    importFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target.result);
          showSettingsModal(
            'Overwrite your data?',
            'Importing will replace all current clubs and sessions with the backup file.',
            false,
            () => { StorageAdapter.importData(json); Haptics.success(); window.location.hash = '#/'; window.location.reload(); }
          );
        } catch (err) {
          Haptics.error();
          alert('Failed to parse backup file. Is it a valid JSON?');
        }
      };
      reader.readAsText(file);
    });
  }

  // Paste Data
  el.querySelector('#paste-btn').addEventListener('click', () => {
    const raw = prompt('Paste your backup JSON here:');
    if (!raw) return;

    try {
      const json = JSON.parse(raw);
      showSettingsModal(
        'Overwrite your data?',
        'Importing will replace all current clubs and sessions with the pasted data.',
        false,
        () => { StorageAdapter.importData(json); Haptics.success(); window.location.hash = '#/'; window.location.reload(); }
      );
    } catch (err) {
      Haptics.error();
      alert('Invalid data. Please make sure you pasted the entire JSON string.');
    }
  });
}

export function unmount() {}
