import './style.css'
import { initRouter } from './router.js'
import { ThemeService } from './services/theme.js'

// Initialize theme before router mounts any view
ThemeService.init();

// Initialize the Hash Router
const appEl = document.querySelector('#app');
initRouter(appEl);

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW registered: ', reg);

      // Check for updates periodically
      setInterval(() => { reg.update(); }, 1000 * 60 * 60); // Every hour

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(reg);
          }
        });
      });
    }).catch(err => {
      console.log('SW registration failed: ', err);
    });
  });

  // Handle manual refresh once new worker takes over
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      window.location.reload();
      refreshing = true;
    }
  });
}

function showUpdateBanner(reg) {
  const banner = document.createElement('div');
  banner.className = 'fixed top-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-xl shadow-2xl z-[100] flex justify-between items-center animate-bounce-in';
  banner.innerHTML = `
    <div class="flex-grow">
      <p class="font-bold text-sm">New version available!</p>
      <p class="text-[10px] opacity-90">Refresh to get the latest features.</p>
    </div>
    <button id="sw-update-btn" class="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold text-xs ml-4">
      Refresh
    </button>
  `;
  document.body.appendChild(banner);

  document.querySelector('#sw-update-btn').addEventListener('click', () => {
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  });
}

if (import.meta.env.DEV) console.log('Pickleball Practice Scheduler Initialized');
