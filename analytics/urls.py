from django.urls import path
from . import views

app_name = "analytics"

urlpatterns = [
    path("", views.analytics_view, name="analytics"),
    path("api/analytics/", views.api_analytics, name="api_analytics"),
    path("api/dashboard/", views.api_dashboard, name="api_dashboard"),
    path("api/notifications/", views.api_notifications, name="api_notifications"),
    path("api/train/", views.api_train, name="api_train"),
]
