// History View Component matching Image 2
import { fetchHistory } from '../services/api.js';

export function renderHistoryView(container) {
  container.innerHTML = `
    <div class="page-container">
      <div>
        <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">Audit Logs</h1>
        <p style="font-size: 14px; color: #64748b;">Review and export historical model classifications.</p>
      </div>

      <!-- Main Audit Logs Card -->
      <div class="card">
        <div class="card-header-flex">
          <div class="search-input-wrapper" style="width: 320px;">
            <i class="bi bi-search"></i>
            <input type="text" id="history-search-input" class="search-input" placeholder="Search Transaction ID..." />
          </div>
          <button class="btn-primary-block" id="btn-export-csv" style="width: auto; padding: 10px 20px; font-size: 13px; display: flex; align-items: center; gap: 8px;">
            <i class="bi bi-download"></i> Export CSV
          </button>
        </div>

        <div class="table-responsive">
          <table class="custom-table" id="history-table">
            <thead>
              <tr>
                <th>TRANSACTION ID</th>
                <th>DATE & TIME</th>
                <th>AMOUNT</th>
                <th>PREDICTION</th>
                <th>PROBABILITY</th>
                <th style="text-align: center;">ACTIONS</th>
              </tr>
            </thead>
            <tbody id="history-table-body">
              <!-- Dynamically Populated -->
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 24px; font-size: 13px; color: #64748b;">
          <div>Showing 1 to 5 of <span id="total-count-lbl">1,248</span> entries</div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button class="icon-btn-circle" style="width: 32px; height: 32px; font-size: 12px;"><i class="bi bi-chevron-left"></i></button>
            <button style="width: 32px; height: 32px; border-radius: 8px; border: none; background: #2563eb; color: #ffffff; font-weight: 700; font-size: 13px;">1</button>
            <button style="width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; background: #ffffff; color: #475569; font-weight: 600; font-size: 13px;">2</button>
            <button style="width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; background: #ffffff; color: #475569; font-weight: 600; font-size: 13px;">3</button>
            <span style="padding: 0 4px;">...</span>
            <button style="width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; background: #ffffff; color: #475569; font-weight: 600; font-size: 13px;">125</button>
            <button class="icon-btn-circle" style="width: 32px; height: 32px; font-size: 12px;"><i class="bi bi-chevron-right"></i></button>
          </div>
        </div>
      </div>

      <!-- Bottom Metric Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px;">
        <div class="metric-card">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div class="metric-icon-box blue" style="background: #eff6ff;">
              <i class="bi bi-check-all"></i>
            </div>
            <div>
              <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Accuracy Rate</div>
              <div style="font-size: 22px; font-weight: 800; color: #0f172a;" id="hist-metric-acc">99.24%</div>
            </div>
          </div>
        </div>

        <div class="metric-card">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div class="metric-icon-box" style="background: #fff7ed; color: #ea580c;">
              <i class="bi bi-stopwatch"></i>
            </div>
            <div>
              <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Avg Inference Time</div>
              <div style="font-size: 22px; font-weight: 800; color: #0f172a;" id="hist-metric-time">14ms</div>
            </div>
          </div>
        </div>

        <div class="metric-card">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div class="metric-icon-box pink">
              <i class="bi bi-shield-slash"></i>
            </div>
            <div>
              <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Fraud Blocked (24h)</div>
              <div style="font-size: 22px; font-weight: 800; color: #0f172a;" id="hist-metric-blocked">$12,450</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Floating Action Button -->
      <button class="fab-btn" title="Add New Transaction">
        <i class="bi bi-plus-lg"></i>
      </button>
    </div>
  `;

  async function loadData(query = '') {
    const data = await fetchHistory(query);
    const tbody = container.querySelector('#history-table-body');
    tbody.innerHTML = '';

    (data.results || []).forEach(row => {
      const tr = document.createElement('tr');
      const statusClass = row.prediction.toLowerCase().includes('fraud') 
        ? 'fraud' 
        : (row.prediction.toLowerCase().includes('suspect') ? 'suspect' : 'legitimate');

      const colorClass = statusClass === 'fraud' ? 'red' : (statusClass === 'suspect' ? 'orange' : 'green');

      tr.innerHTML = `
        <td class="trx-id-code">${row.trx_id}</td>
        <td style="color: #64748b;">${row.date}</td>
        <td style="font-weight: 700;">$${parseFloat(row.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td>
          <span class="badge-status ${statusClass}">
            <i class="bi bi-dot"></i> ${row.prediction}
          </span>
        </td>
        <td>
          <div class="progress-bar-container">
            <div class="progress-track">
              <div class="progress-fill ${colorClass}" style="width: ${row.probability}%;"></div>
            </div>
            <span style="font-size: 12px; font-weight: 700; color: #334155;">${row.probability}%</span>
          </div>
        </td>
        <td style="text-align: center;">
          <button class="icon-btn-circle" style="width: 32px; height: 32px; margin: 0 auto;" title="View Details">
            <i class="bi bi-eye"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (data.total_count) {
      container.querySelector('#total-count-lbl').textContent = data.total_count.toLocaleString();
    }
  }

  loadData();

  const searchInput = container.querySelector('#history-search-input');
  searchInput.addEventListener('input', (e) => {
    loadData(e.target.value);
  });

  const exportBtn = container.querySelector('#btn-export-csv');
  exportBtn.addEventListener('click', () => {
    window.location.href = '/prediction/api/export-csv/';
  });
}
