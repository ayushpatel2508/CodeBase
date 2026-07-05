import json
import requests
import re
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.redis_client import get_redis_client
from app.models.repository import Repository
from app.models.user_repo import UserRepo
from app.models.user import User
from app.models.chat import ChatMessage
from app.schemas.repository import RepoSubmitRequest, RepoSubmitResponse, RepoStatusResponse, VerifyRepoResponse, RepoListResponse, RepoRenameRequest
from app.routers.auth import get_current_user

from rq import Queue
from app.worker.ingestion import process_job

router = APIRouter(prefix="/repo", tags=["Repository"])

@router.post("/submit", response_model=RepoSubmitResponse)
def submit_repository(request: RepoSubmitRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Standardize github URL
    github_url = request.github_url.strip().rstrip("/")
    if github_url.endswith(".git"):
        github_url = github_url[:-4]
        
    # Pre-check size limit before adding to DB or Redis
    pattern = re.compile(r"^https?://(www\.)?github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)/?$")
    match = pattern.match(github_url)
    if not match:
        raise HTTPException(status_code=400, detail="Invalid GitHub URL format.")
        
    owner = match.group(2)
    repo = match.group(3)
    
    try:
        response = requests.get(f"https://api.github.com/repos/{owner}/{repo}", timeout=5)
        if response.status_code == 200:
            size_kb = response.json().get("size", 0)
            if size_kb > 50000: # 50MB limit
                raise HTTPException(status_code=400, detail=f"Repository exceeds the 50MB size limit (Size: {size_kb // 1024}MB).")
        elif response.status_code == 404:
            raise HTTPException(status_code=404, detail="Repository not found or is private.")
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to connect to GitHub API.")
        
    # Universal Deduplication check
    existing_repo = db.query(Repository).filter(Repository.github_url == github_url).first()
    
    if existing_repo:
        # Link user to repo if not already linked
        user_repo = db.query(UserRepo).filter(UserRepo.user_id == current_user.id, UserRepo.repo_id == existing_repo.id).first()
        if not user_repo:
            new_user_repo = UserRepo(user_id=current_user.id, repo_id=existing_repo.id, chat_name=request.chat_name)
            db.add(new_user_repo)
            db.commit()
        elif request.chat_name and user_repo.chat_name != request.chat_name:
            user_repo.chat_name = request.chat_name
            db.commit()
            
        if existing_repo.status == "failed":
            existing_repo.status = "queued"
            db.commit()
            
            redis_client = get_redis_client()
            q = Queue("repo_jobs", connection=redis_client)
            q.enqueue(
                process_job,
                repo_id=str(existing_repo.id),
                github_url=github_url,
                user_id=str(current_user.id),
                job_timeout="1h"
            )
            
            return RepoSubmitResponse(
                repo_id=str(existing_repo.id),
                status="queued",
                message="Repository was requeued because it failed previously."
            )

        return RepoSubmitResponse(
            repo_id=str(existing_repo.id),
            status=existing_repo.status,
            message="Repository already exists." if existing_repo.status == "completed" else "Repository is already being processed."
        )
        
    # Create new repository
    new_repo = Repository(name=github_url.split("/")[-1], github_url=github_url, status="queued")
    db.add(new_repo)
    db.commit()
    db.refresh(new_repo)
    
    # Link user
    new_user_repo = UserRepo(user_id=current_user.id, repo_id=new_repo.id, chat_name=request.chat_name)
    db.add(new_user_repo)
    db.commit()
    
    # Push job to RQ
    redis_client = get_redis_client()
    q = Queue("repo_jobs", connection=redis_client)
    q.enqueue(
        process_job,
        repo_id=str(new_repo.id),
        github_url=github_url,
        user_id=str(current_user.id),
        job_timeout="1h"
    )
    
    return RepoSubmitResponse(
        repo_id=str(new_repo.id),
        status="queued",
        message="Repository submitted for processing."
    )

@router.get("/status/{repo_id}", response_model=RepoStatusResponse)
def get_repository_status(repo_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    return RepoStatusResponse(
        id=str(repo.id),
        status=repo.status,
        total_files=repo.total_files,
        total_chunks=repo.total_chunks,
        error_message=repo.error_message,
        github_url=repo.github_url
    )

@router.get(
    "/list",
    responses={200: {"model": RepoListResponse}}
)
def list_user_repositories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_repos = db.query(UserRepo).filter(UserRepo.user_id == current_user.id).all()
    user_repo_map = {ur.repo_id: ur.chat_name for ur in user_repos}
    
    repo_ids = list(user_repo_map.keys())
    repos = db.query(Repository).filter(Repository.id.in_(repo_ids)).all()
    
    response_data = RepoListResponse(
        repos=[
            RepoStatusResponse(
                id=str(r.id),
                status=r.status,
                total_files=r.total_files,
                total_chunks=r.total_chunks,
                error_message=r.error_message,
                chat_name=user_repo_map.get(r.id),
                github_url=r.github_url
            ) for r in repos
        ]
    )
    return Response(content=response_data.model_dump_json(), media_type="application/json")

@router.patch("/{repo_id}")
def rename_repository(repo_id: str, request: RepoRenameRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_repo = db.query(UserRepo).filter(UserRepo.user_id == current_user.id, UserRepo.repo_id == repo_id).first()
    if not user_repo:
        raise HTTPException(status_code=404, detail="Repository not found for user")
        
    user_repo.chat_name = request.chat_name
    db.commit()
    return {"status": "success"}

@router.delete("/{repo_id}")
def delete_repository_link(repo_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_repo = db.query(UserRepo).filter(UserRepo.user_id == current_user.id, UserRepo.repo_id == repo_id).first()
    if not user_repo:
        raise HTTPException(status_code=404, detail="Repository not found for user")
        
    repo_uuid = user_repo.repo_id
    db.delete(user_repo)
    
    # Cascade delete ChatMessages for this user and repo
    db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id, ChatMessage.repo_id == repo_uuid).delete()
    
    db.commit()
    
    # Clear Redis chat history cache
    redis_client = get_redis_client()
    redis_client.delete(f"chat_history:user:{current_user.id}:repo:{repo_id}")
    
    return {"status": "success"}

@router.post("/{repo_id}/sync")
def sync_repository(repo_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_repo = db.query(UserRepo).filter(UserRepo.user_id == current_user.id, UserRepo.repo_id == repo_id).first()
    if not user_repo:
        raise HTTPException(status_code=404, detail="Repository not found for user")
        
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    if repo.status in ["queued", "cloning", "parsing", "embedding"]:
        raise HTTPException(status_code=400, detail="Repository is already syncing or processing.")
        
    repo.status = "queued"
    db.commit()
    
    redis_client = get_redis_client()
    q = Queue("repo_jobs", connection=redis_client)
    q.enqueue(
        process_job,
        repo_id=str(repo.id),
        github_url=repo.github_url,
        user_id=str(current_user.id),
        job_timeout="1h"
    )
    
    return {"status": "success", "message": "Repository sync queued"}

@router.get("/verify", response_model=VerifyRepoResponse)
def verify_repository(github_url: str = Query(...)):
    github_url = github_url.strip().rstrip("/")
    if github_url.endswith(".git"):
        github_url = github_url[:-4]
        
    pattern = re.compile(r"^https?://(www\.)?github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)/?$")
    match = pattern.match(github_url)
    if not match:
        return VerifyRepoResponse(valid=False, error="Invalid GitHub URL format.")
        
    owner = match.group(2)
    repo = match.group(3)
    
    try:
        # Standard GitHub API call
        response = requests.get(f"https://api.github.com/repos/{owner}/{repo}", timeout=5)
        if response.status_code == 200:
            data = response.json()
            size_kb = data.get("size", 0)
            if size_kb > 50000:
                return VerifyRepoResponse(valid=False, error=f"Repository exceeds the 50MB size limit (Size: {size_kb // 1024}MB).")
            return VerifyRepoResponse(valid=True)
        elif response.status_code == 404:
            return VerifyRepoResponse(valid=False, error="Repository not found or is private.")
        else:
            return VerifyRepoResponse(valid=False, error=f"GitHub API error: {response.status_code}")
    except Exception as e:
        return VerifyRepoResponse(valid=False, error="Failed to connect to GitHub API.")
