import {
  changePassword, clearHistory, fetchAnalytics, retrainModels, updateProfile,
} from '../services/api.js';
import {
  confirmDialog, esc, fmtDate, fmtNum, fmtPct, icon, openModal, setBusy, toast,
} from '../lib/ui.js';
import { syntheticModelBanner } from './AnalyticsView.js';

export function renderSettingsView(container, { user, setUser }) {
  container.innerHTML = `
    <div class="page page-narrow">
      <div class="page-head">
        <div>
          <h2 class="page-title">Settings</h2>
          <p class="page-sub">Manage your account, the ML model and your stored data.</p>
        </div>
      </div>

      <section class="card">
        <div class="card-head"><h3 class="card-title">${icon('person', 'text-primary')}Profile</h3><span class="muted small">Member since ${fmtDate(user.date_joined)}</span></div>
        <form id="profile-form" class="form-grid" novalidate>
          <label class="field"><span class="field-label">Username</span><input value="${esc(user.username)}" disabled /></label>
          <label class="field"><span class="field-label">Email</span><input name="email" type="email" value="${esc(user.email)}" placeholder="you@example.com" /></label>
          <label class="field"><span class="field-label">First name</span><input name="first_name" value="${esc(user.first_name)}" /></label>
          <label class="field"><span class="field-label">Last name</span><input name="last_name" value="${esc(user.last_name)}" /></label>
          <div class="form-actions"><button class="btn btn-primary" type="submit">Save profile</button></div>
        </form>
      </section>

      <section class="card">
        <div class="card-head"><h3 class="card-title">${icon('lock', 'text-primary')}Change password</h3></div>
        <form id="password-form" class="form-grid" novalidate>
          <label class="field field-full"><span class="field-label">Current password</span><input name="old_password" type="password" autocomplete="current-password" required /></label>
          <label class="field"><span class="field-label">New password</span><input name="new_password1" type="password" autocomplete="new-password" required /></label>
          <label class="field"><span class="field-label">Confirm new password</span><input name="new_password2" type="password" autocomplete="new-password" required /></label>
          <div class="form-error field-full" role="alert" hidden></div>
          <div class="form-actions"><button class="btn btn-primary" type="submit">Update password</button></div>
        </form>
      </section>

      <section class="card">
        <div class="card-head"><h3 class="card-title">${icon('model_training', 'text-primary')}Machine learning model</h3></div>
        <div id="model-info" class="muted">Loading model information…</div>
        <div class="setting-row">
          <div><strong>Retrain all models</strong><p class="muted small">Runs <code>ml/train.py</code>: trains six classifiers on <code>dataset/creditcard.csv</code> (or a synthetic demo set if it is missing) and switches live predictions to the best one. This can take several minutes on the full dataset.</p></div>
          <button class="btn btn-secondary" id="retrain-btn">${icon('refresh')}Retrain</button>
        </div>
      </section>

      <section class="card card-danger">
        <div class="card-head"><h3 class="card-title">${icon('warning', 'text-danger')}Danger zone</h3></div>
        <div class="setting-row">
          <div><strong>Clear my prediction history</strong><p class="muted small">Permanently deletes all of your stored predictions and uploads<span id="history-count"></span>. Export a CSV from History first if you need a copy.</p></div>
          <button class="btn btn-danger" id="clear-btn">${icon('delete_forever')}Clear history</button>
        </div>
      </section>
    </div>`;

  // Profile
  const profileForm = container.querySelector('#profile-form');
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = profileForm.querySelector('button[type="submit"]');
    setBusy(btn, true, 'Saving…');
    try {
      const { user: updated } = await updateProfile({
        first_name: profileForm.first_name.value,
        last_name: profileForm.last_name.value,
        email: profileForm.email.value,
      });
      toast('Profile saved.', 'success');
      setUser(updated);
    } catch (err) {
      toast(err.message, 'error');
      setBusy(btn, false);
    }
  });

  // Password
  const pwdForm = container.querySelector('#password-form');
  const pwdError = pwdForm.querySelector('.form-error');
  pwdForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    pwdError.hidden = true;
    const data = Object.fromEntries(new FormData(pwdForm));
    if (!data.old_password || !data.new_password1) {
      pwdError.textContent = 'Fill in your current and new password.';
      pwdError.hidden = false;
      return;
    }
    if (data.new_password1 !== data.new_password2) {
      pwdError.textContent = 'The two new passwords do not match.';
      pwdError.hidden = false;
      return;
    }
    const btn = pwdForm.querySelector('button[type="submit"]');
    setBusy(btn, true, 'Updating…');
    try {
      await changePassword(data);
      pwdForm.reset();
      toast('Password updated.', 'success');
    } catch (err) {
      pwdError.textContent = err.message;
      pwdError.hidden = false;
    } finally {
      setBusy(btn, false);
    }
  });

  // Model info
  const modelInfo = container.querySelector('#model-info');
  const historyCount = container.querySelector('#history-count');
  function renderModel(model, totals) {
    const best = model.best;
    modelInfo.classList.remove('muted');
    modelInfo.innerHTML = `
      ${syntheticModelBanner(model)}
      <dl class="kv kv-3">
        <div><dt>Live model</dt><dd>${esc(model.best_model || 'None')}</dd></div>
        <div><dt>F1 score</dt><dd>${best ? fmtPct(best.f1_score) : '—'}</dd></div>
        <div><dt>Recall</dt><dd>${best ? fmtPct(best.recall) : '—'}</dd></div>
        <div><dt>Training data</dt><dd>${model.dataset_source === 'synthetic' ? 'Synthetic demo' : model.dataset_source ? 'Kaggle creditcard.csv' : '—'}</dd></div>
        <div><dt>Last trained</dt><dd>${model.trained_at ? fmtDate(model.trained_at) : '—'}</dd></div>
        <div><dt>Your predictions</dt><dd>${totals ? fmtNum(totals.total) : '—'}</dd></div>
      </dl>`;
    if (totals) historyCount.textContent = ` (${fmtNum(totals.total)} predictions)`;
  }
  function loadModel() {
    fetchAnalytics('daily')
      .then(({ model, totals }) => container.isConnected && renderModel(model, totals))
      .catch((err) => { modelInfo.textContent = err.message; });
  }
  loadModel();

  container.querySelector('#retrain-btn').addEventListener('click', async (e) => {
    const ok = await confirmDialog({
      title: 'Retrain all models?',
      message: 'Training runs on the server and can take several minutes. Keep this page open until it finishes.',
      confirmLabel: 'Start training',
    });
    if (!ok) return;
    const btn = e.currentTarget;
    setBusy(btn, true, 'Training…');
    try {
      const res = await retrainModels();
      toast(`Training finished. Live model: ${res.model.best_model}.`, 'success');
      openModal({
        title: 'Training log',
        size: 'lg',
        body: `<pre class="code-block code-scroll">${esc(res.log_tail)}</pre>`,
        actions: [{ label: 'Close', variant: 'btn-primary' }],
      });
      loadModel();
    } catch (err) {
      toast(err.message, 'error', 'Training failed');
    } finally {
      setBusy(btn, false);
    }
  });

  container.querySelector('#clear-btn').addEventListener('click', async (e) => {
    const ok = await confirmDialog({
      title: 'Delete your entire history?',
      message: 'All of your stored predictions and uploaded files will be permanently deleted. This cannot be undone.',
      confirmLabel: 'Delete everything',
      danger: true,
    });
    if (!ok) return;
    const btn = e.currentTarget;
    setBusy(btn, true, 'Deleting…');
    try {
      const res = await clearHistory();
      toast(`Deleted ${fmtNum(res.deleted)} records.`, 'success');
      loadModel();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(btn, false);
    }
  });
}
