from pydantic import BaseModel

class ChatQueryRequest(BaseModel):
    repo_id: str
    query: str

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
