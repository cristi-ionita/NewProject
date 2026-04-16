import uuid

import pytest
from sqlalchemy.exc import IntegrityError

from app.db.models.employee_profile import EmployeeProfile
from app.db.models.user import User
from app.db.models.vehicle import Vehicle


def _unique_suffix() -> str:
    return uuid.uuid4().hex[:8]


def make_valid_user(**overrides) -> User:
    suffix = _unique_suffix()
    data = {
        "full_name": f"Test User {suffix}",
        "unique_code": f"EMP-{suffix}",
        "username": f"user_{suffix}",
        "password_hash": "hashed-password",
        "role": "employee",
        "is_active": True,
    }
    data.update(overrides)
    return User(**data)


def make_valid_vehicle(**overrides) -> Vehicle:
    suffix = _unique_suffix()
    data = {
        "brand": "Dacia",
        "model": "Logan",
        "license_plate": f"B-{suffix[:3].upper()}-{suffix[3:6].upper()}",
        "year": 2020,
        "current_mileage": 1000,
    }
    data.update(overrides)
    return Vehicle(**data)


@pytest.mark.asyncio
async def test_user_full_name_blank_violates_check_constraint(db_session):
    user = make_valid_user(full_name="   ")
    db_session.add(user)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_user_unique_code_blank_violates_check_constraint(db_session):
    user = make_valid_user(unique_code="   ")
    db_session.add(user)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_user_role_invalid_violates_check_constraint(db_session):
    user = make_valid_user(role="superuser")
    db_session.add(user)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_vehicle_brand_blank_violates_check_constraint(db_session):
    vehicle = make_valid_vehicle(brand="   ")
    db_session.add(vehicle)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_vehicle_model_blank_violates_check_constraint(db_session):
    vehicle = make_valid_vehicle(model="   ")
    db_session.add(vehicle)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_vehicle_license_plate_blank_violates_check_constraint(db_session):
    vehicle = make_valid_vehicle(license_plate="   ")
    db_session.add(vehicle)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_vehicle_year_below_1900_violates_check_constraint(db_session):
    vehicle = make_valid_vehicle(year=1899)
    db_session.add(vehicle)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_vehicle_negative_mileage_violates_check_constraint(db_session):
    vehicle = make_valid_vehicle(current_mileage=-1)
    db_session.add(vehicle)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_vehicle_blank_vin_violates_check_constraint(db_session):
    vehicle = make_valid_vehicle(vin="   ")
    db_session.add(vehicle)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_employee_profile_first_name_blank_violates_check_constraint(db_session):
    user = make_valid_user()
    db_session.add(user)
    await db_session.flush()

    profile = EmployeeProfile(
        user_id=user.id,
        first_name="   ",
        last_name="Popescu",
    )
    db_session.add(profile)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_employee_profile_last_name_blank_violates_check_constraint(db_session):
    user = make_valid_user()
    db_session.add(user)
    await db_session.flush()

    profile = EmployeeProfile(
        user_id=user.id,
        first_name="Ion",
        last_name="   ",
    )
    db_session.add(profile)

    with pytest.raises(IntegrityError):
        await db_session.flush()