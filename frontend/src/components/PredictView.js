// Predict View Component matching Image 4 with full Batch Results support
import { runPrediction, uploadBatchCSV } from '../services/api.js';

export function renderPredictView(container) {
  container.innerHTML = `
    <div class="page-container">
      <div>
        <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">Predict Transaction</h1>
        <p style="font-size: 14px; color: #64748b; max-width: 800px; line-height: 1.5;">
          Utilize our advanced neural network to analyze transaction risk. Input individual transaction data or upload a batch file for comprehensive intelligence.
        </p>
      </div>

      <div class="predict-grid">
        <!-- Left Side Cards -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Manual Analysis Form -->
          <div class="card">
            <div style="display: flex; align-items: center; gap: 10px; font-weight: 700; color: #0f172a; margin-bottom: 18px;">
              <i class="bi bi-bar-chart-steps" style="color: #2563eb;"></i>
              <span>Manual Analysis</span>
            </div>

            <form id="manual-analysis-form">
              <div class="form-group">
                <label class="form-label">Amount ($)</label>
                <div class="input-with-icon">
                  <i class="bi bi-currency-dollar left-icon"></i>
                  <input type="number" step="0.01" id="input-amount" class="custom-input" placeholder="0.00" value="1240.50" required />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Time</label>
                <div class="input-with-icon">
                  <i class="bi bi-calendar left-icon"></i>
                  <input type="text" id="input-time" class="custom-input" placeholder="mm/dd/yyyy, --:-- --" value="2025-05-24T14:32" />
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 24px;">
                <label class="form-label">Merchant Identifier</label>
                <div class="input-with-icon">
                  <i class="bi bi-shop left-icon"></i>
                  <input type="text" id="input-merchant" class="custom-input" placeholder="e.g. AMZ-9921" value="Global Services Inc." />
                </div>
              </div>

              <button type="submit" class="btn-primary-block">Predict Transaction</button>
            </form>
          </div>

          <!-- CSV Batch Upload -->
          <div class="card">
            <div style="display: flex; align-items: center; gap: 10px; font-weight: 700; color: #0f172a; margin-bottom: 14px;">
              <i class="bi bi-file-earmark-arrow-up" style="color: #2563eb;"></i>
              <span>CSV Batch Upload</span>
            </div>

            <div class="drag-drop-zone" id="csv-drop-zone">
              <i class="bi bi-cloud-upload drag-drop-icon"></i>
              <div style="font-size: 14px; color: #334155; font-weight: 600;">
                Drag and drop CSV files or <span style="color: #2563eb; cursor: pointer;">browse</span>
              </div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Maximum file size: 50MB</div>
              <input type="file" id="csv-file-input" accept=".csv" style="display: none;" />
            </div>
            <div id="upload-status-msg" style="margin-top: 12px; font-size: 13px; font-weight: 600;"></div>
          </div>
        </div>

        <!-- Right Side: Analysis Result Card -->
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div class="card-header-flex">
              <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: #0f172a;">
                <i class="bi bi-shield-check" style="color: #2563eb; font-size: 18px;"></i>
                <span id="result-title-label">Analysis Result</span>
              </div>
              <div style="font-size: 12px; color: #94a3b8;" id="refreshed-time">Refreshed: 07:45 PM</div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
              <!-- Prediction Box -->
              <div style="background: #f8fafc; border-radius: 12px; padding: 20px;">
                <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 10px;" id="result-prediction-header">PREDICTION</div>
                <div id="result-status-badge" class="badge-status fraud" style="font-size: 14px; padding: 6px 16px;">
                  <i class="bi bi-dot"></i> <span id="result-prediction-text">Fraud Detected</span>
                </div>
                <p id="result-subtext" style="font-size: 12px; color: #64748b; margin-top: 12px; line-height: 1.4;">
                  This transaction matches known behavioral patterns of structured laundering attempts.
                </p>
              </div>

              <!-- Confidence Score Box -->
              <div style="background: #eff6ff; border-radius: 12px; padding: 20px;">
                <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;" id="result-confidence-header">CONFIDENCE SCORE</div>
                <div style="font-size: 24px; font-weight: 800; color: #1e3a8a; margin-bottom: 10px;" id="result-confidence-val">98.4%</div>
                <div class="progress-track" style="height: 8px; background: #dbeafe; width: 100%; margin-bottom: 10px;">
                  <div class="progress-fill blue" id="result-confidence-bar" style="width: 98.4%;"></div>
                </div>
                <div style="font-size: 11px; color: #64748b; font-style: italic;" id="result-model-validation-text">High precision model validation (Epoch 422)</div>
              </div>
            </div>

            <!-- Risk level & metrics row -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px;">
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
                <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Risk Level</div>
                <div style="font-size: 18px; font-weight: 800; color: #dc2626; margin-top: 4px;" id="result-risk-level">CRITICAL</div>
              </div>
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
                <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;" id="result-metric2-label">Legitimate Score</div>
                <div style="font-size: 18px; font-weight: 800; color: #2563eb; margin-top: 4px;" id="result-legit-score">1.6%</div>
              </div>
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
                <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Prediction Time</div>
                <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px;" id="result-latency">124ms</div>
              </div>
            </div>

            <!-- Neural Network Graphic Activation Map -->
            <div class="neural-map-box">
              <i class="bi bi-fingerprint"></i>
              <div style="font-size: 13px; font-weight: 600; color: #cbd5e1;">Neural Network Activation Map</div>
            </div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 12px;">
            <a href="#" style="font-size: 13px; color: #2563eb; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 6px;">
              <i class="bi bi-file-earmark-text"></i> View Detailed Technical Report
            </a>
            <button style="padding: 10px 18px; background: #dc2626; color: #ffffff; font-weight: 700; font-size: 13px; border: none; border-radius: 8px; cursor: pointer;">
              Flag for Review
            </button>
          </div>
        </div>
      </div>

      <!-- Batch Screening Results Table Section (Dynamically Populated on CSV Upload) -->
      <div id="batch-results-card" class="card" style="display: none; margin-top: 12px; border: 2px solid #2563eb;">
        <div class="card-header-flex">
          <div>
            <div class="card-title" style="font-size: 18px; color: #1e3a8a;">
              <i class="bi bi-file-earmark-check-fill" style="color: #2563eb; margin-right: 8px;"></i>
              Batch Evaluation Results: <span id="batch-filename-lbl">dataset.csv</span>
            </div>
            <div style="font-size: 13px; color: #64748b; margin-top: 2px;" id="batch-summary-subtitle">
              Evaluated 0 transactions using Support Vector Machine (SVM) model.
            </div>
          </div>
          <button class="btn-primary-block" id="btn-download-evaluated-csv" style="width: auto; padding: 10px 20px; font-size: 13px;">
            <i class="bi bi-download"></i> Download Annotated Results CSV
          </button>
        </div>

        <!-- Summary Stat Cards -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px;">
          <div style="background: #eff6ff; padding: 16px; border-radius: 12px; text-align: center;">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Screened</div>
            <div style="font-size: 22px; font-weight: 800; color: #1e3a8a; margin-top: 4px;" id="batch-stat-total">0</div>
          </div>
          <div style="background: #dcfce7; padding: 16px; border-radius: 12px; text-align: center;">
            <div style="font-size: 11px; font-weight: 700; color: #15803d; text-transform: uppercase;">Legitimate</div>
            <div style="font-size: 22px; font-weight: 800; color: #15803d; margin-top: 4px;" id="batch-stat-legit">0</div>
          </div>
          <div style="background: #fee2e2; padding: 16px; border-radius: 12px; text-align: center;">
            <div style="font-size: 11px; font-weight: 700; color: #b91c1c; text-transform: uppercase;">Fraud Flagged</div>
            <div style="font-size: 22px; font-weight: 800; color: #b91c1c; margin-top: 4px;" id="batch-stat-fraud">0</div>
          </div>
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0;">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Fraud Percentage</div>
            <div style="font-size: 22px; font-weight: 800; color: #dc2626; margin-top: 4px;" id="batch-stat-pct">0%</div>
          </div>
        </div>

        <!-- Table Preview -->
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>TRANSACTION CODE</th>
                <th>MERCHANT</th>
                <th>AMOUNT ($)</th>
                <th>PREDICTION</th>
                <th>PROBABILITY</th>
                <th>RISK LEVEL</th>
              </tr>
            </thead>
            <tbody id="batch-preview-tbody">
              <!-- Dynamically Populated -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Toast Alert Popup -->
      <div class="alert-toast">
        <div class="alert-toast-icon">
          <i class="bi bi-exclamation-triangle-fill"></i>
        </div>
        <div>
          <div style="font-size: 13px; font-weight: 700; color: #991b1b;">Critical Alert</div>
          <div style="font-size: 12px; color: #7f1d1d;">High-risk activity detected in region 'EU-WEST'.</div>
        </div>
        <i class="bi bi-x" style="cursor: pointer; color: #94a3b8; margin-left: 12px;" onclick="this.parentElement.remove()"></i>
      </div>

      <!-- Bottom Recent Global Activity Table -->
      <div class="card" style="margin-top: 12px;">
        <div class="card-header-flex">
          <div class="card-title" id="activity-table-title">Recent Global Activity</div>
          <a href="#" style="font-size: 13px; color: #2563eb; font-weight: 700; text-decoration: none;">Explore Full Dataset &rarr;</a>
        </div>

        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>TRANSACTION ID</th>
                <th>MERCHANT</th>
                <th>AMOUNT</th>
                <th>RISK SCORE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody id="recent-activity-tbody">
              <tr>
                <td class="trx-id-code">TXN-8829-XJ</td>
                <td>Global Services Inc.</td>
                <td>$12,450.00</td>
                <td>
                  <div class="progress-bar-container">
                    <div class="progress-track"><div class="progress-fill blue" style="width: 15%;"></div></div>
                  </div>
                </td>
                <td><span class="badge-status legitimate">Legitimate</span></td>
              </tr>
              <tr>
                <td class="trx-id-code">TXN-1102-KK</td>
                <td>Shadow Proxy Nodes</td>
                <td>$45,000.00</td>
                <td>
                  <div class="progress-bar-container">
                    <div class="progress-track"><div class="progress-fill red" style="width: 95%;"></div></div>
                  </div>
                </td>
                <td><span class="badge-status fraud">Fraud</span></td>
              </tr>
              <tr>
                <td class="trx-id-code">TXN-3942-PP</td>
                <td>Tech Hardware Ltd.</td>
                <td>$2,190.50</td>
                <td>
                  <div class="progress-bar-container">
                    <div class="progress-track"><div class="progress-fill blue" style="width: 22%;"></div></div>
                  </div>
                </td>
                <td><span class="badge-status legitimate">Legitimate</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Manual Analysis Form Submission Handler
  const manualForm = container.querySelector('#manual-analysis-form');
  manualForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = container.querySelector('#input-amount').value;
    const time = container.querySelector('#input-time').value;
    const merchant = container.querySelector('#input-merchant').value;

    const result = await runPrediction({ amount, time_value: 100, merchant });

    // Update Analysis Result Card
    const isFraud = result.is_fraud;
    container.querySelector('#refreshed-time').textContent = `Refreshed: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    container.querySelector('#result-title-label').textContent = 'Analysis Result';
    container.querySelector('#result-prediction-header').textContent = 'PREDICTION';
    container.querySelector('#result-confidence-header').textContent = 'CONFIDENCE SCORE';
    container.querySelector('#result-metric2-label').textContent = 'Legitimate Score';

    const badge = container.querySelector('#result-status-badge');
    badge.className = `badge-status ${isFraud ? 'fraud' : 'legitimate'}`;
    container.querySelector('#result-prediction-text').textContent = result.prediction;
    container.querySelector('#result-subtext').textContent = isFraud 
      ? 'This transaction matches known behavioral patterns of structured laundering attempts.' 
      : 'No suspicious markers identified. Transaction cleared standard security heuristics.';

    container.querySelector('#result-confidence-val').textContent = `${result.probability}%`;
    container.querySelector('#result-confidence-bar').style.width = `${result.probability}%`;
    container.querySelector('#result-confidence-bar').className = `progress-fill ${isFraud ? 'red' : 'blue'}`;

    const riskEl = container.querySelector('#result-risk-level');
    riskEl.textContent = result.risk_level;
    riskEl.style.color = isFraud ? '#dc2626' : '#2563eb';

    container.querySelector('#result-legit-score').textContent = `${result.legitimate_score}%`;
    container.querySelector('#result-latency').textContent = `${result.latency_ms}ms`;
  });

  // CSV Drag and drop handler
  const dropZone = container.querySelector('#csv-drop-zone');
  const fileInput = container.querySelector('#csv-file-input');
  const msgEl = container.querySelector('#upload-status-msg');

  dropZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      msgEl.style.color = '#2563eb';
      msgEl.textContent = `Uploading and evaluating ${file.name} through SVM model...`;

      const res = await uploadBatchCSV(file);
      msgEl.style.color = '#15803d';
      msgEl.textContent = `Processed ${res.total_rows} records cleanly (${res.fraud_count} flagged as fraud).`;

      // 1. Update Right-Hand Analysis Result Card with Batch Stats
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      container.querySelector('#refreshed-time').textContent = `Refreshed: ${nowStr}`;
      container.querySelector('#result-title-label').textContent = 'Batch Analysis Summary';
      container.querySelector('#result-prediction-header').textContent = 'BATCH STATUS';
      container.querySelector('#result-confidence-header').textContent = 'FRAUD RATE';
      container.querySelector('#result-metric2-label').textContent = '% LEGITIMATE';

      const hasFraud = res.fraud_count > 0;
      const badge = container.querySelector('#result-status-badge');
      badge.className = `badge-status ${hasFraud ? 'fraud' : 'legitimate'}`;
      container.querySelector('#result-prediction-text').textContent = hasFraud ? `Fraud Flagged (${res.fraud_count})` : 'All Cleared';

      container.querySelector('#result-subtext').textContent = `Batch evaluation completed for ${res.filename}. ${res.fraud_count} suspicious transactions flagged out of ${res.total_rows} total.`;
      container.querySelector('#result-confidence-val').textContent = `${res.fraud_percentage}%`;
      container.querySelector('#result-confidence-bar').style.width = `${Math.max(res.fraud_percentage, 5)}%`;
      container.querySelector('#result-confidence-bar').className = `progress-fill ${hasFraud ? 'red' : 'blue'}`;

      const riskEl = container.querySelector('#result-risk-level');
      riskEl.textContent = hasFraud ? 'CRITICAL' : 'LOW';
      riskEl.style.color = hasFraud ? '#dc2626' : '#2563eb';

      const legitPct = (100 - res.fraud_percentage).toFixed(1);
      container.querySelector('#result-legit-score').textContent = `${legitPct}%`;
      container.querySelector('#result-latency').textContent = '42ms';

      // 2. Render Batch Results Table Section
      const batchCard = container.querySelector('#batch-results-card');
      batchCard.style.display = 'block';
      container.querySelector('#batch-filename-lbl').textContent = res.filename;
      container.querySelector('#batch-summary-subtitle').textContent = `Evaluated ${res.total_rows} transactions using Support Vector Machine (SVM) model.`;
      
      container.querySelector('#batch-stat-total').textContent = res.total_rows.toLocaleString();
      container.querySelector('#batch-stat-legit').textContent = res.legit_count.toLocaleString();
      container.querySelector('#batch-stat-fraud').textContent = res.fraud_count.toLocaleString();
      container.querySelector('#batch-stat-pct').textContent = `${res.fraud_percentage}%`;

      const previewTbody = container.querySelector('#batch-preview-tbody');
      previewTbody.innerHTML = '';

      const items = res.preview || [];
      items.forEach(item => {
        const tr = document.createElement('tr');
        const statusClass = item.prediction.toLowerCase().includes('fraud') ? 'fraud' : (item.prediction.toLowerCase().includes('suspect') ? 'suspect' : 'legitimate');
        const barColor = statusClass === 'fraud' ? 'red' : (statusClass === 'suspect' ? 'orange' : 'blue');

        tr.innerHTML = `
          <td class="trx-id-code">${item.transaction_id || ('#TRX-' + item.id)}</td>
          <td>${item.merchant || 'Global Merchant'}</td>
          <td style="font-weight: 700;">$${parseFloat(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td>
            <span class="badge-status ${statusClass}">
              <i class="bi bi-dot"></i> ${item.prediction}
            </span>
          </td>
          <td>
            <div class="progress-bar-container">
              <div class="progress-track"><div class="progress-fill ${barColor}" style="width: ${item.probability}%;"></div></div>
              <span style="font-size: 12px; font-weight: 700;">${item.probability}%</span>
            </div>
          </td>
          <td style="font-weight: 700; color: ${statusClass === 'fraud' ? '#dc2626' : '#2563eb'};">${item.risk_level || 'LOW'}</td>
        `;
        previewTbody.appendChild(tr);
      });

      // 3. Update Recent Global Activity Table
      const activityTbody = container.querySelector('#recent-activity-tbody');
      if (items.length > 0) {
        activityTbody.innerHTML = '';
        items.slice(0, 5).forEach(item => {
          const tr = document.createElement('tr');
          const statusClass = item.prediction.toLowerCase().includes('fraud') ? 'fraud' : 'legitimate';
          tr.innerHTML = `
            <td class="trx-id-code">${item.transaction_id}</td>
            <td>${item.merchant}</td>
            <td>$${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td>
              <div class="progress-bar-container">
                <div class="progress-track"><div class="progress-fill ${statusClass === 'fraud' ? 'red' : 'blue'}" style="width: ${item.probability}%;"></div></div>
              </div>
            </td>
            <td><span class="badge-status ${statusClass}">${item.prediction}</span></td>
          `;
          activityTbody.appendChild(tr);
        });
      }
    }
  });

  // Download CSV event listener
  const downloadBtn = container.querySelector('#btn-download-evaluated-csv');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      window.location.href = '/prediction/api/export-csv/';
    });
  }
}
