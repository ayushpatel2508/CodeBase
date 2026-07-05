import logging
from app.redis_client import get_redis_client

logger = logging.getLogger(__name__)

def get_cached_query(repo_id: str, query: str) -> str | None:
    """
    Check Redis for an exact-match cached answer.
    """
    try:
        redis_client = get_redis_client()
        # Create a unique key for this exact repository and question
        key = f"repo:{repo_id}:query:{query.strip()}"
        cached_answer = redis_client.get(key)
        
        if cached_answer:
            logger.info(f"Cache HIT for query: '{query}'")
            return cached_answer
            
        logger.info(f"Cache MISS for query: '{query}'")
        return None
    except Exception as e:
        logger.error(f"Redis Cache Error (Get): {e}")
        return None

def set_cached_query(repo_id: str, query: str, answer: str, expire_seconds: int = 86400):
    """
    Save the LLM's answer to Redis with an expiration (default 24 hours).
    """
    try:
        redis_client = get_redis_client()
        key = f"repo:{repo_id}:query:{query.strip()}"
        # setex saves the string and automatically deletes it after expire_seconds
        redis_client.setex(key, expire_seconds, answer)
    except Exception as e:
        logger.error(f"Redis Cache Error (Set): {e}")
