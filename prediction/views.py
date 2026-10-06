import csv
import io
import json
import random
import time

import pandas as pd
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.files.base import ContentFile
from django.db import connection
from django.http import FileResponse, JsonResponse, StreamingHttpResponse
from django.shortcuts import get_object_or_404, redirect, render

from fraudshield.api_utils import api_login_required, json_body, require_method

from .forms import CSVUploadForm, ManualPredictionForm
from .ml_engine import ModelNotTrainedError, get_feature_columns, load_model, predict_batch, predict_single
from .models import Prediction, UploadedFile

FEATURE_COLUMNS = get_feature_columns()
MAX_UPLOAD_BYTES = 200 * 1024 * 1024


def _save_batch(user, result_df, csv_file):
    """Stores one Prediction per row plus an UploadedFile with a downloadable results CSV."""
    fraud_count = int((result_df["Prediction"] == "Fraud").sum())
    uploaded = UploadedFile.objects.create(
        user=user,
        original_filename=csv_file.name,
        file=csv_file,
        total_rows=len(result_df),
        fraud_count=fraud_count,
    )

    features_df = result_df[FEATURE_COLUMNS].apply(pd.to_numeric, errors="coerce").fillna(0.0)
    bulk = [
        Prediction(
            user=user,
            amount=float(features["Amount"]),
            time_value=float(features["Time"]),
            features_json=json.dumps(features),
            is_fraud=label == "Fraud",
            probability=float(prob),
            risk_level=risk,
            source="csv_upload",
        )
        for features, label, prob, risk in zip(
            features_df.to_dict("records"),
            result_df["Prediction"],
            result_df["Probability"],
            result_df["Risk_Level"],
        )
    ]
    Prediction.objects.bulk_create(bulk, batch_size=2000)

    csv_buffer = io.StringIO()
    result_df.to_csv(csv_buffer, index=False)
    uploaded.result_file.save(
        f"results_{uploaded.id}.csv",
        ContentFile(csv_buffer.getvalue().encode("utf-8")),
        save=True,
    )
    return uploaded


# ---------------------------------------------------------------------
# Server-rendered pages (classic Django template UI)
# ---------------------------------------------------------------------

@login_required
def predict_view(request):
    result = None
    if request.method == "POST":
        form = ManualPredictionForm(request.POST)
        if form.is_valid():
            features = {
                "Time": form.cleaned_data["time_value"],
                "Amount": form.cleaned_data["amount"],
            }
            for i, v in enumerate(form.cleaned_data["advanced_features"], start=1):
                features[f"V{i}"] = v

            try:
                is_fraud, probability, risk_level = predict_single(features)
            except ModelNotTrainedError as e:
                messages.error(request, str(e))
                return render(request, "prediction/predict.html", {"form": form})

            result = Prediction.objects.create(
                user=request.user,
                amount=form.cleaned_data["amount"],
                time_value=form.cleaned_data["time_value"],
                features_json=json.dumps(features),
                is_fraud=is_fraud,
                probability=probability,
                risk_level=risk_level,
                source="manual",
            )
    else:
        form = ManualPredictionForm()

    return render(request, "prediction/predict.html", {"form": form, "result": result})


@login_required
def history_view(request):
    predictions = Prediction.objects.filter(user=request.user)

    search = request.GET.get("q", "").strip()
    risk_filter = request.GET.get("risk", "").strip()
    outcome_filter = request.GET.get("outcome", "").strip()

    if search:
        try:
            amt = float(search)
            predictions = predictions.filter(amount=amt)
        except ValueError:
            pass
    if risk_filter in {"LOW", "MEDIUM", "HIGH"}:
        predictions = predictions.filter(risk_level=risk_filter)
    if outcome_filter == "fraud":
        predictions = predictions.filter(is_fraud=True)
    elif outcome_filter == "legit":
        predictions = predictions.filter(is_fraud=False)

    return render(request, "prediction/history.html", {
        "predictions": predictions[:500],
        "search": search,
        "risk_filter": risk_filter,
        "outcome_filter": outcome_filter,
    })


@login_required
def delete_prediction(request, pk):
    pred = get_object_or_404(Prediction, pk=pk, user=request.user)
    if request.method == "POST":
        pred.delete()
        messages.success(request, "Prediction deleted.")
    return redirect("prediction:history")


@login_required
def upload_view(request):
    if request.method == "POST":
        form = CSVUploadForm(request.POST, request.FILES)
        if form.is_valid():
            csv_file = form.cleaned_data["csv_file"]
            try:
                df = pd.read_csv(csv_file)
            except Exception as e:
                messages.error(request, f"Could not read CSV: {e}")
                return render(request, "prediction/upload.html", {"form": form})

            try:
                result_df = predict_batch(df)
            except ModelNotTrainedError as e:
                messages.error(request, str(e))
                return render(request, "prediction/upload.html", {"form": form})

            uploaded = _save_batch(request.user, result_df, csv_file)
            messages.success(
                request,
                f"Processed {uploaded.total_rows} transactions - {uploaded.fraud_count} flagged as fraud.",
            )
            return redirect("prediction:upload_result", pk=uploaded.pk)
    else:
        form = CSVUploadForm()

    recent_uploads = UploadedFile.objects.filter(user=request.user)[:10]
    return render(request, "prediction/upload.html", {"form": form, "recent_uploads": recent_uploads})


@login_required
def upload_result_view(request, pk):
    uploaded = get_object_or_404(UploadedFile, pk=pk, user=request.user)
    preview_rows = []
    if uploaded.result_file:
        try:
            df = pd.read_csv(uploaded.result_file.path, nrows=50)
            preview_rows = df.to_dict("records")
        except Exception:
            preview_rows = []
    return render(request, "prediction/upload_result.html", {
        "uploaded": uploaded,
        "preview_rows": preview_rows,
    })


@login_required
def download_result(request, pk):
    uploaded = get_object_or_404(UploadedFile, pk=pk, user=request.user)
    if not uploaded.result_file:
        messages.error(request, "No result file available.")
        return redirect("prediction:upload")
    return FileResponse(
        open(uploaded.result_file.path, "rb"),
        as_attachment=True,
        filename=f"fraud_predictions_{uploaded.pk}.csv",
    )


# ---------------------------------------------------------------------
# JSON API endpoints used by the frontend
# ---------------------------------------------------------------------

def serialize_prediction(p, include_features=False):
    data = {
        "id": p.id,
        "transaction_id": p.transaction_code,
        "merchant": p.merchant or "",
        "amount": round(p.amount, 2),
        "time_value": p.time_value,
        "is_fraud": p.is_fraud,
        "prediction": "Fraud" if p.is_fraud else "Legitimate",
        "probability": round(p.probability * 100, 2),
        "risk_level": p.risk_level,
        "flagged": bool(p.flagged),
        "source": p.source,
        "created_at": p.created_at.isoformat(),
    }
    if include_features:
        try:
            data["features"] = json.loads(p.features_json)
        except (TypeError, ValueError):
            data["features"] = {}
    return data


def _parse_float(value, field):
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ValueError(f"'{field}' must be a number.")


@api_login_required
@require_method("POST")
def api_predict(request):
    payload = json_body(request)
    try:
        amount = _parse_float(payload.get("amount", payload.get("Amount", 0)), "amount")
        time_val = _parse_float(payload.get("time_value", payload.get("Time", 0)), "time_value")
        if amount < 0:
            raise ValueError("'amount' cannot be negative.")
        features = {"Time": time_val, "Amount": amount}
        for i in range(1, 29):
            features[f"V{i}"] = _parse_float(payload.get(f"V{i}", 0.0), f"V{i}")
    except ValueError as e:
        return JsonResponse({"error": str(e)}, status=400)

    merchant = str(payload.get("merchant", "")).strip()[:100]

    try:
        load_model()  # so the timing below measures inference only, not the first model load
        started = time.perf_counter()
        is_fraud, probability, risk_level = predict_single(features)
        latency_ms = (time.perf_counter() - started) * 1000
    except ModelNotTrainedError as e:
        return JsonResponse({"error": str(e)}, status=503)

    pred = Prediction.objects.create(
        user=request.user,
        amount=amount,
        time_value=time_val,
        features_json=json.dumps(features),
        is_fraud=is_fraud,
        probability=probability,
        risk_level=risk_level,
        source="manual",
        merchant=merchant or None,
    )
    data = serialize_prediction(pred)
    data["latency_ms"] = round(latency_ms, 1)
    return JsonResponse(data)


@api_login_required
def api_sample(request):
    """Returns the features of a random past transaction (fraud or legitimate) so the
    manual form can be filled with realistic V1-V28 values."""
    kind = request.GET.get("kind", "legit")
    qs = Prediction.objects.filter(user=request.user, is_fraud=(kind == "fraud"))
    bounds = qs.order_by("id").values_list("id", flat=True)
    first_id = bounds.first()
    if first_id is None:
        return JsonResponse({"error": f"No {'fraudulent' if kind == 'fraud' else 'legitimate'} transactions in your history yet. Upload a CSV first."}, status=404)
    last_id = qs.order_by("-id").values_list("id", flat=True).first()
    pick = qs.filter(id__gte=random.randint(first_id, last_id)).order_by("id").first() or qs.first()
    try:
        features = json.loads(pick.features_json)
    except (TypeError, ValueError):
        features = {}
    return JsonResponse({"source_id": pick.id, "features": features})


@api_login_required
@require_method("POST")
def api_upload(request):
    csv_file = request.FILES.get("csv_file") or request.FILES.get("file")
    if csv_file is None:
        return JsonResponse({"error": "No CSV file was provided."}, status=400)
    if not csv_file.name.lower().endswith(".csv"):
        return JsonResponse({"error": "Please upload a .csv file."}, status=400)
    if csv_file.size > MAX_UPLOAD_BYTES:
        return JsonResponse({"error": "File is larger than 200 MB."}, status=400)

    try:
        df = pd.read_csv(csv_file)
    except Exception as e:
        return JsonResponse({"error": f"Could not read CSV file: {e}"}, status=400)
    if df.empty:
        return JsonResponse({"error": "The CSV file has no rows."}, status=400)
    if "Amount" not in df.columns:
        return JsonResponse({"error": "CSV must contain the columns Time, V1-V28 and Amount."}, status=400)
    missing = [c for c in FEATURE_COLUMNS if c not in df.columns]

    started = time.perf_counter()
    try:
        result_df = predict_batch(df)
    except ModelNotTrainedError as e:
        return JsonResponse({"error": str(e)}, status=503)
    inference_ms = (time.perf_counter() - started) * 1000

    csv_file.seek(0)
    uploaded = _save_batch(request.user, result_df, csv_file)
    total = uploaded.total_rows
    fraud = uploaded.fraud_count

    head = result_df.head(50)
    amounts = pd.to_numeric(head["Amount"], errors="coerce").fillna(0.0)
    preview = [
        {
            "row": i + 1,
            "amount": round(float(amount), 2),
            "prediction": label,
            "is_fraud": label == "Fraud",
            "probability": round(float(prob) * 100, 2),
            "risk_level": risk,
        }
        for i, (amount, label, prob, risk) in enumerate(
            zip(amounts, head["Prediction"], head["Probability"], head["Risk_Level"])
        )
    ]

    return JsonResponse({
        "upload_id": uploaded.id,
        "filename": uploaded.original_filename,
        "total_rows": total,
        "fraud_count": fraud,
        "legit_count": total - fraud,
        "fraud_percentage": round(fraud / total * 100, 2) if total else 0,
        "high_risk_count": int((result_df["Risk_Level"] == "HIGH").sum()),
        "medium_risk_count": int((result_df["Risk_Level"] == "MEDIUM").sum()),
        "inference_ms": round(inference_ms, 1),
        "missing_columns": missing,
        "download_url": f"/prediction/upload/{uploaded.id}/download/",
        "preview": preview,
    })


def _filtered_history(request):
    qs = Prediction.objects.filter(user=request.user)
    search = request.GET.get("q", "").strip()
    risk = request.GET.get("risk", "").strip().upper()
    outcome = request.GET.get("outcome", "").strip().lower()
    flagged = request.GET.get("flagged", "").strip().lower()
    source = request.GET.get("source", "").strip().lower()

    if search:
        upper = search.upper().lstrip("#")
        if upper.startswith("TRX"):
            # Transaction code, e.g. "TRX-000123"
            digits = upper[3:].lstrip("-")
            qs = qs.filter(id=int(digits)) if digits.isdigit() else qs.none()
        else:
            try:
                qs = qs.filter(amount=float(search.replace("$", "").replace(",", "")))
            except ValueError:
                qs = qs.filter(merchant__icontains=search)
    if risk in {"LOW", "MEDIUM", "HIGH"}:
        qs = qs.filter(risk_level=risk)
    if outcome == "fraud":
        qs = qs.filter(is_fraud=True)
    elif outcome in {"legit", "legitimate"}:
        qs = qs.filter(is_fraud=False)
    if flagged in {"1", "true", "yes"}:
        qs = qs.filter(flagged=True)
    if source in {"manual", "csv_upload", "api"}:
        qs = qs.filter(source=source)
    return qs


@api_login_required
def api_history(request):
    qs = _filtered_history(request)
    try:
        page = max(int(request.GET.get("page", 1)), 1)
        page_size = min(max(int(request.GET.get("page_size", 10)), 1), 100)
    except ValueError:
        page, page_size = 1, 10

    total_count = qs.count()
    total_pages = max((total_count + page_size - 1) // page_size, 1)
    page = min(page, total_pages)
    start = (page - 1) * page_size
    results = [serialize_prediction(p) for p in qs[start:start + page_size]]

    return JsonResponse({
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "total_count": total_count,
        "results": results,
    })


@api_login_required
def api_prediction_detail(request, pk):
    pred = get_object_or_404(Prediction, pk=pk, user=request.user)
    return JsonResponse(serialize_prediction(pred, include_features=True))


@api_login_required
@require_method("POST")
def api_toggle_flag(request, pk):
    pred = get_object_or_404(Prediction, pk=pk, user=request.user)
    data = json_body(request)
    pred.flagged = bool(data["flagged"]) if "flagged" in data else not pred.flagged
    pred.save(update_fields=["flagged"])
    return JsonResponse({"id": pred.id, "flagged": pred.flagged})


@api_login_required
@require_method("POST", "DELETE")
def api_delete_prediction(request, pk):
    pred = get_object_or_404(Prediction, pk=pk, user=request.user)
    pred.delete()
    return JsonResponse({"success": True, "id": pk})


@api_login_required
@require_method("POST")
def api_clear_history(request):
    deleted, _ = Prediction.objects.filter(user=request.user).delete()
    UploadedFile.objects.filter(user=request.user).delete()
    if connection.vendor == "sqlite" and deleted >= 100_000:
        # Give the freed space back to the operating system (slow, so only after big deletes).
        with connection.cursor() as cursor:
            cursor.execute("VACUUM")
    return JsonResponse({"success": True, "deleted": deleted})


class _Echo:
    def write(self, value):
        return value


@api_login_required
def api_export_csv(request):
    qs = _filtered_history(request).only(
        "id", "created_at", "merchant", "amount", "is_fraud", "probability", "risk_level", "flagged", "source"
    )
    writer = csv.writer(_Echo())

    def rows():
        yield writer.writerow([
            "Transaction ID", "Date & Time (UTC)", "Merchant", "Amount ($)", "Prediction",
            "Fraud Probability (%)", "Risk Level", "Flagged", "Source",
        ])
        for p in qs.iterator(chunk_size=5000):
            yield writer.writerow([
                p.transaction_code,
                p.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                p.merchant or "",
                f"{p.amount:.2f}",
                "Fraud" if p.is_fraud else "Legitimate",
                f"{p.probability * 100:.2f}",
                p.risk_level,
                "Yes" if p.flagged else "No",
                p.source,
            ])

    response = StreamingHttpResponse(rows(), content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="fraudshield_predictions.csv"'
    return response
