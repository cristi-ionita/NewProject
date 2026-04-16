"""add vehicle issue constraints

Revision ID: 0ab0ba5c4b7b
Revises: f913babab886
Create Date: 2026-04-07 12:51:51.532661
"""

from alembic import op


revision = "0ab0ba5c4b7b"
down_revision = "f913babab886"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_vehicle_issues_need_service_in_km_non_negative",
        "vehicle_issues",
        "need_service_in_km IS NULL OR need_service_in_km >= 0",
    )
    op.create_check_constraint(
        "ck_vehicle_issues_scheduled_location_not_blank_if_present",
        "vehicle_issues",
        "scheduled_location IS NULL OR char_length(trim(scheduled_location)) > 0",
    )
    op.create_check_constraint(
        "ck_vehicle_issues_dashboard_checks_not_blank_if_present",
        "vehicle_issues",
        "dashboard_checks IS NULL OR char_length(trim(dashboard_checks)) > 0",
    )
    op.create_check_constraint(
        "ck_vehicle_issues_other_problems_not_blank_if_present",
        "vehicle_issues",
        "other_problems IS NULL OR char_length(trim(other_problems)) > 0",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_vehicle_issues_other_problems_not_blank_if_present",
        "vehicle_issues",
        type_="check",
    )
    op.drop_constraint(
        "ck_vehicle_issues_dashboard_checks_not_blank_if_present",
        "vehicle_issues",
        type_="check",
    )
    op.drop_constraint(
        "ck_vehicle_issues_scheduled_location_not_blank_if_present",
        "vehicle_issues",
        type_="check",
    )
    op.drop_constraint(
        "ck_vehicle_issues_need_service_in_km_non_negative",
        "vehicle_issues",
        type_="check",
    )