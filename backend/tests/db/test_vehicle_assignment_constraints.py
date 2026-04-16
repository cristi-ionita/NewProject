from datetime import datetime, timedelta, UTC
import uuid

import pytest
from sqlalchemy.exc import IntegrityError

from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_assignment import VehicleAssignment, AssignmentStatus


def _unique_suffix() -> str:
    return uuid.uuid4().hex[:8]


def make_valid_user(**overrides) -> User:
    suffix = _unique_suffix()
    data = {
        "full_name": f"Assignment User {suffix}",
        "unique_code": f"ASSIGN-{suffix}",
        "username": f"assign_{suffix}",
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
        "year": 2022,
        "current_mileage": 1000,
    }
    data.update(overrides)
    return Vehicle(**data)


@pytest.mark.asyncio
async def test_vehicle_assignment_rejects_ended_at_before_started_at(db_session):
    user = make_valid_user()
    vehicle = make_valid_vehicle()
    db_session.add_all([user, vehicle])
    await db_session.flush()

    now = datetime.now(UTC)

    assignment = VehicleAssignment(
        user_id=user.id,
        vehicle_id=vehicle.id,
        status=AssignmentStatus.CLOSED,
        started_at=now,
        ended_at=now - timedelta(hours=1),
    )
    db_session.add(assignment)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_vehicle_assignment_active_must_have_null_ended_at(db_session):
    user = make_valid_user()
    vehicle = make_valid_vehicle()
    db_session.add_all([user, vehicle])
    await db_session.flush()

    now = datetime.now(UTC)

    assignment = VehicleAssignment(
        user_id=user.id,
        vehicle_id=vehicle.id,
        status=AssignmentStatus.ACTIVE,
        started_at=now,
        ended_at=now,
    )
    db_session.add(assignment)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_vehicle_assignment_closed_must_have_ended_at(db_session):
    user = make_valid_user()
    vehicle = make_valid_vehicle()
    db_session.add_all([user, vehicle])
    await db_session.flush()

    assignment = VehicleAssignment(
        user_id=user.id,
        vehicle_id=vehicle.id,
        status=AssignmentStatus.CLOSED,
        ended_at=None,
    )
    db_session.add(assignment)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_vehicle_assignment_allows_only_one_active_assignment_per_user(db_session):
    user = make_valid_user()
    vehicle_1 = make_valid_vehicle()
    vehicle_2 = make_valid_vehicle()
    db_session.add_all([user, vehicle_1, vehicle_2])
    await db_session.flush()

    active_assignment = VehicleAssignment(
        user_id=user.id,
        vehicle_id=vehicle_1.id,
        status=AssignmentStatus.ACTIVE,
        ended_at=None,
    )
    db_session.add(active_assignment)
    await db_session.flush()

    second_active_assignment = VehicleAssignment(
        user_id=user.id,
        vehicle_id=vehicle_2.id,
        status=AssignmentStatus.ACTIVE,
        ended_at=None,
    )
    db_session.add(second_active_assignment)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_vehicle_assignment_allows_only_one_active_assignment_per_vehicle(db_session):
    user_1 = make_valid_user()
    user_2 = make_valid_user()
    vehicle = make_valid_vehicle()
    db_session.add_all([user_1, user_2, vehicle])
    await db_session.flush()

    active_assignment = VehicleAssignment(
        user_id=user_1.id,
        vehicle_id=vehicle.id,
        status=AssignmentStatus.ACTIVE,
        ended_at=None,
    )
    db_session.add(active_assignment)
    await db_session.flush()

    second_active_assignment = VehicleAssignment(
        user_id=user_2.id,
        vehicle_id=vehicle.id,
        status=AssignmentStatus.ACTIVE,
        ended_at=None,
    )
    db_session.add(second_active_assignment)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_vehicle_assignment_allows_reassignment_after_closing_previous_one(db_session):
    user = make_valid_user()
    vehicle_1 = make_valid_vehicle()
    vehicle_2 = make_valid_vehicle()
    db_session.add_all([user, vehicle_1, vehicle_2])
    await db_session.flush()

    now = datetime.now(UTC)

    closed_assignment = VehicleAssignment(
        user_id=user.id,
        vehicle_id=vehicle_1.id,
        status=AssignmentStatus.CLOSED,
        started_at=now - timedelta(days=2),
        ended_at=now - timedelta(days=1),
    )
    db_session.add(closed_assignment)
    await db_session.flush()

    new_active_assignment = VehicleAssignment(
        user_id=user.id,
        vehicle_id=vehicle_2.id,
        status=AssignmentStatus.ACTIVE,
        started_at=now,
        ended_at=None,
    )
    db_session.add(new_active_assignment)

    await db_session.flush()