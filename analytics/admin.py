from django.contrib import admin
from .models import ModelMetric

@admin.register(ModelMetric)
class ModelMetricAdmin(admin.ModelAdmin):
    list_display = ("model_name", "accuracy", "precision", "recall", "f1_score", "roc_auc", "is_best", "trained_at")
