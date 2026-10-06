from django.urls import path
from . import views

app_name = "prediction"

urlpatterns = [
    path("predict/", views.predict_view, name="predict"),
    path("history/", views.history_view, name="history"),
    path("history/<int:pk>/delete/", views.delete_prediction, name="delete_prediction"),
    path("upload/", views.upload_view, name="upload"),
    path("upload/<int:pk>/", views.upload_result_view, name="upload_result"),
    path("upload/<int:pk>/download/", views.download_result, name="download_result"),

    # JSON REST APIs
    path("api/predict/", views.api_predict, name="api_predict"),
    path("api/sample/", views.api_sample, name="api_sample"),
    path("api/upload/", views.api_upload, name="api_upload"),
    path("api/history/", views.api_history, name="api_history"),
    path("api/history/clear/", views.api_clear_history, name="api_clear_history"),
    path("api/history/<int:pk>/", views.api_prediction_detail, name="api_prediction_detail"),
    path("api/history/<int:pk>/flag/", views.api_toggle_flag, name="api_toggle_flag"),
    path("api/history/<int:pk>/delete/", views.api_delete_prediction, name="api_delete_prediction"),
    path("api/export-csv/", views.api_export_csv, name="api_export_csv"),
]
