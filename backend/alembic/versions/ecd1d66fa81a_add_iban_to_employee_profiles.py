"""add iban to employee profiles

Revision ID: ecd1d66fa81a
Revises: ab349c5f2a93
Create Date: 2026-04-03 00:50:30.200384
"""

from alembic import op
import sqlalchemy as sa


revision = "ecd1d66fa81a"
down_revision = "ab349c5f2a93"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "employee_profiles",
        sa.Column("iban", sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("employee_profiles", "iban")