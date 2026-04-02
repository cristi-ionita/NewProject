from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.vehicles import (
    build_vehicle_live_status_item,
    create_vehicle,
    delete_vehicle,
    ensure_unique_license_plate,
    ensure_unique_vin,
    get_active_assignment_for_vehicle,
    get_handover_report,
    get_live_status,
    get_vehicle,
    get_vehicle_history,
    get_vehicle_or_404,
    list_vehicles,
    update_vehicle,
)
from app.db.models.vehicle_assignment import AssignmentStatus


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


def make_vehicle(
    vehicle_id=1,
    brand="Dacia",
    model="Logan",
    license_plate="B-123-XYZ",
    year=2022,
    vin="VIN123",
    status="active",
    current_mileage=120000,
):
    return SimpleNamespace(
        id=vehicle_id,
        brand=brand,
        model=model,
        license_plate=license_plate,
        year=year,
        vin=vin,
        status=SimpleNamespace(value=status),
        current_mileage=current_mileage,
    )


def make_user(
    user_id=1,
    full_name="Ana Popescu",
    shift_number="1",
):
    return SimpleNamespace(
        id=user_id,
        full_name=full_name,
        shift_number=shift_number,
    )


def make_assignment(
    assignment_id=100,
    user_id=1,
    vehicle_id=1,
    status=AssignmentStatus.ACTIVE,
    started_at=None,
    ended_at=None,
    user=None,
):
    return SimpleNamespace(
        id=assignment_id,
        user_id=user_id,
        vehicle_id=vehicle_id,
        status=status,
        started_at=started_at or datetime(2026, 3, 30, 8, 0, tzinfo=UTC),
        ended_at=ended_at,
        user=user,
    )


def make_report(
    assignment_id=100,
    mileage_start=120000,
    mileage_end=120500,
    dashboard_warnings_start="none",
    dashboard_warnings_end="none",
    damage_notes_start="small scratch",
    damage_notes_end="same scratch",
    notes_start="ok",
    notes_end="returned ok",
    has_documents=True,
    has_medkit=True,
    has_extinguisher=True,
    has_warning_triangle=True,
    has_spare_wheel=True,
):
    return SimpleNamespace(
        assignment_id=assignment_id,
        mileage_start=mileage_start,
        mileage_end=mileage_end,
        dashboard_warnings_start=dashboard_warnings_start,
        dashboard_warnings_end=dashboard_warnings_end,
        damage_notes_start=damage_notes_start,
        damage_notes_end=damage_notes_end,
        notes_start=notes_start,
        notes_end=notes_end,
        has_documents=has_documents,
        has_medkit=has_medkit,
        has_extinguisher=has_extinguisher,
        has_warning_triangle=has_warning_triangle,
        has_spare_wheel=has_spare_wheel,
    )


def make_vehicle_schema_response(vehicle):
    return SimpleNamespace(
        id=vehicle.id,
        brand=vehicle.brand,
        model=vehicle.model,
        license_plate=vehicle.license_plate,
        year=vehicle.year,
        vin=vehicle.vin,
        status=vehicle.status.value if hasattr(vehicle.status, "value") else str(vehicle.status),
        current_mileage=vehicle.current_mileage,
    )


def make_create_payload(
    brand="Dacia",
    model="Logan",
    license_plate="B-123-XYZ",
    year=2022,
    vin="VIN123",
    status="active",
    current_mileage=120000,
):
    return SimpleNamespace(
        brand=brand,
        model=model,
        license_plate=license_plate,
        year=year,
        vin=vin,
        status=status,
        current_mileage=current_mileage,
        model_dump=lambda: {
            "brand": brand,
            "model": model,
            "license_plate": license_plate,
            "year": year,
            "vin": vin,
            "status": status,
            "current_mileage": current_mileage,
        },
    )


def make_update_payload(**kwargs):
    return SimpleNamespace(model_dump=lambda exclude_unset=True: kwargs)


@pytest.mark.asyncio
async def test_get_vehicle_or_404_returns_vehicle():
    vehicle = make_vehicle()

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(vehicle)

    result = await get_vehicle_or_404(db, 1)

    assert result == vehicle


@pytest.mark.asyncio
async def test_get_vehicle_or_404_not_found():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    with pytest.raises(HTTPException) as exc:
        await get_vehicle_or_404(db, 999)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Vehicle not found."


@pytest.mark.asyncio
async def test_ensure_unique_license_plate_ok():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    await ensure_unique_license_plate(db, "B-123-XYZ")


@pytest.mark.asyncio
async def test_ensure_unique_license_plate_raises():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(make_vehicle())

    with pytest.raises(HTTPException) as exc:
        await ensure_unique_license_plate(db, "B-123-XYZ")

    assert exc.value.status_code == 400
    assert exc.value.detail == "License plate already exists."


@pytest.mark.asyncio
async def test_ensure_unique_vin_ok():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    await ensure_unique_vin(db, "VIN123")


@pytest.mark.asyncio
async def test_ensure_unique_vin_raises():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(make_vehicle())

    with pytest.raises(HTTPException) as exc:
        await ensure_unique_vin(db, "VIN123")

    assert exc.value.status_code == 400
    assert exc.value.detail == "VIN already exists."


@pytest.mark.asyncio
async def test_get_active_assignment_for_vehicle_returns_assignment():
    assignment = make_assignment()

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(assignment)

    result = await get_active_assignment_for_vehicle(db, 1)

    assert result == assignment


@pytest.mark.asyncio
async def test_get_handover_report_returns_report():
    report = make_report()

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(report)

    result = await get_handover_report(db, 100)

    assert result == report


def test_build_vehicle_live_status_item_free():
    vehicle = make_vehicle(vehicle_id=1)

    result = build_vehicle_live_status_item(vehicle, None)

    assert result.vehicle_id == 1
    assert result.availability == "free"
    assert result.assigned_to_user_id is None
    assert result.active_assignment_id is None


def test_build_vehicle_live_status_item_occupied():
    vehicle = make_vehicle(vehicle_id=1)
    user = make_user(user_id=5, full_name="Mihai", shift_number="2")
    assignment = make_assignment(
        assignment_id=100,
        vehicle_id=1,
        user=user,
    )

    result = build_vehicle_live_status_item(vehicle, assignment)

    assert result.vehicle_id == 1
    assert result.availability == "occupied"
    assert result.assigned_to_user_id == 5
    assert result.assigned_to_name == "Mihai"
    assert result.assigned_to_shift_number == "2"
    assert result.active_assignment_id == 100


@pytest.mark.asyncio
async def test_create_vehicle(monkeypatch):
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicles.ensure_unique_license_plate",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicles.ensure_unique_vin",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicles.VehicleReadSchema.model_validate",
        lambda vehicle: make_vehicle_schema_response(vehicle),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicles.Vehicle",
        lambda **kwargs: SimpleNamespace(**kwargs),
    )

    db = AsyncMock()
    db.add = Mock()

    async def refresh_side_effect(vehicle):
        vehicle.id = 10

    db.refresh.side_effect = refresh_side_effect

    payload = make_create_payload()

    result = await create_vehicle(payload=payload, db=db, _=True)

    assert result.id == 10
    assert result.brand == "Dacia"
    assert result.license_plate == "B-123-XYZ"

    db.add.assert_called_once()
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once()


@pytest.mark.asyncio
async def test_list_vehicles(monkeypatch):
    vehicles = [
        make_vehicle(vehicle_id=1, license_plate="B-111-AAA"),
        make_vehicle(vehicle_id=2, license_plate="B-222-BBB"),
    ]

    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicles.VehicleReadSchema.model_validate",
        lambda vehicle: make_vehicle_schema_response(vehicle),
    )

    db = AsyncMock()
    db.execute.return_value = FakeResult(vehicles)

    result = await list_vehicles(db=db, _=True)

    assert len(result) == 2
    assert result[0].id == 1
    assert result[1].license_plate == "B-222-BBB"


@pytest.mark.asyncio
async def test_update_vehicle(monkeypatch):
    vehicle = make_vehicle(vehicle_id=1)

    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicles.get_vehicle_or_404",
        AsyncMock(return_value=vehicle),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicles.ensure_unique_license_plate",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicles.ensure_unique_vin",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicles.VehicleReadSchema.model_validate",
        lambda v: make_vehicle_schema_response(v),
    )

    db = AsyncMock()
    payload = make_update_payload(
        license_plate="B-999-XYZ",
        vin="VIN999",
        current_mileage=130000,
    )

    result = await update_vehicle(vehicle_id=1, payload=payload, db=db, _=True)

    assert vehicle.license_plate == "B-999-XYZ"
    assert vehicle.vin == "VIN999"
    assert vehicle.current_mileage == 130000
    assert result.license_plate == "B-999-XYZ"

    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(vehicle)


@pytest.mark.asyncio
async def test_delete_vehicle_in_use(monkeypatch):
    vehicle = make_vehicle(vehicle_id=1)
    assignment = make_assignment(vehicle_id=1)

    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicles.get_vehicle_or_404",
        AsyncMock(return_value=vehicle),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicles.get_active_assignment_for_vehicle",
        AsyncMock(return_value=assignment),
    )

    db = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await delete_vehicle(vehicle_id=1, db=db, _=True)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Nu poți șterge mașina. Este în uz."


@pytest.mark.asyncio
async def test_delete_vehicle_success(monkeypatch):
    vehicle = make_vehicle(vehicle_id=1)

    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicles.get_vehicle_or_404",
        AsyncMock(return_value=vehicle),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicles.get_active_assignment_for_vehicle",
        AsyncMock(return_value=None),
    )

    db = AsyncMock()

    response = await delete_vehicle(vehicle_id=1, db=db, _=True)

    assert response.status_code == 204
    db.delete.assert_awaited_once_with(vehicle)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_live_status():
    vehicle_1 = make_vehicle(vehicle_id=1, license_plate="B-111-AAA")
    vehicle_2 = make_vehicle(vehicle_id=2, license_plate="B-222-BBB")

    user = make_user(user_id=10, full_name="Ana", shift_number="1")
    assignment = make_assignment(
        assignment_id=100,
        vehicle_id=1,
        user=user,
    )

    db = AsyncMock()
    db.execute.side_effect = [
        FakeResult([vehicle_1, vehicle_2]),
        FakeResult([assignment]),
    ]

    result = await get_live_status(db=db)

    assert len(result.vehicles) == 2

    first = result.vehicles[0]
    second = result.vehicles[1]

    assert first.vehicle_id == 1
    assert first.availability == "occupied"
    assert first.assigned_to_name == "Ana"

    assert second.vehicle_id == 2
    assert second.availability == "free"

    db.refresh.assert_awaited_once_with(assignment, ["user"])


@pytest.mark.asyncio
async def test_get_vehicle_history(monkeypatch):
    vehicle = make_vehicle(vehicle_id=1)
    user = make_user(user_id=10, full_name="Ana")
    assignment = make_assignment(
        assignment_id=100,
        vehicle_id=1,
        user=user,
        ended_at=datetime(2026, 3, 30, 18, 0, tzinfo=UTC),
    )
    report = make_report(assignment_id=100)

    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicles.get_vehicle_or_404",
        AsyncMock(return_value=vehicle),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicles.get_handover_report",
        AsyncMock(return_value=report),
    )

    db = AsyncMock()
    db.execute.return_value = FakeResult([assignment])

    result = await get_vehicle_history(vehicle_id=1, db=db)

    assert result.vehicle_id == 1
    assert len(result.history) == 1

    item = result.history[0]
    assert item.assignment_id == 100
    assert item.driver_name == "Ana"
    assert item.mileage_start == 120000
    assert item.mileage_end == 120500
    assert item.has_documents is True
    assert item.has_medkit is True

    db.refresh.assert_awaited_once_with(assignment, ["user"])


@pytest.mark.asyncio
async def test_get_vehicle(monkeypatch):
    vehicle = make_vehicle(vehicle_id=1)

    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicles.get_vehicle_or_404",
        AsyncMock(return_value=vehicle),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicles.VehicleReadSchema.model_validate",
        lambda v: make_vehicle_schema_response(v),
    )

    db = AsyncMock()

    result = await get_vehicle(vehicle_id=1, db=db)

    assert result.id == 1
    assert result.license_plate == "B-123-XYZ"


@pytest.mark.asyncio
async def test_ensure_unique_license_plate_excludes_current_vehicle():
    db = AsyncMock()

    fake_result = Mock()
    fake_result.scalar_one_or_none.return_value = None
    db.execute.return_value = fake_result

    await ensure_unique_license_plate(
        db=db,
        license_plate="B-123-XYZ",
        exclude_vehicle_id=1,
    )

    db.execute.assert_called_once()


@pytest.mark.asyncio
async def test_ensure_unique_vin_excludes_current_vehicle():
    db = AsyncMock()

    fake_result = Mock()
    fake_result.scalar_one_or_none.return_value = None
    db.execute.return_value = fake_result

    await ensure_unique_vin(
        db=db,
        vin="WVWZZZ1JZXW000001",
        exclude_vehicle_id=1,
    )

    db.execute.assert_called_once()
