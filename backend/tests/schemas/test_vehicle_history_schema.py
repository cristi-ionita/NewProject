from datetime import datetime, UTC

import pytest
from pydantic import ValidationError

from app.schemas.vehicle_history import (
    VehicleHistoryItemSchema,
    VehicleHistoryResponseSchema,
)


def now_utc():
    return datetime.now(UTC)


# ================= ITEM =================

def test_vehicle_history_item_schema_valid_minimal():
    now = now_utc()

    obj = VehicleHistoryItemSchema(
        assignment_id=1,
        driver_name="Ana Popescu",
        started_at=now,
    )

    assert obj.assignment_id == 1
    assert obj.driver_name == "Ana Popescu"
    assert obj.started_at == now
    assert obj.ended_at is None

    # default flags
    assert obj.has_documents is False
    assert obj.has_medkit is False
    assert obj.has_extinguisher is False
    assert obj.has_warning_triangle is False
    assert obj.has_spare_wheel is False


def test_vehicle_history_item_schema_full_data():
    started = now_utc()
    ended = now_utc()

    obj = VehicleHistoryItemSchema(
        assignment_id=10,
        driver_name="Ion Ionescu",
        started_at=started,
        ended_at=ended,
        mileage_start=1000,
        mileage_end=1500,
        dashboard_warnings_start="none",
        dashboard_warnings_end="oil",
        damage_notes_start="scratch",
        damage_notes_end="bigger scratch",
        notes_start="ok",
        notes_end="needs check",
        has_documents=True,
        has_medkit=True,
        has_extinguisher=True,
        has_warning_triangle=True,
        has_spare_wheel=True,
    )

    assert obj.assignment_id == 10
    assert obj.driver_name == "Ion Ionescu"
    assert obj.started_at == started
    assert obj.ended_at == ended
    assert obj.mileage_start == 1000
    assert obj.mileage_end == 1500
    assert obj.has_documents is True


def test_vehicle_history_item_schema_optional_fields_none():
    now = now_utc()

    obj = VehicleHistoryItemSchema(
        assignment_id=1,
        driver_name="Ana",
        started_at=now,
        mileage_start=None,
        mileage_end=None,
    )

    assert obj.mileage_start is None
    assert obj.mileage_end is None


def test_vehicle_history_item_schema_required_fields():
    now = now_utc()

    with pytest.raises(ValidationError):
        VehicleHistoryItemSchema(
            driver_name="Ana",
            started_at=now,
        )

    with pytest.raises(ValidationError):
        VehicleHistoryItemSchema(
            assignment_id=1,
            started_at=now,
        )

    with pytest.raises(ValidationError):
        VehicleHistoryItemSchema(
            assignment_id=1,
            driver_name="Ana",
        )


def test_vehicle_history_item_schema_invalid_types():
    now = now_utc()

    with pytest.raises(ValidationError):
        VehicleHistoryItemSchema(
            assignment_id="abc",
            driver_name="Ana",
            started_at=now,
        )

    with pytest.raises(ValidationError):
        VehicleHistoryItemSchema(
            assignment_id=1,
            driver_name="Ana",
            started_at="not-a-date",
        )

    with pytest.raises(ValidationError):
        VehicleHistoryItemSchema(
            assignment_id=1,
            driver_name="Ana",
            started_at=now,
            mileage_start="bad",
        )


def test_vehicle_history_item_schema_extra_forbidden():
    now = now_utc()

    with pytest.raises(ValidationError):
        VehicleHistoryItemSchema(
            assignment_id=1,
            driver_name="Ana",
            started_at=now,
            extra_field="boom",
        )


# ================= RESPONSE =================

def test_vehicle_history_response_schema_valid():
    now = now_utc()

    response = VehicleHistoryResponseSchema(
        vehicle_id=1,
        history=[
            VehicleHistoryItemSchema(
                assignment_id=1,
                driver_name="Ana",
                started_at=now,
            ),
            VehicleHistoryItemSchema(
                assignment_id=2,
                driver_name="Ion",
                started_at=now,
                ended_at=now,
            ),
        ],
    )

    assert response.vehicle_id == 1
    assert len(response.history) == 2
    assert response.history[0].driver_name == "Ana"
    assert response.history[1].driver_name == "Ion"


def test_vehicle_history_response_schema_empty_history():
    response = VehicleHistoryResponseSchema(
        vehicle_id=1,
        history=[],
    )

    assert response.history == []


def test_vehicle_history_response_schema_invalid_item():
    now = now_utc()

    with pytest.raises(ValidationError):
        VehicleHistoryResponseSchema(
            vehicle_id=1,
            history=[
                {
                    "assignment_id": "bad",
                    "driver_name": "Ana",
                    "started_at": now,
                }
            ],
        )


def test_vehicle_history_response_schema_required_fields():
    now = now_utc()

    with pytest.raises(ValidationError):
        VehicleHistoryResponseSchema(
            history=[],
        )

    with pytest.raises(ValidationError):
        VehicleHistoryResponseSchema(
            vehicle_id=1,
        )


def test_vehicle_history_response_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        VehicleHistoryResponseSchema(
            vehicle_id=1,
            history=[],
            extra_field="boom",
        )