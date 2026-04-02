from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.schemas.auth import (
    ActiveSessionResponseSchema,
    EndSessionRequestSchema,
    EndSessionResponseSchema,
    LoginRequestSchema,
    LoginResponseSchema,
    StartSessionRequestSchema,
    StartSessionResponseSchema,
)


def test_login_request_schema_valid():
    obj = LoginRequestSchema(
        identifier="EMP001",
        pin="1234",
    )

    assert obj.identifier == "EMP001"
    assert obj.pin == "1234"


def test_login_request_schema_identifier_too_short():
    with pytest.raises(ValidationError):
        LoginRequestSchema(
            identifier="",
            pin="1234",
        )


def test_login_request_schema_identifier_too_long():
    with pytest.raises(ValidationError):
        LoginRequestSchema(
            identifier="A" * 51,
            pin="1234",
        )


def test_login_request_schema_pin_too_short():
    with pytest.raises(ValidationError):
        LoginRequestSchema(
            identifier="EMP001",
            pin="123",
        )


def test_login_request_schema_pin_too_long():
    with pytest.raises(ValidationError):
        LoginRequestSchema(
            identifier="EMP001",
            pin="12345",
        )


def test_login_request_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        LoginRequestSchema(
            identifier="EMP001",
            pin="1234",
            extra_field="boom",
        )


def test_login_response_schema_valid():
    obj = LoginResponseSchema(
        user_id=1,
        full_name="Ana Popescu",
        shift_number="2",
        unique_code="EMP001",
        role="employee",
    )

    assert obj.user_id == 1
    assert obj.full_name == "Ana Popescu"
    assert obj.shift_number == "2"
    assert obj.unique_code == "EMP001"
    assert obj.role == "employee"


def test_login_response_schema_shift_number_optional():
    obj = LoginResponseSchema(
        user_id=1,
        full_name="Ana Popescu",
        shift_number=None,
        unique_code="EMP001",
        role="employee",
    )

    assert obj.shift_number is None


def test_login_response_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        LoginResponseSchema(
            user_id=1,
            full_name="Ana Popescu",
            shift_number="2",
            unique_code="EMP001",
            role="employee",
            extra_field="boom",
        )


def test_active_session_response_schema_without_active_session():
    obj = ActiveSessionResponseSchema(
        has_active_session=False,
    )

    assert obj.has_active_session is False
    assert obj.assignment_id is None
    assert obj.vehicle_id is None
    assert obj.license_plate is None
    assert obj.brand is None
    assert obj.model is None
    assert obj.started_at is None
    assert obj.status is None


def test_active_session_response_schema_with_active_session():
    now = datetime.now(UTC)

    obj = ActiveSessionResponseSchema(
        has_active_session=True,
        assignment_id=100,
        vehicle_id=10,
        license_plate="B-123-XYZ",
        brand="Dacia",
        model="Logan",
        started_at=now,
        status="active",
    )

    assert obj.has_active_session is True
    assert obj.assignment_id == 100
    assert obj.vehicle_id == 10
    assert obj.license_plate == "B-123-XYZ"
    assert obj.brand == "Dacia"
    assert obj.model == "Logan"
    assert obj.started_at == now
    assert obj.status == "active"


def test_active_session_response_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        ActiveSessionResponseSchema(
            has_active_session=True,
            extra_field="boom",
        )


def test_start_session_request_schema_valid():
    obj = StartSessionRequestSchema(
        code="EMP001",
        license_plate="B-123-XYZ",
    )

    assert obj.code == "EMP001"
    assert obj.license_plate == "B-123-XYZ"


def test_start_session_request_schema_code_too_short():
    with pytest.raises(ValidationError):
        StartSessionRequestSchema(
            code="",
            license_plate="B-123-XYZ",
        )


def test_start_session_request_schema_code_too_long():
    with pytest.raises(ValidationError):
        StartSessionRequestSchema(
            code="A" * 51,
            license_plate="B-123-XYZ",
        )


def test_start_session_request_schema_license_plate_too_short():
    with pytest.raises(ValidationError):
        StartSessionRequestSchema(
            code="EMP001",
            license_plate="",
        )


def test_start_session_request_schema_license_plate_too_long():
    with pytest.raises(ValidationError):
        StartSessionRequestSchema(
            code="EMP001",
            license_plate="A" * 21,
        )


def test_start_session_request_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        StartSessionRequestSchema(
            code="EMP001",
            license_plate="B-123-XYZ",
            extra_field="boom",
        )


def test_start_session_response_schema_valid():
    now = datetime.now(UTC)

    obj = StartSessionResponseSchema(
        assignment_id=100,
        user_id=1,
        user_name="Ana Popescu",
        vehicle_id=10,
        license_plate="B-123-XYZ",
        started_at=now,
        status="active",
    )

    assert obj.assignment_id == 100
    assert obj.user_id == 1
    assert obj.user_name == "Ana Popescu"
    assert obj.vehicle_id == 10
    assert obj.license_plate == "B-123-XYZ"
    assert obj.started_at == now
    assert obj.status == "active"


def test_start_session_response_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        StartSessionResponseSchema(
            assignment_id=100,
            user_id=1,
            user_name="Ana Popescu",
            vehicle_id=10,
            license_plate="B-123-XYZ",
            started_at=datetime.now(UTC),
            status="active",
            extra_field="boom",
        )


def test_end_session_request_schema_valid():
    obj = EndSessionRequestSchema(
        code="EMP001",
    )

    assert obj.code == "EMP001"


def test_end_session_request_schema_code_too_short():
    with pytest.raises(ValidationError):
        EndSessionRequestSchema(
            code="",
        )


def test_end_session_request_schema_code_too_long():
    with pytest.raises(ValidationError):
        EndSessionRequestSchema(
            code="A" * 51,
        )


def test_end_session_request_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        EndSessionRequestSchema(
            code="EMP001",
            extra_field="boom",
        )


def test_end_session_response_schema_valid():
    now = datetime.now(UTC)

    obj = EndSessionResponseSchema(
        assignment_id=100,
        user_id=1,
        vehicle_id=10,
        ended_at=now,
        status="closed",
    )

    assert obj.assignment_id == 100
    assert obj.user_id == 1
    assert obj.vehicle_id == 10
    assert obj.ended_at == now
    assert obj.status == "closed"


def test_end_session_response_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        EndSessionResponseSchema(
            assignment_id=100,
            user_id=1,
            vehicle_id=10,
            ended_at=datetime.now(UTC),
            status="closed",
            extra_field="boom",
        )




def test_login_schema_pin_empty():
    with pytest.raises(ValidationError) as exc:
        LoginRequestSchema(identifier="EMP001", pin="   ")

    assert "PIN is required." in str(exc.value)


def test_login_schema_pin_not_digits():
    with pytest.raises(ValidationError) as exc:
        LoginRequestSchema(identifier="EMP001", pin="12a4")

    assert "PIN must contain only digits." in str(exc.value)