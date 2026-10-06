from django.conf import settings
from django.db import models


class Prediction(models.Model):
    RISK_LEVELS = [
        ("LOW", "Low"),
        ("MEDIUM", "Medium"),
        ("HIGH", "High"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="predictions")
    amount = models.FloatField()
    time_value = models.FloatField(default=0)
    features_json = models.TextField(help_text="JSON list of V1-V28 feature values used for this prediction")
    is_fraud = models.BooleanField(default=False)
    probability = models.FloatField(help_text="Predicted probability of fraud (0-1)")
    risk_level = models.CharField(max_length=10, choices=RISK_LEVELS, default="LOW")
    model_used = models.CharField(max_length=100, default="model.pkl")
    source = models.CharField(max_length=20, default="manual", help_text="manual or csv_upload")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Prediction #{self.pk} - {'FRAUD' if self.is_fraud else 'LEGIT'} (${self.amount})"


class UploadedFile(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="uploads")
    original_filename = models.CharField(max_length=255)
    file = models.FileField(upload_to="uploads/")
    result_file = models.FileField(upload_to="results/", blank=True, null=True)
    total_rows = models.IntegerField(default=0)
    fraud_count = models.IntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return self.original_filename
