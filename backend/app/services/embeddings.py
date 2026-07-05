import logging
from openai import OpenAI, AsyncOpenAI
from app.config import settings

logger = logging.getLogger(__name__)

client = OpenAI(api_key=settings.openai_api_key)
async_client = AsyncOpenAI(api_key=settings.openai_api_key)



async def get_embedding_async(text: str) -> list[float]:
    """
    Asynchronously generates a 1536-dimensional embedding for a single string using OpenAI's API.
    """
    if not text.strip():
        return [0.0] * settings.vector_dimension
        
    try:
        response = await async_client.embeddings.create(
            model='text-embedding-3-large',
            input=text,
            dimensions=settings.vector_dimension
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Failed to asynchronously generate embedding: {e}")
        return [0.0] * settings.vector_dimension

def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """
    Generates embeddings for a batch of strings.
    This is much faster and reduces the number of API calls.
    """
    if not texts:
        return []
        
    valid_texts = [t if t.strip() else "empty_chunk" for t in texts]
        
    try:
        response = client.embeddings.create(
            model='text-embedding-3-large',
            input=valid_texts,
            dimensions=settings.vector_dimension
        )
        return [data.embedding for data in response.data]
    except Exception as e:
        logger.error(f"Failed to generate batch embeddings: {e}")
        return [[0.0] * settings.vector_dimension for _ in valid_texts]

