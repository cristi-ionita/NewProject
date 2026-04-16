"""add leave request constraints

Revision ID: af51138a8446
Revises: 0ab0ba5c4b7b
Create Date: 2026-04-07 12:59:29.265758
"""

from alembic import op


revision = "af51138a8446"
down_revision = "0ab0ba5c4b7b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_leave_requests_end_date_after_start_date",
        "leave_requests",
        "end_date >= start_date",
    )
    op.create_check_constraint(
        "ck_leave_requests_reason_not_blank_if_present",
        "leave_requests",
        "reason IS NULL OR char_length(trim(reason)) > 0",
    )
    op.create_check_constraint(
        "ck_leave_requests_review_fields_match_status",
        "leave_requests",
        "("
        "status = 'pending' AND reviewed_by_admin_id IS NULL AND reviewed_at IS NULL"
        ") OR ("
        "status IN ('approved', 'rejected') "
        "AND reviewed_by_admin_id IS NOT NULL "
        "AND reviewed_at IS NOT NULL"
        ")",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_leave_requests_review_fields_match_status",
        "leave_requests",
        type_="check",
    )
    op.drop_constraint(
        "ck_leave_requests_reason_not_blank_if_present",
        "leave_requests",
        type_="check",
    )
    op.drop_constraint(
        "ck_leave_requests_end_date_after_start_date",
        "leave_requests",
        type_="check",
    )