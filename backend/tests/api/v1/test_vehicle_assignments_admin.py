from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.vehicle_assignments_admin import (
    build_assignment_read,
    close_assignment,
    create_assignment,
    delete_closed_assignment,
    get_active_assignment_for_user,
    get_active_assignment_for_vehicle,
    get_assignment_or_404,
    get_user_or_404,
    get_vehicle_or_404,
    list_assignments,
    parse_assignment_status,
)
from app.db.models.vehicle_assignment import AssignmentStatus


class FakeScalarResult:
    def __init__(self, item):
        self._item = item

    def scalar_one_or_none(self):
        return self._item


class FakeResult:
    def __init__(self, items):
        self._items = items

    def all(self):
        return self._items


def make_user(
    user_id=1,
    full_name="Ana Popescu",
    is_active=True,
):
    return SimpleNamespace(
        id=user_id,
        full_name=full_name,
        is_active=is_active,
    )


def make_vehicle(
    vehicle_id=10,
    license_plate="B-123-XYZ",
    brand="Dacia",
    model="Logan",
):
    return SimpleNamespace(
        id=vehicle_id,
        license_plate=license_plate,
        brand=brand,
        model=model,
    )


def make_assignment(
    assignment_id=100,
    user_id=1,
    vehicle_id=10,
    status=AssignmentStatus.ACTIVE,
    started_at=None,
    ended_at=None,
):
    return SimpleNamespace(
        id=assignment_id,
        user_id=user_id,
        vehicle_id=vehicle_id,
        status=status,
        started_at=started_at or datetime(2026, 3, 30, 8, 0, tzinfo=timezone.utc),
        ended_at=ended_at,
    )


def make_create_payload(user_id=1, vehicle_id=10):
    return SimpleNamespace(
        user_id=user_id,
        vehicle_id=vehicle_id,
    )


def test_parse_assignment_status_valid():
    assert parse_assignment_status("active") == AssignmentStatus.ACTIVE
    assert parse_assignment_status("ACTIVE") == AssignmentStatus.ACTIVE
    assert parse_assignment_status(" closed ") == AssignmentStatus.CLOSED


def test_parse_assignment_status_invalid():
    with pytest.raises(HTTPException) as exc:
        parse_assignment_status("invalid")

    assert exc.value.status_code == 400
    assert exc.value.detail == "Status invalid."


@pytest.mark.asyncio
async def test_get_user_or_404_returns_user():
    user = make_user()

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(user)

    result = await get_user_or_404(db, 1)

    assert result == user


@pytest.mark.asyncio
async def test_get_user_or_404_not_found():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    with pytest.raises(HTTPException) as exc:
        await get_user_or_404(db, 99)

    assert exc.value.status_code == 404
    assert exc.value.detail == "User not found."


@pytest.mark.asyncio
async def test_get_vehicle_or_404_returns_vehicle():
    vehicle = make_vehicle()

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(vehicle)

    result = await get_vehicle_or_404(db, 10)

    assert result == vehicle


@pytest.mark.asyncio
async def test_get_vehicle_or_404_not_found():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    with pytest.raises(HTTPException) as exc:
        await get_vehicle_or_404(db, 99)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Vehicle not found."


@pytest.mark.asyncio
async def test_get_assignment_or_404_returns_assignment():
    assignment = make_assignment()

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(assignment)

    result = await get_assignment_or_404(db, 100)

    assert result == assignment


@pytest.mark.asyncio
async def test_get_assignment_or_404_not_found():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    with pytest.raises(HTTPException) as exc:
        await get_assignment_or_404(db, 999)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Assignment not found."


@pytest.mark.asyncio
async def test_get_active_assignment_for_user_returns_assignment():
    assignment = make_assignment()

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(assignment)

    result = await get_active_assignment_for_user(db, 1)

    assert result == assignment


@pytest.mark.asyncio
async def test_get_active_assignment_for_vehicle_returns_assignment():
    assignment = make_assignment()

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(assignment)

    result = await get_active_assignment_for_vehicle(db, 10)

    assert result == assignment


def test_build_assignment_read():
    assignment = make_assignment(assignment_id=100, user_id=1, vehicle_id=10)
    user = make_user(user_id=1, full_name="Ana Popescu")
    vehicle = make_vehicle(vehicle_id=10, license_plate="B-123-XYZ", brand="Dacia", model="Logan")

    result = build_assignment_read(assignment, user, vehicle)

    assert result.id == 100
    assert result.user_id == 1
    assert result.user_name == "Ana Popescu"
    assert result.vehicle_id == 10
    assert result.vehicle_license_plate == "B-123-XYZ"
    assert result.vehicle_brand == "Dacia"
    assert result.vehicle_model == "Logan"
    assert result.status == "active"


@pytest.mark.asyncio
async def test_create_assignment_user_inactive(monkeypatch):
    user = make_user(user_id=1, is_active=False)
    vehicle = make_vehicle(vehicle_id=10)

    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_assignments_admin.get_user_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_assignments_admin.get_vehicle_or_404",
        AsyncMock(return_value=vehicle),
    )

    db = AsyncMock()
    payload = make_create_payload(user_id=1, vehicle_id=10)

    with pytest.raises(HTTPException) as exc:
        await create_assignment(payload=payload, db=db, _=True)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Nu poți atribui o mașină unui utilizator inactiv."


@pytest.mark.asyncio
async def test_create_assignment_user_already_has_vehicle(monkeypatch):
    user = make_user(user_id=1, is_active=True)
    vehicle = make_vehicle(vehicle_id=10)
    existing_assignment = make_assignment(assignment_id=200, user_id=1, vehicle_id=99)

    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_assignments_admin.get_user_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_assignments_admin.get_vehicle_or_404",
        AsyncMock(return_value=vehicle),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_assignments_admin.get_active_assignment_for_user",
        AsyncMock(return_value=existing_assignment),
    )

    db = AsyncMock()
    payload = make_create_payload(user_id=1, vehicle_id=10)

    with pytest.raises(HTTPException) as exc:
        await create_assignment(payload=payload, db=db, _=True)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Utilizatorul are deja o mașină atribuită."


@pytest.mark.asyncio
async def test_create_assignment_vehicle_already_assigned(monkeypatch):
    user = make_user(user_id=1, is_active=True)
    vehicle = make_vehicle(vehicle_id=10)
    existing_assignment = make_assignment(assignment_id=200, user_id=2, vehicle_id=10)

    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_assignments_admin.get_user_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_assignments_admin.get_vehicle_or_404",
        AsyncMock(return_value=vehicle),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_assignments_admin.get_active_assignment_for_user",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_assignments_admin.get_active_assignment_for_vehicle",
        AsyncMock(return_value=existing_assignment),
    )

    db = AsyncMock()
    payload = make_create_payload(user_id=1, vehicle_id=10)

    with pytest.raises(HTTPException) as exc:
        await create_assignment(payload=payload, db=db, _=True)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Mașina este deja atribuită altui utilizator."


@pytest.mark.asyncio
async def test_create_assignment_success(monkeypatch):
    user = make_user(user_id=1, full_name="Ana Popescu", is_active=True)
    vehicle = make_vehicle(vehicle_id=10, license_plate="B-123-XYZ")

    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_assignments_admin.get_user_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_assignments_admin.get_vehicle_or_404",
        AsyncMock(return_value=vehicle),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_assignments_admin.get_active_assignment_for_user",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_assignments_admin.get_active_assignment_for_vehicle",
        AsyncMock(return_value=None),
    )

    db = AsyncMock()
    db.add = Mock()

    async def refresh_side_effect(obj):
        obj.id = 300
        obj.started_at = datetime(2026, 3, 30, 9, 0, tzinfo=timezone.utc)

    db.refresh.side_effect = refresh_side_effect

    payload = make_create_payload(user_id=1, vehicle_id=10)

    result = await create_assignment(payload=payload, db=db, _=True)

    assert result.id == 300
    assert result.user_id == 1
    assert result.user_name == "Ana Popescu"
    assert result.vehicle_id == 10
    assert result.vehicle_license_plate == "B-123-XYZ"
    assert result.status == "active"

    db.add.assert_called_once()
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once()


@pytest.mark.asyncio
async def test_list_assignments_without_filters():
    user = make_user(user_id=1, full_name="Ana")
    vehicle = make_vehicle(vehicle_id=10, license_plate="B-123-XYZ")
    assignment = make_assignment(assignment_id=100, user_id=1, vehicle_id=10)

    db = AsyncMock()
    db.execute.return_value = FakeResult([
        (assignment, user, vehicle),
    ])

    result = await list_assignments(
        status_filter=None,
        user_id=None,
        vehicle_id=None,
        db=db,
        _=True,
    )

    assert len(result.assignments) == 1
    assert result.assignments[0].id == 100
    assert result.assignments[0].user_name == "Ana"
    assert result.assignments[0].vehicle_license_plate == "B-123-XYZ"


@pytest.mark.asyncio
async def test_list_assignments_with_status_filter():
    user = make_user(user_id=1, full_name="Ana")
    vehicle = make_vehicle(vehicle_id=10)
    assignment = make_assignment(assignment_id=100, status=AssignmentStatus.CLOSED)

    db = AsyncMock()
    db.execute.return_value = FakeResult([
        (assignment, user, vehicle),
    ])

    result = await list_assignments(
        status_filter="closed",
        user_id=None,
        vehicle_id=None,
        db=db,
        _=True,
    )

    assert len(result.assignments) == 1
    assert result.assignments[0].status == "closed"


@pytest.mark.asyncio
async def test_close_assignment_already_closed(monkeypatch):
    assignment = make_assignment(
        assignment_id=100,
        status=AssignmentStatus.CLOSED,
        ended_at=datetime(2026, 3, 29, 18, 0, tzinfo=timezone.utc),
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_assignments_admin.get_assignment_or_404",
        AsyncMock(return_value=assignment),
    )

    db = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await close_assignment(assignment_id=100, db=db, _=True)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Assignment-ul este deja închis."


@pytest.mark.asyncio
async def test_close_assignment_success(monkeypatch):
    assignment = make_assignment(
        assignment_id=100,
        status=AssignmentStatus.ACTIVE,
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_assignments_admin.get_assignment_or_404",
        AsyncMock(return_value=assignment),
    )

    db = AsyncMock()

    result = await close_assignment(assignment_id=100, db=db, _=True)

    assert result.id == 100
    assert result.status == "closed"
    assert result.ended_at is not None

    assert assignment.status == AssignmentStatus.CLOSED
    assert assignment.ended_at is not None

    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(assignment)


@pytest.mark.asyncio
async def test_delete_closed_assignment_active_forbidden(monkeypatch):
    assignment = make_assignment(
        assignment_id=100,
        status=AssignmentStatus.ACTIVE,
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_assignments_admin.get_assignment_or_404",
        AsyncMock(return_value=assignment),
    )

    db = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await delete_closed_assignment(assignment_id=100, db=db, _=True)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Nu poți șterge un assignment activ. Închide-l mai întâi."


@pytest.mark.asyncio
async def test_delete_closed_assignment_success(monkeypatch):
    assignment = make_assignment(
        assignment_id=100,
        status=AssignmentStatus.CLOSED,
        ended_at=datetime(2026, 3, 29, 18, 0, tzinfo=timezone.utc),
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_assignments_admin.get_assignment_or_404",
        AsyncMock(return_value=assignment),
    )

    db = AsyncMock()

    response = await delete_closed_assignment(assignment_id=100, db=db, _=True)

    assert response.status_code == 204
    db.delete.assert_awaited_once_with(assignment)
    db.commit.assert_awaited_once()