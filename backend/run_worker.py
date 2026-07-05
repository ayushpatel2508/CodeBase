import os
from dotenv import load_dotenv

# Load the .env file so we have access to REDIS_URL
load_dotenv()

from redis import Redis
from rq import SimpleWorker, Queue
from app.config import settings

if __name__ == '__main__':
    print(f"Connecting to Redis at: {settings.redis_url.split('@')[-1]}")
    
    # Create the redis connection
    redis_conn = Redis.from_url(settings.redis_url)
    
    # Start the worker
    worker = SimpleWorker(['repo_jobs'], connection=redis_conn)
    worker.work()
