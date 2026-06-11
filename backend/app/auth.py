"""Single-user authentication via a shared application token.

Accepted in two ways:
  - Header: Authorization: Bearer <token>
  - Query param: ?token=<token>  (required for EventSource SSE and audio URLs
    loaded by wavesurfer, which cannot carry custom headers)

Timing-safe comparison via secrets.compare_digest.
"""

from __future__ import annotations

import secrets

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import settings

# Paths exempt from authentication (health check polled by tunnel/monitoring).
_PUBLIC_PATHS = {"/api/health"}


class TokenAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Auth disabled when no token is configured (local dev).
        if not settings.app_auth_token:
            return await call_next(request)

        # CORS preflight is handled upstream by CORSMiddleware.
        if request.method == "OPTIONS":
            return await call_next(request)

        if request.url.path in _PUBLIC_PATHS:
            return await call_next(request)

        provided = self._extract_token(request)
        if not provided or not secrets.compare_digest(provided, settings.app_auth_token):
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)

        return await call_next(request)

    @staticmethod
    def _extract_token(request: Request) -> str | None:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            return header[len("Bearer "):].strip()
        return request.query_params.get("token")
