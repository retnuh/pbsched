export function mount(el, params) {
  el.innerHTML = `
    <div class="p-4 space-y-8 pb-32">
      <header class="flex items-center space-x-4">
        <button onclick="window.history.back()" class="p-2 -ml-2 text-blue-600 dark:text-blue-400">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <h1 class="text-2xl font-bold">Help & Guide</h1>
      </header>

      <section class="space-y-4">
        <h2 class="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center">
          <span class="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs mr-2">1</span>
          Getting Started
        </h2>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3 text-sm leading-relaxed dark:text-gray-300">
          <p><strong>Create a Club:</strong> Start by adding your club and its members. You can quickly add new players at any time.</p>
          <p><strong>Start a Session:</strong> Pick who is present today. The app sorts your most frequent players to the top for speed.</p>
          <p><strong>Generate:</strong> The first round is created instantly. Tap "Mark Played" to move to the next.</p>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center">
          <span class="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs mr-2">2</span>
          Odd Player Counts
        </h2>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3 text-sm leading-relaxed dark:text-gray-300">
          <p>If you have a remainder (e.g., 11 players), use the strategy toggle at the bottom:</p>
          <ul class="list-disc ml-5 space-y-2">
            <li><strong>Play 2v1:</strong> Keeps everyone playing by creating one 3-player court.</li>
            <li><strong>Play 1v1:</strong> Creates a singles court; any remaining person sits out.</li>
            <li><strong>All Sit:</strong> Standard 2v2 only; everyone not in a 4-pack sits out.</li>
          </ul>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center">
          <span class="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs mr-2">3</span>
          Manual Overrides
        </h2>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3 text-sm leading-relaxed dark:text-gray-300">
          <p><strong>Pick Sitter:</strong> Tap the "Sitting Out" section of any unplayed round to manually choose who should sit. Matchups will regenerate automatically.</p>
          <p><strong>Alternatives:</strong> Don't like a specific matchup? Tap "Alternatives" to see other optimized options for that round.</p>
          <p><strong>Undo:</strong> Accidentally tapped played? Use the "Undo" button on the latest completed round.</p>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center">
          <span class="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs mr-2">4</span>
          Optimization Settings
        </h2>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3 text-sm leading-relaxed dark:text-gray-300">
          <p>The scheduler runs hundreds of simulations to find the best mix. You can tune this in <strong>Settings</strong>:</p>
          <p>Increase <strong>Fair Sitting Out</strong> if you want the app to strictly rotate people who haven't sat out yet.</p>
          <p>Increase <strong>Repeated Partners</strong> to prioritize playing with new people every round.</p>
        </div>
      </section>

      <footer class="text-center pt-4">
        <p class="text-xs text-gray-400 dark:text-gray-500">Pickleball Practice Scheduler ${__APP_VERSION__}</p>
      </footer>
    </div>
  `;
}

export function unmount() {}
