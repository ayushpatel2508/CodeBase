import logging
import os
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.chunk import CodeChunk
from app.services.embeddings import get_embeddings_batch

logger = logging.getLogger(__name__)

def save_chunks(db: Session, repo_id: str, repo_path: str, chunks: list[dict]):
    """
    Takes a list of chunk dictionaries, computes their embeddings in batches,
    and saves them to the CodeChunk table in the database.
    """
    if not chunks:
        return
        
    BATCH_SIZE = 100
    
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i:i + BATCH_SIZE]
        texts = [c["content"] for c in batch]
        
        logger.info(f"Generating embeddings for batch {i//BATCH_SIZE + 1}...")
        embeddings = get_embeddings_batch(texts)
        
        db_chunks = []
        for chunk, embedding in zip(batch, embeddings):
            # Convert absolute filepath to relative path for DB storage
            abs_path = chunk.get("filepath", "unknown")
            try:
                rel_path = os.path.relpath(abs_path, repo_path) if repo_path else os.path.basename(abs_path)
            except Exception:
                rel_path = os.path.basename(abs_path)
                
            db_chunk = CodeChunk(
                repo_id=repo_id,
                name=chunk.get("name", "unknown"),
                filepath=rel_path,
                chunk_type=chunk.get("chunk_type", "unknown"),
                content=chunk["content"],
                line_start=chunk.get("line_start", 0),
                line_end=chunk.get("line_end", 0),
                embedding=embedding
            )
            db_chunks.append(db_chunk)
            
        db.add_all(db_chunks)
        db.commit()
        logger.info(f"Saved {len(db_chunks)} chunks to DB.")


def search_similar_chunks(db: Session, repo_id: str, query_embedding: list[float], limit: int = 10, min_similarity: float = 0.3):
    """
    Uses pgvector's cosine distance operator (<=>) to find the most similar chunks.
    Cosine Similarity = 1 - Cosine Distance.
    """
    max_distance = 1.0 - min_similarity
    distance_expr = CodeChunk.embedding.cosine_distance(query_embedding)
    
    results = (
        db.execute(
            select(CodeChunk, distance_expr.label('distance'))
            .filter(CodeChunk.repo_id == repo_id)
            .filter(distance_expr <= max_distance) 
            .order_by(distance_expr)
            .limit(limit)
        )
        .all()
    )
    
    valid_chunks = []
    for chunk, distance in results:
        similarity = 1.0 - distance
        logger.info(f"  Chunk '{chunk.name}' in {chunk.filepath} => similarity: {similarity:.4f}")
        chunk.similarity_score = similarity
        valid_chunks.append(chunk)
            
    return valid_chunks
