import uuid

import pytest
from sqlalchemy.exc import IntegrityError

from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_issue import VehicleIssue


def _unique_suffix() -> str:
    return uuid.uuid4().hex[:8]


def make_valid_user(**overrides) -> User:
    suffix = _unique_suffix()
    data = {
        "full_name": f"Issue User {suffix}",
        "unique_code": f"ISSUE-{suffix}",
        "username": f"issue_{suffix}",
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
        "year": 2021,
        "current_mileage": 1000,
    }
    data.update(overrides)
    return Vehicle(**data)


@pytest.mark.asyncio
async def test_vehicle_issue_rejects_negative_need_service_in_km(db_session):
    user = make_valid_user()
    vehicle = make_valid_vehicle()
    db_session.add_all([user, vehicle])
    await db_session.flush()

    issue = VehicleIssue(
        vehicle_id=vehicle.id,
        reported_by_user_id=user.id,
        need_service_in_km=-1,
    )
    db_session.add(issue)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_vehicle_issue_rejects_blank_scheduled_location(db_session):
    user = make_valid_user()
    vehicle = make_valid_vehicle()
    db_session.add_all([user, vehicle])
    await db_session.flush()

    issue = VehicleIssue(
        vehicle_id=vehicle.id,
        reported_by_user_id=user.id,
        scheduled_location="   ",
    )
    db_session.add(issue)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_vehicle_issue_rejects_blank_dashboard_checks(db_session):
    user = make_valid_user()
    vehicle = make_valid_vehicle()
    db_session.add_all([user, vehicle])
    await db_session.flush()

    issue = VehicleIssue(
        vehicle_id=vehicle.id,
        reported_by_user_id=user.id,
        dashboard_checks="   ",
    )
    db_session.add(issue)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_vehicle_issue_rejects_blank_other_problems(db_session):
    user = make_valid_user()
    vehicle = make_valid_vehicle()
    db_session.add_all([user, vehicle])
    await db_session.flush()

    issue = VehicleIssue(
        vehicle_id=vehicle.id,
        reported_by_user_id=user.id,
        other_problems="   ",
    )
    db_session.add(issue)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_vehicle_issue_allows_valid_optional_fields(db_session):
    user = make_valid_user()
    vehicle = make_valid_vehicle()
    db_session.add_all([user, vehicle])
    await db_session.flush()

    issue = VehicleIssue(
        vehicle_id=vehicle.id,
        reported_by_user_id=user.id,
        need_service_in_km=1500,
        scheduled_location="Service Central",
        dashboard_checks="Check engine light",
        other_problems="Minor vibration at braking",
    )
    db_session.add(issue)

    await db_session.flush()