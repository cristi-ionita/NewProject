"""repair vehicle_issues schema

Revision ID: df3f5d6c83a3
Revises: 0a37223c7c72
Create Date: 2026-04-01 19:08:54.154017
"""

from alembic import op

revision = "df3f5d6c83a3"
down_revision = "0a37223c7c72"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    DO $$
    BEGIN
        CREATE TYPE vehicle_issue_status AS ENUM ('open', 'scheduled', 'in_progress', 'resolved');
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END $$;
    """)

    op.execute("""
    ALTER TABLE vehicle_issues
    ADD COLUMN IF NOT EXISTS assigned_mechanic_id INTEGER,
    ADD COLUMN IF NOT EXISTS need_service_in_km INTEGER,
    ADD COLUMN IF NOT EXISTS need_brakes BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS need_tires BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS need_oil BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS dashboard_checks TEXT,
    ADD COLUMN IF NOT EXISTS other_problems TEXT,
    ADD COLUMN IF NOT EXISTS status vehicle_issue_status NOT NULL DEFAULT 'open',
    ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS scheduled_location VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    """)

    op.execute("""
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'vehicle_issues_assigned_mechanic_id_fkey'
        ) THEN
            ALTER TABLE vehicle_issues
            ADD CONSTRAINT vehicle_issues_assigned_mechanic_id_fkey
            FOREIGN KEY (assigned_mechanic_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
    END $$;
    """)

    op.execute("""
    CREATE INDEX IF NOT EXISTS ix_vehicle_issues_assigned_mechanic_id
    ON vehicle_issues (assigned_mechanic_id);
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_vehicle_issues_assigned_mechanic_id;")

    op.execute("""
    ALTER TABLE vehicle_issues
    DROP CONSTRAINT IF EXISTS vehicle_issues_assigned_mechanic_id_fkey;
    """)

    op.execute("""
    ALTER TABLE vehicle_issues
    DROP COLUMN IF EXISTS assigned_mechanic_id,
    DROP COLUMN IF EXISTS need_service_in_km,
    DROP COLUMN IF EXISTS need_brakes,
    DROP COLUMN IF EXISTS need_tires,
    DROP COLUMN IF EXISTS need_oil,
    DROP COLUMN IF EXISTS dashboard_checks,
    DROP COLUMN IF EXISTS other_problems,
    DROP COLUMN IF EXISTS status,
    DROP COLUMN IF EXISTS scheduled_for,
    DROP COLUMN IF EXISTS scheduled_location,
    DROP COLUMN IF EXISTS updated_at;
    """)

    op.execute("DROP TYPE IF EXISTS vehicle_issue_status;")