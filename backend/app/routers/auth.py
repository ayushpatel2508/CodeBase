import logging

import requests
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    GithubAuthRequest,
    LoginRequest,
    RegisterRequest,
    RefreshRequest,
    TokenResponse,
)
from app.services.auth_helper import (
    create_access_token,
    create_refresh_token,
    decode_jwt_token,
    hash_password,
    verify_password,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

security = HTTPBearer()



def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:

    token = credentials.credentials
    payload = decode_jwt_token(token)

    if payload is None or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user



@router.post("/register", response_model=TokenResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    # Check if username is already taken
    existing_username = db.query(User).filter(User.username == request.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    # Check if email is already registered
    existing_email = db.query(User).filter(User.email == request.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    hashed = hash_password(request.password)
    new_user = User(
        username=request.username,
        email=request.email,
        password_hash=hashed,
        github_id=None,
        avatar_url=None,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(str(new_user.id), new_user.username)
    refresh_token = create_refresh_token(str(new_user.id))
    logger.info(f"New user registered: {new_user.username}")

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=str(new_user.id),
        username=new_user.username,
        avatar_url=new_user.avatar_url,
    )



@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",  
        )

    access_token = create_access_token(str(user.id), user.username)
    refresh_token = create_refresh_token(str(user.id))
    logger.info(f"User logged in: {user.username}")

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=str(user.id),
        username=user.username,
        avatar_url=user.avatar_url,
    )



@router.post("/github", response_model=TokenResponse)
def github_auth(request: GithubAuthRequest, db: Session = Depends(get_db)):
    github_response = requests.get(
        "https://api.github.com/user",
        headers={
            "Authorization": f"Bearer {request.access_token}",
            "Accept": "application/vnd.github+json",
        },
        timeout=10,
    )

    if github_response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid GitHub access token",
        )

    github_user = github_response.json()
    github_id = str(github_user["id"])
    username = github_user.get("login", "github_user")
    avatar_url = github_user.get("avatar_url", "")

    user = db.query(User).filter(User.github_id == github_id).first()

    if user:
        user.username = username
        user.avatar_url = avatar_url
        db.commit()
    else:
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            existing.github_id = github_id
            existing.avatar_url = avatar_url
            db.commit()
            user = existing
        else:
            user = User(
                github_id=github_id,
                username=username,
                avatar_url=avatar_url,
                password_hash=None,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    access_token = create_access_token(str(user.id), user.username)
    refresh_token = create_refresh_token(str(user.id))
    logger.info(f"GitHub user authenticated: {user.username}")

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=str(user.id),
        username=user.username,
        avatar_url=user.avatar_url,
    )

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(request: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_jwt_token(request.refresh_token)
    
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # Generate new tokens (rotating the refresh token as well for extra security)
    new_access_token = create_access_token(str(user.id), user.username)
    new_refresh_token = create_refresh_token(str(user.id))
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        user_id=str(user.id),
        username=user.username,
        avatar_url=user.avatar_url,
    )
