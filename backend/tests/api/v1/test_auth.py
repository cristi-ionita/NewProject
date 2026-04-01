import pytest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

from fastapi import HTTPException

from app.api.v1.endpoints.auth import (
    admin_login,
    end_session,
    get_active_assignment_for_user,
    get_active_assignment_for_vehicle,
    get_active_session,
    get_user_by_login_identifier,
    login,
    start_session,
    AdminLoginRequestSchema,
)
from app.db.models.vehicle_assignment import AssignmentStatus


class FakeScalarResult:
    def __init__(self, item):
        self._item = item

    def scalar_one_or_none(self):
        return self._item


def make_user(
    user_id: int,
    full_name: str = "Cristi Popescu",
    shift_number: str = "1",
    unique_code: str = "EMP001",
    role: str = "employee",
    pin_hash: str = "hashed-1234",
):
    return SimpleNamespace(
        id=user_id,
        full_name=full_name,
        shift_number=shift_number,
        unique_code=unique_code,
        role=role,
        pin_hash=pin_hash,
    )


def make_vehicle(
    vehicle_id: int,
    license_plate: str = "B-123-XYZ",
    brand: str = "Dacia",
    model: str = "Logan",
    current_mileage: int = 100000,
):
    return SimpleNamespace(
        id=vehicle_id,
        license_plate=license_plate,
        brand=brand,
        model=model,
        current_mileage=current_mileage,
    )


def make_assignment(
    assignment_id: int,
    user_id: int,
    vehicle_id: int,
    status=AssignmentStatus.ACTIVE,
    started_at=None,
    ended_at=None,
    vehicle=None,
):
    return SimpleNamespace(
        id=assignment_id,
        user_id=user_id,
        vehicle_id=vehicle_id,
        status=status,
        started_at=started_at or datetime(2026, 3, 30, 8, 0, tzinfo=timezone.utc),
        ended_at=ended_at,
        vehicle=vehicle,
    )


def make_report(
    assignment_id: int,
    mileage_end=100500,
    dashboard_warnings_end="none",
    damage_notes_end="none",
    notes_end="ok",
):
    return SimpleNamespace(
        assignment_id=assignment_id,
        mileage_end=mileage_end,
        dashboard_warnings_end=dashboard_warnings_end,
        damage_notes_end=damage_notes_end,
        notes_end=notes_end,
    )


@pytest.mark.asyncio
async def test_get_active_assignment_for_user_returns_assignment():
    assignment = make_assignment(1, user_id=10, vehicle_id=20)

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(assignment)

    result = await get_active_assignment_for_user(db, 10)

    assert result == assignment


@pytest.mark.asyncio
async def test_get_active_assignment_for_vehicle_returns_assignment():
    assignment = make_assignment(2, user_id=10, vehicle_id=20)

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(assignment)

    result = await get_active_assignment_for_vehicle(db, 20)

    assert result == assignment


@pytest.mark.asyncio
async def test_get_user_by_login_identifier_returns_none_for_blank_identifier():
    db = AsyncMock()

    result = await get_user_by_login_identifier(db, "   ")

    assert result is None
    db.execute.assert_not_called()


@pytest.mark.asyncio
async def test_get_user_by_login_identifier_returns_user():
    user = make_user(1)

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(user)

    result = await get_user_by_login_identifier(db, "EMP001")

    assert result == user


@pytest.mark.asyncio
async def test_admin_login_success(monkeypatch):
    monkeypatch.setattr("app.api.v1.endpoints.auth.settings.ADMIN_PASSWORD", "secret")
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.generate_admin_token",
        lambda password: f"token-for-{password}",
    )

    payload = AdminLoginRequestSchema(password="secret")

    result = await admin_login(payload)

    assert result.token == "token-for-secret"


@pytest.mark.asyncio
async def test_admin_login_invalid_password(monkeypatch):
    monkeypatch.setattr("app.api.v1.endpoints.auth.settings.ADMIN_PASSWORD", "secret")

    payload = AdminLoginRequestSchema(password="wrong")

    with pytest.raises(HTTPException) as exc:
        await admin_login(payload)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Parolă admin incorectă."


@pytest.mark.asyncio
async def test_login_user_not_found(monkeypatch):
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_user_by_login_identifier",
        AsyncMock(return_value=None),
    )

    payload = SimpleNamespace(identifier="EMP001", pin="1234")
    db = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await login(payload, db)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Utilizatorul nu există."


@pytest.mark.asyncio
async def test_login_invalid_pin(monkeypatch):
    user = make_user(1, pin_hash="hashed-correct")

    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_user_by_login_identifier",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.ensure_user_is_active",
        lambda user: None,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.hash_pin",
        lambda pin: "hashed-wrong",
    )

    payload = SimpleNamespace(identifier="EMP001", pin="1234")
    db = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await login(payload, db)

    assert exc.value.status_code == 401
    assert exc.value.detail == "PIN incorect."


@pytest.mark.asyncio
async def test_login_success(monkeypatch):
    user = make_user(
        1,
        full_name="Ana Popescu",
        shift_number="2",
        unique_code="EMP001",
        role="employee",
        pin_hash="hashed-1234",
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_user_by_login_identifier",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.ensure_user_is_active",
        lambda user: None,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.hash_pin",
        lambda pin: "hashed-1234",
    )

    payload = SimpleNamespace(identifier="EMP001", pin="1234")
    db = AsyncMock()

    result = await login(payload, db)

    assert result.user_id == 1
    assert result.full_name == "Ana Popescu"
    assert result.shift_number == "2"
    assert result.unique_code == "EMP001"
    assert result.role == "employee"


@pytest.mark.asyncio
async def test_get_active_session_returns_false_when_no_active_assignment(monkeypatch):
    user = make_user(1)

    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_active_assignment_for_user",
        AsyncMock(return_value=None),
    )

    db = AsyncMock()

    result = await get_active_session("EMP001", db)

    assert result.has_active_session is False


@pytest.mark.asyncio
async def test_get_active_session_returns_assignment_data(monkeypatch):
    user = make_user(1)
    vehicle = make_vehicle(10, "B-123-XYZ", "Dacia", "Logan")
    assignment = make_assignment(
        100,
        user_id=1,
        vehicle_id=10,
        status=AssignmentStatus.ACTIVE,
        vehicle=vehicle,
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_active_assignment_for_user",
        AsyncMock(return_value=assignment),
    )

    db = AsyncMock()

    result = await get_active_session("EMP001", db)

    assert result.has_active_session is True
    assert result.assignment_id == 100
    assert result.vehicle_id == 10
    assert result.license_plate == "B-123-XYZ"
    assert result.brand == "Dacia"
    assert result.model == "Logan"
    assert result.status == "active"
    db.refresh.assert_awaited_once()


@pytest.mark.asyncio
async def test_start_session_vehicle_not_found(monkeypatch):
    user = make_user(1)

    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.ensure_user_is_active",
        lambda user: None,
    )

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    payload = SimpleNamespace(code="EMP001", license_plate="B-123-XYZ")

    with pytest.raises(HTTPException) as exc:
        await start_session(payload, db)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Vehicle not found."


@pytest.mark.asyncio
async def test_start_session_user_already_has_active_assignment(monkeypatch):
    user = make_user(1)
    vehicle = make_vehicle(10)

    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.ensure_user_is_active",
        lambda user: None,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_active_assignment_for_user",
        AsyncMock(return_value=make_assignment(50, 1, 10)),
    )

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(vehicle)

    payload = SimpleNamespace(code="EMP001", license_plate="B-123-XYZ")

    with pytest.raises(HTTPException) as exc:
        await start_session(payload, db)

    assert exc.value.status_code == 400
    assert exc.value.detail == "User already has an active vehicle session."


@pytest.mark.asyncio
async def test_start_session_vehicle_already_assigned(monkeypatch):
    user = make_user(1)
    vehicle = make_vehicle(10)

    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.ensure_user_is_active",
        lambda user: None,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_active_assignment_for_user",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_active_assignment_for_vehicle",
        AsyncMock(return_value=make_assignment(60, 2, 10)),
    )

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(vehicle)

    payload = SimpleNamespace(code="EMP001", license_plate="B-123-XYZ")

    with pytest.raises(HTTPException) as exc:
        await start_session(payload, db)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Vehicle is already assigned."


@pytest.mark.asyncio
async def test_start_session_success(monkeypatch):
    user = make_user(1, full_name="Ana Popescu")
    vehicle = make_vehicle(10, "B-123-XYZ")

    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.ensure_user_is_active",
        lambda user: None,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_active_assignment_for_user",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_active_assignment_for_vehicle",
        AsyncMock(return_value=None),
    )

    db = AsyncMock()
    db.add = Mock()
    db.execute.return_value = FakeScalarResult(vehicle)

    created_assignment = make_assignment(
        200,
        user_id=1,
        vehicle_id=10,
        status=AssignmentStatus.ACTIVE,
        started_at=datetime(2026, 3, 30, 8, 0, tzinfo=timezone.utc),
    )

    async def refresh_side_effect(obj):
        obj.id = created_assignment.id
        obj.started_at = created_assignment.started_at
        obj.status = created_assignment.status

    db.refresh.side_effect = refresh_side_effect

    payload = SimpleNamespace(code="EMP001", license_plate=" B-123-XYZ ")

    result = await start_session(payload, db)

    assert result.assignment_id == 200
    assert result.user_id == 1
    assert result.user_name == "Ana Popescu"
    assert result.vehicle_id == 10
    assert result.license_plate == "B-123-XYZ"
    assert result.status == "active"

    db.add.assert_called_once()
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once()


@pytest.mark.asyncio
async def test_end_session_no_active_session(monkeypatch):
    user = make_user(1)

    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_active_assignment_for_user",
        AsyncMock(return_value=None),
    )

    db = AsyncMock()
    payload = SimpleNamespace(code="EMP001")

    with pytest.raises(HTTPException) as exc:
        await end_session(payload, db)

    assert exc.value.status_code == 404
    assert exc.value.detail == "No active session."


@pytest.mark.asyncio
async def test_end_session_missing_handover_report(monkeypatch):
    user = make_user(1)
    assignment = make_assignment(100, 1, 10)

    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_active_assignment_for_user",
        AsyncMock(return_value=assignment),
    )

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    payload = SimpleNamespace(code="EMP001")

    with pytest.raises(HTTPException) as exc:
        await end_session(payload, db)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Completează predarea înainte."


@pytest.mark.asyncio
async def test_end_session_incomplete_handover_report(monkeypatch):
    user = make_user(1)
    assignment = make_assignment(100, 1, 10)
    report = make_report(
        assignment_id=100,
        mileage_end=100500,
        dashboard_warnings_end="",
        damage_notes_end="none",
        notes_end="ok",
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_active_assignment_for_user",
        AsyncMock(return_value=assignment),
    )

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(report)

    payload = SimpleNamespace(code="EMP001")

    with pytest.raises(HTTPException) as exc:
        await end_session(payload, db)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Date predare incomplete."


@pytest.mark.asyncio
async def test_end_session_invalid_mileage(monkeypatch):
    user = make_user(1)
    vehicle = make_vehicle(10, current_mileage=120000)
    assignment = make_assignment(100, 1, 10, vehicle=vehicle)
    report = make_report(
        assignment_id=100,
        mileage_end=110000,
        dashboard_warnings_end="none",
        damage_notes_end="none",
        notes_end="ok",
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_active_assignment_for_user",
        AsyncMock(return_value=assignment),
    )

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(report)

    payload = SimpleNamespace(code="EMP001")

    with pytest.raises(HTTPException) as exc:
        await end_session(payload, db)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Kilometraj invalid."


@pytest.mark.asyncio
async def test_end_session_success(monkeypatch):
    user = make_user(1)
    vehicle = make_vehicle(10, current_mileage=100000)
    assignment = make_assignment(
        100,
        1,
        10,
        status=AssignmentStatus.ACTIVE,
        vehicle=vehicle,
    )
    report = make_report(
        assignment_id=100,
        mileage_end=100500,
        dashboard_warnings_end="none",
        damage_notes_end="none",
        notes_end="ok",
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.auth.get_active_assignment_for_user",
        AsyncMock(return_value=assignment),
    )

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(report)

    payload = SimpleNamespace(code="EMP001")

    result = await end_session(payload, db)

    assert result.assignment_id == 100
    assert result.user_id == 1
    assert result.vehicle_id == 10
    assert result.status == "closed"
    assert assignment.vehicle.current_mileage == 100500
    assert assignment.status == AssignmentStatus.CLOSED
    assert assignment.ended_at is not None

    assert db.refresh.await_count == 2
    db.commit.assert_awaited_once()