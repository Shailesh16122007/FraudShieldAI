from django.contrib.auth.decorators import login_required
from django.shortcuts import render

from prediction.models import Prediction


@login_required
def home_view(request):
    predictions = Prediction.objects.filter(user=request.user)
    context = {
        "total_predictions": predictions.count(),
        "fraud_count": predictions.filter(is_fraud=True).count(),
        "legit_count": predictions.filter(is_fraud=False).count(),
        "recent_predictions": predictions[:5],
    }
    return render(request, "dashboard/home.html", context)
