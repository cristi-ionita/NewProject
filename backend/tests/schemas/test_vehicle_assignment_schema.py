from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.schemas.vehicle_assignment_admin import (
    VehicleAssignmentCloseResponseSchema,
    VehicleAssignmentCreateRequestSchema,
    VehicleAssignmentListResponseSchema,
    VehicleAssignmentReadSchema,
)


def now_utc():
    return datetime.now(UTC)


# ================= CREATE =================


def test_vehicle_assignment_create_request_schema_valid():
    obj = VehicleAssignmentCreateRequestSchema(
        user_id=1,
        vehicle_id=10,
    )

    assert obj.user_id == 1
    assert obj.vehicle_id == 10


def test_vehicle_assignment_create_request_schema_required_fields():
    with pytest.raises(ValidationError):
        VehicleAssignmentCreateRequestSchema(vehicle_id=10)

    with pytest.raises(ValidationError):
        VehicleAssignmentCreateRequestSchema(user_id=1)


def test_vehicle_assignment_create_request_schema_invalid_types():
    with pytest.raises(ValidationError):
        VehicleAssignmentCreateRequestSchema(user_id="abc", vehicle_id=10)

    with pytest.raises(ValidationError):
        VehicleAssignmentCreateRequestSchema(user_id=1, vehicle_id="xyz")


def test_vehicle_assignment_create_request_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        VehicleAssignmentCreateRequestSchema(
            user_id=1,
            vehicle_id=10,
            extra_field="boom",
        )


# ================= READ =================


def test_vehicle_assignment_read_schema_valid():
    now = now_utc()

    obj = VehicleAssignmentReadSchema(
        id=1,
        user_id=1,
        user_name="Ana Popescu",
        vehicle_id=10,
        vehicle_license_plate="B123ABC",
        vehicle_brand="Dacia",
        vehicle_model="Logan",
        status="active",
        started_at=now,
        ended_at=None,
    )

    assert obj.id == 1
    assert obj.user_name == "Ana Popescu"
    assert obj.status == "active"
    assert obj.started_at == now
    assert obj.ended_at is None


def test_vehicle_assignment_read_schema_with_ended_at():
    started = now_utc()
    ended = now_utc()

    obj = VehicleAssignmentReadSchema(
        id=2,
        user_id=3,
        user_name="Ion Ionescu",
        vehicle_id=15,
        vehicle_license_plate="CJ99XYZ",
        vehicle_brand="Ford",
        vehicle_model="Focus",
        status="closed",
        started_at=started,
        ended_at=ended,
    )

    assert obj.ended_at == ended


def test_vehicle_assignment_read_schema_required_fields():
    now = now_utc()

    with pytest.raises(ValidationError):
        VehicleAssignmentReadSchema(
            user_id=1,
            user_name="Ana",
            vehicle_id=10,
            vehicle_license_plate="B123ABC",
            vehicle_brand="Dacia",
            vehicle_model="Logan",
            status="active",
            started_at=now,
        )

    with pytest.raises(ValidationError):
        VehicleAssignmentReadSchema(
            id=1,
            user_name="Ana",
            vehicle_id=10,
            vehicle_license_plate="B123ABC",
            vehicle_brand="Dacia",
            vehicle_model="Logan",
            status="active",
            started_at=now,
        )


def test_vehicle_assignment_read_schema_invalid_types():
    now = now_utc()

    with pytest.raises(ValidationError):
        VehicleAssignmentReadSchema(
            id="abc",
            user_id=1,
            user_name="Ana",
            vehicle_id=10,
            vehicle_license_plate="B123ABC",
            vehicle_brand="Dacia",
            vehicle_model="Logan",
            status="active",
            started_at=now,
            ended_at=None,
        )

    with pytest.raises(ValidationError):
        VehicleAssignmentReadSchema(
            id=1,
            user_id=1,
            user_name="Ana",
            vehicle_id=10,
            vehicle_license_plate="B123ABC",
            vehicle_brand="Dacia",
            vehicle_model="Logan",
            status="active",
            started_at="not-a-date",
            ended_at=None,
        )


def test_vehicle_assignment_read_schema_extra_forbidden():
    now = now_utc()

    with pytest.raises(ValidationError):
        VehicleAssignmentReadSchema(
            id=1,
            user_id=1,
            user_name="Ana",
            vehicle_id=10,
            vehicle_license_plate="B123ABC",
            vehicle_brand="Dacia",
            vehicle_model="Logan",
            status="active",
            started_at=now,
            ended_at=None,
            extra_field="boom",
        )


# ================= LIST =================


def test_vehicle_assignment_list_response_schema_valid():
    now = now_utc()

    response = VehicleAssignmentListResponseSchema(
        assignments=[
            VehicleAssignmentReadSchema(
                id=1,
                user_id=1,
                user_name="Ana",
                vehicle_id=10,
                vehicle_license_plate="B123ABC",
                vehicle_brand="Dacia",
                vehicle_model="Logan",
                status="active",
                started_at=now,
                ended_at=None,
            )
        ]
    )

    assert len(response.assignments) == 1


def test_vehicle_assignment_list_response_schema_empty():
    response = VehicleAssignmentListResponseSchema(assignments=[])

    assert response.assignments == []


def test_vehicle_assignment_list_response_schema_invalid_item():
    now = now_utc()

    with pytest.raises(ValidationError):
        VehicleAssignmentListResponseSchema(
            assignments=[
                {
                    "id": "bad",
                    "user_id": 1,
                    "user_name": "Ana",
                    "vehicle_id": 10,
                    "vehicle_license_plate": "B123ABC",
                    "vehicle_brand": "Dacia",
                    "vehicle_model": "Logan",
                    "status": "active",
                    "started_at": now,
                    "ended_at": None,
                }
            ]
        )


def test_vehicle_assignment_list_response_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        VehicleAssignmentListResponseSchema(
            assignments=[],
            extra_field="boom",
        )


# ================= CLOSE =================


def test_vehicle_assignment_close_response_schema_valid():
    ended = now_utc()

    obj = VehicleAssignmentCloseResponseSchema(
        id=1,
        status="closed",
        ended_at=ended,
    )

    assert obj.id == 1
    assert obj.status == "closed"
    assert obj.ended_at == ended


def test_vehicle_assignment_close_response_schema_required_fields():
    ended = now_utc()

    with pytest.raises(ValidationError):
        VehicleAssignmentCloseResponseSchema(
            status="closed",
            ended_at=ended,
        )


def test_vehicle_assignment_close_response_schema_invalid_types():
    ended = now_utc()

    with pytest.raises(ValidationError):
        VehicleAssignmentCloseResponseSchema(
            id="abc",
            status="closed",
            ended_at=ended,
        )

    with pytest.raises(ValidationError):
        VehicleAssignmentCloseResponseSchema(
            id=1,
            status="closed",
            ended_at="not-a-date",
        )


def test_vehicle_assignment_close_response_schema_extra_forbidden():
    ended = now_utc()

    with pytest.raises(ValidationError):
        VehicleAssignmentCloseResponseSchema(
            id=1,
            status="closed",
            ended_at=ended,
            extra_field="boom",
        )
