// Transaction detail dialog used by Dashboard, History and Notifications.
import { deletePrediction, fetchPrediction, toggleFlag } from '../services/api.js';
import {
  confirmDialog, esc, fmtDate, fmtMoney, icon, openModal, predictionChip, riskBar, riskChip, setBusy, spinner, toast,
} from '../lib/ui.js';

const SOURCE_LABELS = { manual: 'Manual entry', csv_upload: 'CSV upload', api: 'API' };

export function openTransactionModal(id, { onChange } = {}) {
  const modal = openModal({ title: `Transaction TRX-${String(id).padStart(6, '0')}`, body: spinner('Loading transaction…'), size: 'lg' });
  const body = modal.el.querySelector('.modal-body');

  fetchPrediction(id)
    .then((p) => render(p))
    .catch((err) => {
      body.innerHTML = `<p class="modal-text">${esc(err.message)}</p>`;
    });

  function render(p) {
    const features = p.features || {};
    const vCells = Array.from({ length: 28 }, (_, i) => {
      const v = Number(features[`V${i + 1}`] ?? 0);
      return `<div class="feature-cell"><span>V${i + 1}</span><strong>${v.toFixed(4)}</strong></div>`;
    }).join('');

    body.innerHTML = `
      <div class="detail-grid">
        <div class="detail-item"><span class="label">Prediction</span>${predictionChip(p.is_fraud)}</div>
        <div class="detail-item"><span class="label">Risk level</span>${riskChip(p.risk_level)}</div>
        <div class="detail-item"><span class="label">Amount</span><strong>${fmtMoney(p.amount)}</strong></div>
        <div class="detail-item"><span class="label">Screened</span><strong>${fmtDate(p.created_at)}</strong></div>
        <div class="detail-item"><span class="label">Source</span><strong>${SOURCE_LABELS[p.source] || esc(p.source)}</strong></div>
        <div class="detail-item"><span class="label">Merchant / label</span><strong>${esc(p.merchant || '—')}</strong></div>
      </div>
      <div class="detail-prob">
        <span class="label">Fraud probability</span>
        ${riskBar(p.probability)}
      </div>
      <details class="feature-details">
        <summary>${icon('dataset')} Model input features (Time, Amount, V1–V28)</summary>
        <div class="feature-head">
          <div class="feature-cell"><span>Time</span><strong>${Number(features.Time ?? p.time_value).toFixed(0)} s</strong></div>
          <div class="feature-cell"><span>Amount</span><strong>${fmtMoney(features.Amount ?? p.amount)}</strong></div>
        </div>
        <div class="feature-grid">${vCells}</div>
      </details>
      <div class="modal-actions-row">
        <button class="btn btn-ghost-danger" data-act="delete">${icon('delete')}Delete</button>
        <button class="btn ${p.flagged ? 'btn-secondary' : 'btn-warning'}" data-act="flag">${icon(p.flagged ? 'outlined_flag' : 'flag')}${p.flagged ? 'Remove flag' : 'Flag for review'}</button>
      </div>`;

    body.querySelector('[data-act="flag"]').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      setBusy(btn, true, 'Saving…');
      try {
        const res = await toggleFlag(p.id, !p.flagged);
        p.flagged = res.flagged;
        toast(p.flagged ? 'Transaction flagged for review.' : 'Flag removed.', 'success');
        onChange?.(p);
        render(p);
      } catch (err) {
        setBusy(btn, false);
        toast(err.message, 'error');
      }
    });

    body.querySelector('[data-act="delete"]').addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Delete this prediction?',
        message: `${p.transaction_id} will be removed from your history. This cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      });
      if (!ok) return;
      try {
        await deletePrediction(p.id);
        toast('Prediction deleted.', 'success');
        modal.close();
        onChange?.({ ...p, deleted: true });
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }
  return modal;
}
