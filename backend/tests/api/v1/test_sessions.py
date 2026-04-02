from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.sessions import (
    ensure_session_belongs_to_user,
    get_assignment_or_404,
    get_handover_report,
    get_session_page,
    is_handover_end_completed,
    is_handover_start_completed,
    save_handover_end,
    save_handover_start,
)


class FakeScalarResult:
    def __init__(self, item):
        self._item = item

    def scalar_one_or_none(self):
        return self._item


def make_user(user_id=1, unique_code="EMP001", full_name="Ana Popescu"):
    return SimpleNamespace(
        id=user_id,
        unique_code=unique_code,
        full_name=full_name,
    )


def make_vehicle(
    vehicle_id=10,
    brand="Dacia",
    model="Logan",
    license_plate="B-123-XYZ",
    year=2022,
    status="active",
    current_mileage=120000,
):
    return SimpleNamespace(
        id=vehicle_id,
        brand=brand,
        model=model,
        license_plate=license_plate,
        year=year,
        status=SimpleNamespace(value=status),
        current_mileage=current_mileage,
    )


def make_assignment(
    assignment_id=100,
    user_id=1,
    vehicle_id=10,
    status="active",
    started_at=None,
    ended_at=None,
    user=None,
    vehicle=None,
):
    return SimpleNamespace(
        id=assignment_id,
        user_id=user_id,
        vehicle_id=vehicle_id,
        status=SimpleNamespace(value=status),
        started_at=started_at or datetime(2026, 3, 30, 8, 0, tzinfo=UTC),
        ended_at=ended_at,
        user=user,
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


def make_start_payload(
    user_code="EMP001",
    mileage_start=120100,
    dashboard_warnings_start="none",
    damage_notes_start="none",
    notes_start="ok",
    has_documents=True,
    has_medkit=True,
    has_extinguisher=True,
    has_warning_triangle=True,
    has_spare_wheel=True,
):
    return SimpleNamespace(
        user_code=user_code,
        mileage_start=mileage_start,
        dashboard_warnings_start=dashboard_warnings_start,
        damage_notes_start=damage_notes_start,
        notes_start=notes_start,
        has_documents=has_documents,
        has_medkit=has_medkit,
        has_extinguisher=has_extinguisher,
        has_warning_triangle=has_warning_triangle,
        has_spare_wheel=has_spare_wheel,
    )


def make_end_payload(
    user_code="EMP001",
    mileage_end=120500,
    dashboard_warnings_end="none",
    damage_notes_end="none",
    notes_end="ok",
):
    return SimpleNamespace(
        user_code=user_code,
        mileage_end=mileage_end,
        dashboard_warnings_end=dashboard_warnings_end,
        damage_notes_end=damage_notes_end,
        notes_end=notes_end,
    )


def make_handover_start_response(report):
    return SimpleNamespace(
        assignment_id=report.assignment_id,
        mileage_start=report.mileage_start,
        dashboard_warnings_start=report.dashboard_warnings_start,
        damage_notes_start=report.damage_notes_start,
        notes_start=report.notes_start,
        has_documents=report.has_documents,
        has_medkit=report.has_medkit,
        has_extinguisher=report.has_extinguisher,
        has_warning_triangle=report.has_warning_triangle,
        has_spare_wheel=report.has_spare_wheel,
    )


def make_handover_end_response(report):
    return SimpleNamespace(
        assignment_id=report.assignment_id,
        mileage_end=report.mileage_end,
        dashboard_warnings_end=report.dashboard_warnings_end,
        damage_notes_end=report.damage_notes_end,
        notes_end=report.notes_end,
    )


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
    assert exc.value.detail == "Session not found."


@pytest.mark.asyncio
async def test_get_handover_report_returns_report():
    report = make_report()

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(report)

    result = await get_handover_report(db, 100)

    assert result == report


def test_ensure_session_belongs_to_user_ok():
    assignment = make_assignment(user_id=1)
    user = make_user(user_id=1)

    ensure_session_belongs_to_user(assignment, user)


def test_ensure_session_belongs_to_user_raises():
    assignment = make_assignment(user_id=2)
    user = make_user(user_id=1)

    with pytest.raises(HTTPException) as exc:
        ensure_session_belongs_to_user(assignment, user)

    assert exc.value.status_code == 403
    assert exc.value.detail == "Nu ai voie să accesezi această sesiune."


def test_is_handover_start_completed_false():
    report = make_report()

    assert is_handover_start_completed(report) is False


def test_is_handover_start_completed_true():
    report = make_report(mileage_start=120000)

    assert is_handover_start_completed(report) is True


def test_is_handover_end_completed_false():
    report = make_report()

    assert is_handover_end_completed(report) is False


def test_is_handover_end_completed_true():
    report = make_report(mileage_end=120500)

    assert is_handover_end_completed(report) is True


@pytest.mark.asyncio
async def test_get_session_page_without_previous_assignment_or_report(monkeypatch):
    user = make_user(user_id=1, unique_code="EMP001")
    vehicle = make_vehicle(vehicle_id=10)
    assignment = make_assignment(
        assignment_id=100,
        user_id=1,
        vehicle_id=10,
        user=user,
        vehicle=vehicle,
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_assignment_or_404",
        AsyncMock(return_value=assignment),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_handover_report",
        AsyncMock(return_value=None),
    )

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    result = await get_session_page(assignment_id=100, user_code="EMP001", db=db)

    assert result.session.assignment_id == 100
    assert result.session.status == "active"
    assert result.user.id == 1
    assert result.vehicle.id == 10
    assert result.previous_handover_report is None
    assert result.handover_start is None
    assert result.handover_end is None

    db.refresh.assert_awaited_once_with(assignment, attribute_names=["user", "vehicle"])


@pytest.mark.asyncio
async def test_get_session_page_with_previous_assignment_and_report(monkeypatch):
    user = make_user(user_id=1, unique_code="EMP001", full_name="Ana")
    vehicle = make_vehicle(vehicle_id=10, brand="VW", model="Golf", license_plate="B-999-XYZ")
    assignment = make_assignment(
        assignment_id=100,
        user_id=1,
        vehicle_id=10,
        user=user,
        vehicle=vehicle,
    )

    previous_user = make_user(user_id=2, unique_code="EMP002", full_name="Mihai")
    previous_assignment = make_assignment(
        assignment_id=90,
        user_id=2,
        vehicle_id=10,
        started_at=datetime(2026, 3, 29, 8, 0, tzinfo=UTC),
        ended_at=datetime(2026, 3, 29, 18, 0, tzinfo=UTC),
        user=previous_user,
    )

    report = make_report(
        assignment_id=100,
        mileage_start=120100,
        dashboard_warnings_start="none",
        damage_notes_start="small scratch",
        notes_start="ok",
        has_documents=True,
        mileage_end=120500,
        dashboard_warnings_end="none",
        damage_notes_end="same scratch",
        notes_end="returned ok",
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_assignment_or_404",
        AsyncMock(return_value=assignment),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_handover_report",
        AsyncMock(return_value=report),
    )

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(previous_assignment)

    result = await get_session_page(assignment_id=100, user_code="EMP001", db=db)

    assert result.session.assignment_id == 100
    assert result.user.full_name == "Ana"
    assert result.vehicle.license_plate == "B-999-XYZ"

    assert result.previous_handover_report is not None
    assert result.previous_handover_report.assignment_id == 90
    assert result.previous_handover_report.previous_driver_name == "Mihai"

    assert result.handover_start is not None
    assert result.handover_start.mileage_start == 120100
    assert result.handover_start.is_completed is True

    assert result.handover_end is not None
    assert result.handover_end.mileage_end == 120500
    assert result.handover_end.is_completed is True

    assert db.refresh.await_count == 2


@pytest.mark.asyncio
async def test_save_handover_start_already_completed(monkeypatch):
    user = make_user(user_id=1)
    assignment = make_assignment(assignment_id=100, user_id=1)
    report = make_report(assignment_id=100, mileage_start=120000)

    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_assignment_or_404",
        AsyncMock(return_value=assignment),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_handover_report",
        AsyncMock(return_value=report),
    )

    db = AsyncMock()
    payload = make_start_payload()

    with pytest.raises(HTTPException) as exc:
        await save_handover_start(assignment_id=100, payload=payload, db=db)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Datele de preluare au fost deja salvate."


@pytest.mark.asyncio
async def test_save_handover_start_invalid_mileage(monkeypatch):
    user = make_user(user_id=1)
    vehicle = make_vehicle(current_mileage=120000)
    assignment = make_assignment(assignment_id=100, user_id=1, vehicle=vehicle)

    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_assignment_or_404",
        AsyncMock(return_value=assignment),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_handover_report",
        AsyncMock(return_value=None),
    )

    db = AsyncMock()
    payload = make_start_payload(mileage_start=119000)

    with pytest.raises(HTTPException) as exc:
        await save_handover_start(assignment_id=100, payload=payload, db=db)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Kilometri invalizi."


@pytest.mark.asyncio
async def test_save_handover_start_creates_report(monkeypatch):
    user = make_user(user_id=1)
    vehicle = make_vehicle(current_mileage=120000)
    assignment = make_assignment(assignment_id=100, user_id=1, vehicle=vehicle)

    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_assignment_or_404",
        AsyncMock(return_value=assignment),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_handover_report",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.HandoverStartResponseSchema.model_validate",
        lambda report: make_handover_start_response(report),
    )

    db = AsyncMock()
    db.add = Mock()

    async def refresh_side_effect(*args, **kwargs):
        return None

    db.refresh.side_effect = refresh_side_effect

    payload = make_start_payload(mileage_start=120100)

    result = await save_handover_start(assignment_id=100, payload=payload, db=db)

    assert result.assignment_id == 100
    assert result.mileage_start == 120100
    assert result.has_documents is True

    db.add.assert_called_once()
    db.commit.assert_awaited_once()
    assert db.refresh.await_count == 2


@pytest.mark.asyncio
async def test_save_handover_start_updates_existing_report(monkeypatch):
    user = make_user(user_id=1)
    vehicle = make_vehicle(current_mileage=120000)
    assignment = make_assignment(assignment_id=100, user_id=1, vehicle=vehicle)
    report = make_report(assignment_id=100)

    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_assignment_or_404",
        AsyncMock(return_value=assignment),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_handover_report",
        AsyncMock(return_value=report),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.HandoverStartResponseSchema.model_validate",
        lambda r: make_handover_start_response(r),
    )

    db = AsyncMock()
    payload = make_start_payload(mileage_start=120200, notes_start="updated")

    result = await save_handover_start(assignment_id=100, payload=payload, db=db)

    assert result.mileage_start == 120200
    assert report.notes_start == "updated"
    db.commit.assert_awaited_once()
    assert db.refresh.await_count == 2


@pytest.mark.asyncio
async def test_save_handover_end_missing_start(monkeypatch):
    user = make_user(user_id=1)
    assignment = make_assignment(assignment_id=100, user_id=1)

    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_assignment_or_404",
        AsyncMock(return_value=assignment),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_handover_report",
        AsyncMock(return_value=None),
    )

    db = AsyncMock()
    payload = make_end_payload()

    with pytest.raises(HTTPException) as exc:
        await save_handover_end(assignment_id=100, payload=payload, db=db)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Lipsesc datele de preluare."


@pytest.mark.asyncio
async def test_save_handover_end_invalid_mileage(monkeypatch):
    user = make_user(user_id=1)
    assignment = make_assignment(assignment_id=100, user_id=1)
    report = make_report(assignment_id=100, mileage_start=120000)

    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_assignment_or_404",
        AsyncMock(return_value=assignment),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_handover_report",
        AsyncMock(return_value=report),
    )

    db = AsyncMock()
    payload = make_end_payload(mileage_end=119000)

    with pytest.raises(HTTPException) as exc:
        await save_handover_end(assignment_id=100, payload=payload, db=db)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Kilometri invalizi."


@pytest.mark.asyncio
async def test_save_handover_end_success(monkeypatch):
    user = make_user(user_id=1)
    assignment = make_assignment(assignment_id=100, user_id=1)
    report = make_report(assignment_id=100, mileage_start=120000)

    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_assignment_or_404",
        AsyncMock(return_value=assignment),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.get_handover_report",
        AsyncMock(return_value=report),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.sessions.HandoverEndResponseSchema.model_validate",
        lambda r: make_handover_end_response(r),
    )

    db = AsyncMock()
    payload = make_end_payload(
        mileage_end=120500,
        dashboard_warnings_end="none",
        damage_notes_end="none",
        notes_end="ok",
    )

    result = await save_handover_end(assignment_id=100, payload=payload, db=db)

    assert result.assignment_id == 100
    assert result.mileage_end == 120500
    assert report.notes_end == "ok"

    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(report)
