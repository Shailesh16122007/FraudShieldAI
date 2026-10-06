"""
Fraud Shield AI - Model Training Pipeline
==========================================
Loads dataset/creditcard.csv, preprocesses it, trains 6 classifiers,
compares them on Accuracy/Precision/Recall/F1/ROC-AUC, and saves the
best model + scaler + metrics to models/.

Run:
    python ml/train.py

If dataset/creditcard.csv is not found, a synthetic dataset with the
same schema (Time, V1-V28, Amount, Class) is generated so the whole
pipeline (and the Django app) is runnable end-to-end for demo purposes.
Drop the real Kaggle creditcard.csv into dataset/ and re-run this
script to train on real data.
"""
import json
import os
import sys
import time

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier

try:
    from imblearn.over_sampling import SMOTE
    HAS_SMOTE = True
except ImportError:
    HAS_SMOTE = False

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_PATH = os.path.join(BASE_DIR, "dataset", "creditcard.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

FEATURE_COLUMNS = ["Time"] + [f"V{i}" for i in range(1, 29)] + ["Amount"]


def generate_synthetic_dataset(n_rows=20000, fraud_ratio=0.0025, seed=42):
    """Generates a schema-compatible synthetic dataset so the project
    is runnable without the real (large) Kaggle CSV present."""
    rng = np.random.default_rng(seed)
    n_fraud = max(int(n_rows * fraud_ratio), 20)
    n_legit = n_rows - n_fraud

    def make_rows(n, fraud):
        data = {}
        data["Time"] = rng.uniform(0, 172792, n)
        for i in range(1, 29):
            # Fraud rows get a shifted/scaled distribution so models
            # actually have signal to learn from.
            if fraud:
                data[f"V{i}"] = rng.normal(loc=rng.uniform(-1.5, 1.5), scale=1.8, size=n)
            else:
                data[f"V{i}"] = rng.normal(loc=0, scale=1.0, size=n)
        data["Amount"] = np.abs(rng.normal(loc=88 if not fraud else 120, scale=100, size=n))
        data["Class"] = 1 if fraud else 0
        return pd.DataFrame(data)

    df = pd.concat([make_rows(n_legit, False), make_rows(n_fraud, True)], ignore_index=True)
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)
    return df[FEATURE_COLUMNS + ["Class"]]


def load_dataset():
    if os.path.exists(DATASET_PATH):
        print(f"[data] Loading real dataset from {DATASET_PATH}")
        df = pd.read_csv(DATASET_PATH)
        source = "creditcard.csv"
    else:
        print("[data] dataset/creditcard.csv not found.")
        print("[data] Generating a synthetic schema-compatible dataset for a demo run.")
        print("[data] Place the real Kaggle creditcard.csv in dataset/ and re-run for real training.")
        df = generate_synthetic_dataset()
        source = "synthetic"
    return df, source


def preprocess(df):
    print("\n=== STEP 1: DATA PREPROCESSING ===")
    print("Shape:", df.shape)
    print("Dtypes:\n", df.dtypes.value_counts())
    print("Missing values:", int(df.isnull().sum().sum()))
    dup_count = int(df.duplicated().sum())
    print("Duplicate rows:", dup_count)
    if dup_count:
        df = df.drop_duplicates()
        print("Duplicates removed. New shape:", df.shape)

    fraud_pct = df["Class"].mean() * 100
    print(f"Fraud percentage: {fraud_pct:.4f}%")
    print("Summary statistics (Amount):\n", df["Amount"].describe())

    X = df[FEATURE_COLUMNS]
    y = df["Class"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    if HAS_SMOTE:
        print("Applying SMOTE to balance training data...")
        sm = SMOTE(random_state=42)
        X_train_scaled, y_train = sm.fit_resample(X_train_scaled, y_train)
        print("Post-SMOTE training shape:", X_train_scaled.shape)
    else:
        print("imbalanced-learn not installed; skipping SMOTE (class_weight='balanced' used instead).")

    joblib.dump(scaler, os.path.join(MODELS_DIR, "scaler.pkl"))
    return X_train_scaled, X_test_scaled, y_train, y_test


def train_all_models(X_train, X_test, y_train, y_test):
    print("\n=== STEP 2: MODEL TRAINING & COMPARISON ===")
    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000, class_weight="balanced"),
        "Decision Tree": DecisionTreeClassifier(max_depth=10, class_weight="balanced", random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=200, class_weight="balanced", random_state=42, n_jobs=-1),
        "Support Vector Machine": SVC(probability=True, class_weight="balanced", random_state=42),
        "KNN": KNeighborsClassifier(n_neighbors=5),
        "Gaussian Naive Bayes": GaussianNB(),
    }

    results = {}
    for name, model in models.items():
        t0 = time.time()
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)[:, 1] if hasattr(model, "predict_proba") else y_pred

        metrics = {
            "accuracy": float(accuracy_score(y_test, y_pred)),
            "precision": float(precision_score(y_test, y_pred, zero_division=0)),
            "recall": float(recall_score(y_test, y_pred, zero_division=0)),
            "f1_score": float(f1_score(y_test, y_pred, zero_division=0)),
            "roc_auc": float(roc_auc_score(y_test, y_proba)),
            "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
            "classification_report": classification_report(y_test, y_pred, zero_division=0, output_dict=True),
            "train_time_seconds": round(time.time() - t0, 2),
        }
        results[name] = metrics
        print(f"\n[{name}] trained in {metrics['train_time_seconds']}s")
        print(f"  Accuracy={metrics['accuracy']:.4f} Precision={metrics['precision']:.4f} "
              f"Recall={metrics['recall']:.4f} F1={metrics['f1_score']:.4f} ROC-AUC={metrics['roc_auc']:.4f}")

        joblib.dump(model, os.path.join(MODELS_DIR, f"model_{name.replace(' ', '_').lower()}.pkl"))

    return models, results


def select_best_model(models, results):
    # Best model = highest F1 score (good balance for imbalanced fraud data)
    best_name = max(results, key=lambda k: results[k]["f1_score"])
    best_model = models[best_name]
    print(f"\n=== BEST MODEL SELECTED: {best_name} (F1={results[best_name]['f1_score']:.4f}) ===")
    joblib.dump(best_model, os.path.join(MODELS_DIR, "model.pkl"))
    return best_name


def main():
    df, source = load_dataset()
    X_train, X_test, y_train, y_test = preprocess(df)
    models, results = train_all_models(X_train, X_test, y_train, y_test)
    best_name = select_best_model(models, results)

    metrics_out = {
        "dataset_source": source,
        "best_model": best_name,
        "results": results,
        "feature_columns": FEATURE_COLUMNS,
    }
    with open(os.path.join(MODELS_DIR, "metrics.json"), "w") as f:
        json.dump(metrics_out, f, indent=2)

    print(f"\nSaved model.pkl, scaler.pkl and metrics.json to {MODELS_DIR}")
    print("Done.")


if __name__ == "__main__":
    main()
