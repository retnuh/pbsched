import { StorageAdapter } from '../storage.js';
import { Haptics } from '../services/haptics.js';

export function mount(el, params) {
  const settings = StorageAdapter.get('settings') || {};

  el.innerHTML = `
    <div class="p-4 space-y-6 pb-24">
      <h1 class="text-2xl font-bold">Settings</h1>
      
      <div class="space-y-4">
        <!-- Scheduler Optimization -->
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-6">
          <div>
            <h2 class="font-bold text-gray-700">Scheduler Optimization</h2>
            <p class="text-xs text-gray-500 italic">Adjust how the algorithm prioritizes variety vs fairness.</p>
          </div>

          <div class="space-y-4">
            <div class="space-y-2">
              <div class="flex justify-between text-sm font-bold">
                <label>Repeated Partners</label>
                <span id="val-partner" class="text-blue-600">${settings.penaltyRepeatedPartner || 5}</span>
              </div>
              <input type="range" id="weight-partner" min="1" max="50" value="${settings.penaltyRepeatedPartner || 5}" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600">
              <p class="text-[10px] text-gray-400">Higher = avoids putting same partners together.</p>
            </div>

            <div class="space-y-2">
              <div class="flex justify-between text-sm font-bold">
                <label>Repeated Opponents</label>
                <span id="val-opponent" class="text-blue-600">${settings.penaltyRepeatedOpponent || 10}</span>
              </div>
              <input type="range" id="weight-opponent" min="1" max="50" value="${settings.penaltyRepeatedOpponent || 10}" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600">
              <p class="text-[10px] text-gray-400">Higher = avoids playing against same people.</p>
            </div>

            <div class="space-y-2">
              <div class="flex justify-between text-sm font-bold">
                <label>Fair Sitting Out</label>
                <span id="val-sitout" class="text-blue-600">${settings.penaltyRepeatedSitOut || 3}</span>
              </div>
              <input type="range" id="weight-sitout" min="1" max="50" value="${settings.penaltyRepeatedSitOut || 3}" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600">
              <p class="text-[10px] text-gray-400">Higher = forces everyone to sit out equally.</p>
            </div>

            <p class="text-xs font-bold text-gray-600 uppercase tracking-wide mt-2">Short-Sided Matches</p>

            <div class="space-y-2">
              <div class="flex justify-between text-sm font-bold">
                <label>Singles Match</label>
                <span id="val-singles" class="text-blue-600">${settings.penaltySingles || 15}</span>
              </div>
              <input type="range" id="weight-singles" min="1" max="50"
                value="${settings.penaltySingles || 15}"
                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600">
              <p class="text-[10px] text-gray-400">Higher = avoids scheduling repeated 1v1 singles matches.</p>
            </div>

            <div class="space-y-2">
              <div class="flex justify-between text-sm font-bold">
                <label>3-Way Solo</label>
                <span id="val-threeway-solo" class="text-blue-600">${settings.penaltyThreeWaySolo || 20}</span>
              </div>
              <input type="range" id="weight-threeway-solo" min="1" max="50"
                value="${settings.penaltyThreeWaySolo || 20}"
                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600">
              <p class="text-[10px] text-gray-400">Higher = avoids putting the same player alone on the short side of a 3-player court.</p>
            </div>

            <div class="space-y-2">
              <div class="flex justify-between text-sm font-bold">
                <label>3-Way Pair</label>
                <span id="val-threeway-pair" class="text-blue-600">${settings.penaltyThreeWayPair || 15}</span>
              </div>
              <input type="range" id="weight-threeway-pair" min="1" max="50"
                value="${settings.penaltyThreeWayPair || 15}"
                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600">
              <p class="text-[10px] text-gray-400">Higher = avoids repeating the same players on the pair side of a 3-player court.</p>
            </div>

            <button id="reset-weights" class="text-xs font-bold text-blue-600 hover:underline">Reset to Defaults</button>
          </div>
        </div>

        <!-- Backup & Restore -->
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 class="font-bold text-gray-700">Backup & Restore</h2>
          <p class="text-sm text-gray-500 italic">Download or share your data to keep a backup or switch devices.</p>
          
          <div class="space-y-3">
            <button id="export-data" class="w-full py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md shadow-blue-100 transition">
              Share Backup
            </button>
            <div class="grid grid-cols-2 gap-3">
              <button id="import-btn" class="py-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg font-bold hover:bg-blue-100 transition text-sm">
                Import File
              </button>
              <button id="paste-btn" class="py-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg font-bold hover:bg-blue-100 transition text-sm">
                Paste Data
              </button>
            </div>
          </div>
          <input type="file" id="import-file" class="hidden" accept=".json,application/json">
        </div>

        <!-- Danger Zone -->
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 class="font-bold text-gray-700">App Data</h2>
          <p class="text-sm text-gray-500">Resetting will clear all clubs, members, and session history from this device.</p>
          <button id="reset-data" class="w-full py-3 bg-red-50 text-red-600 border border-red-100 rounded-lg font-bold hover:bg-red-100 transition">
            Reset All Data
          </button>
        </div>

        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-2">
          <h2 class="font-bold text-gray-700">About</h2>
          <p class="text-sm text-gray-500">Pickleball Practice Scheduler</p>
          <p class="text-xs text-gray-400 font-mono">Build ${__APP_VERSION__}</p>
        </div>
      </div>
    </div>
  `;

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
    if (confirm('Are you absolutely sure? This will delete all your clubs and sessions. This cannot be undone.')) {
      Haptics.error();
      StorageAdapter.reset();
      window.location.hash = '#/';
      window.location.reload();
    }
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
          if (confirm('Importing will overwrite your current data. Continue?')) {
            StorageAdapter.importData(json);
            Haptics.success();
            window.location.hash = '#/';
            window.location.reload();
          }
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
      if (confirm('Importing will overwrite your current data. Continue?')) {
        StorageAdapter.importData(json);
        Haptics.success();
        window.location.hash = '#/';
        window.location.reload();
      }
    } catch (err) {
      Haptics.error();
      alert('Invalid data. Please make sure you pasted the entire JSON string.');
    }
  });
}

export function unmount() {}
