from pydantic import BaseModel, Field

class ChatQueryRequest(BaseModel):
    repo_id: str
    query: str = Field(..., min_length=1, max_length=2000, description="User question about the codebase")

class ChatQueryResponse(BaseModel):
    answer: str
    cached: bool

class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: str

class ChatHistoryResponse(BaseModel):
    messages: list[ChatMessageResponse]
