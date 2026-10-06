from django.urls import path
from . import views

app_name = "analytics"

urlpatterns = [
    path("", views.analytics_view, name="analytics"),
    path("api/analytics/", views.api_analytics, name="api_analytics"),
    path("api/train/", views.api_train, name="api_train"),
]
