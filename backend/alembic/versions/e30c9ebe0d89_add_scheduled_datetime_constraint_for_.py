from alembic import op


revision = "e30c9ebe0d89"
down_revision = "b70bf278c474"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_vehicle_issues_scheduled_requires_datetime",
        "vehicle_issues",
        "status != 'scheduled' OR scheduled_for IS NOT NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_vehicle_issues_scheduled_requires_datetime",
        "vehicle_issues",
        type_="check",
    )
