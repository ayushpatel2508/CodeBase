import time
import math
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response, JSONResponse

from app.redis_client import get_redis_client


# ─── Rate Limit Configuration ───
# Format: { route_prefix: (max_requests, window_seconds) }
RATE_LIMITS: dict[str, tuple[int, int]] = {
    "/auth/login":     (5, 60),      # 5 login attempts per minute
    "/auth/register":  (3, 60),      # 3 registrations per minute
    "/repo/verify":    (15, 60),     # 15 URL verifications per minute
    "/repo/submit":    (5, 60),      # 5 repo submissions per minute
    "/chat/":          (20, 60),     # 20 chat messages per minute
}

# Global fallback for any route not explicitly listed
DEFAULT_RATE_LIMIT = (60, 60)  # 60 requests per minute


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _get_rate_limit(path: str) -> tuple[int, int]:
    for prefix, limit in RATE_LIMITS.items():
        if path.startswith(prefix):
            return limit
    return DEFAULT_RATE_LIMIT


def _check_rate_limit(client_ip: str, path: str, max_requests: int, window_seconds: int) -> tuple[bool, int, int]:

    redis = get_redis_client()
    now = time.time()
    
    current_window = math.floor(now / window_seconds)
    previous_window = current_window - 1
    
    elapsed_in_window = (now % window_seconds) / window_seconds
    
    key_current = f"rl:{client_ip}:{path}:{current_window}"
    key_previous = f"rl:{client_ip}:{path}:{previous_window}"
    
    pipe = redis.pipeline()
    pipe.get(key_current)
    pipe.get(key_previous)
    results = pipe.execute()
    
    current_count = int(results[0] or 0)
    previous_count = int(results[1] or 0)
    
    overlap_weight = 1.0 - elapsed_in_window
    weighted_count = (previous_count * overlap_weight) + current_count
    
    if weighted_count >= max_requests:
        retry_after = int(window_seconds - (now % window_seconds)) + 1
        remaining = 0
        return False, remaining, retry_after
    
    # Request is allowed — increment the current window counter
    pipe = redis.pipeline()
    pipe.incr(key_current)
    # Set TTL to 2x window so the "previous window" key is still around
    # when the next window needs it for the weighted calculation
    pipe.expire(key_current, window_seconds * 2)
    pipe.execute()
    
    remaining = max(0, int(max_requests - weighted_count - 1))
    return True, remaining, 0


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware that applies sliding window rate limiting
    to all incoming requests using Redis counters.
    """
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Skip rate limiting for health checks and docs
        path = request.url.path
        if path in ("/", "/health", "/docs", "/openapi.json", "/redoc"):
            return await call_next(request)
        
        client_ip = _get_client_ip(request)
        max_requests, window_seconds = _get_rate_limit(path)
        
        is_allowed, remaining, retry_after = _check_rate_limit(
            client_ip, path, max_requests, window_seconds
        )
        
        if not is_allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please slow down.",
                    "retry_after": retry_after,
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                },
            )
        
        # Proceed with the request and attach rate limit headers
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
