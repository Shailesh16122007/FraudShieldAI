from django.contrib import admin
from .models import Prediction, UploadedFile


@admin.register(Prediction)
class PredictionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "amount", "is_fraud", "probability", "risk_level", "source", "created_at")
    list_filter = ("is_fraud", "risk_level", "source")
    search_fields = ("user__username",)


@admin.register(UploadedFile)
class UploadedFileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "original_filename", "total_rows", "fraud_count", "uploaded_at")
