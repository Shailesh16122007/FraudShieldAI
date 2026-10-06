import datetime
import json
import os
import subprocess
import sys

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncDate
from django.http import JsonResponse
from django.shortcuts import render
from django.utils import timezone

from fraudshield.api_utils import api_login_required, require_method
from prediction.ml_engine import reload_model
from prediction.models import Prediction
from prediction.views import serialize_prediction


def _load_metrics_json():
    path = os.path.join(settings.ML_MODELS_DIR, "metrics.json")
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def _model_rows(metrics_data):
    if not metrics_data:
        return []
    best = metrics_data.get("best_model")
    rows = [
        {
            "name": name,
            "accuracy": round(m["accuracy"] * 100, 2),
            "precision": round(m["precision"] * 100, 2),
            "recall": round(m["recall"] * 100, 2),
            "f1_score": round(m["f1_score"] * 100, 2),
            "roc_auc": round(m["roc_auc"] * 100, 2),
            "confusion_matrix": m.get("confusion_matrix"),
            "train_time_seconds": m.get("train_time_seconds"),
            "is_best": name == best,
        }
        for name, m in metrics_data.get("results", {}).items()
    ]
    rows.sort(key=lambda r: r["f1_score"], reverse=True)
    return rows


def _model_info():
    metrics_data = _load_metrics_json()
    rows = _model_rows(metrics_data)
    best = next((r for r in rows if r["is_best"]), None)
    model_path = os.path.join(settings.ML_MODELS_DIR, "model.pkl")
    trained_at = None
    if os.path.exists(model_path):
        trained_at = datetime.datetime.fromtimestamp(os.path.getmtime(model_path), tz=datetime.timezone.utc).isoformat()
    return {
        "available": metrics_data is not None,
        "best_model": metrics_data.get("best_model") if metrics_data else None,
        "dataset_source": metrics_data.get("dataset_source") if metrics_data else None,
        "feature_count": len(metrics_data.get("feature_columns", [])) if metrics_data else 0,
        "trained_at": trained_at,
        "best": best,
        "models": rows,
    }


def _totals(qs):
    # Several small queries, each answered from an index, are much faster on a large
    # SQLite table than one aggregate with conditional counts (which scans every row).
    total = qs.count()
    fraud_agg = qs.filter(is_fraud=True).aggregate(n=Count("id"), amount=Sum("amount"))
    fraud = fraud_agg["n"] or 0
    risk_counts = dict(qs.values_list("risk_level").annotate(n=Count("id")).order_by())
    avg_amount = qs.aggregate(v=Avg("amount"))["v"] or 0.0
    high = risk_counts.get("HIGH", 0)
    medium = risk_counts.get("MEDIUM", 0)
    return {
        "total": total,
        "fraud": fraud,
        "legit": total - fraud,
        "fraud_percentage": round(fraud / total * 100, 2) if total else 0.0,
        "high_risk": high,
        "medium_risk": medium,
        "low_risk": total - high - medium,
        "flagged": qs.filter(flagged=True).count(),
        "avg_amount": round(avg_amount, 2),
        "fraud_amount": round(fraud_agg["amount"] or 0.0, 2),
    }


def _trend(qs, period):
    """Prediction volume per bucket. period: 'daily' (14 days), 'weekly' (8 weeks), 'monthly' (6 months)."""
    today = timezone.localdate()
    if period == "weekly":
        start = today - datetime.timedelta(days=today.weekday() + 7 * 7)
        buckets = [start + datetime.timedelta(weeks=i) for i in range(8)]
        key = lambda d: d - datetime.timedelta(days=d.weekday())
        label = lambda d: d.strftime("%b %d")
    elif period == "monthly":
        first = today.replace(day=1)
        buckets = []
        for i in range(5, -1, -1):
            y, m = first.year, first.month - i
            while m <= 0:
                y, m = y - 1, m + 12
            buckets.append(datetime.date(y, m, 1))
        start = buckets[0]
        key = lambda d: d.replace(day=1)
        label = lambda d: d.strftime("%b %Y")
    else:
        start = today - datetime.timedelta(days=13)
        buckets = [start + datetime.timedelta(days=i) for i in range(14)]
        key = lambda d: d
        label = lambda d: d.strftime("%b %d")

    start_dt = timezone.make_aware(datetime.datetime.combine(start, datetime.time.min))
    daily = (
        qs.filter(created_at__gte=start_dt)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(total=Count("id"), fraud=Count("id", filter=Q(is_fraud=True)))
        .order_by()
    )
    totals = {b: 0 for b in buckets}
    frauds = {b: 0 for b in buckets}
    for row in daily:
        b = key(row["day"])
        if b in totals:
            totals[b] += row["total"]
            frauds[b] += row["fraud"]
    return {
        "period": period,
        "labels": [label(b) for b in buckets],
        "total": [totals[b] for b in buckets],
        "fraud": [frauds[b] for b in buckets],
    }


def _insight(qs, totals):
    """A short, data-driven observation for the analytics page."""
    if totals["total"] == 0:
        return {
            "title": "No predictions yet",
            "message": "Run a manual prediction or upload a CSV of transactions to start building analytics.",
            "action": "predict",
            "action_label": "Go to Predict",
        }
    week_ago = timezone.now() - datetime.timedelta(days=7)
    recent = _totals(qs.filter(created_at__gte=week_ago))
    unreviewed_high = qs.filter(risk_level="HIGH").exclude(flagged=True).count()
    if recent["total"]:
        msg = (
            f"In the last 7 days {recent['total']:,} transactions were screened and "
            f"{recent['fraud']:,} ({recent['fraud_percentage']}%) were predicted as fraud. "
        )
    else:
        msg = "No transactions were screened in the last 7 days. "
    msg += f"{unreviewed_high:,} high-risk transactions have not been flagged for review yet."
    return {
        "title": "Insight from your data",
        "message": msg,
        "action": "history-high",
        "action_label": "Review high-risk",
    }


@login_required
def analytics_view(request):
    predictions = Prediction.objects.filter(user=request.user)
    totals = _totals(predictions)
    info = _model_info()
    trend = _trend(predictions, "daily")
    context = {
        "total_predictions": totals["total"],
        "fraud_count": totals["fraud"],
        "legit_count": totals["legit"],
        "best_model_name": info["best_model"],
        "best_accuracy": info["best"]["accuracy"] if info["best"] else None,
        "model_rows": info["models"],
        "recent_predictions": predictions[:10],
        "trend_labels_json": json.dumps(trend["labels"]),
        "trend_total_json": json.dumps(trend["total"]),
        "trend_fraud_json": json.dumps(trend["fraud"]),
    }
    return render(request, "analytics/analytics.html", context)


@api_login_required
def api_dashboard(request):
    qs = Prediction.objects.filter(user=request.user)
    period = request.GET.get("period", "daily")
    alerts = qs.filter(risk_level="HIGH")[:5]
    return JsonResponse({
        "totals": _totals(qs),
        "trend": _trend(qs, period if period in {"daily", "weekly", "monthly"} else "daily"),
        "alerts": [serialize_prediction(p) for p in alerts],
        "recent": [serialize_prediction(p) for p in qs[:6]],
        "model": _model_info(),
    })


@api_login_required
def api_analytics(request):
    qs = Prediction.objects.filter(user=request.user)
    period = request.GET.get("period", "daily")
    totals = _totals(qs)
    return JsonResponse({
        "totals": totals,
        "trend": _trend(qs, period if period in {"daily", "weekly", "monthly"} else "daily"),
        "insight": _insight(qs, totals),
        "model": _model_info(),
    })


@api_login_required
def api_notifications(request):
    qs = Prediction.objects.filter(user=request.user, risk_level="HIGH")
    return JsonResponse({"results": [serialize_prediction(p) for p in qs[:8]]})


@api_login_required
@require_method("POST")
def api_train(request):
    script = os.path.join(settings.BASE_DIR, "ml", "train.py")
    try:
        result = subprocess.run([sys.executable, script], capture_output=True, text=True, timeout=1800)
    except subprocess.TimeoutExpired:
        return JsonResponse({"error": "Training took longer than 30 minutes and was stopped."}, status=500)
    if result.returncode != 0:
        return JsonResponse({"error": "Training failed.", "log": result.stderr[-4000:]}, status=500)

    reload_model()
    return JsonResponse({
        "status": "success",
        "model": _model_info(),
        "log_tail": result.stdout[-3000:],
    })
