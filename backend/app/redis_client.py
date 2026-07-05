import redis
from app.config import settings

# Create a connection pool to reuse connections
# Upstash and AWS ElastiCachee aggressively close idle TCP connections. 
# health_check_interval=30 ensures we ping the servr to keep it alive or drop dead sockets,
# and retry_on_timeout ensures we gracefully recover if a socket was severed.
pool = redis.ConnectionPool.from_url(
    settings.redis_url, 
    decode_responses=True,
    health_check_interval=30,
    retry_on_timeout=True,
    max_connections=50
)

def get_redis_client() -> redis.Redis:
    """Returns a Redis client from the connection pool."""
    return redis.Redis(connection_pool=pool)
