"""add vehicle assignment constraints

Revision ID: f913babab886
Revises: c7293c126e9c
Create Date: 2026-04-07 12:34:48.683116
"""

from alembic import op
import sqlalchemy as sa


revision = "f913babab886"
down_revision = "c7293c126e9c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_vehicle_assignments_ended_at_after_started_at",
        "vehicle_assignments",
        "ended_at IS NULL OR ended_at >= started_at",
    )
    op.create_check_constraint(
        "ck_vehicle_assignments_status_matches_ended_at",
        "vehicle_assignments",
        "(status = 'ACTIVE' AND ended_at IS NULL) "
        "OR (status = 'CLOSED' AND ended_at IS NOT NULL)",
    )

    op.create_index(
        "ux_vehicle_assignments_active_user",
        "vehicle_assignments",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'ACTIVE' AND ended_at IS NULL"),
    )
    op.create_index(
        "ux_vehicle_assignments_active_vehicle",
        "vehicle_assignments",
        ["vehicle_id"],
        unique=True,
        postgresql_where=sa.text("status = 'ACTIVE' AND ended_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "ux_vehicle_assignments_active_vehicle",
        table_name="vehicle_assignments",
    )
    op.drop_index(
        "ux_vehicle_assignments_active_user",
        table_name="vehicle_assignments",
    )

    op.drop_constraint(
        "ck_vehicle_assignments_status_matches_ended_at",
        "vehicle_assignments",
        type_="check",
    )
    op.drop_constraint(
        "ck_vehicle_assignments_ended_at_after_started_at",
        "vehicle_assignments",
        type_="check",
    )