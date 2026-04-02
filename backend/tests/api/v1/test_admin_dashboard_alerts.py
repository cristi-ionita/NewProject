from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.api.v1.endpoints.admin_dashboard_alerts import (
    build_user_alert,
    get_occupied_vehicles,
    get_users_without_contract,
    get_users_without_driver_license,
    get_users_without_profile,
    get_vehicles_with_open_issues,
)


class FakeScalarsResult:
    def __init__(self, items):
        self._items = items

    def all(self):
        return self._items


class FakeResult:
    def __init__(self, items):
        self._items = items

    def scalars(self):
        return FakeScalarsResult(self._items)

    def all(self):
        return self._items


def make_user(
    user_id: int,
    full_name: str,
    unique_code: str,
    shift_number: str = "1",
    is_active: bool = True,
):
    return SimpleNamespace(
        id=user_id,
        full_name=full_name,
        unique_code=unique_code,
        shift_number=shift_number,
        is_active=is_active,
    )


def make_vehicle(
    vehicle_id: int,
    license_plate: str,
    brand: str,
    model: str,
):
    return SimpleNamespace(
        id=vehicle_id,
        license_plate=license_plate,
        brand=brand,
        model=model,
    )


def make_assignment(assignment_id: int, started_at):
    return SimpleNamespace(
        id=assignment_id,
        started_at=started_at,
    )


def test_build_user_alert():
    user = make_user(
        user_id=1,
        full_name="Cristi Popescu",
        unique_code="EMP001",
        shift_number="2",
        is_active=True,
    )

    result = build_user_alert(user)

    assert result.user_id == 1
    assert result.full_name == "Cristi Popescu"
    assert result.unique_code == "EMP001"
    assert result.shift_number == "2"
    assert result.is_active is True


@pytest.mark.asyncio
async def test_get_users_without_profile():
    users = [
        make_user(1, "Ana", "EMP001"),
        make_user(2, "Bogdan", "EMP002"),
    ]

    db = AsyncMock()
    db.execute.return_value = FakeResult(users)

    response = await get_users_without_profile(db=db, _=True)

    assert len(response.users) == 2
    assert response.users[0].full_name == "Ana"
    assert response.users[1].unique_code == "EMP002"


@pytest.mark.asyncio
async def test_get_users_without_contract():
    users = [
        make_user(3, "Carmen", "EMP003"),
    ]

    db = AsyncMock()
    db.execute.return_value = FakeResult(users)

    response = await get_users_without_contract(db=db, _=True)

    assert len(response.users) == 1
    assert response.users[0].user_id == 3
    assert response.users[0].full_name == "Carmen"


@pytest.mark.asyncio
async def test_get_users_without_driver_license():
    users = [
        make_user(4, "Dan", "EMP004"),
    ]

    db = AsyncMock()
    db.execute.return_value = FakeResult(users)

    response = await get_users_without_driver_license(db=db, _=True)

    assert len(response.users) == 1
    assert response.users[0].user_id == 4
    assert response.users[0].unique_code == "EMP004"


@pytest.mark.asyncio
async def test_get_vehicles_with_open_issues_returns_only_vehicles_with_open_or_in_progress_issues(
):
    vehicle_1 = make_vehicle(1, "B-100-AAA", "Dacia", "Logan")
    vehicle_2 = make_vehicle(2, "B-200-BBB", "VW", "Golf")
    vehicle_3 = make_vehicle(3, "B-300-CCC", "Ford", "Focus")

    db = AsyncMock()
    db.execute.return_value = FakeResult([vehicle_1, vehicle_2, vehicle_3])
    db.scalar.side_effect = [
        2,
        1,
        "2026-03-20T10:00:00Z",
        0,
        0,
        None,
        0,
        3,
        "2026-03-22T08:30:00Z",
    ]

    response = await get_vehicles_with_open_issues(db=db, _=True)

    assert len(response.vehicles) == 2

    first = response.vehicles[0]
    second = response.vehicles[1]

    assert first.vehicle_id == 1
    assert first.license_plate == "B-100-AAA"
    assert first.open_issues_count == 2
    assert first.in_progress_issues_count == 1

    assert second.vehicle_id == 3
    assert second.license_plate == "B-300-CCC"
    assert second.open_issues_count == 0
    assert second.in_progress_issues_count == 3


@pytest.mark.asyncio
async def test_get_vehicles_with_open_issues_returns_empty_when_no_vehicle_has_issues():
    vehicle_1 = make_vehicle(1, "B-100-AAA", "Dacia", "Logan")
    vehicle_2 = make_vehicle(2, "B-200-BBB", "VW", "Golf")

    db = AsyncMock()
    db.execute.return_value = FakeResult([vehicle_1, vehicle_2])
    db.scalar.side_effect = [
        0,
        0,
        None,
        0,
        0,
        None,
    ]

    response = await get_vehicles_with_open_issues(db=db, _=True)

    assert response.vehicles == []


@pytest.mark.asyncio
async def test_get_occupied_vehicles_returns_active_assignments():
    vehicle = make_vehicle(10, "B-999-XYZ", "Skoda", "Octavia")
    user = make_user(20, "Elena Ionescu", "EMP020")
    assignment = make_assignment(30, "2026-03-25T09:00:00Z")

    db = AsyncMock()
    db.execute.return_value = FakeResult(
        [
            (assignment, vehicle, user),
        ]
    )

    response = await get_occupied_vehicles(db=db, _=True)

    assert len(response.vehicles) == 1

    item = response.vehicles[0]
    assert item.assignment_id == 30
    assert item.vehicle_id == 10
    assert item.license_plate == "B-999-XYZ"
    assert item.user_id == 20
    assert item.user_name == "Elena Ionescu"
    assert item.started_at == datetime(2026, 3, 25, 9, 0, tzinfo=UTC)
