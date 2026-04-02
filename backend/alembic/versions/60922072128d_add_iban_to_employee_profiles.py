"""add username to users"""

import sqlalchemy as sa

from alembic import op

# 🔥 IMPORTANT: păstrează revision-ul tău existent
revision = "60922072128d"
down_revision = "93b0cc20389f"  # ← acesta e celălalt head pe care l-ai avut
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("username", sa.String(length=50), nullable=True))
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_column("users", "username")
