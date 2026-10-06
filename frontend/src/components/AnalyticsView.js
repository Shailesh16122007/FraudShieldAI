import Chart from 'chart.js/auto';
import { fetchAnalytics } from '../services/api.js';
import {
  errorState, esc, fmtCompact, fmtMoney, fmtNum, fmtPct, icon, spinner, trackChart, emptyState,
} from '../lib/ui.js';

export function syntheticModelBanner(model) {
  if (!model?.available) {
    return `<div class="notice notice-warning">${icon('warning')}<span>No trained model metrics found. Run <code>python ml/train.py</code> to train the models.</span></div>`;
  }
  if (model.dataset_source === 'synthetic') {
    return `<div class="notice notice-warning">${icon('science')}<span>The current model was trained on a <strong>synthetic demo dataset</strong> (dataset/creditcard.csv was missing), so the model scores below are not real-world results. Put the Kaggle <code>creditcard.csv</code> in <code>dataset/</code> and retrain from Settings.</span></div>`;
  }
  return '';
}

export function renderAnalyticsView(container) {
  let period = 'daily';

  container.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div>
          <h2 class="page-title">Analytics</h2>
          <p class="page-sub">Fraud statistics from your predictions and the evaluation of all trained models.</p>
        </div>
      </div>
      <div id="an-body" class="stack">${spinner('Crunching numbers…')}</div>
    </div>`;
  const bodyEl = container.querySelector('#an-body');

  async function load() {
    try {
      const data = await fetchAnalytics(period);
      if (!container.isConnected) return;
      render(data);
    } catch (err) {
      bodyEl.innerHTML = errorState(err.message, 'an-retry');
      bodyEl.querySelector('#an-retry')?.addEventListener('click', load);
    }
  }

  function render({ totals, trend, insight, model }) {
    const best = model.best;
    const ratio = totals.fraud ? `1 : ${fmtNum(Math.round(totals.legit / totals.fraud))}` : '—';
    const cm = best?.confusion_matrix;

    bodyEl.innerHTML = `
      ${syntheticModelBanner(model)}
      <div class="stat-grid stat-grid-3">
        <div class="stat-card stat-row">
          <div><div class="stat-label">Predicted fraud</div><div class="stat-value">${fmtNum(totals.fraud)}</div><div class="stat-foot">of ${fmtNum(totals.total)} screened</div></div>
          <span class="stat-icon tone-danger">${icon('gpp_maybe')}</span>
        </div>
        <div class="stat-card stat-row">
          <div><div class="stat-label">Fraud rate</div><div class="stat-value">${fmtPct(totals.fraud_percentage)}</div><div class="stat-foot">${fmtNum(totals.high_risk)} high · ${fmtNum(totals.medium_risk)} medium risk</div></div>
          <span class="stat-icon tone-primary">${icon('percent')}</span>
        </div>
        <div class="stat-card stat-row">
          <div><div class="stat-label">Avg. transaction amount</div><div class="stat-value">${fmtMoney(totals.avg_amount)}</div><div class="stat-foot">${fmtMoney(totals.fraud_amount)} in predicted fraud</div></div>
          <span class="stat-icon tone-neutral">${icon('payments')}</span>
        </div>
      </div>

      <div class="grid-1-2">
        <section class="card">
          <div class="card-head"><h3 class="card-title">Classification split</h3></div>
          ${totals.total ? `
          <div class="donut">
            <canvas id="split-chart" aria-label="Classification split chart"></canvas>
            <div class="donut-center"><span class="label">Fraud ratio</span><strong>${ratio}</strong></div>
          </div>
          <ul class="legend">
            <li><span class="dot dot-primary"></span>Legitimate<strong>${fmtPct(100 - totals.fraud_percentage)}</strong></li>
            <li><span class="dot dot-danger"></span>Fraud<strong>${fmtPct(totals.fraud_percentage)}</strong></li>
          </ul>` : emptyState('donut_large', 'No data yet', 'Run predictions to see the split.')}
        </section>

        <section class="card">
          <div class="card-head">
            <div><h3 class="card-title">Fraud rate over time</h3><p class="card-sub">Share of screened transactions predicted as fraud</p></div>
            <div class="segmented" role="group" aria-label="Chart period">
              ${['daily', 'weekly', 'monthly'].map((p) => `<button class="${p === period ? 'active' : ''}" data-period="${p}" aria-pressed="${p === period}">${p[0].toUpperCase() + p.slice(1)}</button>`).join('')}
            </div>
          </div>
          <div class="chart-box">${trend.total.some(Boolean) ? '<canvas id="rate-chart" aria-label="Fraud rate chart"></canvas>' : emptyState('show_chart', 'No activity in this period', 'Try a longer period.')}</div>
          <div class="mini-grid mini-grid-2">
            <div class="mini tone-bg-primary"><span class="label">${icon('shield')}Risk mix</span>
              <div class="stacked" title="High / Medium / Low">
                <span class="seg danger" style="width:${totals.total ? (totals.high_risk / totals.total) * 100 : 0}%"></span>
                <span class="seg warning" style="width:${totals.total ? (totals.medium_risk / totals.total) * 100 : 0}%"></span>
                <span class="seg primary" style="width:${totals.total ? (totals.low_risk / totals.total) * 100 : 100}%"></span>
              </div>
              <span class="muted small">${fmtNum(totals.high_risk)} high · ${fmtNum(totals.medium_risk)} medium · ${fmtNum(totals.low_risk)} low</span>
            </div>
            <div class="mini"><span class="label">${icon('flag')}Flagged for review</span><strong class="big">${fmtNum(totals.flagged)}</strong></div>
          </div>
        </section>
      </div>

      <div class="insight">
        <div class="insight-left">
          <span class="insight-icon">${icon('lightbulb')}</span>
          <div><div class="insight-title">${esc(insight.title)}</div><p>${esc(insight.message)}</p></div>
        </div>
        <a class="btn btn-light" href="${insight.action === 'predict' ? '#/predict' : '#/history?risk=HIGH'}">${esc(insight.action_label)}</a>
      </div>

      <section class="card card-flush">
        <div class="card-head card-head-pad">
          <div><h3 class="card-title">Model performance benchmark</h3><p class="card-sub">Test-set results from <code>ml/train.py</code>. The best model by F1 score is used for live predictions.</p></div>
        </div>
        ${model.models.length ? `
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Algorithm</th><th>Accuracy</th><th>Precision</th><th>Recall</th><th>F1 score</th><th>ROC AUC</th><th>Train time</th><th>Status</th></tr></thead>
            <tbody>
              ${model.models.map((m) => `
                <tr class="${m.is_best ? 'row-best' : ''}">
                  <td class="strong">${esc(m.name)}</td>
                  <td>${fmtPct(m.accuracy)}</td>
                  <td>${fmtPct(m.precision)}</td>
                  <td>${fmtPct(m.recall)}</td>
                  <td class="strong text-primary">${fmtPct(m.f1_score)}</td>
                  <td>${fmtPct(m.roc_auc)}</td>
                  <td class="muted">${m.train_time_seconds ?? '—'} s</td>
                  <td>${m.is_best ? '<span class="chip chip-success">Live model</span>' : '<span class="muted small">Evaluated</span>'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : emptyState('model_training', 'No model metrics', 'Train the models to see the comparison.')}
      </section>

      ${cm ? `
      <div class="grid-1-1">
        <section class="card">
          <div class="card-head"><div><h3 class="card-title">Confusion matrix — ${esc(best.name)}</h3><p class="card-sub">Rows: actual class · Columns: predicted class (test set)</p></div></div>
          <div class="cm">
            <span></span><span class="cm-h">Pred. legit</span><span class="cm-h">Pred. fraud</span>
            <span class="cm-h">Actual legit</span><span class="cm-cell good">${fmtNum(cm[0][0])}<small>TN</small></span><span class="cm-cell bad">${fmtNum(cm[0][1])}<small>FP</small></span>
            <span class="cm-h">Actual fraud</span><span class="cm-cell bad">${fmtNum(cm[1][0])}<small>FN</small></span><span class="cm-cell good">${fmtNum(cm[1][1])}<small>TP</small></span>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><h3 class="card-title">Why F1, not accuracy?</h3></div>
          <p class="muted">Fraud is rare, so a model that always answers “legitimate” would still score above 99% accuracy while catching zero fraud. FraudShield therefore ranks models by <strong>F1 score</strong>, which balances <strong>precision</strong> (how many alerts are real fraud) and <strong>recall</strong> (how much fraud is caught).</p>
          <ul class="facts">
            <li>${icon('balance')}Class imbalance handled with SMOTE oversampling + class weights</li>
            <li>${icon('straighten')}Features standardised with StandardScaler</li>
            <li>${icon('call_split')}Stratified 80 / 20 train–test split</li>
            <li>${icon('database')}Training data: ${model.dataset_source === 'synthetic' ? 'synthetic demo set' : 'Kaggle creditcard.csv'} · ${model.feature_count} features</li>
          </ul>
        </section>
      </div>` : ''}`;

    bodyEl.querySelectorAll('[data-period]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.period === period) return;
      period = b.dataset.period;
      load();
    }));

    const split = bodyEl.querySelector('#split-chart');
    if (split) {
      trackChart(new Chart(split, {
        type: 'doughnut',
        data: {
          labels: ['Legitimate', 'Fraud'],
          datasets: [{ data: [totals.legit, totals.fraud], backgroundColor: ['#2563eb', '#dc2626'], borderWidth: 0 }],
        },
        options: {
          cutout: '74%',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${fmtNum(c.parsed)}` } } },
        },
      }));
    }

    const rate = bodyEl.querySelector('#rate-chart');
    if (rate) {
      const pct = trend.total.map((t, i) => (t ? +((trend.fraud[i] / t) * 100).toFixed(2) : null));
      trackChart(new Chart(rate, {
        data: {
          labels: trend.labels,
          datasets: [
            { type: 'line', label: 'Fraud rate %', data: pct, borderColor: '#dc2626', backgroundColor: '#dc2626', tension: 0.35, spanGaps: true, yAxisID: 'y', pointRadius: 3 },
            { type: 'bar', label: 'Screened', data: trend.total, backgroundColor: '#dbe4fd', borderRadius: 4, yAxisID: 'y1', maxBarThickness: 28 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, position: 'left', ticks: { callback: (v) => `${v}%` }, grid: { color: '#eef0f6' } },
            y1: { beginAtZero: true, position: 'right', grid: { display: false }, ticks: { callback: (v) => fmtCompact(v) } },
          },
        },
      }));
    }
  }

  load();
}
