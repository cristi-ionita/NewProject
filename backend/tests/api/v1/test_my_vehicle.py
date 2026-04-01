from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.my_vehicle import (
    build_handover_end,
    build_handover_start,
    build_issue,
    ensure_user_is_active,
    get_active_assignment_for_user,
    get_handover_report,
    get_my_vehicle_page,
    get_user_by_code_or_404,
)


class FakeScalarResult:
    def __init__(self, item):
        self._item = item

    def scalar_one_or_none(self):
        return self._item


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


def make_user(
    user_id=1,
    unique_code="EMP001",
    is_active=True,
    full_name="Ana Popescu",
):
    return SimpleNamespace(
        id=user_id,
        unique_code=unique_code,
        is_active=is_active,
        full_name=full_name,
    )


def make_vehicle(
    vehicle_id=10,
    brand="Dacia",
    model="Logan",
    license_plate="B-123-XYZ",
    year=2022,
    vin="VIN123456789",
    status="active",
    current_mileage=120000,
):
    vehicle_status = SimpleNamespace(value=status) if not hasattr(status, "value") else status
    return SimpleNamespace(
        id=vehicle_id,
        brand=brand,
        model=model,
        license_plate=license_plate,
        year=year,
        vin=vin,
        status=vehicle_status,
        current_mileage=current_mileage,
    )


def make_assignment(
    assignment_id=100,
    user_id=1,
    vehicle_id=10,
    status="active",
    started_at=None,
    ended_at=None,
    vehicle=None,
):
    assignment_status = SimpleNamespace(value=status) if not hasattr(status, "value") else status
    return SimpleNamespace(
        id=assignment_id,
        user_id=user_id,
        vehicle_id=vehicle_id,
        status=assignment_status,
        started_at=started_at or datetime(2026, 3, 30, 8, 0, tzinfo=timezone.utc),
        ended_at=ended_at,
        vehicle=vehicle,
    )


def make_report(
    assignment_id=100,
    mileage_start=None,
    dashboard_warnings_start=None,
    damage_notes_start=None,
    notes_start=None,
    has_documents=False,
    has_medkit=False,
    has_extinguisher=False,
    has_warning_triangle=False,
    has_spare_wheel=False,
    mileage_end=None,
    dashboard_warnings_end=None,
    damage_notes_end=None,
    notes_end=None,
):
    return SimpleNamespace(
        assignment_id=assignment_id,
        mileage_start=mileage_start,
        dashboard_warnings_start=dashboard_warnings_start,
        damage_notes_start=damage_notes_start,
        notes_start=notes_start,
        has_documents=has_documents,
        has_medkit=has_medkit,
        has_extinguisher=has_extinguisher,
        has_warning_triangle=has_warning_triangle,
        has_spare_wheel=has_spare_wheel,
        mileage_end=mileage_end,
        dashboard_warnings_end=dashboard_warnings_end,
        damage_notes_end=damage_notes_end,
        notes_end=notes_end,
    )


def make_issue_obj(
    issue_id=1,
    status="open",
    need_service_in_km=5000,
    need_brakes=False,
    need_tires=False,
    need_oil=True,
    dashboard_checks="check engine",
    other_problems="minor issue",
    created_at=None,
    updated_at=None,
):
    issue_status = SimpleNamespace(value=status) if not hasattr(status, "value") else status
    return SimpleNamespace(
        id=issue_id,
        status=issue_status,
        need_service_in_km=need_service_in_km,
        need_brakes=need_brakes,
        need_tires=need_tires,
        need_oil=need_oil,
        dashboard_checks=dashboard_checks,
        other_problems=other_problems,
        created_at=created_at or datetime(2026, 3, 29, 10, 0, tzinfo=timezone.utc),
        updated_at=updated_at or datetime(2026, 3, 29, 12, 0, tzinfo=timezone.utc),
    )


def test_ensure_user_is_active_ok():
    user = make_user(is_active=True)
    ensure_user_is_active(user)


def test_ensure_user_is_active_raises():
    user = make_user(is_active=False)

    with pytest.raises(HTTPException) as exc:
        ensure_user_is_active(user)

    assert exc.value.status_code == 403
    assert exc.value.detail == "User inactiv."


@pytest.mark.asyncio
async def test_get_user_by_code_or_404_returns_user():
    user = make_user(unique_code="EMP001")

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(user)

    result = await get_user_by_code_or_404(db, "EMP001")

    assert result == user


@pytest.mark.asyncio
async def test_get_user_by_code_or_404_not_found():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    with pytest.raises(HTTPException) as exc:
        await get_user_by_code_or_404(db, "EMP001")

    assert exc.value.status_code == 404
    assert exc.value.detail == "User not found."


@pytest.mark.asyncio
async def test_get_active_assignment_for_user_returns_assignment():
    assignment = make_assignment()

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(assignment)

    result = await get_active_assignment_for_user(db, 1)

    assert result == assignment


@pytest.mark.asyncio
async def test_get_handover_report_returns_report():
    report = make_report()

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(report)

    result = await get_handover_report(db, 100)

    assert result == report


def test_build_handover_start_not_completed():
    report = make_report()

    result = build_handover_start(report)

    assert result.mileage_start is None
    assert result.is_completed is False


def test_build_handover_start_completed():
    report = make_report(
        mileage_start=120000,
        has_documents=True,
    )

    result = build_handover_start(report)

    assert result.mileage_start == 120000
    assert result.has_documents is True
    assert result.is_completed is True


def test_build_handover_end_not_completed():
    report = make_report()

    result = build_handover_end(report)

    assert result.mileage_end is None
    assert result.is_completed is False


def test_build_handover_end_completed():
    report = make_report(
        mileage_end=120500,
        notes_end="Totul ok",
    )

    result = build_handover_end(report)

    assert result.mileage_end == 120500
    assert result.notes_end == "Totul ok"
    assert result.is_completed is True


def test_build_issue():
    issue = make_issue_obj(
        issue_id=5,
        status="in_progress",
        other_problems="Brakes noise",
    )

    result = build_issue(issue)

    assert result.id == 5
    assert result.status == "in_progress"
    assert result.other_problems == "Brakes noise"


@pytest.mark.asyncio
async def test_get_my_vehicle_page_without_assignment(monkeypatch):
    user = make_user(user_id=1, unique_code="EMP001", is_active=True)

    monkeypatch.setattr(
        "app.api.v1.endpoints.my_vehicle.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.my_vehicle.get_active_assignment_for_user",
        AsyncMock(return_value=None),
    )

    db = AsyncMock()

    result = await get_my_vehicle_page(code="EMP001", db=db)

    assert result.user.id == 1
    assert result.vehicle is None
    assert result.assignment is None
    assert result.handover_start is None
    assert result.handover_end is None
    assert result.open_issues == []


@pytest.mark.asyncio
async def test_get_my_vehicle_page_with_assignment_and_report(monkeypatch):
    user = make_user(user_id=1, unique_code="EMP001", is_active=True)

    vehicle = make_vehicle(
        vehicle_id=10,
        brand="VW",
        model="Golf",
        license_plate="B-999-XYZ",
        year=2021,
        vin="VIN999",
        status="active",
        current_mileage=150000,
    )

    assignment = make_assignment(
        assignment_id=200,
        user_id=1,
        vehicle_id=10,
        status="active",
        vehicle=vehicle,
    )

    report = make_report(
        assignment_id=200,
        mileage_start=149500,
        dashboard_warnings_start="none",
        damage_notes_start="small scratch",
        notes_start="ok",
        has_documents=True,
        has_medkit=True,
        mileage_end=150000,
        dashboard_warnings_end="none",
        damage_notes_end="same scratch",
        notes_end="returned ok",
    )

    issue_1 = make_issue_obj(issue_id=1, status="open", other_problems="Oil change")
    issue_2 = make_issue_obj(issue_id=2, status="in_progress", other_problems="Brake pads")

    monkeypatch.setattr(
        "app.api.v1.endpoints.my_vehicle.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.my_vehicle.get_active_assignment_for_user",
        AsyncMock(return_value=assignment),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.my_vehicle.get_handover_report",
        AsyncMock(return_value=report),
    )

    db = AsyncMock()
    db.execute.return_value = FakeResult([issue_1, issue_2])

    result = await get_my_vehicle_page(code="EMP001", db=db)

    assert result.user.id == 1

    assert result.vehicle.id == 10
    assert result.vehicle.brand == "VW"
    assert result.vehicle.model == "Golf"
    assert result.vehicle.license_plate == "B-999-XYZ"
    assert result.vehicle.status == "active"
    assert result.vehicle.current_mileage == 150000

    assert result.assignment.id == 200
    assert result.assignment.status == "active"

    assert result.handover_start is not None
    assert result.handover_start.mileage_start == 149500
    assert result.handover_start.has_documents is True
    assert result.handover_start.is_completed is True

    assert result.handover_end is not None
    assert result.handover_end.mileage_end == 150000
    assert result.handover_end.notes_end == "returned ok"
    assert result.handover_end.is_completed is True

    assert len(result.open_issues) == 2
    assert result.open_issues[0].id == 1
    assert result.open_issues[0].status == "open"
    assert result.open_issues[1].id == 2
    assert result.open_issues[1].status == "in_progress"

    db.refresh.assert_awaited_once_with(assignment, attribute_names=["vehicle"])


@pytest.mark.asyncio
async def test_get_my_vehicle_page_with_assignment_without_report(monkeypatch):
    user = make_user(user_id=1, unique_code="EMP001", is_active=True)
    vehicle = make_vehicle(vehicle_id=10)
    assignment = make_assignment(
        assignment_id=200,
        user_id=1,
        vehicle_id=10,
        status="active",
        vehicle=vehicle,
    )

    issue_1 = make_issue_obj(issue_id=1, status="open")

    monkeypatch.setattr(
        "app.api.v1.endpoints.my_vehicle.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.my_vehicle.get_active_assignment_for_user",
        AsyncMock(return_value=assignment),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.my_vehicle.get_handover_report",
        AsyncMock(return_value=None),
    )

    db = AsyncMock()
    db.execute.return_value = FakeResult([issue_1])

    result = await get_my_vehicle_page(code="EMP001", db=db)

    assert result.vehicle is not None
    assert result.assignment is not None
    assert result.handover_start is None
    assert result.handover_end is None
    assert len(result.open_issues) == 1