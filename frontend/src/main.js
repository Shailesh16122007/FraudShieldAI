// FraudShield AI frontend entry: auth gate, hash router and app shell.
import '@fontsource-variable/inter';
import 'material-symbols/outlined.css';
import './style.css';
import { getCurrentUser, logoutUser, setUnauthorizedHandler } from './services/api.js';
import { destroyCharts, errorState, spinner, toast } from './lib/ui.js';
import { createSidebar } from './components/Sidebar.js';
import { createHeader } from './components/Header.js';
import { renderLoginView } from './components/LoginView.js';
import { renderDashboardView } from './components/DashboardView.js';
import { renderPredictView } from './components/PredictView.js';
import { renderHistoryView } from './components/HistoryView.js';
import { renderAnalyticsView } from './components/AnalyticsView.js';
import { renderAboutView } from './components/AboutView.js';
import { renderSettingsView } from './components/SettingsView.js';

const ROUTES = {
  dashboard: { title: 'Dashboard', render: renderDashboardView },
  predict: { title: 'Predict Transaction', render: renderPredictView },
  history: { title: 'Prediction History', render: renderHistoryView },
  analytics: { title: 'Analytics', render: renderAnalyticsView },
  about: { title: 'About the Project', render: renderAboutView },
  settings: { title: 'Settings', render: renderSettingsView },
};

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const route = ROUTES[path] ? path : 'dashboard';
  return { route, params: new URLSearchParams(query) };
}

class App {
  constructor(root) {
    this.root = root;
    this.user = null;
    this.header = null;
    setUnauthorizedHandler(() => {
      if (this.user) {
        this.user = null;
        toast('Your session has expired. Please log in again.', 'warning');
        this.showLogin();
      }
    });
    window.addEventListener('hashchange', () => this.user && this.renderRoute());
    this.init();
  }

  async init() {
    this.root.innerHTML = `<div class="boot">${spinner('Starting FraudShield AI…')}</div>`;
    try {
      const data = await getCurrentUser();
      if (data.authenticated) {
        this.onLogin(data.user);
      } else {
        this.showLogin();
      }
    } catch (err) {
      this.root.innerHTML = `<div class="boot">${errorState(err.message, 'boot-retry')}</div>`;
      this.root.querySelector('#boot-retry').addEventListener('click', () => this.init());
    }
  }

  showLogin() {
    destroyCharts();
    this.header?.cleanup?.();
    this.header = null;
    document.title = 'Sign in · FraudShield AI';
    renderLoginView(this.root, (user) => this.onLogin(user));
  }

  onLogin(user) {
    this.user = user;
    // replaceState does not fire hashchange, so the route renders exactly once.
    if (!location.hash) history.replaceState(null, '', '#/dashboard');
    this.renderRoute();
  }

  async logout() {
    try {
      await logoutUser();
    } catch { /* already logged out */ }
    this.user = null;
    toast('You have been logged out.', 'info');
    this.showLogin();
  }

  setUser(user) {
    this.user = user;
    this.renderRoute();
  }

  renderRoute() {
    const { route, params } = parseHash();
    const { title, render } = ROUTES[route];
    document.title = `${title} · FraudShield AI`;
    destroyCharts();
    this.header?.cleanup?.();

    const shell = document.createElement('div');
    shell.className = 'shell';
    const scrim = document.createElement('div');
    scrim.className = 'scrim';
    const closeMenu = () => shell.classList.remove('menu-open');
    scrim.addEventListener('click', closeMenu);

    const sidebar = createSidebar(route, { onLogout: () => this.logout(), onNavigate: closeMenu });
    const main = document.createElement('div');
    main.className = 'main';
    this.header = createHeader(title, this.user, {
      onLogout: () => this.logout(),
      onToggleMenu: () => shell.classList.toggle('menu-open'),
    });
    const content = document.createElement('main');
    content.className = 'content';
    content.id = 'content';

    main.append(this.header, content);
    shell.append(sidebar, scrim, main);
    this.root.replaceChildren(shell);
    window.scrollTo(0, 0);

    render(content, { params, user: this.user, setUser: (u) => this.setUser(u) });
  }
}

new App(document.querySelector('#app'));
