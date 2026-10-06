import { icon } from '../lib/ui.js';

export const NAV_ITEMS = [
  { route: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { route: 'predict', label: 'Predict', icon: 'online_prediction' },
  { route: 'history', label: 'History', icon: 'history' },
  { route: 'analytics', label: 'Analytics', icon: 'analytics' },
  { route: 'about', label: 'About', icon: 'info' },
];

export function createSidebar(activeRoute, { onLogout, onNavigate }) {
  const aside = document.createElement('aside');
  aside.className = 'sidebar';
  aside.id = 'sidebar';
  aside.innerHTML = `
    <a class="brand" href="#/dashboard">
      <span class="brand-mark">${icon('shield')}</span>
      <span>
        <span class="brand-title">FraudShield AI</span>
        <span class="brand-sub">Fraud Detection System</span>
      </span>
    </a>
    <nav class="nav" aria-label="Main">
      ${NAV_ITEMS.map((item) => `
        <a class="nav-link ${activeRoute === item.route ? 'active' : ''}" href="#/${item.route}" ${activeRoute === item.route ? 'aria-current="page"' : ''}>
          ${icon(item.icon)}<span>${item.label}</span>
        </a>`).join('')}
    </nav>
    <div class="nav-bottom">
      <a class="nav-link ${activeRoute === 'settings' ? 'active' : ''}" href="#/settings">${icon('settings')}<span>Settings</span></a>
      <button class="nav-link nav-logout" type="button">${icon('logout')}<span>Logout</span></button>
    </div>`;

  aside.querySelector('.nav-logout').addEventListener('click', onLogout);
  aside.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => onNavigate?.()));
  return aside;
}
