from django.db import models


class ModelMetric(models.Model):
    """Stores trained model comparison metrics (loaded from ml/models/metrics.json)."""
    model_name = models.CharField(max_length=100)
    accuracy = models.FloatField()
    precision = models.FloatField()
    recall = models.FloatField()
    f1_score = models.FloatField()
    roc_auc = models.FloatField()
    is_best = models.BooleanField(default=False)
    trained_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-f1_score"]

    def __str__(self):
        return f"{self.model_name} (F1={self.f1_score:.3f})"
