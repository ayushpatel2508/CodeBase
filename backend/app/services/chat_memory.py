import json
import logging
from app.redis_client import get_redis_client

logger = logging.getLogger(__name__)

def _get_session_key(user_id: str, repo_id: str) -> str:
    return f"chat_history:user:{user_id}:repo:{repo_id}"

def get_chat_history(user_id: str, repo_id: str, limit: int = 10) -> list[dict]:
    
    try:
        redis_client = get_redis_client()
        key = _get_session_key(user_id, repo_id)
        
        # Redis LRANGE gets items from start to stop.
        # To get the last 'limit' items, we can use -limit to -1
        # Example: if limit is 10, getting the last 10 elements is LRANGE key -10 -1
        raw_messages = redis_client.lrange(key, -limit, -1)
        
        if not raw_messages:
            return []
            
        messages = [json.loads(msg) for msg in raw_messages]
        return messages
    except Exception as e:
        logger.error(f"Redis Chat Memory Error (Get): {e}")
        return []

def add_messages_to_history(user_id: str, repo_id: str, user_query: str, ai_response: str, ttl_seconds: int = 86400, limit: int = 10):
    """
    Append a user query and the AI's response to the Redis list, trim old messages, and reset the expiration timer.
    """
    try:
        redis_client = get_redis_client()
        key = _get_session_key(user_id, repo_id)
        
        user_msg = json.dumps({"role": "user", "content": user_query})
        ai_msg = json.dumps({"role": "assistant", "content": ai_response})
        
        # RPUSH appends to the end of the list
        redis_client.rpush(key, user_msg, ai_msg)
        
        # LTRIM ensures we ONLY keep the latest `limit` messages (deleting the oldest ones)
        redis_client.ltrim(key, -limit, -1)
        
        # Reset the expiration so the session stays alive as long as they keep chatting
        redis_client.expire(key, ttl_seconds)
    except Exception as e:
        logger.error(f"Redis Chat Memory Error (Set): {e}")
