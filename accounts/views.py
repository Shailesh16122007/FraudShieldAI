from django.contrib import messages
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.forms import PasswordChangeForm
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.csrf import ensure_csrf_cookie

from fraudshield.api_utils import api_login_required, json_body, require_method

from .forms import StyledAuthenticationForm


def login_view(request):
    if request.user.is_authenticated:
        return redirect("dashboard:home")

    if request.method == "POST":
        form = StyledAuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = authenticate(
                request,
                username=form.cleaned_data["username"],
                password=form.cleaned_data["password"],
            )
            if user is not None:
                login(request, user)
                return redirect("dashboard:home")
        messages.error(request, "Invalid username or password.")
    else:
        form = StyledAuthenticationForm()
    return render(request, "accounts/login.html", {"form": form})


def logout_view(request):
    logout(request)
    return redirect("accounts:login")


# ---------------------------------------------------------------------
# JSON API endpoints used by the frontend
# ---------------------------------------------------------------------

def serialize_user(user):
    full_name = user.get_full_name()
    return {
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "name": full_name or user.username,
        "role": "Administrator" if user.is_staff else "Analyst",
        "is_staff": user.is_staff,
        "date_joined": user.date_joined.isoformat(),
        "last_login": user.last_login.isoformat() if user.last_login else None,
    }


@ensure_csrf_cookie
def api_user(request):
    """Returns the logged-in user. Also sets the CSRF cookie the frontend needs for POSTs."""
    if request.user.is_authenticated:
        return JsonResponse({"authenticated": True, "user": serialize_user(request.user)})
    return JsonResponse({"authenticated": False, "user": None})


@require_method("POST")
def api_login(request):
    data = json_body(request)
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))

    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse(
            {"authenticated": False, "error": "Invalid username or password."},
            status=401,
        )
    login(request, user)
    return JsonResponse({"authenticated": True, "user": serialize_user(user)})


@require_method("POST")
def api_logout(request):
    logout(request)
    return JsonResponse({"authenticated": False})


@api_login_required
@require_method("POST")
def api_update_profile(request):
    data = json_body(request)
    user = request.user
    user.first_name = str(data.get("first_name", user.first_name)).strip()[:150]
    user.last_name = str(data.get("last_name", user.last_name)).strip()[:150]
    email = str(data.get("email", user.email)).strip()
    if email and "@" not in email:
        return JsonResponse({"error": "Enter a valid email address."}, status=400)
    user.email = email[:254]
    user.save(update_fields=["first_name", "last_name", "email"])
    return JsonResponse({"user": serialize_user(user)})


@api_login_required
@require_method("POST")
def api_change_password(request):
    data = json_body(request)
    form = PasswordChangeForm(request.user, {
        "old_password": data.get("old_password", ""),
        "new_password1": data.get("new_password1", ""),
        "new_password2": data.get("new_password2", ""),
    })
    if not form.is_valid():
        errors = [e for field_errors in form.errors.values() for e in field_errors]
        return JsonResponse({"error": " ".join(errors)}, status=400)
    user = form.save()
    update_session_auth_hash(request, user)
    return JsonResponse({"success": True})
