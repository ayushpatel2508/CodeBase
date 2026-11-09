"""add fulltext search to code_chunks

Revision ID: a3f7c8e1d924
Revises: b1b4fef2db61
Create Date: 2026-11-01 13:30:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a3f7c8e1d924'
down_revision: Union[str, Sequence[str], None] = 'b1b4fef2db61'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add a tsvector column and GIN index for full-text search on code chunks."""
    
    # Add a GENERATED column that Postgres auto-computes from `content`.
    # No application-level changes needed — Postgres fills it on INSERT/UPDATE.
    op.execute("""
        ALTER TABLE code_chunks
        ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED
    """)
    
    # GIN index makes full-text queries fast (scans the inverted index, not every row).
    op.execute("""
        CREATE INDEX idx_code_chunks_fulltext
        ON code_chunks
        USING GIN(search_vector)
    """)


def downgrade() -> None:
    """Remove the full-text search column and index."""
    op.execute("DROP INDEX IF EXISTS idx_code_chunks_fulltext")
    op.execute("ALTER TABLE code_chunks DROP COLUMN IF EXISTS search_vector")
