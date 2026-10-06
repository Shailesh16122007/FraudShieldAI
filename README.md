# Fraud Shield AI — Credit Card Fraud Detection

A production-style Django + Machine Learning system for detecting fraudulent
credit card transactions, built as a final-year college project.

## Features
- Manual single-transaction fraud check
- Bulk CSV upload → screens every row → downloadable results CSV
- Prediction history with search / filter / delete
- Analytics dashboard: totals, fraud trend chart, model comparison table
- 6 trained ML models compared automatically (Logistic Regression, Decision
  Tree, Random Forest, SVM, KNN, Gaussian Naive Bayes) — best model (by F1)
  is auto-selected for live predictions
- JSON API: `POST /prediction/api/predict/`, `POST /prediction/upload/`,
  `GET /prediction/api/history/`, `GET /analytics/api/analytics/`,
  `POST /analytics/api/train/`, `GET /prediction/upload/<id>/download/`
- Bootstrap 5 dark "cyber security" themed UI, responsive
- Django admin for Users / Predictions / UploadedFiles / ModelMetrics

## Tech Stack
Python 3, Django 5, Pandas, NumPy, Scikit-Learn, Imbalanced-Learn, Joblib,
Bootstrap 5, Chart.js. SQLite by default, MySQL supported via env vars.

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

## 6. Run

```bash
python manage.py runserver
```

Visit `http://127.0.0.1:8000/` and log in.

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
├── templates/            # Bootstrap 5 dark theme templates
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
- CSV upload was made the primary prediction workflow (rather than manual
  entry of all 30 features) since `V1-V28` are PCA components a real user
  can't meaningfully type in — this mirrors how a bank would actually batch
  screen transactions.
