import Chart from 'chart.js/auto';
import { exportCsvUrl, fetchDashboard } from '../services/api.js';
import {
  downloadUrl, emptyState, errorState, esc, fmtCompact, fmtDate, fmtMoney, fmtNum, fmtPct, icon,
  predictionChip, riskBar, spinner, timeAgo, trackChart,
} from '../lib/ui.js';
import { openTransactionModal } from './TransactionModal.js';
import { syntheticModelBanner } from './AnalyticsView.js';

export function renderDashboardView(container) {
  let period = 'daily';
  let chart = null;

  container.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div>
          <h2 class="page-title">Overview</h2>
          <p class="page-sub">Live summary of every transaction you have screened.</p>
        </div>
        <div class="page-actions">
          <a class="btn btn-secondary" href="#/history">${icon('history')}History</a>
          <a class="btn btn-primary" href="#/predict">${icon('add')}New prediction</a>
        </div>
      </div>
      <div id="dash-body" class="stack">${spinner('Loading dashboard…')}</div>
    </div>`;

  const bodyEl = container.querySelector('#dash-body');

  async function load() {
    try {
      const data = await fetchDashboard(period);
      if (!container.isConnected) return;
      render(data);
    } catch (err) {
      bodyEl.innerHTML = errorState(err.message, 'dash-retry');
      bodyEl.querySelector('#dash-retry')?.addEventListener('click', load);
    }
  }

  function render({ totals, trend, alerts, recent, model }) {
    const best = model.best;
    const share = (v) => (totals.total ? fmtPct(v) : '—');
    bodyEl.innerHTML = `
      ${syntheticModelBanner(model)}
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-top"><span class="stat-icon tone-primary">${icon('receipt_long')}</span><span class="tag tag-primary">All time</span></div>
          <div class="stat-label">Total transactions</div>
          <div class="stat-value">${fmtNum(totals.total)}</div>
          <div class="stat-foot">Avg. amount ${fmtMoney(totals.avg_amount)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-top"><span class="stat-icon tone-danger">${icon('gpp_maybe')}</span><span class="tag tag-danger">${share(totals.fraud_percentage)}</span></div>
          <div class="stat-label">Fraud detected</div>
          <div class="stat-value text-danger">${fmtNum(totals.fraud)}</div>
          <div class="stat-foot">${fmtMoney(totals.fraud_amount)} in flagged amounts</div>
        </div>
        <div class="stat-card">
          <div class="stat-top"><span class="stat-icon tone-success">${icon('verified_user')}</span><span class="tag tag-success">${share(100 - totals.fraud_percentage)}</span></div>
          <div class="stat-label">Legitimate</div>
          <div class="stat-value text-primary-dark">${fmtNum(totals.legit)}</div>
          <div class="stat-foot">${fmtNum(totals.flagged)} flagged for manual review</div>
        </div>
        <div class="stat-card">
          <div class="stat-top"><span class="stat-icon tone-warning">${icon('model_training')}</span><span class="tag tag-warning">${esc(model.best_model || 'No model')}</span></div>
          <div class="stat-label">Best model F1 score</div>
          <div class="stat-value">${best ? fmtPct(best.f1_score) : '—'}</div>
          <div class="stat-foot">${best ? `Recall ${fmtPct(best.recall)} · Precision ${fmtPct(best.precision)}` : 'Run python ml/train.py'}</div>
        </div>
      </div>

      <div class="grid-2-1">
        <section class="card">
          <div class="card-head">
            <div><h3 class="card-title">Screening volume</h3><p class="card-sub">Transactions screened vs. predicted fraud</p></div>
            <div class="segmented" role="group" aria-label="Chart period">
              ${['daily', 'weekly', 'monthly'].map((p) => `<button class="${p === period ? 'active' : ''}" data-period="${p}" aria-pressed="${p === period}">${p[0].toUpperCase() + p.slice(1)}</button>`).join('')}
            </div>
          </div>
          <div class="chart-box">${trend.total.some(Boolean) ? '<canvas id="volume-chart" aria-label="Screening volume chart"></canvas>' : emptyState('bar_chart', 'No activity in this period', 'Predictions you run will appear here.')}</div>
        </section>

        <section class="card">
          <div class="card-head"><h3 class="card-title">Recent high-risk alerts</h3></div>
          <div class="alert-stack">
            ${alerts.length ? alerts.slice(0, 3).map((a, i) => `
              <button class="alert-card ${i === 0 ? 'alert-card-strong' : ''}" data-id="${a.id}">
                ${icon('warning')}
                <span>
                  <strong>${esc(a.transaction_id)} · ${fmtMoney(a.amount)}</strong>
                  <span>${a.probability.toFixed(1)}% fraud probability · ${timeAgo(a.created_at)}</span>
                  <span class="alert-link">Review now</span>
                </span>
              </button>`).join('') : emptyState('verified', 'No high-risk alerts', 'Nothing above 70% fraud probability yet.')}
          </div>
          <a class="btn btn-outline btn-block" href="#/history?risk=HIGH">View all high-risk activity</a>
        </section>
      </div>

      <section class="card card-flush">
        <div class="card-head card-head-pad">
          <h3 class="card-title">Recent predictions</h3>
          <button class="link-btn" id="dash-export">${icon('download')}Download CSV</button>
        </div>
        ${recent.length ? `
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Transaction</th><th>Screened</th><th>Amount</th><th>Fraud probability</th><th>Status</th><th class="t-right">Action</th></tr></thead>
            <tbody>
              ${recent.map((p) => `
                <tr>
                  <td class="mono">${esc(p.transaction_id)}${p.flagged ? ` <span class="flag-pin" title="Flagged">${icon('flag')}</span>` : ''}</td>
                  <td class="muted">${fmtDate(p.created_at)}</td>
                  <td class="strong">${fmtMoney(p.amount)}</td>
                  <td>${riskBar(p.probability)}</td>
                  <td>${predictionChip(p.is_fraud)}</td>
                  <td class="t-right"><button class="btn btn-sm btn-secondary" data-id="${p.id}">View</button></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="table-foot"><span>Showing ${recent.length} of ${fmtNum(totals.total)} predictions</span><a class="link-btn" href="#/history">Open full history ${icon('arrow_forward')}</a></div>`
        : emptyState('inbox', 'No predictions yet', 'Score a transaction or upload a CSV to get started.', '<a class="btn btn-primary" href="#/predict">Go to Predict</a>')}
      </section>`;

    bodyEl.querySelectorAll('[data-period]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.period === period) return;
      period = b.dataset.period;
      load();
    }));
    bodyEl.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => openTransactionModal(Number(b.dataset.id), { onChange: load })));
    bodyEl.querySelector('#dash-export').addEventListener('click', () => downloadUrl(exportCsvUrl()));

    const canvas = bodyEl.querySelector('#volume-chart');
    if (chart) chart.destroy();
    chart = null;
    if (canvas) {
      chart = trackChart(new Chart(canvas, {
        type: 'bar',
        data: {
          labels: trend.labels,
          datasets: [
            { label: 'Screened', data: trend.total, backgroundColor: '#c7d7fb', hoverBackgroundColor: '#2563eb', borderRadius: 6, maxBarThickness: 36 },
            { label: 'Predicted fraud', data: trend.fraud, backgroundColor: '#dc2626', borderRadius: 6, maxBarThickness: 36 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
            tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmtNum(ctx.parsed.y)}` } },
          },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: { color: '#eef0f6' }, ticks: { callback: (v) => fmtCompact(v) } },
          },
        },
      }));
    }
  }

  load();
}
