"""add mechanic and leave features

Revision ID: 0a37223c7c72
Revises: 331e4aa03b7f
Create Date: 2026-03-30 01:21:33.521967
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0a37223c7c72"
down_revision = "331e4aa03b7f"
branch_labels = None
depends_on = None


leave_status = postgresql.ENUM(
    "pending",
    "approved",
    "rejected",
    name="leave_status",
    create_type=False,
)


def upgrade() -> None:
    op.execute(
        "DO $$ BEGIN "
        "CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected'); "
        "EXCEPTION WHEN duplicate_object THEN NULL; "
        "END $$;"
    )

    op.create_table(
        "leave_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("status", leave_status, nullable=False, server_default="pending"),
        sa.Column("reviewed_by_admin_id", sa.Integer(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewed_by_admin_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(op.f("ix_leave_requests_id"), "leave_requests", ["id"], unique=False)
    op.create_index(op.f("ix_leave_requests_user_id"), "leave_requests", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_leave_requests_user_id"), table_name="leave_requests")
    op.drop_index(op.f("ix_leave_requests_id"), table_name="leave_requests")
    op.drop_table("leave_requests")
    op.execute("DROP TYPE IF EXISTS leave_status")