"""
Loads the trained scaler.pkl and model.pkl once (module-level cache) and
exposes a simple predict() function used by the prediction views.
"""
import os
import numpy as np
import joblib
from django.conf import settings

_model = None
_scaler = None
_feature_columns = ["Time"] + [f"V{i}" for i in range(1, 29)] + ["Amount"]


class ModelNotTrainedError(Exception):
    pass


def _load():
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


def get_feature_columns():
    return list(_feature_columns)


def risk_level_from_probability(prob):
    if prob >= 0.7:
        return "HIGH"
    if prob >= 0.3:
        return "MEDIUM"
    return "LOW"


def predict_single(feature_dict):
    """feature_dict: {"Time": .., "V1": .., ..., "V28": .., "Amount": ..}
    Returns (is_fraud: bool, probability: float, risk_level: str)
    """
    import pandas as pd
    model, scaler = _load()
    row = pd.DataFrame([[feature_dict.get(col, 0.0) for col in _feature_columns]], columns=_feature_columns)
    row_scaled = scaler.transform(row)
    pred = model.predict(row_scaled)[0]
    if hasattr(model, "predict_proba"):
        prob = model.predict_proba(row_scaled)[0][1]
    else:
        prob = float(pred)
    return bool(pred), float(prob), risk_level_from_probability(float(prob))


def predict_batch(df):
    """df: pandas DataFrame containing at least the feature columns.
    Returns DataFrame with added Prediction, Probability, Risk_Level columns.
    """
    model, scaler = _load()
    for col in _feature_columns:
        if col not in df.columns:
            df[col] = 0.0
    X = df[_feature_columns]
    X_scaled = scaler.transform(X)
    preds = model.predict(X_scaled)
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(X_scaled)[:, 1]
    else:
        probs = preds.astype(float)

    df = df.copy()
    df["Prediction"] = np.where(preds == 1, "Fraud", "Legitimate")
    df["Probability"] = probs
    df["Risk_Level"] = [risk_level_from_probability(p) for p in probs]
    return df
