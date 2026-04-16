from alembic import op
import sqlalchemy as sa


revision = "ca4e5719bf20"
down_revision = "af51138a8446"
branch_labels = None
depends_on = None


def upgrade() -> None:
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

    op.execute(
        "CREATE TYPE assignment_status_new AS ENUM ('active', 'closed')"
    )

    op.add_column(
        "vehicle_assignments",
        sa.Column(
            "status_new",
            sa.Enum("active", "closed", name="assignment_status_new"),
            nullable=True,
        ),
    )

    op.execute(
        """
        UPDATE vehicle_assignments
        SET status_new =
            CASE
                WHEN status = 'ACTIVE' THEN 'active'::assignment_status_new
                WHEN status = 'CLOSED' THEN 'closed'::assignment_status_new
            END
        """
    )

    op.drop_column("vehicle_assignments", "status")

    op.alter_column(
        "vehicle_assignments",
        "status_new",
        new_column_name="status",
        existing_type=sa.Enum("active", "closed", name="assignment_status_new"),
        nullable=False,
    )

    op.execute("DROP TYPE assignment_status")
    op.execute("ALTER TYPE assignment_status_new RENAME TO assignment_status")

    op.create_check_constraint(
        "ck_vehicle_assignments_ended_at_after_started_at",
        "vehicle_assignments",
        "ended_at IS NULL OR ended_at >= started_at",
    )
    op.create_check_constraint(
        "ck_vehicle_assignments_status_matches_ended_at",
        "vehicle_assignments",
        "(status = 'active' AND ended_at IS NULL) "
        "OR (status = 'closed' AND ended_at IS NOT NULL)",
    )

    op.create_index(
        "ux_vehicle_assignments_active_vehicle",
        "vehicle_assignments",
        ["vehicle_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active' AND ended_at IS NULL"),
    )
    op.create_index(
        "ux_vehicle_assignments_active_user",
        "vehicle_assignments",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active' AND ended_at IS NULL"),
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

    op.execute(
        "CREATE TYPE assignment_status_old AS ENUM ('ACTIVE', 'CLOSED')"
    )

    op.add_column(
        "vehicle_assignments",
        sa.Column(
            "status_old",
            sa.Enum("ACTIVE", "CLOSED", name="assignment_status_old"),
            nullable=True,
        ),
    )

    op.execute(
        """
        UPDATE vehicle_assignments
        SET status_old =
            CASE
                WHEN status = 'active' THEN 'ACTIVE'::assignment_status_old
                WHEN status = 'closed' THEN 'CLOSED'::assignment_status_old
            END
        """
    )

    op.drop_column("vehicle_assignments", "status")

    op.alter_column(
        "vehicle_assignments",
        "status_old",
        new_column_name="status",
        existing_type=sa.Enum("ACTIVE", "CLOSED", name="assignment_status_old"),
        nullable=False,
    )

    op.execute("DROP TYPE assignment_status")
    op.execute("ALTER TYPE assignment_status_old RENAME TO assignment_status")

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
        "ux_vehicle_assignments_active_vehicle",
        "vehicle_assignments",
        ["vehicle_id"],
        unique=True,
        postgresql_where=sa.text("status = 'ACTIVE' AND ended_at IS NULL"),
    )
    op.create_index(
        "ux_vehicle_assignments_active_user",
        "vehicle_assignments",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'ACTIVE' AND ended_at IS NULL"),
    )
