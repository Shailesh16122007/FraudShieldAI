import { fetchHistory, fetchSample, runPrediction, toggleFlag, uploadBatchCSV } from '../services/api.js';
import {
  downloadUrl, emptyState, esc, fmtDate, fmtMoney, fmtNum, fmtPct, icon, predictionChip, riskBar, riskChip,
  setBusy, spinner, toast,
} from '../lib/ui.js';
import { openTransactionModal } from './TransactionModal.js';

const V_KEYS = Array.from({ length: 28 }, (_, i) => `V${i + 1}`);
const TEMPLATE_HEADER = ['Time', ...V_KEYS, 'Amount'].join(',');

function parseVector(text) {
  const parts = text.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
  const nums = parts.map(Number);
  return { parts, nums, valid: nums.every((n) => Number.isFinite(n)) };
}

export function renderPredictView(container) {
  let lastResult = null;

  container.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div>
          <h2 class="page-title">Predict Transaction</h2>
          <p class="page-sub">Score a single transaction with the trained model, or upload a CSV to screen a whole batch.</p>
        </div>
      </div>

      <div class="grid-5-7">
        <div class="stack">
          <section class="card">
            <div class="card-head"><h3 class="card-title">${icon('edit_note', 'text-primary')}Manual analysis</h3></div>
            <form id="manual-form" novalidate>
              <div class="sample-row">
                <span class="muted small">Fill with a real transaction from your history:</span>
                <div class="btn-row">
                  <button type="button" class="btn btn-sm btn-secondary" data-sample="legit">${icon('verified_user')}Legitimate sample</button>
                  <button type="button" class="btn btn-sm btn-secondary" data-sample="fraud">${icon('gpp_maybe')}Fraud sample</button>
                </div>
              </div>
              <div class="form-grid">
                <label class="field">
                  <span class="field-label">Amount ($)</span>
                  <span class="input-icon">${icon('attach_money')}<input name="amount" type="number" step="0.01" min="0" placeholder="0.00" required /></span>
                </label>
                <label class="field">
                  <span class="field-label">Time (seconds)</span>
                  <span class="input-icon">${icon('schedule')}<input name="time_value" type="number" step="1" min="0" value="0" /></span>
                  <span class="field-hint">Seconds since the first transaction in the dataset (0–172,792).</span>
                </label>
              </div>
              <label class="field">
                <span class="field-label">Merchant / label <span class="muted">(optional)</span></span>
                <span class="input-icon">${icon('storefront')}<input name="merchant" maxlength="100" placeholder="e.g. AMZ-9921" /></span>
              </label>
              <details class="advanced" id="advanced">
                <summary>${icon('tune')}Advanced: V1–V28 features <span class="v-count" id="v-count">all 0 (average)</span></summary>
                <textarea name="vector" rows="4" placeholder="Paste 28 comma-separated values (V1…V28), or a full CSV row of 30 values (Time, V1…V28, Amount)."></textarea>
                <span class="field-hint">V1–V28 are anonymised PCA components. Leaving them blank uses 0 for each, which describes an “average” transaction — results then depend almost only on Amount and Time.</span>
              </details>
              <div class="form-error" role="alert" hidden></div>
              <div class="btn-row btn-row-end">
                <button type="reset" class="btn btn-secondary">Clear</button>
                <button type="submit" class="btn btn-primary btn-lg">${icon('bolt')}Predict transaction</button>
              </div>
            </form>
          </section>

          <section class="card">
            <div class="card-head">
              <h3 class="card-title">${icon('upload_file', 'text-primary')}CSV batch upload</h3>
              <button class="link-btn" id="template-btn">${icon('download')}Template</button>
            </div>
            <label class="dropzone" id="dropzone" tabindex="0">
              ${icon('cloud_upload', 'dropzone-icon')}
              <span class="dropzone-text">Drag and drop a CSV file or <span class="text-primary strong">browse</span></span>
              <span class="dropzone-hint">Columns: Time, V1–V28, Amount (Class is ignored) · max 200 MB</span>
              <input type="file" id="csv-input" accept=".csv,text/csv" hidden />
            </label>
            <div id="upload-status"></div>
          </section>
        </div>

        <section class="card result-card" id="result-card" aria-live="polite">
          <div class="card-head">
            <h3 class="card-title">${icon('verified', 'text-primary')}Analysis result</h3>
            <span class="muted small" id="result-time"></span>
          </div>
          <div id="result-body">
            ${emptyState('query_stats', 'No prediction yet', 'Enter a transaction and press “Predict transaction” to see the fraud probability and risk level here.')}
          </div>
        </section>
      </div>

      <section class="card card-flush" id="batch-card" hidden></section>

      <section class="card card-flush">
        <div class="card-head card-head-pad">
          <h3 class="card-title">Your recent activity</h3>
          <a class="link-btn" href="#/history">Explore full history ${icon('arrow_forward')}</a>
        </div>
        <div id="recent-body">${spinner()}</div>
      </section>
    </div>`;

  const form = container.querySelector('#manual-form');
  const errorBox = form.querySelector('.form-error');
  const vCount = container.querySelector('#v-count');
  const resultBody = container.querySelector('#result-body');
  const resultTime = container.querySelector('#result-time');

  // ---------- V-vector helper ----------
  function updateVectorInfo() {
    const text = form.vector.value.trim();
    if (!text) {
      vCount.textContent = 'all 0 (average)';
      vCount.className = 'v-count';
      return;
    }
    const { nums, valid } = parseVector(text);
    const ok = valid && (nums.length === 28 || nums.length === 30);
    vCount.textContent = ok ? `${nums.length === 30 ? 'full row' : '28 values'} ✓` : `${nums.length} values — need 28 or 30`;
    vCount.className = `v-count ${ok ? 'ok' : 'bad'}`;
  }
  form.vector.addEventListener('input', updateVectorInfo);
  form.addEventListener('reset', () => setTimeout(() => {
    updateVectorInfo();
    errorBox.hidden = true;
  }));

  container.querySelectorAll('[data-sample]').forEach((btn) => btn.addEventListener('click', async () => {
    setBusy(btn, true, 'Loading…');
    try {
      const { features, source_id } = await fetchSample(btn.dataset.sample);
      form.amount.value = Number(features.Amount ?? 0).toFixed(2);
      form.time_value.value = Math.round(Number(features.Time ?? 0));
      form.vector.value = V_KEYS.map((k) => Number(features[k] ?? 0)).join(', ');
      form.merchant.value = `Sample of TRX-${String(source_id).padStart(6, '0')}`;
      container.querySelector('#advanced').open = true;
      updateVectorInfo();
      toast(`Loaded features from TRX-${String(source_id).padStart(6, '0')}.`, 'info');
    } catch (err) {
      toast(err.message, 'warning');
    } finally {
      setBusy(btn, false);
    }
  }));

  // ---------- Manual prediction ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.hidden = true;
    const fail = (msg) => {
      errorBox.textContent = msg;
      errorBox.hidden = false;
    };

    const payload = {
      amount: form.amount.value,
      time_value: form.time_value.value || 0,
      merchant: form.merchant.value.trim(),
    };
    if (payload.amount === '' || Number(payload.amount) < 0) return fail('Enter a transaction amount of 0 or more.');

    const text = form.vector.value.trim();
    if (text) {
      const { nums, valid } = parseVector(text);
      if (!valid) return fail('V1–V28 must all be numbers.');
      if (nums.length === 30) {
        [payload.time_value] = nums;
        payload.amount = nums[29];
        nums.slice(1, 29).forEach((v, i) => { payload[`V${i + 1}`] = v; });
        form.time_value.value = nums[0];
        form.amount.value = nums[29];
      } else if (nums.length === 28) {
        nums.forEach((v, i) => { payload[`V${i + 1}`] = v; });
      } else {
        return fail(`Advanced features: expected 28 values (or a 30-value CSV row) but got ${nums.length}.`);
      }
    }

    const btn = form.querySelector('button[type="submit"]');
    setBusy(btn, true, 'Analyzing…');
    resultBody.classList.add('is-loading');
    try {
      lastResult = await runPrediction(payload);
      renderResult(lastResult);
      loadRecent();
      // On narrow screens the result card sits below the form — bring it into view.
      const card = container.querySelector('#result-card');
      if (card.getBoundingClientRect().top > window.innerHeight * 0.5) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      fail(err.message);
    } finally {
      setBusy(btn, false);
      resultBody.classList.remove('is-loading');
    }
  });

  function renderResult(r) {
    resultTime.textContent = `Screened ${new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const p = r.probability;
    const verdict = r.is_fraud
      ? 'The model estimates this transaction is more likely fraudulent than legitimate.'
      : r.risk_level === 'MEDIUM'
        ? 'Classified as legitimate, but the probability is in the medium band — worth a second look.'
        : 'No strong fraud signal — the model classifies this transaction as legitimate.';

    resultBody.innerHTML = `
      <div class="result-grid">
        <div class="result-tile">
          <span class="label">Prediction</span>
          <div class="result-verdict ${r.is_fraud ? 'danger' : 'success'}">
            <span class="pulse"></span>${r.is_fraud ? 'Fraud detected' : 'Legitimate'}
          </div>
          <p class="muted small">${verdict}</p>
        </div>
        <div class="result-tile">
          <div class="tile-row"><span class="label">Fraud probability</span><strong class="big ${p >= 70 ? 'text-danger' : p >= 30 ? 'text-warning' : 'text-primary'}">${fmtPct(p, 1)}</strong></div>
          <div class="scale">
            <div class="scale-track"><span class="zone low"></span><span class="zone med"></span><span class="zone high"></span></div>
            <span class="scale-marker" style="left:${Math.min(Math.max(p, 0), 100)}%"></span>
            <div class="scale-labels"><span>Low &lt;30%</span><span>Medium</span><span>High ≥70%</span></div>
          </div>
        </div>
      </div>
      <div class="mini-grid">
        <div class="mini"><span class="label">Risk level</span>${riskChip(r.risk_level)}</div>
        <div class="mini"><span class="label">Legitimate score</span><strong>${fmtPct(100 - p, 1)}</strong></div>
        <div class="mini"><span class="label">Model time</span><strong>${r.latency_ms} ms</strong></div>
      </div>
      <dl class="result-facts">
        <div><dt>Transaction</dt><dd class="mono">${esc(r.transaction_id)}</dd></div>
        <div><dt>Amount</dt><dd>${fmtMoney(r.amount)}</dd></div>
        <div><dt>Time</dt><dd>${fmtNum(r.time_value)} s</dd></div>
        <div><dt>Label</dt><dd>${esc(r.merchant || '—')}</dd></div>
      </dl>
      <div class="result-actions">
        <button class="link-btn" data-act="details">${icon('description')}View full details</button>
        <div class="btn-row">
          <button class="btn btn-secondary" data-act="new">New prediction</button>
          <button class="btn ${r.flagged ? 'btn-secondary' : 'btn-danger'}" data-act="flag">${icon('flag')}${r.flagged ? 'Flagged ✓' : 'Flag for review'}</button>
        </div>
      </div>`;

    resultBody.querySelector('[data-act="details"]').addEventListener('click', () => openTransactionModal(r.id, {
      onChange: (changed) => {
        if (changed?.deleted) {
          resultBody.innerHTML = emptyState('delete', 'Prediction deleted', 'Run another prediction to see a new result.');
          resultTime.textContent = '';
        } else if (changed) {
          r.flagged = changed.flagged;
          renderResult(r);
        }
        loadRecent();
      },
    }));
    resultBody.querySelector('[data-act="new"]').addEventListener('click', () => {
      form.reset();
      form.amount.focus();
    });
    resultBody.querySelector('[data-act="flag"]').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      setBusy(btn, true, 'Saving…');
      try {
        const res = await toggleFlag(r.id, !r.flagged);
        r.flagged = res.flagged;
        toast(r.flagged ? `${r.transaction_id} flagged for review.` : 'Flag removed.', 'success');
        renderResult(r);
        loadRecent();
      } catch (err) {
        setBusy(btn, false);
        toast(err.message, 'error');
      }
    });
  }

  // ---------- CSV upload ----------
  const dropzone = container.querySelector('#dropzone');
  const fileInput = container.querySelector('#csv-input');
  const statusEl = container.querySelector('#upload-status');
  const batchCard = container.querySelector('#batch-card');

  container.querySelector('#template-btn').addEventListener('click', () => {
    const sample = ['0', ...V_KEYS.map(() => '0'), '149.62'].join(',');
    const blob = new Blob([`${TEMPLATE_HEADER}\n${sample}\n`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fraudshield_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });
  ['dragenter', 'dragover'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.add('dragging');
  }));
  ['dragleave', 'drop'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragging');
  }));
  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
    fileInput.value = '';
  });

  async function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      statusEl.innerHTML = `<div class="notice notice-danger">${icon('error')}Please choose a .csv file.</div>`;
      return;
    }
    dropzone.classList.add('busy');
    const mb = (file.size / 1024 / 1024).toFixed(1);
    statusEl.innerHTML = `<div class="notice notice-info"><span class="spinner spinner-sm"></span>Screening <strong>${esc(file.name)}</strong> (${mb} MB)… large files can take a minute.</div>`;
    try {
      const res = await uploadBatchCSV(file);
      statusEl.innerHTML = `<div class="notice notice-success">${icon('check_circle')}Screened ${fmtNum(res.total_rows)} transactions — ${fmtNum(res.fraud_count)} predicted as fraud.</div>`;
      if (res.missing_columns?.length) {
        statusEl.innerHTML += `<div class="notice notice-warning">${icon('warning')}Missing columns were treated as 0: ${esc(res.missing_columns.join(', '))}</div>`;
      }
      renderBatch(res);
      loadRecent();
      toast(`${res.filename}: ${fmtNum(res.fraud_count)} of ${fmtNum(res.total_rows)} flagged as fraud.`, res.fraud_count ? 'warning' : 'success', 'Batch complete');
    } catch (err) {
      statusEl.innerHTML = `<div class="notice notice-danger">${icon('error')}${esc(err.message)}</div>`;
    } finally {
      dropzone.classList.remove('busy');
    }
  }

  function renderBatch(res) {
    batchCard.hidden = false;
    batchCard.innerHTML = `
      <div class="card-head card-head-pad">
        <div>
          <h3 class="card-title">${icon('task', 'text-primary')}Batch results: ${esc(res.filename)}</h3>
          <p class="card-sub">Model inference took ${fmtNum(Math.round(res.inference_ms))} ms for ${fmtNum(res.total_rows)} rows. Showing the first ${res.preview.length}.</p>
        </div>
        <div class="btn-row">
          <a class="btn btn-secondary" href="#/history?source=csv_upload">${icon('history')}Open in history</a>
          <button class="btn btn-primary" id="batch-download">${icon('download')}Download results CSV</button>
        </div>
      </div>
      <div class="batch-stats">
        <div class="batch-stat"><span class="label">Total screened</span><strong>${fmtNum(res.total_rows)}</strong></div>
        <div class="batch-stat success"><span class="label">Legitimate</span><strong>${fmtNum(res.legit_count)}</strong></div>
        <div class="batch-stat danger"><span class="label">Predicted fraud</span><strong>${fmtNum(res.fraud_count)}</strong></div>
        <div class="batch-stat"><span class="label">Fraud rate</span><strong class="text-danger">${fmtPct(res.fraud_percentage)}</strong></div>
        <div class="batch-stat warning"><span class="label">High / medium risk</span><strong>${fmtNum(res.high_risk_count)} / ${fmtNum(res.medium_risk_count)}</strong></div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Row</th><th>Amount</th><th>Prediction</th><th>Fraud probability</th><th>Risk</th></tr></thead>
          <tbody>
            ${res.preview.map((row) => `
              <tr>
                <td class="mono">#${row.row}</td>
                <td class="strong">${fmtMoney(row.amount)}</td>
                <td>${predictionChip(row.is_fraud)}</td>
                <td>${riskBar(row.probability)}</td>
                <td>${riskChip(row.risk_level)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    batchCard.querySelector('#batch-download').addEventListener('click', () => downloadUrl(res.download_url));
    batchCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- Recent activity ----------
  const recentBody = container.querySelector('#recent-body');
  async function loadRecent() {
    try {
      const { results } = await fetchHistory({ page_size: 5 });
      if (!container.isConnected) return;
      recentBody.innerHTML = results.length ? `
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Transaction</th><th>Label</th><th>Amount</th><th>Fraud probability</th><th>Status</th><th>Screened</th></tr></thead>
            <tbody>
              ${results.map((p) => `
                <tr class="row-link" data-id="${p.id}" tabindex="0">
                  <td class="mono">${esc(p.transaction_id)}</td>
                  <td>${esc(p.merchant || '—')}</td>
                  <td class="strong">${fmtMoney(p.amount)}</td>
                  <td>${riskBar(p.probability)}</td>
                  <td>${predictionChip(p.is_fraud)}</td>
                  <td class="muted">${fmtDate(p.created_at)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : emptyState('inbox', 'No activity yet', 'Your predictions will be listed here.');
      recentBody.querySelectorAll('[data-id]').forEach((row) => {
        const open = () => openTransactionModal(Number(row.dataset.id), { onChange: loadRecent });
        row.addEventListener('click', open);
        row.addEventListener('keydown', (e) => e.key === 'Enter' && open());
      });
    } catch (err) {
      recentBody.innerHTML = `<div class="notice notice-danger">${icon('error')}${esc(err.message)}</div>`;
    }
  }
  loadRecent();
}
