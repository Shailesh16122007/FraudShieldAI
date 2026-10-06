"""
Simple CORS middleware for FraudShield AI backend to allow cross-origin requests from frontend dev server.
"""

class CorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            from django.http import HttpResponse
            response = HttpResponse()
            return self._add_cors_headers(request, response)
        
        response = self.get_response(request)
        return self._add_cors_headers(request, response)

    def _add_cors_headers(self, request, response):
        origin = request.headers.get("Origin", "*")
        response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, X-CSRFToken, Authorization, X-Requested-With"
        response["Access-Control-Allow-Credentials"] = "true"
        return response
