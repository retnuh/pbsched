import * as ClubManager from './views/ClubManager.js';
import * as MemberEditor from './views/MemberEditor.js';
import * as SessionSetup from './views/SessionSetup.js';
import * as RoundDisplay from './views/RoundDisplay.js';
import * as Settings from './views/Settings.js';
import * as Help from './views/Help.js';
import * as MatchEditor from './views/MatchEditor.js';

/**
 * Basic Hash Router
 */

const routes = {
  '/': ClubManager,
  '/club/:clubId': MemberEditor,
  '/setup/:clubId': SessionSetup,
  '/active': RoundDisplay,
  '/settings': Settings,
  '/help': Help,
  '/edit/:roundIndex': MatchEditor,
};

let currentView = null;

function resolveRoute() {
  const hash = window.location.hash.slice(1) || '/';
  
  // Basic param matching (e.g. /club/123 -> /club/:id)
  let matchedRoute = null;
  let params = {};

  for (const path in routes) {
    const routeParts = path.split('/');
    const hashParts = hash.split('/');
    const candidateParams = {}; // fresh object per attempt — avoids stale param bleed

    if (routeParts.length === hashParts.length) {
      const isMatch = routeParts.every((part, i) => {
        if (part.startsWith(':')) {
          candidateParams[part.slice(1)] = hashParts[i];
          return true;
        }
        return part === hashParts[i];
      });

      if (isMatch) {
        params = candidateParams;
        matchedRoute = routes[path];
        break;
      }
    }
  }

  return { route: matchedRoute, params };
}

export function navigate(path) {
  window.location.hash = path;
}

export function initRouter(el) {
  async function update() {
    if (currentView && currentView.unmount) {
      currentView.unmount();
    }

    const { route, params } = resolveRoute();
    
    if (route) {
      currentView = route;
      el.innerHTML = ''; // Clear
      route.mount(el, params);
      window.scrollTo(0, 0);
      
      // Update active state in nav
      document.querySelectorAll('[data-nav]').forEach(link => {
        const navTarget = link.getAttribute('data-nav');
        const hash = window.location.hash;
        
        const isClubs = (hashIsHome() || hash.startsWith('#/club') || hash.startsWith('#/setup')) && navTarget === 'ClubManager';
        const isSession = (hash.startsWith('#/active') || hash.startsWith('#/edit')) && navTarget === 'RoundDisplay';
        const isSettings = hash.startsWith('#/settings') && navTarget === 'Settings';
        const isHelp = hash.startsWith('#/help') && navTarget === 'Help';

        link.classList.toggle('text-blue-600', isClubs || isSession || isSettings || isHelp);
        link.classList.toggle('text-gray-400', !(isClubs || isSession || isSettings || isHelp));
        link.classList.toggle('dark:text-blue-400', isClubs || isSession || isSettings || isHelp);
        link.classList.toggle('dark:text-gray-500', !(isClubs || isSession || isSettings || isHelp));
      });
    } else {
      el.innerHTML = '<div class="p-4 text-red-500 font-bold">404 - Not Found</div>';
    }
  }

  window.addEventListener('hashchange', update);
  update();
}

function hashIsHome() {
  const h = window.location.hash;
  return h === '' || h === '#' || h === '#/';
}
