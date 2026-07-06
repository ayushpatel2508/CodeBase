from __future__ import annotations

from dataclasses import dataclass, field
import os
from dotenv import load_dotenv

# Find the root .env file (two folders up from app/config.py)
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(os.path.dirname(current_dir))
env_path = os.path.join(root_dir, ".env")

# Load the environment variables from the file into os.environ
load_dotenv(dotenv_path=env_path)

def _get_bool(name: str, default: bool = False) -> bool:
	value = os.getenv(name)
	if value is None:
		return default
	return value.strip().lower() in {"1", "true", "yes", "on"}


def _get_int(name: str, default: int) -> int:
	value = os.getenv(name)
	if value is None or value.strip() == "":
		return default
	return int(value)


def _get_list(name: str, default: list[str]) -> list[str]:
	value = os.getenv(name)
	if value is None or value.strip() == "":
		return default
	return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(slots=True)
class Settings:
	app_name: str = "Codebase RAG"
	environment: str = "development"
	debug: bool = False
	host: str = "0.0.0.0"
	port: int = 8000
	database_url: str = ""
	redis_url: str = ""
	secret_key: str = "change-me"
	encryption_key: str = ""
	github_client_id: str = ""
	github_client_secret: str = ""
	github_redirect_uri: str = "http://localhost:8000/auth/github/callback"
	frontend_url: str = "http://localhost:3000"
	cors_origins: list[str] = field(default_factory=lambda: ["http://localhost:3000"])
	vector_dimension: int = 1536
	openai_api_key: str = ""


def load_settings() -> Settings:
	database_url = os.getenv("DATABASE_URL")
	redis_url = os.getenv("REDIS_URL")
	openai_api_key = os.getenv("OPENAI_API_KEY")
	github_token = os.getenv("GITHUB_TOKEN")

	# Fail loudly if critical environment variables are missing
	missing_vars = []
	if not database_url:
		missing_vars.append("DATABASE_URL")
	if not redis_url:
		missing_vars.append("REDIS_URL")
	if not openai_api_key:
		missing_vars.append("OPENAI_API_KEY")
	if not github_token:
		missing_vars.append("GITHUB_TOKEN")

	if missing_vars:
		raise ValueError(f"CRITICAL: Missing required environment variables on startup: {', '.join(missing_vars)}")

	environment = os.getenv("APP_ENV", "development")
	secret_key = os.getenv("SECRET_KEY")
	
	if environment == "production" and not secret_key:
		raise ValueError("CRITICAL: SECRET_KEY environment variable is missing in production!")

	return Settings(
		app_name=os.getenv("APP_NAME", "Codebase RAG"),
		environment=environment,
		debug=_get_bool("DEBUG", False),
		host=os.getenv("HOST", "0.0.0.0"),
		port=_get_int("PORT", 8000),
		database_url=database_url,
		redis_url=redis_url,
		secret_key=secret_key or "change-me",
		encryption_key=os.getenv("ENCRYPTION_KEY", ""),
		github_client_id=os.getenv("GITHUB_CLIENT_ID", ""),
		github_client_secret=os.getenv("GITHUB_CLIENT_SECRET", ""),
		github_redirect_uri=os.getenv(
			"GITHUB_REDIRECT_URI",
			"http://localhost:8000/auth/github/callback",
		),
		frontend_url=os.getenv("FRONTEND_URL", "http://localhost:3000"),
		cors_origins=_get_list("CORS_ORIGINS", ["http://localhost:3000"]),
		vector_dimension=_get_int("VECTOR_DIMENSION", 1536),
		openai_api_key=openai_api_key,
	)


settings = load_settings()

