from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.generic import RedirectView

FRONTEND_INDEX = settings.FRONTEND_DIST_DIR / "index.html"


@ensure_csrf_cookie
def frontend_app(request):
    """Serves the built frontend (frontend/dist) so the whole app runs from `manage.py runserver`.
    Falls back to the classic template UI when the frontend has not been built yet."""
    if FRONTEND_INDEX.exists():
        return HttpResponse(FRONTEND_INDEX.read_text(encoding="utf-8"))
    return RedirectView.as_view(pattern_name="dashboard:home", permanent=False)(request)


urlpatterns = [
    path("admin/", admin.site.urls),
    path("", frontend_app, name="frontend"),
    path("favicon.ico", lambda request: HttpResponse(status=204)),
    path("accounts/", include("accounts.urls")),
    path("dashboard/", include("dashboard.urls")),
    path("prediction/", include("prediction.urls")),
    path("analytics/", include("analytics.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
