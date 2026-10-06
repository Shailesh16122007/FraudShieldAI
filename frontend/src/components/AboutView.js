import { PROJECT } from '../config.js';
import { esc, icon, initials } from '../lib/ui.js';
import { openHelp } from './Header.js';

const MODELS = [
  { name: 'Logistic Regression', text: 'Linear baseline; fast and easy to interpret.' },
  { name: 'Decision Tree', text: 'Rule-like splits on the features (max depth 10).' },
  { name: 'Random Forest', text: '200 trees voting together; robust to noise.' },
  { name: 'Support Vector Machine', text: 'RBF-kernel SVM with probability estimates.' },
  { name: 'K-Nearest Neighbours', text: 'Classifies by the 5 most similar transactions.' },
  { name: 'Gaussian Naive Bayes', text: 'Probabilistic baseline assuming independent features.' },
];

const PIPELINE = [
  ['upload_file', 'Load data', 'Kaggle credit-card dataset: Time, V1–V28, Amount, Class'],
  ['cleaning_services', 'Clean', 'Drop duplicate rows, check missing values'],
  ['call_split', 'Split', 'Stratified 80% train / 20% test'],
  ['straighten', 'Scale', 'StandardScaler on all 30 features'],
  ['balance', 'Balance', 'SMOTE oversampling of the fraud class'],
  ['model_training', 'Train & compare', 'Six classifiers, ranked by F1 score'],
  ['bolt', 'Predict', 'Best model scores new transactions in the web app'],
];

export function renderAboutView(container) {
  const team = PROJECT.team.map((m) => `
    <div class="person"><span class="avatar avatar-lg">${esc(initials(m.name))}</span><div><strong>${esc(m.name)}</strong><span class="muted small">${esc(m.role)}</span></div></div>`).join('');

  container.innerHTML = `
    <div class="page">
      <section class="hero-card">
        <div>
          <span class="tag tag-primary">${esc(PROJECT.institution)}</span>
          <h2>${esc(PROJECT.name)}</h2>
          <p>A Django web application that uses supervised machine learning to estimate the probability that a credit card transaction is fraudulent, assign it a risk level, and keep an auditable history of every prediction.</p>
          <div class="btn-row">
            <a class="btn btn-light" href="#/predict">${icon('bolt')}Try a prediction</a>
            <button class="btn btn-ghost-light" id="about-help">${icon('help')}How to use</button>
          </div>
        </div>
        <div class="hero-badge">${icon('shield', 'hero-shield')}<span>${esc(PROJECT.tagline)}</span></div>
      </section>

      <div class="grid-1-2">
        <section class="card">
          <div class="card-head"><h3 class="card-title">${icon('database', 'text-warning')}Dataset</h3></div>
          <p class="muted">Kaggle “Credit Card Fraud Detection” (European cardholders, September 2013). Features V1–V28 are PCA-transformed for confidentiality; only Time and Amount are in their original form.</p>
          <dl class="kv">
            <div><dt>Transactions</dt><dd>284,807</dd></div>
            <div><dt>Fraud cases</dt><dd>492 (0.172%)</dd></div>
            <div><dt>Model features</dt><dd>30 (Time, V1–V28, Amount)</dd></div>
            <div><dt>Target</dt><dd>Class (1 = fraud)</dd></div>
          </dl>
        </section>
        <section class="card">
          <div class="card-head"><h3 class="card-title">${icon('hub', 'text-primary')}Algorithms compared</h3></div>
          <div class="model-grid">
            ${MODELS.map((m) => `<div class="model-tile"><strong>${esc(m.name)}</strong><span>${esc(m.text)}</span></div>`).join('')}
          </div>
        </section>
      </div>

      <section class="card">
        <div class="card-head"><h3 class="card-title">${icon('account_tree', 'text-primary')}Training pipeline</h3></div>
        <ol class="pipeline">
          ${PIPELINE.map(([ic, title, text], i) => `<li><span class="step-icon">${icon(ic)}</span><span class="step-num">${i + 1}</span><strong>${title}</strong><span>${text}</span></li>`).join('')}
        </ol>
      </section>

      <div class="grid-1-1">
        <section class="card">
          <div class="card-head"><h3 class="card-title">${icon('memory', 'text-primary')}Technology stack</h3></div>
          <div class="pill-row">
            ${['Python 3', 'Django 5', 'scikit-learn', 'imbalanced-learn (SMOTE)', 'pandas & NumPy', 'joblib', 'SQLite / MySQL', 'Vite', 'Chart.js'].map((t) => `<span class="pill">${t}</span>`).join('')}
          </div>
          <div class="card-head" style="margin-top:20px"><h3 class="card-title">${icon('rule', 'text-primary')}Risk levels</h3></div>
          <ul class="facts">
            <li><span class="chip chip-danger">HIGH</span>fraud probability ≥ 70%</li>
            <li><span class="chip chip-warning">MEDIUM</span>30% – 70%</li>
            <li><span class="chip chip-neutral">LOW</span>below 30%</li>
          </ul>
        </section>
        <section class="card">
          <div class="card-head"><h3 class="card-title">${icon('groups', 'text-primary')}Project team</h3></div>
          <div class="people">${team}</div>
          <div class="supervisor">
            <span class="avatar avatar-lg avatar-dark">${icon('school')}</span>
            <div>
              <span class="muted small">Supervised by</span>
              <strong>${esc(PROJECT.supervisor.name)}</strong>
              <span class="muted small">${esc(PROJECT.supervisor.title)}</span>
              ${PROJECT.supervisor.email ? `<a class="link-btn" href="mailto:${esc(PROJECT.supervisor.email)}">${icon('mail')}${esc(PROJECT.supervisor.email)}</a>` : ''}
            </div>
          </div>
        </section>
      </div>

      <footer class="page-foot">
        <span>© ${PROJECT.year} ${esc(PROJECT.name)} · Academic project — not for real financial decisions.</span>
        ${PROJECT.repositoryUrl ? `<a class="link-btn" href="${esc(PROJECT.repositoryUrl)}" target="_blank" rel="noopener">${icon('code')}Source code</a>` : ''}
      </footer>
    </div>`;

  container.querySelector('#about-help').addEventListener('click', openHelp);
}
