import os
import sys
import json
import logging
import time
import traceback

# Ensure the app module can be imported when running as a standalone script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import SessionLocal
from app.redis_client import get_redis_client
from app.models.repository import Repository
from app.models.user import User
from app.models.chunk import CodeChunk
from app.services.github import clone_repo, get_filtered_files, cleanup_repo, get_commit_hash, get_local_git_diff
from app.services.parser import chunk_file
from app.services.vector_store import save_chunks

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("worker.ingestion")

def update_status(db, repo_id: str, status: str, total_files: int = 0, total_chunks: int = 0, error_message: str = None):
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if repo:
        repo.status = status
        if total_files > 0:
            repo.total_files = total_files
        if total_chunks > 0:
            repo.total_chunks = total_chunks
        if error_message:
            repo.error_message = error_message
        db.commit()

def process_job(repo_id: str, github_url: str, user_id: str = None):
    logger.info(f"Processing repo {repo_id}: {github_url}")
    db = SessionLocal()
    repo_path = None
    
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
    
    try:
        repo = db.query(Repository).filter(Repository.id == repo_id).first()
        old_hash = repo.last_commit_hash if repo else None
        
        update_status(db, repo_id, "cloning")
        repo_path = clone_repo(github_url, repo_id)
        latest_hash = get_commit_hash(repo_path)
        
        if old_hash and old_hash == latest_hash:
            logger.info(f"Repo {repo_id} is already up to date ({latest_hash}). Skipping sync.")
            update_status(db, repo_id, "completed")
            return
            
        update_status(db, repo_id, "parsing")
        
        if old_hash:
            # Incremental Sync
            logger.info(f"Performing incremental sync from {old_hash} to {latest_hash}")
            diff_data = get_local_git_diff(repo_path, old_hash)
            
            deleted_and_modified = diff_data["deleted"] + diff_data["modified"]
            added_and_modified = diff_data["added"] + diff_data["modified"]
            
            if deleted_and_modified:
                logger.info(f"Deleting chunks for {len(deleted_and_modified)} modified/deleted files")
                db.query(CodeChunk).filter(
                    CodeChunk.repo_id == repo_id,
                    CodeChunk.filepath.in_(deleted_and_modified)
                ).delete(synchronize_session=False)
                db.commit()
                
            files, _ = get_filtered_files(repo_path, specific_files=added_and_modified)
            _, full_tree = get_filtered_files(repo_path)
            
            if repo:
                repo.parsed_tree = full_tree
                repo.last_commit_hash = latest_hash
                db.commit()
                
        else:
            # Full fresh clone
            logger.info("Performing full fresh clone")
            files, full_tree = get_filtered_files(repo_path)
            
            if repo:
                repo.parsed_tree = full_tree
                repo.last_commit_hash = latest_hash
                db.commit()
        
        all_chunks = []
        for file in files:
            chunks = chunk_file(file, repo_path)
            all_chunks.extend(chunks)
            
        total_files_delta = len(files)
        total_chunks_delta = len(all_chunks)
        
        if all_chunks:
            update_status(db, repo_id, "embedding", total_files=total_files_delta, total_chunks=total_chunks_delta)
            save_chunks(db, repo_id, repo_path, all_chunks)
        else:
            logger.info("No new chunks to embed.")
            
        final_total_chunks = db.query(CodeChunk).filter(CodeChunk.repo_id == repo_id).count()
        
        update_status(db, repo_id, "completed", total_chunks=final_total_chunks)
        logger.info(f"Successfully processed {github_url}")
        
    except Exception as e:
        logger.error(f"Failed to process {github_url}: {e}")
        logger.error(traceback.format_exc())
        update_status(db, repo_id, "failed", error_message=str(e))
    finally:
        if repo_path:
            cleanup_repo(repo_path)
        db.close()

