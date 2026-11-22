from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .middleware.rate_limiter import RateLimitMiddleware
from .routers import repository, chat, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

# Add application middlewares first
app.add_middleware(RateLimitMiddleware)

# Add CORSMiddleware LAST so it becomes the OUTERMOST layer in the Starlette stack.
# This ensures that ALL responses (including errors and 429s) get CORS headers attached.
if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth.router)
app.include_router(repository.router)
app.include_router(chat.router)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": f"{settings.app_name} is running",
        "environment": settings.environment,
    }


@app.get("/health")
def health_check() -> dict[str, str]:
    """
    Production health check endpoint for uptime monitoring.
    """
    return {"status": "ok", "environment": settings.environment}



if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=settings.debug)
