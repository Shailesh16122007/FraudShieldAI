"""
Loads the trained scaler.pkl and model.pkl once (module-level cache) and
exposes predict_single() / predict_batch() used by the prediction views.

The fraud label is derived from the fraud probability (>= 0.5) so that the
label and the risk level shown in the UI can never contradict each other.
"""
import os

import joblib
import numpy as np
import pandas as pd
from django.conf import settings

FRAUD_THRESHOLD = 0.5
HIGH_RISK_THRESHOLD = 0.7
MEDIUM_RISK_THRESHOLD = 0.3

_model = None
_scaler = None
_feature_columns = ["Time"] + [f"V{i}" for i in range(1, 29)] + ["Amount"]


class ModelNotTrainedError(Exception):
    pass


def load_model():
    global _model, _scaler
    if _model is None or _scaler is None:
        model_path = os.path.join(settings.ML_MODELS_DIR, "model.pkl")
        scaler_path = os.path.join(settings.ML_MODELS_DIR, "scaler.pkl")
        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            raise ModelNotTrainedError(
                "model.pkl / scaler.pkl not found. Run `python ml/train.py` first."
            )
        _model = joblib.load(model_path)
        _scaler = joblib.load(scaler_path)
    return _model, _scaler


def reload_model():
    """Drop the cached model so the next prediction loads freshly trained files."""
    global _model, _scaler
    _model = None
    _scaler = None


def get_feature_columns():
    return list(_feature_columns)


def risk_level_from_probability(prob):
    if prob >= HIGH_RISK_THRESHOLD:
        return "HIGH"
    if prob >= MEDIUM_RISK_THRESHOLD:
        return "MEDIUM"
    return "LOW"


def _fraud_probabilities(model, X_scaled):
    if hasattr(model, "predict_proba"):
        return model.predict_proba(X_scaled)[:, 1]
    return model.predict(X_scaled).astype(float)


def predict_single(feature_dict):
    """feature_dict: {"Time": .., "V1": .., ..., "V28": .., "Amount": ..}
    Returns (is_fraud: bool, probability: float, risk_level: str)
    """
    model, scaler = load_model()
    row = pd.DataFrame([[float(feature_dict.get(col, 0.0)) for col in _feature_columns]], columns=_feature_columns)
    prob = float(_fraud_probabilities(model, scaler.transform(row))[0])
    return prob >= FRAUD_THRESHOLD, prob, risk_level_from_probability(prob)


def predict_batch(df):
    """df: pandas DataFrame containing the feature columns (missing ones default to 0).
    Returns a copy with added Prediction, Probability, Risk_Level columns.
    """
    model, scaler = load_model()
    df = df.copy()
    for col in _feature_columns:
        if col not in df.columns:
            df[col] = 0.0
    X = df[_feature_columns].apply(pd.to_numeric, errors="coerce").fillna(0.0)
    probs = _fraud_probabilities(model, scaler.transform(X))

    df["Prediction"] = np.where(probs >= FRAUD_THRESHOLD, "Fraud", "Legitimate")
    df["Probability"] = probs
    df["Risk_Level"] = np.select(
        [probs >= HIGH_RISK_THRESHOLD, probs >= MEDIUM_RISK_THRESHOLD],
        ["HIGH", "MEDIUM"],
        default="LOW",
    )
    return df
