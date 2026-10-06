// FraudWatch Master Entry File
import './style.css';
import { getCurrentUser, loginUser, logoutUser } from './services/api.js';
import { createSidebar } from './components/Sidebar.js';
import { createHeader } from './components/Header.js';
import { renderLoginView } from './components/LoginView.js';
import { renderPredictView } from './components/PredictView.js';
import { renderHistoryView } from './components/HistoryView.js';
import { renderAnalyticsView } from './components/AnalyticsView.js';
import { renderAboutView } from './components/AboutView.js';

class App {
  constructor() {
    this.appEl = document.querySelector('#app');
    this.user = null;
    this.activeTab = 'analytics'; // Default tab matching image 1 or predict
    this.init();
  }

  async init() {
    const authData = await getCurrentUser();
    if (authData.authenticated) {
      this.user = authData.user;
      this.renderMainLayout();
    } else {
      this.renderLogin();
    }
  }

  renderLogin() {
    this.appEl.innerHTML = '';
    renderLoginView(this.appEl, async (username, password) => {
      const res = await loginUser(username, password);
      if (res.authenticated) {
        this.user = res.user;
        this.renderMainLayout();
      } else {
        alert(res.error || 'Invalid credentials');
      }
    });
  }

  renderMainLayout() {
    this.appEl.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'app-container';

    // Sidebar
    const sidebar = createSidebar(
      this.activeTab,
      (newTab) => this.switchTab(newTab),
      async () => {
        await logoutUser();
        this.user = null;
        this.renderLogin();
      }
    );

    // Main Wrapper
    const mainWrapper = document.createElement('div');
    mainWrapper.className = 'main-wrapper';

    // Top Header
    const getPageTitle = (tab) => {
      switch (tab) {
        case 'analytics': return 'Analytics Intelligence';
        case 'history': return 'Prediction History';
        case 'predict':
        case 'dashboard': return 'FraudWatch Dashboard';
        case 'about': return 'About the Project';
        default: return 'FraudWatch Dashboard';
      }
    };

    const header = createHeader(getPageTitle(this.activeTab), this.user);
    mainWrapper.appendChild(header);

    // Page Content Body
    const contentArea = document.createElement('div');
    contentArea.id = 'page-content';
    mainWrapper.appendChild(contentArea);

    container.appendChild(sidebar);
    container.appendChild(mainWrapper);
    this.appEl.appendChild(container);

    this.renderCurrentTabContent(contentArea);
  }

  switchTab(tab) {
    this.activeTab = tab === 'dashboard' ? 'predict' : tab;
    this.renderMainLayout();
  }

  renderCurrentTabContent(container) {
    container.innerHTML = '';
    switch (this.activeTab) {
      case 'predict':
      case 'dashboard':
        renderPredictView(container);
        break;
      case 'history':
        renderHistoryView(container);
        break;
      case 'analytics':
        renderAnalyticsView(container);
        break;
      case 'about':
        renderAboutView(container);
        break;
      default:
        renderAnalyticsView(container);
        break;
    }
  }
}

new App();
