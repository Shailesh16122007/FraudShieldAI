// Analytics View Component matching Image 1
import { fetchAnalytics } from '../services/api.js';
import Chart from 'chart.js/auto';

export function renderAnalyticsView(container) {
  container.innerHTML = `
    <div class="page-container">
      <!-- Top Metrics Row -->
      <div class="metrics-row">
        <div class="metric-card">
          <div>
            <div class="metric-label">TOTAL FRAUD IDENTIFIED</div>
            <div class="metric-value" id="an-total-fraud">1,284</div>
            <div class="metric-subtext positive">
              <i class="bi bi-arrow-up-right"></i> +12% from last month
            </div>
          </div>
          <div class="metric-icon-box pink">
            <i class="bi bi-eraser-fill"></i>
          </div>
        </div>

        <div class="metric-card">
          <div>
            <div class="metric-label">FRAUD PERCENTAGE</div>
            <div class="metric-value" id="an-fraud-pct">3.18%</div>
            <div class="metric-subtext negative">
              <i class="bi bi-arrow-down-right"></i> -0.4% from average
            </div>
          </div>
          <div class="metric-icon-box blue">%</div>
        </div>

        <div class="metric-card">
          <div>
            <div class="metric-label">AVG. TRANS. AMOUNT</div>
            <div class="metric-value" id="an-avg-amount">$4,821</div>
            <div class="metric-subtext neutral">
              <i class="bi bi-calendar3"></i> Rolling 30 day average
            </div>
          </div>
          <div class="metric-icon-box gray">
            <i class="bi bi-cash-stack"></i>
          </div>
        </div>
      </div>

      <!-- Main Grid: Donut Chart & Accuracy Trends Line Chart -->
      <div style="display: grid; grid-template-columns: 360px 1fr; gap: 24px;">
        <!-- Left: Donut Chart Card -->
        <div class="card">
          <div class="card-header-flex">
            <div class="card-title">Classification Split</div>
            <i class="bi bi-three-dots-vertical" style="color: #94a3b8; cursor: pointer;"></i>
          </div>

          <div class="donut-wrapper">
            <canvas id="donutChartCanvas"></canvas>
            <div class="donut-center-text">
              <div class="donut-center-label">RATIO</div>
              <div class="donut-center-val" id="donut-ratio-val">1:31</div>
            </div>
          </div>

          <div class="legend-list">
            <div class="legend-item">
              <div class="legend-badge-name">
                <span class="dot blue"></span> Legitimate
              </div>
              <div class="legend-pct" id="donut-legit-pct">96.82%</div>
            </div>
            <div class="legend-item">
              <div class="legend-badge-name">
                <span class="dot red"></span> Fraudulent
              </div>
              <div class="legend-pct" id="donut-fraud-pct">3.18%</div>
            </div>
          </div>
        </div>

        <!-- Right: Prediction Accuracy Trends -->
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div class="card-header-flex">
              <div>
                <div class="card-title">Prediction Accuracy Trends</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Confidence scores across the last 14 testing epochs</div>
              </div>
              <div style="display: flex; background: #f1f5f9; border-radius: 8px; padding: 3px;">
                <button style="padding: 4px 12px; border: none; border-radius: 6px; background: #ffffff; color: #2563eb; font-weight: 700; font-size: 12px; shadow: var(--shadow-sm);">D</button>
                <button style="padding: 4px 12px; border: none; border-radius: 6px; background: transparent; color: #64748b; font-weight: 600; font-size: 12px;">W</button>
                <button style="padding: 4px 12px; border: none; border-radius: 6px; background: transparent; color: #64748b; font-weight: 600; font-size: 12px;">M</button>
              </div>
            </div>

            <div style="height: 220px; position: relative;">
              <canvas id="lineChartCanvas"></canvas>
            </div>
          </div>

          <!-- Bottom Meters inside accuracy card -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px;">
            <div style="background: #eff6ff; border-radius: 12px; padding: 16px;">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; color: #1e3a8a; text-transform: uppercase;">
                <i class="bi bi-shield-check" style="color: #2563eb;"></i> MODEL INTEGRITY
              </div>
              <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 6px 0 8px 0;" id="integrity-val">98.4%</div>
              <div class="progress-track" style="height: 6px; background: #dbeafe;">
                <div class="progress-fill blue" style="width: 98.4%;"></div>
              </div>
            </div>

            <div style="background: #f8fafc; border-radius: 12px; padding: 16px;">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">
                <i class="bi bi-speedometer" style="color: #ea580c;"></i> LATENCY AVERAGE
              </div>
              <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 6px 0 8px 0;" id="latency-val">42ms</div>
              <div class="progress-track" style="height: 6px; background: #e2e8f0;">
                <div class="progress-fill orange" style="width: 35%;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Intelligence Insight Alert Banner -->
      <div class="insight-alert-card">
        <div class="insight-left">
          <div class="insight-icon-circle">
            <i class="bi bi-lightbulb"></i>
          </div>
          <div>
            <div class="insight-title">Intelligence Insight</div>
            <div class="insight-body">
              Fraud detection rates spiked by 8.4% between 02:00 and 04:00 UTC. Initial heuristics suggest a concerted automated campaign targeting cross-border gateways. Recommendation: Enable strict verification filters for Tier-1 jurisdictions for the next 12 hours.
            </div>
          </div>
        </div>
        <button class="btn-insight-action">Apply Recommendation</button>
      </div>

      <!-- ML Models Benchmark Table -->
      <div class="card" style="margin-top: 12px;">
        <div class="card-title" style="margin-bottom: 16px;">Machine Learning Algorithm Performance Benchmark</div>
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>ALGORITHM</th>
                <th>ACCURACY</th>
                <th>PRECISION</th>
                <th>RECALL</th>
                <th>F1 SCORE</th>
                <th>ROC AUC</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody id="models-benchmark-body">
              <!-- Dynamically Populated -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Init Charts and load metrics data
  async function initAnalytics() {
    const data = await fetchAnalytics();

    // Render Donut Chart
    const donutCtx = container.querySelector('#donutChartCanvas').getContext('2d');
    new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: ['Legitimate', 'Fraudulent'],
        datasets: [{
          data: [data.classification_split.legitimate_pct, data.classification_split.fraudulent_pct],
          backgroundColor: ['#2563eb', '#dc2626'],
          borderWidth: 0,
          cutout: '76%',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });

    // Render Line Chart
    const lineCtx = container.querySelector('#lineChartCanvas').getContext('2d');
    new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: data.accuracy_trends.labels,
        datasets: [{
          label: 'Accuracy Trend',
          data: data.accuracy_trends.confidence_scores,
          borderColor: '#2563eb',
          borderWidth: 3,
          tension: 0.4,
          pointBackgroundColor: '#2563eb',
          pointRadius: 4,
          fill: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { min: 95, max: 100, grid: { color: '#f1f5f9' } }
        }
      }
    });

    // Models Table
    const tbody = container.querySelector('#models-benchmark-body');
    tbody.innerHTML = '';
    (data.models || []).forEach(m => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 700;">${m.name}</td>
        <td>${m.accuracy}%</td>
        <td>${m.precision}%</td>
        <td>${m.recall}%</td>
        <td style="font-weight: 700; color: #2563eb;">${m.f1_score}%</td>
        <td>${m.roc_auc}%</td>
        <td>${m.is_best ? '<span class="badge-status legitimate">Primary Model</span>' : '<span style="color: #94a3b8; font-size: 12px;">Evaluated</span>'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  setTimeout(initAnalytics, 50);
}
