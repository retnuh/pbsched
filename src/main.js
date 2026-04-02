import './style.css'
import { initRouter } from './router.js'

// Initialize the Hash Router
const appEl = document.querySelector('#app');
initRouter(appEl);

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

console.log('Pickleball Practice Scheduler Initialized');
