import json
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.csrf import csrf_exempt

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


# JSON API Endpoints
@csrf_exempt
def api_login(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    
    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else request.POST
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()
    except Exception:
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "").strip()

    user = authenticate(request, username=username, password=password)
    if user is not None:
        login(request, user)
        return JsonResponse({
            "authenticated": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email or f"{user.username}@fraudwatch.ai",
                "name": user.get_full_name() or "Dr. Aris Thorne",
                "role": "Principal Analyst" if user.is_staff else "Security Analyst",
                "clearance": "Level 4 Clearance" if user.is_staff else "Level 2 Clearance"
            }
        })
    else:
        return JsonResponse({
            "authenticated": False,
            "error": "Invalid credentials. Please check your username/password."
        }, status=401)


@csrf_exempt
def api_logout(request):
    logout(request)
    return JsonResponse({"authenticated": False, "message": "Logged out successfully"})


def api_user(request):
    if request.user.is_authenticated:
        user = request.user
        return JsonResponse({
            "authenticated": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email or f"{user.username}@fraudwatch.ai",
                "name": user.get_full_name() or "Dr. Aris Thorne",
                "role": "Principal Analyst" if user.is_staff else "Security Analyst",
                "clearance": "Level 4 Clearance" if user.is_staff else "Level 2 Clearance"
            }
        })
    else:
        return JsonResponse({
            "authenticated": False,
            "user": {
                "username": "Guest Analyst",
                "email": "analyst@fraudwatch.ai",
                "name": "Dr. Aris Thorne",
                "role": "Principal Analyst",
                "clearance": "Level 4 Clearance"
            }
        })
