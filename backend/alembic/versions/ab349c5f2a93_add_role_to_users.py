"""add role to users

Revision ID: ab349c5f2a93
Revises: df3f5d6c83a3
Create Date: 2026-04-02 12:45:39.736354
"""

from alembic import op
import sqlalchemy as sa


revision = "ab349c5f2a93"
down_revision = "df3f5d6c83a3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.String(length=20),
            nullable=False,
            server_default="employee",
        ),
    )
    op.alter_column("users", "role", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "role")