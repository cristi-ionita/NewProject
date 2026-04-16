"""add db constraints for users vehicles employee profiles

Revision ID: c7293c126e9c
Revises: ecd1d66fa81a
Create Date: 2026-04-07 11:49:41.010193
"""

from alembic import op
import sqlalchemy as sa



revision = 'c7293c126e9c'
down_revision = 'ecd1d66fa81a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_users_full_name_not_blank",
        "users",
        "char_length(trim(full_name)) > 0",
    )
    op.create_check_constraint(
        "ck_users_unique_code_not_blank",
        "users",
        "char_length(trim(unique_code)) > 0",
    )
    op.create_check_constraint(
        "ck_users_role_valid",
        "users",
        "role IN ('employee', 'admin', 'mechanic')",
    )

    op.create_check_constraint(
        "ck_vehicles_brand_not_blank",
        "vehicles",
        "char_length(trim(brand)) > 0",
    )
    op.create_check_constraint(
        "ck_vehicles_model_not_blank",
        "vehicles",
        "char_length(trim(model)) > 0",
    )
    op.create_check_constraint(
        "ck_vehicles_license_plate_not_blank",
        "vehicles",
        "char_length(trim(license_plate)) > 0",
    )
    op.create_check_constraint(
        "ck_vehicles_year_min_1900",
        "vehicles",
        "year >= 1900",
    )
    op.create_check_constraint(
        "ck_vehicles_current_mileage_non_negative",
        "vehicles",
        "current_mileage >= 0",
    )
    op.create_check_constraint(
        "ck_vehicles_vin_not_blank_if_present",
        "vehicles",
        "vin IS NULL OR char_length(trim(vin)) > 0",
    )

    op.create_check_constraint(
        "ck_employee_profiles_first_name_not_blank",
        "employee_profiles",
        "char_length(trim(first_name)) > 0",
    )
    op.create_check_constraint(
        "ck_employee_profiles_last_name_not_blank",
        "employee_profiles",
        "char_length(trim(last_name)) > 0",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_employee_profiles_last_name_not_blank",
        "employee_profiles",
        type_="check",
    )
    op.drop_constraint(
        "ck_employee_profiles_first_name_not_blank",
        "employee_profiles",
        type_="check",
    )

    op.drop_constraint(
        "ck_vehicles_vin_not_blank_if_present",
        "vehicles",
        type_="check",
    )
    op.drop_constraint(
        "ck_vehicles_current_mileage_non_negative",
        "vehicles",
        type_="check",
    )
    op.drop_constraint(
        "ck_vehicles_year_min_1900",
        "vehicles",
        type_="check",
    )
    op.drop_constraint(
        "ck_vehicles_license_plate_not_blank",
        "vehicles",
        type_="check",
    )
    op.drop_constraint(
        "ck_vehicles_model_not_blank",
        "vehicles",
        type_="check",
    )
    op.drop_constraint(
        "ck_vehicles_brand_not_blank",
        "vehicles",
        type_="check",
    )

    op.drop_constraint(
        "ck_users_role_valid",
        "users",
        type_="check",
    )
    op.drop_constraint(
        "ck_users_unique_code_not_blank",
        "users",
        type_="check",
    )
    op.drop_constraint(
        "ck_users_full_name_not_blank",
        "users",
        type_="check",
    )