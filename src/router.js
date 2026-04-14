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

    if (routeParts.length === hashParts.length) {
      const isMatch = routeParts.every((part, i) => {
        if (part.startsWith(':')) {
          params[part.slice(1)] = hashParts[i];
          return true;
        }
        return part === hashParts[i];
      });

      if (isMatch) {
        matchedRoute = routes[path];
        break;
      }
    }
  }

  return { route: matchedRoute, params };
}

export async function navigate(path) {
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
      
      // Update active state in nav
      document.querySelectorAll('[data-nav]').forEach(link => {
        const navTarget = link.getAttribute('data-nav');
        const hash = window.location.hash;
        
        const isClubs = (hashIsHome() || hash.startsWith('#/club') || hash.startsWith('#/setup')) && navTarget === 'ClubManager';
        const isSession = (hash.startsWith('#/active') || hash.startsWith('#/edit')) && navTarget === 'RoundDisplay';
        const isSettings = hash.startsWith('#/settings') && navTarget === 'Settings';
        
        link.classList.toggle('text-blue-600', isClubs || isSession || isSettings);
        link.classList.toggle('text-gray-400', !(isClubs || isSession || isSettings));
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
