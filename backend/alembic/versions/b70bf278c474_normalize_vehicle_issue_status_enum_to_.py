from alembic import op
import sqlalchemy as sa


revision = "b70bf278c474"
down_revision = "ca4e5719bf20"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "CREATE TYPE vehicle_issue_status_new AS ENUM "
        "('open', 'scheduled', 'in_progress', 'resolved')"
    )

    op.add_column(
        "vehicle_issues",
        sa.Column(
            "status_new",
            sa.Enum(
                "open",
                "scheduled",
                "in_progress",
                "resolved",
                name="vehicle_issue_status_new",
            ),
            nullable=True,
        ),
    )

    op.execute(
        """
        UPDATE vehicle_issues
        SET status_new =
            CASE
                WHEN status = 'OPEN' THEN 'open'::vehicle_issue_status_new
                WHEN status = 'IN_PROGRESS' THEN 'in_progress'::vehicle_issue_status_new
                WHEN status = 'RESOLVED' THEN 'resolved'::vehicle_issue_status_new
            END
        """
    )

    op.drop_column("vehicle_issues", "status")

    op.alter_column(
        "vehicle_issues",
        "status_new",
        new_column_name="status",
        existing_type=sa.Enum(
            "open",
            "scheduled",
            "in_progress",
            "resolved",
            name="vehicle_issue_status_new",
        ),
        nullable=False,
    )

    op.execute("DROP TYPE vehicle_issue_status")
    op.execute("ALTER TYPE vehicle_issue_status_new RENAME TO vehicle_issue_status")


def downgrade() -> None:
    op.execute(
        "CREATE TYPE vehicle_issue_status_old AS ENUM "
        "('OPEN', 'IN_PROGRESS', 'RESOLVED')"
    )

    op.add_column(
        "vehicle_issues",
        sa.Column(
            "status_old",
            sa.Enum(
                "OPEN",
                "IN_PROGRESS",
                "RESOLVED",
                name="vehicle_issue_status_old",
            ),
            nullable=True,
        ),
    )

    op.execute(
        """
        UPDATE vehicle_issues
        SET status_old =
            CASE
                WHEN status = 'open' THEN 'OPEN'::vehicle_issue_status_old
                WHEN status = 'in_progress' THEN 'IN_PROGRESS'::vehicle_issue_status_old
                WHEN status = 'resolved' THEN 'RESOLVED'::vehicle_issue_status_old
            END
        """
    )

    op.drop_column("vehicle_issues", "status")

    op.alter_column(
        "vehicle_issues",
        "status_old",
        new_column_name="status",
        existing_type=sa.Enum(
            "OPEN",
            "IN_PROGRESS",
            "RESOLVED",
            name="vehicle_issue_status_old",
        ),
        nullable=False,
    )

    op.execute("DROP TYPE vehicle_issue_status")
    op.execute("ALTER TYPE vehicle_issue_status_old RENAME TO vehicle_issue_status")
