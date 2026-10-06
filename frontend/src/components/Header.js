import { fetchNotifications } from '../services/api.js';
import { esc, fmtMoney, icon, initials, openModal, timeAgo } from '../lib/ui.js';
import { openTransactionModal } from './TransactionModal.js';

const SEEN_KEY = 'fs:lastSeenAlertId';

function readSeen() {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
}
function writeSeen(id) {
  try {
    localStorage.setItem(SEEN_KEY, String(id));
  } catch { /* storage unavailable */ }
}

export function openHelp() {
  openModal({
    title: 'How to use FraudShield AI',
    size: 'lg',
    body: `
      <ol class="help-list">
        <li><strong>Predict</strong> — score one transaction (enter an amount, or load a real sample so V1–V28 are filled in), or upload a CSV with the columns <code>Time, V1…V28, Amount</code> to screen many at once.</li>
        <li><strong>History</strong> — search by transaction code (e.g. <code>TRX-000123</code>) or exact amount, filter by risk or outcome, open a row to see its inputs, flag it for review, delete it, or export the filtered list as CSV.</li>
        <li><strong>Dashboard &amp; Analytics</strong> — live totals, fraud rate, daily/weekly/monthly volume, risk split and the comparison of all six trained models.</li>
        <li><strong>Settings</strong> — update your profile, change your password, retrain the models, or clear your history.</li>
      </ol>
      <p class="modal-text"><strong>Risk levels:</strong> fraud probability ≥ 70% is <em>High</em>, 30–70% is <em>Medium</em>, below 30% is <em>Low</em>. A transaction is labelled <em>Fraud</em> when its probability is 50% or more.</p>
      <p class="modal-text">V1–V28 are anonymised PCA components from the Kaggle credit-card dataset, so they cannot be typed in by hand meaningfully — use CSV upload or “Load sample” for realistic results.</p>`,
    actions: [{ label: 'Got it', variant: 'btn-primary' }],
  });
}

export function createHeader(title, user, { onLogout, onToggleMenu }) {
  const header = document.createElement('header');
  header.className = 'topbar';
  header.innerHTML = `
    <button class="icon-btn menu-btn" aria-label="Open menu" aria-controls="sidebar">${icon('menu')}</button>
    <h1 class="topbar-title">${esc(title)}</h1>
    <div class="topbar-actions">
      <form class="search" role="search">
        ${icon('search')}
        <input type="search" name="q" placeholder="Search TRX-000123 or amount…" aria-label="Search transactions" />
      </form>
      <div class="dropdown" data-dropdown="alerts">
        <button class="icon-btn" aria-label="High-risk alerts" aria-haspopup="true" aria-expanded="false" data-toggle>
          ${icon('notifications')}<span class="notif-dot" hidden></span>
        </button>
        <div class="dropdown-menu dropdown-wide" hidden>
          <div class="dropdown-head">High-risk alerts</div>
          <div class="alerts-list"><div class="dropdown-empty">Loading…</div></div>
          <a class="dropdown-foot" href="#/history?risk=HIGH">View all high-risk transactions</a>
        </div>
      </div>
      <button class="icon-btn help-btn" aria-label="Help">${icon('help')}</button>
      <div class="dropdown" data-dropdown="user">
        <button class="user-chip" aria-haspopup="true" aria-expanded="false" data-toggle>
          <span class="user-meta"><span class="user-name">${esc(user.name)}</span><span class="user-role">${esc(user.role)}</span></span>
          <span class="avatar">${esc(initials(user.name))}</span>
        </button>
        <div class="dropdown-menu" hidden>
          <div class="dropdown-head">${esc(user.username)}</div>
          <a class="dropdown-item" href="#/settings">${icon('settings')}Settings</a>
          <button class="dropdown-item" data-logout>${icon('logout')}Logout</button>
        </div>
      </div>
    </div>`;

  header.querySelector('.menu-btn').addEventListener('click', onToggleMenu);
  header.querySelector('.help-btn').addEventListener('click', openHelp);
  header.querySelector('[data-logout]').addEventListener('click', onLogout);

  header.querySelector('.search').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = e.currentTarget.q.value.trim();
    location.hash = q ? `#/history?q=${encodeURIComponent(q)}` : '#/history';
  });

  // Dropdown behaviour (click to open, click outside / Esc to close)
  const dropdowns = [...header.querySelectorAll('.dropdown')];
  const closeAll = (except) => dropdowns.forEach((d) => {
    if (d === except) return;
    d.querySelector('.dropdown-menu').hidden = true;
    d.querySelector('[data-toggle]').setAttribute('aria-expanded', 'false');
  });
  dropdowns.forEach((d) => {
    const toggle = d.querySelector('[data-toggle]');
    const menu = d.querySelector('.dropdown-menu');
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      closeAll(d);
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open && d.dataset.dropdown === 'alerts') markSeen();
    });
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) closeAll();
    });
  });
  const onDocClick = () => closeAll();
  const onKey = (e) => e.key === 'Escape' && closeAll();
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKey);
  header.cleanup = () => {
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('keydown', onKey);
  };

  // Alerts
  let latestId = 0;
  const dot = header.querySelector('.notif-dot');
  const list = header.querySelector('.alerts-list');
  function markSeen() {
    if (latestId) writeSeen(latestId);
    dot.hidden = true;
  }
  fetchNotifications()
    .then(({ results }) => {
      if (!results.length) {
        list.innerHTML = '<div class="dropdown-empty">No high-risk transactions yet.</div>';
        return;
      }
      latestId = Math.max(...results.map((r) => r.id));
      dot.hidden = latestId <= readSeen();
      list.innerHTML = results.map((r) => `
        <button class="alert-row" data-id="${r.id}">
          <span class="alert-icon">${icon('warning')}</span>
          <span class="alert-text">
            <strong>${esc(r.transaction_id)} · ${fmtMoney(r.amount)}</strong>
            <span>${r.probability.toFixed(1)}% fraud probability · ${timeAgo(r.created_at)}</span>
          </span>
        </button>`).join('');
      list.querySelectorAll('.alert-row').forEach((row) => {
        row.addEventListener('click', () => openTransactionModal(Number(row.dataset.id)));
      });
    })
    .catch(() => {
      list.innerHTML = '<div class="dropdown-empty">Could not load alerts.</div>';
    });

  return header;
}
