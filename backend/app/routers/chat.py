import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from fastapi.responses import StreamingResponse, Response
import json

from app.database import get_db
from app.models.repository import Repository
from app.models.user import User
from app.models.chat import ChatMessage
from app.schemas.chat import ChatQueryRequest, ChatQueryResponse, ChatHistoryResponse, ChatMessageResponse
from app.services.rag import stream_repository_query
from app.routers.auth import get_current_user
from app.services.cache import get_redis_client
from app.services.chat_memory import clear_chat_memory

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("/query")
async def query_codebase(request: Request, body: ChatQueryRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Main endpoint for answering user questions about a specific codebase.
    """
    repo = db.query(Repository).filter(Repository.id == body.repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    if repo.status != "completed":
        raise HTTPException(status_code=400, detail="Repository is still processing or has failed.")

    async def event_generator():
        user_msg = ChatMessage(repo_id=repo.id, user_id=current_user.id, role="user", content=body.query)
        db.add(user_msg)
        db.commit()
        
        full_answer = ""
        try:
            async for item in stream_repository_query(db, body.repo_id, body.query, current_user, request):
                if isinstance(item, dict):
                    if item.get("type") == "chunk":
                        text = item.get("text", "")
                        full_answer += text
                        yield f"data: {json.dumps({'chunk': text})}\n\n"
                    elif item.get("type") == "status":
                        yield f"data: {json.dumps({'status': item.get('message', '')})}\n\n"
                else:
                    # Fallback for plain strings
                    full_answer += item
                    yield f"data: {json.dumps({'chunk': item})}\n\n"
        except Exception as e:
            logger.error(f"Streaming Error: {e}")
            yield f"data: {json.dumps({'error': 'Error during streaming'})}\n\n"
            
        # Send closing event
        yield "data: [DONE]\n\n"
        
        if full_answer and not await request.is_disconnected():
            ai_msg = ChatMessage(repo_id=repo.id, user_id=current_user.id, role="assistant", content=full_answer)
            db.add(ai_msg)
            db.commit()
            
            # Write-Through Cache Append
            try:
                redis_client = get_redis_client()
                cache_key = f"api:history:user:{current_user.id}:repo:{body.repo_id}"
                cached_data = redis_client.get(cache_key)
                if cached_data:
                    data = json.loads(cached_data)
                    data["messages"].append({
                        "id": str(user_msg.id),
                        "role": user_msg.role,
                        "content": user_msg.content,
                        "created_at": user_msg.created_at.isoformat()
                    })
                    data["messages"].append({
                        "id": str(ai_msg.id),
                        "role": ai_msg.role,
                        "content": ai_msg.content,
                        "created_at": ai_msg.created_at.isoformat()
                    })
                    redis_client.setex(cache_key, 600, json.dumps(data))
            except Exception as e:
                logger.error(f"Failed to append to Redis cache: {e}")

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get(
    "/history/{repo_id}",
    responses={200: {"model": ChatHistoryResponse}}
)
def get_chat_history(repo_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    redis_client = get_redis_client()
    cache_key = f"api:history:user:{current_user.id}:repo:{repo_id}"
    
    try:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            logger.info(f"CACHE HIT: Chat history for repo {repo_id}")
            return Response(content=cached_data, media_type="application/json")
        else:
            logger.info(f"CACHE MISS: Chat history for repo {repo_id} not found in Redis.")
    except Exception as e:
        logger.error(f"Redis get failed: {e}")

    messages = db.query(ChatMessage).filter(
        ChatMessage.repo_id == repo_id,
        ChatMessage.user_id == current_user.id
    ).order_by(ChatMessage.created_at.asc()).all()
    
    response_data = ChatHistoryResponse(
        messages=[
            ChatMessageResponse(
                id=str(msg.id),
                role=msg.role,
                content=msg.content,
                created_at=msg.created_at.isoformat()
            ) for msg in messages
        ]
    )
    
    json_data = response_data.model_dump_json()
    try:
        redis_client.setex(cache_key, 600, json_data)
    except Exception as e:
        logger.error(f"Redis set failed: {e}")
        
    return Response(content=json_data, media_type="application/json")

@router.delete("/history/{repo_id}")
def clear_chat_history(repo_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    try:
        db.query(ChatMessage).filter(
            ChatMessage.repo_id == repo_id,
            ChatMessage.user_id == current_user.id
        ).delete()
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to clear chat history: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred during deletion.")
    
    clear_chat_memory(db, str(current_user.id), repo_id)
    redis_client = get_redis_client()
    redis_client.delete(f"api:history:user:{current_user.id}:repo:{repo_id}")
    
    return {"status": "success", "message": "Chat history cleared"}

@router.get("/tree/{repo_id}")
def get_parsed_tree(repo_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    redis_client = get_redis_client()
    cache_key = f"api:tree:repo:{repo_id}"
    #cache hit
    try:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            logger.info(f"CACHE HIT: Tree for repo {repo_id}")
            return Response(content=cached_data, media_type="application/json")
        else:
            logger.info(f"CACHE MISS: Tree for repo {repo_id} not found in Redis.")
    except Exception as e:
        logger.error(f"Redis get failed: {e}")

    # cache miss
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    tree_json = json.dumps({"tree": repo.parsed_tree or []})
    
    # save to redis
    try:
        redis_client.setex(cache_key, 3600, tree_json)
    except Exception as e:
        logger.error(f"Redis set failed: {e}")
        
    return Response(
        content=tree_json,
        media_type="application/json"
    )
