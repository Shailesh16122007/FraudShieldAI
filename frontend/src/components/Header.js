// Header Component matching designs
export function createHeader(title, user) {
  const header = document.createElement('header');
  header.className = 'top-header';

  const userName = user?.name || 'Dr. Aris Thorne';
  const userRole = user?.role || 'PRINCIPAL ANALYST';
  const avatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

  header.innerHTML = `
    <div class="header-page-title">${title}</div>
    <div class="header-actions">
      <div class="search-input-wrapper">
        <i class="bi bi-search"></i>
        <input type="text" class="search-input" placeholder="Search patterns..." />
      </div>
      <button class="icon-btn-circle" title="Notifications">
        <i class="bi bi-bell"></i>
        <span class="notification-dot"></span>
      </button>
      <button class="icon-btn-circle" title="Help & Documentation">
        <i class="bi bi-question-circle"></i>
      </button>
      <div class="user-profile-widget">
        <img src="${avatarUrl}" alt="User Avatar" class="user-avatar" />
        <div class="user-info">
          <div class="user-name">${userName}</div>
          <div class="user-role">${userRole}</div>
        </div>
      </div>
    </div>
  `;

  return header;
}
