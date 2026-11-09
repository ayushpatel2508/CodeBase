"""add summary to user_repos

Revision ID: c5e9a1b2d3f4
Revises: a3f7c8e1d924
Create Date: 2026-11-07 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5e9a1b2d3f4'
down_revision: Union[str, Sequence[str], None] = 'a3f7c8e1d924'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add summary column to user_repos table."""
    op.add_column('user_repos', sa.Column('summary', sa.Text(), nullable=True))


def downgrade() -> None:
    """Remove summary column from user_repos table."""
    op.drop_column('user_repos', 'summary')

