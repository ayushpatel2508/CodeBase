import json
import logging
from typing import Optional
from openai import AsyncOpenAI
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.chat import ChatMessage
from app.models.user_repo import UserRepo
from app.redis_client import get_redis_client

logger = logging.getLogger(__name__)

# Fast OpenAI client for background summarization
client = AsyncOpenAI(api_key=settings.openai_api_key)

# Number of exact recent messages to keep in prompt (2 full turns: user -> assistant -> user -> assistant)
RAW_HISTORY_LIMIT = 4

# Redis TTL: 7 days
TTL_SECONDS = 86400 * 7


def _get_history_key(user_id: str, repo_id: str) -> str:
    return f"chat_history:user:{user_id}:repo:{repo_id}"


def _get_summary_key(user_id: str, repo_id: str) -> str:
    return f"chat_summary:user:{user_id}:repo:{repo_id}"


def get_chat_memory(db: Optional[Session], user_id: str, repo_id: str) -> tuple[Optional[str], list[dict]]:
    """
    Retrieves conversational memory: (summary, recent_messages).
    
    1. Summary: Checked in Redis first (1ms). On cache miss / eviction,
       falls back to PostgreSQL `user_repos.summary` and re-warms Redis.
    2. Recent Messages: Fetched from Redis (last RAW_HISTORY_LIMIT messages).
       On Redis miss/restart, recovers the last N messages from PostgreSQL `chat_messages`.
    """
    summary: Optional[str] = None
    messages: list[dict] = []
    
    history_key = _get_history_key(user_id, repo_id)
    summary_key = _get_summary_key(user_id, repo_id)
    
    try:
        redis_client = get_redis_client()
        
        # ── 1. Fetch Rolling Summary ──
        cached_summary = redis_client.get(summary_key)
        if cached_summary:
            summary = cached_summary
        elif db is not None:
            # Cache miss / evicted in Redis -> Fetch from Postgres
            user_repo = db.query(UserRepo).filter(
                UserRepo.user_id == user_id,
                UserRepo.repo_id == repo_id
            ).first()
            if user_repo and user_repo.summary:
                summary = user_repo.summary
                redis_client.setex(summary_key, TTL_SECONDS, summary)
                logger.info(f"Summary cache miss restored from Postgres for repo {repo_id}")

        # ── 2. Fetch Recent Raw Messages ──
        raw_messages = redis_client.lrange(history_key, -RAW_HISTORY_LIMIT, -1)
        if raw_messages:
            messages = [json.loads(m) for m in raw_messages]
        elif db is not None:
            # Redis list was empty/evicted -> Recover last N messages from Postgres
            past_msgs = (
                db.query(ChatMessage)
                .filter(ChatMessage.user_id == user_id, ChatMessage.repo_id == repo_id)
                .order_by(ChatMessage.created_at.desc())
                .limit(RAW_HISTORY_LIMIT)
                .all()
            )
            if past_msgs:
                past_msgs.reverse()
                messages = [{"role": m.role, "content": m.content} for m in past_msgs]
                for m in messages:
                    redis_client.rpush(history_key, json.dumps(m))
                redis_client.expire(history_key, TTL_SECONDS)
                logger.info(f"Raw history restored from Postgres for repo {repo_id}")

    except Exception as e:
        logger.error(f"Error fetching chat memory for user {user_id}, repo {repo_id}: {e}")

    return summary, messages


async def update_chat_memory_async(user_id: str, repo_id: str, user_query: str, ai_response: str):
    """
    Asynchronous background task run AFTER response is streamed to the user:
    1. Appends new user + assistant turn to Redis raw history.
    2. If total messages > RAW_HISTORY_LIMIT:
       - Extracts the older overflow messages.
       - Asks gpt-4o-mini to incrementally update the rolling summary.
       - Write-Through: Saves updated summary to both Redis and PostgreSQL.
       - Trims Redis raw history to RAW_HISTORY_LIMIT.
    """
    history_key = _get_history_key(user_id, repo_id)
    summary_key = _get_summary_key(user_id, repo_id)
    
    try:
        redis_client = get_redis_client()
        
        # 1. Append user & assistant messages
        user_msg = json.dumps({"role": "user", "content": user_query})
        ai_msg = json.dumps({"role": "assistant", "content": ai_response})
        redis_client.rpush(history_key, user_msg, ai_msg)
        redis_client.expire(history_key, TTL_SECONDS)
        
        total_msgs = redis_client.llen(history_key)
        
        # 2. Check if we have overflow beyond the raw limit
        if total_msgs > RAW_HISTORY_LIMIT:
            num_overflow = total_msgs - RAW_HISTORY_LIMIT
            overflow_raw = redis_client.lrange(history_key, 0, num_overflow - 1)
            overflow_msgs = [json.loads(m) for m in overflow_raw]
            
            existing_summary = redis_client.get(summary_key) or ""
            
            # Format the overflow messages for summarization (truncate code to save tokens)
            conversation_snippet = ""
            for msg in overflow_msgs:
                role = msg.get("role", "user").upper()
                content = msg.get("content", "")
                # Truncate content to 400 chars so code blocks don't bloat the summarizer call
                snippet = content[:400] + ("..." if len(content) > 400 else "")
                conversation_snippet += f"{role}: {snippet}\n"
            
            summary_prompt = (
                "You are maintaining a concise rolling summary of a developer's conversation with an AI about a GitHub codebase.\n"
                "Focus on: repository files mentioned, architectural decisions made, features discussed, and specific user goals.\n"
                "Keep the updated summary to 3-5 high-signal bullet points. Do NOT include code snippets.\n\n"
            )
            if existing_summary:
                summary_prompt += f"CURRENT SUMMARY:\n{existing_summary}\n\n"
            
            summary_prompt += f"NEW CONVERSATION TO INCORPORATE:\n{conversation_snippet}\n\n"
            summary_prompt += "Produce the updated bulleted summary:"
            
            logger.info(f"Running background summarization for repo {repo_id}...")
            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": summary_prompt}],
                temperature=0.2,
                max_tokens=350,
                timeout=15.0
            )
            updated_summary = resp.choices[0].message.content.strip()
            
            # ── 3. Write-Through: Update Redis + PostgreSQL ──
            # Update Redis
            redis_client.setex(summary_key, TTL_SECONDS, updated_summary)
            
            # Update PostgreSQL
            with SessionLocal() as db:
                user_repo = db.query(UserRepo).filter(
                    UserRepo.user_id == user_id,
                    UserRepo.repo_id == repo_id
                ).first()
                if user_repo:
                    user_repo.summary = updated_summary
                else:
                    user_repo = UserRepo(user_id=user_id, repo_id=repo_id, summary=updated_summary)
                    db.add(user_repo)
                db.commit()
                logger.info(f"Write-Through: Saved updated summary to PostgreSQL for repo {repo_id}")
            
            # ── 4. Trim Redis raw history to the latest RAW_HISTORY_LIMIT ──
            redis_client.ltrim(history_key, -RAW_HISTORY_LIMIT, -1)
            
    except Exception as e:
        logger.error(f"Error in update_chat_memory_async for user {user_id}, repo {repo_id}: {e}")


def clear_chat_memory(db: Optional[Session], user_id: str, repo_id: str):
    """Clears both Redis cache and PostgreSQL persistent summary."""
    try:
        redis_client = get_redis_client()
        redis_client.delete(_get_history_key(user_id, repo_id))
        redis_client.delete(_get_summary_key(user_id, repo_id))
        
        if db is not None:
            user_repo = db.query(UserRepo).filter(
                UserRepo.user_id == user_id,
                UserRepo.repo_id == repo_id
            ).first()
            if user_repo:
                user_repo.summary = None
                db.commit()
    except Exception as e:
        logger.error(f"Error clearing chat memory: {e}")


# ── Backward-compatibility wrappers ──
def get_chat_history(user_id: str, repo_id: str, limit: int = RAW_HISTORY_LIMIT) -> list[dict]:
    """Compatibility wrapper returning raw recent history."""
    try:
        redis_client = get_redis_client()
        key = _get_history_key(user_id, repo_id)
        raw_messages = redis_client.lrange(key, -limit, -1)
        if not raw_messages:
            return []
        return [json.loads(msg) for msg in raw_messages]
    except Exception as e:
        logger.error(f"Redis Chat Memory Error (Get): {e}")
        return []


def add_messages_to_history(user_id: str, repo_id: str, user_query: str, ai_response: str, ttl_seconds: int = TTL_SECONDS, limit: int = RAW_HISTORY_LIMIT):
    """Compatibility wrapper for simple append."""
    try:
        redis_client = get_redis_client()
        key = _get_history_key(user_id, repo_id)
        user_msg = json.dumps({"role": "user", "content": user_query})
        ai_msg = json.dumps({"role": "assistant", "content": ai_response})
        redis_client.rpush(key, user_msg, ai_msg)
        redis_client.ltrim(key, -limit, -1)
        redis_client.expire(key, ttl_seconds)
    except Exception as e:
        logger.error(f"Redis Chat Memory Error (Set): {e}")
