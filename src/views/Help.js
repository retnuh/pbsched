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
          Before You Start
        </h2>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3 text-sm leading-relaxed dark:text-gray-300">
          <p><strong>Create a club:</strong> Tap the club icon and add your club's name. Then add your regular players — you only need to do this once.</p>
          <p><strong>Check in who showed up:</strong> When you start a session, pick the players who are present today. The app puts your most frequent players at the top so check-in is fast.</p>
          <p>You need at least 2 players to generate rounds.</p>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center">
          <span class="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs mr-2">2</span>
          Running a Session
        </h2>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3 text-sm leading-relaxed dark:text-gray-300">
          <p><strong>Generate a round:</strong> Tap "Generate Round" and the app instantly proposes court assignments. Call out the matchups to your group.</p>
          <p><strong>Mark it played:</strong> Once the round is finished, tap "Mark Played." This locks the result into history and queues up the next round.</p>
          <p><strong>Odd number of players?</strong> If the round doesn't look right, tap Edit to rearrange players between courts however you like.</p>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center">
          <span class="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs mr-2">3</span>
          Fixing Things
        </h2>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3 text-sm leading-relaxed dark:text-gray-300">
          <p><strong>Don't like the matchup?</strong> Tap "Alternatives" to see other options for that round, then tap "Select" on the one you prefer.</p>
          <p><strong>Need to swap players?</strong> Tap "Edit" on any unplayed round. Drag players between courts or to the bench (bench means the player is sitting out / resting that round), then tap "Confirm" to save your changes.</p>
          <p><strong>Need to correct a played round?</strong> Tap "Edit" on the most recently played round to fix it — keeping the history accurate helps the app suggest better matchups going forward.</p>
          <p><strong>Marked played by mistake?</strong> Tap "Undo" on the most recent completed round to reverse it.</p>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center">
          <span class="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs mr-2">4</span>
          Settings & Preferences
        </h2>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3 text-sm leading-relaxed dark:text-gray-300">
          <p><strong>Appearance:</strong> Choose light mode, dark mode, or follow your device's system setting. Find this at the top of Settings.</p>
          <p><strong>Fairness sliders:</strong> Under "Scheduling Preferences" you can adjust how strongly the app avoids repeating the same partners, opponents, or sit-out players. The defaults work well for most groups. The exact numbers aren't critical — what matters is how the sliders compare to each other.</p>
          <p><strong>Backup & Restore:</strong> Share your club data to keep a backup or move to a new device — all from the Settings screen.</p>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center">
          <span class="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs mr-2">5</span>
          How It Works
        </h2>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3 text-sm leading-relaxed dark:text-gray-300">
          <p>The app runs hundreds of simulations and picks the matchup where everyone plays with the most different people across the session. It tracks who has played with or against each other and who has sat out, so the best mix rises to the top automatically.</p>
        </div>
      </section>

      <footer class="text-center pt-4">
        <p class="text-xs text-gray-400 dark:text-gray-500">Pickleball Practice Scheduler ${__APP_VERSION__}</p>
      </footer>
    </div>
  `;
}

export function unmount() {}
