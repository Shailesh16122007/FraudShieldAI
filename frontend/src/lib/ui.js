// Shared UI helpers: escaping, formatting, icons, toasts, modals and chart bookkeeping.

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const icon = (name, cls = '') => `<span class="ms ${cls}" aria-hidden="true">${name}</span>`;

const moneyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const compactFmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export const fmtMoney = (n) => moneyFmt.format(Number(n) || 0);
export const fmtNum = (n) => (Number(n) || 0).toLocaleString('en-US');
export const fmtCompact = (n) => compactFmt.format(Number(n) || 0);
export const fmtPct = (n, digits = 2) => `${(Number(n) || 0).toFixed(digits)}%`;

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [unit, size] of units) {
    const value = Math.floor(seconds / size);
    if (value >= 1) return `${value} ${unit}${value > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

export function initials(name) {
  return String(name || '?')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export function predictionChip(isFraud) {
  return isFraud
    ? `<span class="chip chip-danger"><span class="chip-dot"></span>Fraud</span>`
    : `<span class="chip chip-success"><span class="chip-dot"></span>Legitimate</span>`;
}

export function riskChip(level) {
  const cls = { HIGH: 'chip-danger', MEDIUM: 'chip-warning', LOW: 'chip-neutral' }[level] || 'chip-neutral';
  return `<span class="chip ${cls}">${esc(level)}</span>`;
}

export function riskBar(probability) {
  const p = Math.max(0, Math.min(100, Number(probability) || 0));
  const tone = p >= 70 ? 'danger' : p >= 30 ? 'warning' : 'primary';
  return `<div class="riskbar"><div class="riskbar-track"><div class="riskbar-fill ${tone}" style="width:${Math.max(p, 2)}%"></div></div><span class="riskbar-val">${p.toFixed(1)}%</span></div>`;
}

export function emptyState(iconName, title, text, actionHtml = '') {
  return `<div class="empty-state">${icon(iconName, 'empty-icon')}<div class="empty-title">${esc(title)}</div><p>${esc(text)}</p>${actionHtml}</div>`;
}

export function errorState(message, retryId = '') {
  return `<div class="empty-state error">${icon('error', 'empty-icon')}<div class="empty-title">Could not load data</div><p>${esc(message)}</p>${retryId ? `<button class="btn btn-secondary" id="${retryId}">${icon('refresh')}Try again</button>` : ''}</div>`;
}

export const spinner = (label = 'Loading…') => `<div class="loading">${'<span class="spinner"></span>'}<span>${esc(label)}</span></div>`;

export function setBusy(button, busy, busyLabel = 'Working…') {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span class="spinner spinner-sm"></span>${esc(busyLabel)}`;
  } else {
    button.disabled = false;
    if (button.dataset.label) button.innerHTML = button.dataset.label;
  }
}

// ---------- Toasts ----------
export function toast(message, type = 'info', title = '') {
  let host = document.querySelector('.toast-host');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toast-host';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <div class="toast-icon">${icon(icons[type] || 'info')}</div>
    <div class="toast-body">${title ? `<div class="toast-title">${esc(title)}</div>` : ''}<div>${esc(message)}</div></div>
    <button class="icon-btn icon-btn-sm" aria-label="Dismiss">${icon('close')}</button>`;
  const remove = () => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 200);
  };
  el.querySelector('button').addEventListener('click', remove);
  host.appendChild(el);
  setTimeout(remove, type === 'error' ? 7000 : 4500);
}

// ---------- Modals ----------
export function openModal({ title, body = '', actions = [], size = '' }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal ${size ? `modal-${size}` : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-header">
        <h3>${esc(title)}</h3>
        <button class="icon-btn" data-close aria-label="Close">${icon('close')}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${actions.length ? '<div class="modal-footer"></div>' : ''}
    </div>`;
  const previousFocus = document.activeElement;

  const close = () => {
    document.removeEventListener('keydown', onKey);
    backdrop.classList.add('leaving');
    setTimeout(() => backdrop.remove(), 150);
    previousFocus?.focus?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };

  const footer = backdrop.querySelector('.modal-footer');
  actions.forEach((a) => {
    const btn = document.createElement('button');
    btn.className = `btn ${a.variant || 'btn-secondary'}`;
    btn.innerHTML = a.label;
    btn.addEventListener('click', () => (a.onClick ? a.onClick({ close, button: btn }) : close()));
    footer.appendChild(btn);
  });

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.closest('[data-close]')) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(backdrop);
  (backdrop.querySelector('.modal-body input, .modal-footer .btn-primary, .modal-footer .btn-danger') || backdrop.querySelector('[data-close]')).focus();
  return { close, el: backdrop.querySelector('.modal') };
}

export function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value, close) => {
      settled = true;
      close();
      resolve(value);
    };
    const { el } = openModal({
      title,
      body: `<p class="modal-text">${esc(message)}</p>`,
      actions: [
        { label: 'Cancel', variant: 'btn-secondary', onClick: ({ close }) => done(false, close) },
        { label: esc(confirmLabel), variant: danger ? 'btn-danger' : 'btn-primary', onClick: ({ close }) => done(true, close) },
      ],
    });
    // Closing with Esc / backdrop counts as cancel.
    const observer = new MutationObserver(() => {
      if (!document.body.contains(el)) {
        observer.disconnect();
        if (!settled) resolve(false);
      }
    });
    observer.observe(document.body, { childList: true });
  });
}

// ---------- Charts ----------
const charts = new Set();
export function trackChart(chart) {
  charts.add(chart);
  return chart;
}
export function destroyCharts() {
  charts.forEach((c) => c.destroy());
  charts.clear();
}

export function downloadUrl(url) {
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
