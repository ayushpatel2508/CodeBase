from pydantic import BaseModel, Field
from typing import Optional


class RegisterRequest(BaseModel):
    username: str
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    password: str = Field(..., min_length=8, max_length=24)


class LoginRequest(BaseModel):
    email: str
    password: str


class GithubAuthRequest(BaseModel):
    access_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    avatar_url: Optional[str] = None

class RefreshRequest(BaseModel):
    refresh_token: str
