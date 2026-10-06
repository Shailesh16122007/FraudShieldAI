// Sidebar Component matching design
export function createSidebar(activeTab, onSelectTab, onLogout) {
  const sidebar = document.createElement('div');
  sidebar.className = 'sidebar';

  sidebar.innerHTML = `
    <div>
      <div class="sidebar-header">
        <i class="bi bi-shield-check sidebar-logo-icon"></i>
        <div>
          <div class="sidebar-title">FraudWatch</div>
          <div class="sidebar-subtitle">Technical Intelligence</div>
        </div>
      </div>
      <ul class="nav-list">
        <li>
          <button class="nav-item-btn ${activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
            <i class="bi bi-grid-fill"></i>
            <span>Dashboard</span>
          </button>
        </li>
        <li>
          <button class="nav-item-btn ${activeTab === 'predict' ? 'active' : ''}" data-tab="predict">
            <i class="bi bi-broadcast"></i>
            <span>Predict</span>
          </button>
        </li>
        <li>
          <button class="nav-item-btn ${activeTab === 'history' ? 'active' : ''}" data-tab="history">
            <i class="bi bi-clock-history"></i>
            <span>History</span>
          </button>
        </li>
        <li>
          <button class="nav-item-btn ${activeTab === 'analytics' ? 'active' : ''}" data-tab="analytics">
            <i class="bi bi-bar-chart-fill"></i>
            <span>Analytics</span>
          </button>
        </li>
        <li>
          <button class="nav-item-btn ${activeTab === 'about' ? 'active' : ''}" data-tab="about">
            <i class="bi bi-info-circle-fill"></i>
            <span>About</span>
          </button>
        </li>
      </ul>
    </div>
    <div class="sidebar-bottom">
      <button class="nav-item-btn" id="btn-settings">
        <i class="bi bi-gear-fill"></i>
        <span>Settings</span>
      </button>
      <button class="nav-item-btn" id="btn-logout">
        <i class="bi bi-box-arrow-right"></i>
        <span>Logout</span>
      </button>
    </div>
  `;

  sidebar.querySelectorAll('.nav-item-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      onSelectTab(tab);
    });
  });

  const logoutBtn = sidebar.querySelector('#btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', onLogout);
  }

  return sidebar;
}
