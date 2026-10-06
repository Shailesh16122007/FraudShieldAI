import { deletePrediction, exportCsvUrl, fetchHistory, toggleFlag } from '../services/api.js';
import {
  confirmDialog, downloadUrl, emptyState, errorState, esc, fmtDate, fmtMoney, fmtNum, icon, predictionChip,
  riskBar, riskChip, spinner, toast,
} from '../lib/ui.js';
import { openTransactionModal } from './TransactionModal.js';

const PAGE_SIZE_KEY = 'fs:pageSize';

function readPageSize() {
  try {
    return Number(localStorage.getItem(PAGE_SIZE_KEY)) || 10;
  } catch {
    return 10;
  }
}

function pageList(current, total) {
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

export function renderHistoryView(container, { params }) {
  const state = {
    q: params.get('q') || '',
    risk: params.get('risk') || '',
    outcome: params.get('outcome') || '',
    flagged: params.get('flagged') || '',
    source: params.get('source') || '',
    page: Number(params.get('page')) || 1,
    page_size: readPageSize(),
  };

  container.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div>
          <h2 class="page-title">Prediction History</h2>
          <p class="page-sub">Every transaction you have screened. Click a row for details.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="export-btn">${icon('download')}Export CSV</button>
        </div>
      </div>

      <section class="card card-flush">
        <form class="filters" id="filters">
          <label class="search search-block">
            ${icon('search')}
            <input type="search" name="q" placeholder="TRX-000123, amount or label…" value="${esc(state.q)}" aria-label="Search" />
          </label>
          <select name="outcome" aria-label="Prediction">
            <option value="">All predictions</option>
            <option value="fraud">Fraud only</option>
            <option value="legitimate">Legitimate only</option>
          </select>
          <select name="risk" aria-label="Risk level">
            <option value="">All risk levels</option>
            <option value="HIGH">High risk</option>
            <option value="MEDIUM">Medium risk</option>
            <option value="LOW">Low risk</option>
          </select>
          <select name="source" aria-label="Source">
            <option value="">All sources</option>
            <option value="manual">Manual entry</option>
            <option value="csv_upload">CSV upload</option>
            <option value="api">API</option>
          </select>
          <label class="check"><input type="checkbox" name="flagged" value="1" /> Flagged only</label>
          <button type="button" class="btn btn-secondary btn-sm" id="reset-filters">Reset</button>
        </form>
        <div id="history-body">${spinner('Loading history…')}</div>
      </section>
    </div>`;

  const form = container.querySelector('#filters');
  form.outcome.value = state.outcome;
  form.risk.value = state.risk;
  form.source.value = state.source;
  form.flagged.checked = state.flagged === '1';
  const body = container.querySelector('#history-body');

  const apiParams = () => ({
    q: state.q, risk: state.risk, outcome: state.outcome, flagged: state.flagged, source: state.source,
  });

  function syncUrl() {
    const p = new URLSearchParams();
    Object.entries({ ...apiParams(), page: state.page > 1 ? state.page : '' }).forEach(([k, v]) => v && p.set(k, v));
    const hash = `#/history${p.toString() ? `?${p}` : ''}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
  }

  let requestId = 0;
  async function load() {
    const id = ++requestId;
    syncUrl();
    body.classList.add('is-loading');
    try {
      const data = await fetchHistory({ ...apiParams(), page: state.page, page_size: state.page_size });
      if (id !== requestId || !container.isConnected) return;
      state.page = data.page;
      render(data);
    } catch (err) {
      body.innerHTML = errorState(err.message, 'history-retry');
      body.querySelector('#history-retry')?.addEventListener('click', load);
    } finally {
      body.classList.remove('is-loading');
    }
  }

  function render(data) {
    const filtered = Object.values(apiParams()).some(Boolean);
    if (!data.results.length) {
      body.innerHTML = filtered
        ? emptyState('filter_alt_off', 'No matching transactions', 'Try a different search or reset the filters.', '<button class="btn btn-secondary" data-reset>Reset filters</button>')
        : emptyState('inbox', 'No predictions yet', 'Screen a transaction or upload a CSV to build your history.', '<a class="btn btn-primary" href="#/predict">Go to Predict</a>');
      body.querySelector('[data-reset]')?.addEventListener('click', resetFilters);
      return;
    }

    const start = (data.page - 1) * data.page_size + 1;
    const end = start + data.results.length - 1;
    body.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Transaction</th><th>Screened</th><th>Amount</th><th>Prediction</th><th>Fraud probability</th><th>Risk</th><th class="t-right">Actions</th></tr></thead>
          <tbody>
            ${data.results.map((p) => `
              <tr class="row-link" data-id="${p.id}" tabindex="0">
                <td><span class="mono">${esc(p.transaction_id)}</span>${p.merchant ? `<div class="muted small">${esc(p.merchant)}</div>` : ''}</td>
                <td class="muted">${fmtDate(p.created_at)}</td>
                <td class="strong">${fmtMoney(p.amount)}</td>
                <td>${predictionChip(p.is_fraud)}</td>
                <td>${riskBar(p.probability)}</td>
                <td>${riskChip(p.risk_level)}</td>
                <td class="t-right nowrap">
                  <button class="icon-btn icon-btn-sm ${p.flagged ? 'is-flagged' : ''}" data-act="flag" title="${p.flagged ? 'Remove flag' : 'Flag for review'}" aria-label="${p.flagged ? 'Remove flag' : 'Flag for review'}" aria-pressed="${p.flagged}">${icon('flag')}</button>
                  <button class="icon-btn icon-btn-sm" data-act="view" title="View details" aria-label="View details">${icon('visibility')}</button>
                  <button class="icon-btn icon-btn-sm danger" data-act="delete" title="Delete" aria-label="Delete">${icon('delete')}</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="table-foot">
        <div class="foot-left">
          <span>Showing ${fmtNum(start)}–${fmtNum(end)} of ${fmtNum(data.total_count)}</span>
          <label class="page-size">Rows
            <select id="page-size">${[10, 25, 50, 100].map((n) => `<option value="${n}" ${n === data.page_size ? 'selected' : ''}>${n}</option>`).join('')}</select>
          </label>
        </div>
        <nav class="pager" aria-label="Pagination">
          <button class="icon-btn icon-btn-sm" data-page="${data.page - 1}" ${data.page <= 1 ? 'disabled' : ''} aria-label="Previous page">${icon('chevron_left')}</button>
          ${pageList(data.page, data.total_pages).map((p) => (p === '…'
    ? '<span class="pager-gap">…</span>'
    : `<button class="pager-btn ${p === data.page ? 'active' : ''}" data-page="${p}" ${p === data.page ? 'aria-current="page"' : ''}>${fmtNum(p)}</button>`)).join('')}
          <button class="icon-btn icon-btn-sm" data-page="${data.page + 1}" ${data.page >= data.total_pages ? 'disabled' : ''} aria-label="Next page">${icon('chevron_right')}</button>
        </nav>
      </div>`;

    body.querySelectorAll('[data-page]').forEach((b) => b.addEventListener('click', () => {
      state.page = Number(b.dataset.page);
      load();
      container.scrollIntoView({ block: 'start' });
    }));
    body.querySelector('#page-size').addEventListener('change', (e) => {
      state.page_size = Number(e.target.value);
      state.page = 1;
      try {
        localStorage.setItem(PAGE_SIZE_KEY, String(state.page_size));
      } catch { /* ignore */ }
      load();
    });

    body.querySelectorAll('tr[data-id]').forEach((row) => {
      const id = Number(row.dataset.id);
      const item = data.results.find((r) => r.id === id);
      row.addEventListener('click', async (e) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (!act || act === 'view') return openTransactionModal(id, { onChange: load });
        e.stopPropagation();
        if (act === 'flag') {
          try {
            const res = await toggleFlag(id, !item.flagged);
            toast(res.flagged ? `${item.transaction_id} flagged for review.` : 'Flag removed.', 'success');
            load();
          } catch (err) {
            toast(err.message, 'error');
          }
        } else if (act === 'delete') {
          const ok = await confirmDialog({
            title: 'Delete this prediction?',
            message: `${item.transaction_id} (${fmtMoney(item.amount)}) will be removed from your history. This cannot be undone.`,
            confirmLabel: 'Delete',
            danger: true,
          });
          if (!ok) return;
          try {
            await deletePrediction(id);
            toast('Prediction deleted.', 'success');
            load();
          } catch (err) {
            toast(err.message, 'error');
          }
        }
      });
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target === row) openTransactionModal(id, { onChange: load });
      });
    });
  }

  function readFilters() {
    state.q = form.q.value.trim();
    state.outcome = form.outcome.value;
    state.risk = form.risk.value;
    state.source = form.source.value;
    state.flagged = form.flagged.checked ? '1' : '';
    state.page = 1;
    load();
  }

  function resetFilters() {
    form.reset();
    form.q.value = '';
    readFilters();
  }

  let debounce;
  form.q.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(readFilters, 350);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounce);
    readFilters();
  });
  ['outcome', 'risk', 'source', 'flagged'].forEach((name) => form[name].addEventListener('change', readFilters));
  container.querySelector('#reset-filters').addEventListener('click', resetFilters);
  container.querySelector('#export-btn').addEventListener('click', () => {
    downloadUrl(exportCsvUrl(apiParams()));
    toast('Export started — the CSV contains every row matching the current filters.', 'info');
  });

  load();
}
