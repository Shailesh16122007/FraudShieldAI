# Fraud Shield AI — Credit Card Fraud Detection

A production-style Django + Machine Learning system for detecting fraudulent
credit card transactions, built as a final-year college project.

## Features
- Dashboard: live totals, fraud rate, screening volume (daily / weekly / monthly), high-risk alerts
- Manual single-transaction check, with "load a real sample" to fill V1–V28
- Bulk CSV upload → screens every row → downloadable annotated results CSV
- Prediction history: search (`TRX-000123` or amount), filters, pagination,
  detail view, flag for review, delete, CSV export of the filtered list
- Analytics: classification split, fraud rate over time, risk mix, model
  benchmark table and confusion matrix of the live model
- Settings: profile, change password, retrain models, clear history
- 6 trained ML models compared automatically (Logistic Regression, Decision
  Tree, Random Forest, SVM, KNN, Gaussian Naive Bayes) — best model (by F1)
  is auto-selected for live predictions
- Every number in the UI comes from the database / `models/metrics.json` (no mock data)
- JSON API (login + CSRF protected, each user sees only their own data)
- Responsive UI (Stitch "Academic Precision" design), works offline — fonts and icons are bundled
- Django admin for Users / Predictions / UploadedFiles

## Tech Stack
Python 3, Django 5, Pandas, NumPy, Scikit-Learn, Imbalanced-Learn, Joblib,
Vite + vanilla JS, Chart.js. SQLite by default, MySQL supported via env vars.

## 1. Installation

```bash
cd FraudShieldAI
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Add the dataset (optional but recommended)

Download `creditcard.csv` (Kaggle "Credit Card Fraud Detection" dataset)
and place it at:

```
FraudShieldAI/dataset/creditcard.csv
```

If it's missing, the training script auto-generates a schema-compatible
synthetic dataset so the whole project still runs for a demo.

## 3. Train the models

```bash
python ml/train.py
```

This prints preprocessing stats, trains all 6 models, prints a comparison,
and saves `models/model.pkl`, `models/scaler.pkl`, `models/metrics.json`.
Re-run any time to retrain (also triggerable via `POST /analytics/api/train/`).

## 4. Database setup

**SQLite (default, zero config):**
```bash
python manage.py migrate
```

**MySQL:**
```bash
export USE_MYSQL=1
export DB_NAME=fraudshield_db DB_USER=root DB_PASSWORD=yourpass DB_HOST=localhost DB_PORT=3306
python manage.py migrate
```

## 5. Create an admin user

```bash
python manage.py createsuperuser
```

## 6. Build the frontend (once, and after any change in `frontend/src`)

Needs Node.js 18+.

```bash
cd frontend
npm install
npm run build
cd ..
```

This writes `frontend/dist/`, which Django serves at `/`.

## 7. Run

```bash
python manage.py runserver
```

Visit `http://127.0.0.1:8000/` and log in. (Restart `runserver` the first time
after building so Django picks up `frontend/dist`.)

**Frontend development with hot reload:** keep `runserver` running and, in a
second terminal, run `npm run dev` inside `frontend/`, then open
`http://localhost:5173/`. API calls are proxied to Django.

The classic server-rendered pages are still available at `/dashboard/`.

## Tests

```bash
python manage.py test prediction
```

## Folder Structure

```
FraudShieldAI/
├── accounts/          # login/logout
├── prediction/        # predict form, CSV upload, history, ML inference
├── analytics/          # dashboard stats, model comparison, charts
├── dashboard/          # home overview page
├── ml/train.py          # preprocessing + training + model comparison
├── dataset/creditcard.csv   # <- place the Kaggle dataset here
├── models/              # model.pkl, scaler.pkl, metrics.json (generated)
├── frontend/            # Vite single-page app (src/components = one file per page)
├── templates/            # classic Django template UI
├── static/css/style.css
├── requirements.txt
└── manage.py
```

## Notes for your project report / viva
- Class imbalance handled with SMOTE (oversampling minority/fraud class)
  plus `class_weight="balanced"` on applicable models.
- Best model is selected by **F1 score** (not raw accuracy), since fraud
  detection is a highly imbalanced problem where accuracy alone is
  misleading (a model predicting "never fraud" would still score >99%).
- A transaction is labelled Fraud when its predicted probability is ≥ 50%;
  risk is HIGH at ≥ 70%, MEDIUM at 30–70%, LOW below 30%.
- CSV upload was made the primary prediction workflow (rather than manual
  entry of all 30 features) since `V1-V28` are PCA components a real user
  can't meaningfully type in — this mirrors how a bank would actually batch
  screen transactions.
