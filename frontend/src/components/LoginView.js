import { loginUser } from '../services/api.js';
import { esc, icon, openModal, setBusy } from '../lib/ui.js';

export function renderLoginView(root, onSuccess) {
  root.innerHTML = `
    <div class="login-page">
      <div class="login-hero">
        <div class="brand brand-lg">
          <span class="brand-mark">${icon('shield')}</span>
          <span><span class="brand-title">FraudShield AI</span><span class="brand-sub">Fraud Detection System</span></span>
        </div>
        <h2>Machine-learning screening for credit card transactions.</h2>
        <ul class="hero-points">
          <li>${icon('model_training')}Six classifiers compared — best one by F1 score used live</li>
          <li>${icon('upload_file')}Screen a single transaction or a whole CSV batch</li>
          <li>${icon('monitoring')}Risk scores, history, flags and analytics</li>
        </ul>
      </div>
      <div class="login-panel">
        <form class="login-card" novalidate>
          <h1>Welcome back</h1>
          <p class="muted">Sign in with your FraudShield account.</p>
          <div class="form-error" role="alert" hidden></div>
          <label class="field">
            <span class="field-label">Username</span>
            <span class="input-icon">${icon('person')}<input name="username" autocomplete="username" required autofocus /></span>
          </label>
          <label class="field">
            <span class="field-label-row"><span class="field-label">Password</span><button type="button" class="link-btn" data-forgot>Forgot password?</button></span>
            <span class="input-icon">${icon('lock')}<input name="password" type="password" autocomplete="current-password" required />
              <button type="button" class="input-action" data-toggle-pwd aria-label="Show password">${icon('visibility')}</button>
            </span>
          </label>
          <button type="submit" class="btn btn-primary btn-block btn-lg">Sign in</button>
          <p class="login-note">${icon('info')}<span>Accounts are created by the administrator with <code>python manage.py createsuperuser</code>.</span></p>
        </form>
        <div class="login-foot">Academic machine learning project · ${new Date().getFullYear()}</div>
      </div>
    </div>`;

  const form = root.querySelector('form');
  const errorBox = root.querySelector('.form-error');
  const pwd = form.password;
  const toggle = root.querySelector('[data-toggle-pwd]');

  toggle.addEventListener('click', () => {
    const show = pwd.type === 'password';
    pwd.type = show ? 'text' : 'password';
    toggle.innerHTML = icon(show ? 'visibility_off' : 'visibility');
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  root.querySelector('[data-forgot]').addEventListener('click', () => {
    openModal({
      title: 'Reset your password',
      body: `<p class="modal-text">FraudShield AI runs locally, so there is no email reset. Ask the administrator to run this in the project folder:</p>
             <pre class="code-block">python manage.py changepassword ${esc(form.username.value.trim() || '<username>')}</pre>`,
      actions: [{ label: 'OK', variant: 'btn-primary' }],
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.hidden = true;
    const username = form.username.value.trim();
    if (!username || !pwd.value) {
      errorBox.textContent = 'Enter your username and password.';
      errorBox.hidden = false;
      return;
    }
    const btn = form.querySelector('button[type="submit"]');
    setBusy(btn, true, 'Signing in…');
    try {
      const res = await loginUser(username, pwd.value);
      onSuccess(res.user);
    } catch (err) {
      setBusy(btn, false);
      errorBox.textContent = err.message;
      errorBox.hidden = false;
      pwd.select();
    }
  });
}
