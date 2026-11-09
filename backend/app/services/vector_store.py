import logging
import os
from sqlalchemy.orm import Session
from sqlalchemy import select, text

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


# ─── Hybrid Search: Vector + Full-Text Keyword Search ───


def search_by_keywords(db: Session, repo_id: str, query_text: str, limit: int = 20):
    """
    BM25-style keyword search using PostgreSQL's built-in full-text search.
    
    Uses plainto_tsquery which tokenizes the query string into stemmed words
    and matches them against the pre-computed tsvector column (search_vector)
    on code_chunks. ts_rank scores each match by word frequency and position.
    
    Returns a list of CodeChunk objects with a `keyword_rank` attribute.
    """
    if not query_text or not query_text.strip():
        return []
    
    results = db.execute(
        text("""
            SELECT id, repo_id, name, filepath, chunk_type, content,
                   line_start, line_end, embedding, created_at,
                   ts_rank(search_vector, plainto_tsquery('english', :query)) AS rank
            FROM code_chunks
            WHERE repo_id = CAST(:repo_id AS UUID)
              AND search_vector @@ plainto_tsquery('english', :query)
            ORDER BY rank DESC
            LIMIT :limit
        """),
        {"query": query_text, "repo_id": str(repo_id), "limit": limit}
    ).fetchall()
    
    keyword_chunks = []
    for row in results:
        # Load the full ORM object so it behaves identically to vector search results
        chunk = db.query(CodeChunk).get(row.id)
        if chunk:
            chunk.keyword_rank = row.rank
            keyword_chunks.append(chunk)
            logger.info(f"  [KW] Chunk '{chunk.name}' in {chunk.filepath} => keyword_rank: {row.rank:.4f}")
    
    return keyword_chunks


def reciprocal_rank_fusion(vector_chunks: list, keyword_chunks: list, k: int = 60, limit: int = 10) -> list:
    """
    Merges two ranked lists using Reciprocal Rank Fusion (RRF).
    
    RRF scores each chunk by: 1/(k + rank_position). Chunks that appear
    in BOTH lists get scores from both, so they naturally rise to the top.
    
    k=60 is the standard constant from the original RRF paper — it dampens
    the effect of very high-ranked items so the fusion stays balanced.
    """
    scores: dict[str, float] = {}
    chunk_map: dict[str, object] = {}
    
    # Score from vector search results (rank 1, 2, 3, ...)
    for rank, chunk in enumerate(vector_chunks, start=1):
        chunk_id = str(chunk.id)
        scores[chunk_id] = scores.get(chunk_id, 0.0) + 1.0 / (k + rank)
        chunk_map[chunk_id] = chunk
    
    # Score from keyword search results (rank 1, 2, 3, ...)
    for rank, chunk in enumerate(keyword_chunks, start=1):
        chunk_id = str(chunk.id)
        scores[chunk_id] = scores.get(chunk_id, 0.0) + 1.0 / (k + rank)
        if chunk_id not in chunk_map:
            chunk_map[chunk_id] = chunk
    
    # Sort by combined RRF score (highest first) and return top N
    ranked_ids = sorted(scores.keys(), key=lambda cid: scores[cid], reverse=True)[:limit]
    
    fused_chunks = []
    for cid in ranked_ids:
        chunk = chunk_map[cid]
        chunk.rrf_score = scores[cid]
        fused_chunks.append(chunk)
        logger.info(f"  [RRF] Chunk '{chunk.name}' in {chunk.filepath} => rrf_score: {scores[cid]:.6f}")
    
    return fused_chunks


def hybrid_search(db: Session, repo_id: str, query_text: str, query_embedding: list[float], limit: int = 10, min_similarity: float = 0.3):
    """
    Combines vector (semantic) search and keyword (BM25) search using
    Reciprocal Rank Fusion to get the best of both worlds.
    
    - Vector search catches semantically similar chunks (meaning-based).
    - Keyword search catches exact function/class name matches (text-based).
    - RRF merges both lists — chunks appearing in both lists rank highest.
    
    Falls back to pure vector search if no keyword matches are found.
    """
    # Retrieve broadly from both methods (top 20 each)
    vector_results = search_similar_chunks(db, repo_id, query_embedding, limit=20, min_similarity=min_similarity)
    keyword_results = search_by_keywords(db, repo_id, query_text, limit=20)
    
    logger.info(f"Hybrid search: {len(vector_results)} vector results, {len(keyword_results)} keyword results")
    
    if not keyword_results:
        # No keyword matches found — fall back to pure vector search
        logger.info("No keyword matches — using vector-only results")
        return vector_results[:limit]
    
    if not vector_results:
        # No vector matches — fall back to pure keyword search
        logger.info("No vector matches — using keyword-only results")
        return keyword_results[:limit]
    
    return reciprocal_rank_fusion(vector_results, keyword_results, limit=limit)
