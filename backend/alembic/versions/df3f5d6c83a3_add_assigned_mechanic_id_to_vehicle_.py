"""add assigned_mechanic_id to vehicle_issues

Revision ID: df3f5d6c83a3
Revises: 0a37223c7c72
Create Date: 2026-04-01 19:08:54.154017
"""

from alembic import op
import sqlalchemy as sa



revision = 'df3f5d6c83a3'
down_revision = '0a37223c7c72'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "vehicle_issues",
        sa.Column("assigned_mechanic_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        None,
        "vehicle_issues",
        "users",
        ["assigned_mechanic_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    pass
