"""Small helpers shared by the JSON API views."""
import json
from functools import wraps

from django.http import JsonResponse


def api_login_required(view):
    """Like @login_required, but answers 401 JSON instead of redirecting to the login page."""
    @wraps(view)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Authentication required"}, status=401)
        return view(request, *args, **kwargs)
    return wrapper


def require_method(*methods):
    def decorator(view):
        @wraps(view)
        def wrapper(request, *args, **kwargs):
            if request.method not in methods:
                return JsonResponse({"error": f"{' or '.join(methods)} required"}, status=405)
            return view(request, *args, **kwargs)
        return wrapper
    return decorator


def json_body(request):
    """Parse a JSON request body, falling back to form data."""
    if request.body and request.content_type == "application/json":
        try:
            return json.loads(request.body.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return {}
    return request.POST
