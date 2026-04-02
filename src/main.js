import './style.css'
import { initRouter } from './router.js'

// Initialize the Hash Router
const appEl = document.querySelector('#app');
initRouter(appEl);

console.log('Pickleball Practice Scheduler Initialized');
