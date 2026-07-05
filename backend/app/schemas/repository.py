from pydantic import BaseModel, HttpUrl
from typing import Optional
import uuid

class RepoSubmitRequest(BaseModel):
    github_url: str
    chat_name: Optional[str] = None

class RepoSubmitResponse(BaseModel):
    repo_id: str
    status: str
    message: str

class RepoStatusResponse(BaseModel):
    id: str
    status: str
    total_files: int
    total_chunks: int
    error_message: Optional[str] = None
    chat_name: Optional[str] = None
    github_url: Optional[str] = None

class RepoRenameRequest(BaseModel):
    chat_name: str

class VerifyRepoResponse(BaseModel):
    valid: bool
    error: Optional[str] = None

class RepoListResponse(BaseModel):
    repos: list[RepoStatusResponse]
