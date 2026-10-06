// Login View Component matching Image 3
export function renderLoginView(container, onLoginSuccess) {
  container.innerHTML = `
    <div class="login-page-bg">
      <div class="login-card">
        <div class="login-logo-badge">
          <i class="bi bi-shield-lock-fill"></i>
          <span>Fraud Shield AI</span>
        </div>
        <h1 class="login-title">FraudWatch</h1>
        <div class="login-subtitle">TECHNICAL INTELLIGENCE</div>
        
        <h2 class="login-heading">Welcome Back</h2>
        <p class="login-desc">Please enter your credentials to access the dashboard.</p>

        <form id="login-form" style="width: 100%;">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <div class="input-with-icon">
              <i class="bi bi-envelope left-icon"></i>
              <input type="text" id="login-email" class="custom-input" placeholder="analyst@fraudwatch.ai" value="analyst@fraudwatch.ai" required />
            </div>
          </div>

          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label class="form-label" style="margin-bottom: 0;">Password</label>
              <a href="#" style="font-size: 12px; color: #2563eb; text-decoration: none; font-weight: 600;">Forgot?</a>
            </div>
            <div class="input-with-icon">
              <i class="bi bi-lock left-icon"></i>
              <input type="password" id="login-password" class="custom-input" value="password123" required />
              <i class="bi bi-eye toggle-pwd" id="toggle-pwd-btn"></i>
            </div>
          </div>

          <div class="form-row-between">
            <label class="checkbox-label">
              <input type="checkbox" checked /> Remember this device
            </label>
          </div>

          <button type="submit" class="btn-primary-block">Login to Dashboard</button>
        </form>

        <div class="login-footer-links">
          Internal System. <a href="#">Request access</a><br/>
          <span style="color: #94a3b8; font-size: 11px;">Privacy Policy &nbsp;·&nbsp; Security Standards</span>
        </div>

        <div class="academic-footer-text">
          ACADEMIC RESEARCH PROJECT &copy; 2024
        </div>
      </div>
    </div>
  `;

  const pwdInput = container.querySelector('#login-password');
  const toggleBtn = container.querySelector('#toggle-pwd-btn');
  toggleBtn.addEventListener('click', () => {
    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
      toggleBtn.className = 'bi bi-eye-slash toggle-pwd';
    } else {
      pwdInput.type = 'password';
      toggleBtn.className = 'bi bi-eye toggle-pwd';
    }
  });

  const form = container.querySelector('#login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = container.querySelector('#login-email').value;
    const password = pwdInput.value;
    onLoginSuccess(email, password);
  });
}
