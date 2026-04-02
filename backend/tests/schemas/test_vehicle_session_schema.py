from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.schemas.vehicle_session import (
    CurrentHandoverEndSchema,
    CurrentHandoverStartSchema,
    CurrentSessionSchema,
    CurrentSessionUserSchema,
    CurrentSessionVehicleSchema,
    PreviousHandoverReportSchema,
    SessionAccessQuerySchema,
    VehicleSessionPageResponseSchema,
)


def now_utc():
    return datetime.now(UTC)


# ================= CURRENT SESSION =================


def test_current_session_schema_valid():
    started_at = now_utc()

    obj = CurrentSessionSchema(
        assignment_id=1,
        status="active",
        started_at=started_at,
    )

    assert obj.assignment_id == 1
    assert obj.status == "active"
    assert obj.started_at == started_at


def test_current_session_schema_required_fields():
    started_at = now_utc()

    with pytest.raises(ValidationError):
        CurrentSessionSchema(
            status="active",
            started_at=started_at,
        )

    with pytest.raises(ValidationError):
        CurrentSessionSchema(
            assignment_id=1,
            started_at=started_at,
        )

    with pytest.raises(ValidationError):
        CurrentSessionSchema(
            assignment_id=1,
            status="active",
        )


def test_current_session_schema_invalid_types():
    started_at = now_utc()

    with pytest.raises(ValidationError):
        CurrentSessionSchema(
            assignment_id="bad",
            status="active",
            started_at=started_at,
        )

    with pytest.raises(ValidationError):
        CurrentSessionSchema(
            assignment_id=1,
            status="active",
            started_at="not-a-date",
        )


def test_current_session_schema_extra_forbidden():
    started_at = now_utc()

    with pytest.raises(ValidationError):
        CurrentSessionSchema(
            assignment_id=1,
            status="active",
            started_at=started_at,
            extra_field="boom",
        )


# ================= CURRENT SESSION USER =================


def test_current_session_user_schema_valid():
    obj = CurrentSessionUserSchema(
        id=1,
        full_name="Ana Popescu",
        unique_code="EMP001",
    )

    assert obj.id == 1
    assert obj.full_name == "Ana Popescu"
    assert obj.unique_code == "EMP001"


def test_current_session_user_schema_required_fields():
    with pytest.raises(ValidationError):
        CurrentSessionUserSchema(
            full_name="Ana Popescu",
            unique_code="EMP001",
        )

    with pytest.raises(ValidationError):
        CurrentSessionUserSchema(
            id=1,
            unique_code="EMP001",
        )

    with pytest.raises(ValidationError):
        CurrentSessionUserSchema(
            id=1,
            full_name="Ana Popescu",
        )


def test_current_session_user_schema_invalid_types():
    with pytest.raises(ValidationError):
        CurrentSessionUserSchema(
            id="bad",
            full_name="Ana Popescu",
            unique_code="EMP001",
        )


def test_current_session_user_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        CurrentSessionUserSchema(
            id=1,
            full_name="Ana Popescu",
            unique_code="EMP001",
            extra_field="boom",
        )


# ================= CURRENT SESSION VEHICLE =================


def test_current_session_vehicle_schema_valid():
    obj = CurrentSessionVehicleSchema(
        id=10,
        brand="Dacia",
        model="Logan",
        license_plate="B123ABC",
        year=2022,
        status="active",
        current_mileage=123456,
    )

    assert obj.id == 10
    assert obj.brand == "Dacia"
    assert obj.model == "Logan"
    assert obj.license_plate == "B123ABC"
    assert obj.year == 2022
    assert obj.status == "active"
    assert obj.current_mileage == 123456


def test_current_session_vehicle_schema_required_fields():
    with pytest.raises(ValidationError):
        CurrentSessionVehicleSchema(
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2022,
            status="active",
            current_mileage=123456,
        )

    with pytest.raises(ValidationError):
        CurrentSessionVehicleSchema(
            id=10,
            model="Logan",
            license_plate="B123ABC",
            year=2022,
            status="active",
            current_mileage=123456,
        )

    with pytest.raises(ValidationError):
        CurrentSessionVehicleSchema(
            id=10,
            brand="Dacia",
            model="Logan",
            year=2022,
            status="active",
            current_mileage=123456,
        )


def test_current_session_vehicle_schema_invalid_types():
    with pytest.raises(ValidationError):
        CurrentSessionVehicleSchema(
            id="bad",
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2022,
            status="active",
            current_mileage=123456,
        )

    with pytest.raises(ValidationError):
        CurrentSessionVehicleSchema(
            id=10,
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year="bad",
            status="active",
            current_mileage=123456,
        )

    with pytest.raises(ValidationError):
        CurrentSessionVehicleSchema(
            id=10,
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2022,
            status="active",
            current_mileage="bad",
        )


def test_current_session_vehicle_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        CurrentSessionVehicleSchema(
            id=10,
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2022,
            status="active",
            current_mileage=123456,
            extra_field="boom",
        )


# ================= PREVIOUS HANDOVER REPORT =================


def test_previous_handover_report_schema_valid():
    started_at = now_utc()
    ended_at = now_utc()

    obj = PreviousHandoverReportSchema(
        assignment_id=1,
        previous_driver_name="Ion Ionescu",
        previous_session_started_at=started_at,
        previous_session_ended_at=ended_at,
    )

    assert obj.assignment_id == 1
    assert obj.previous_driver_name == "Ion Ionescu"
    assert obj.previous_session_started_at == started_at
    assert obj.previous_session_ended_at == ended_at


def test_previous_handover_report_schema_previous_session_ended_at_optional():
    started_at = now_utc()

    obj = PreviousHandoverReportSchema(
        assignment_id=1,
        previous_driver_name="Ion Ionescu",
        previous_session_started_at=started_at,
        previous_session_ended_at=None,
    )

    assert obj.previous_session_ended_at is None


def test_previous_handover_report_schema_required_fields():
    started_at = now_utc()

    with pytest.raises(ValidationError):
        PreviousHandoverReportSchema(
            previous_driver_name="Ion Ionescu",
            previous_session_started_at=started_at,
        )

    with pytest.raises(ValidationError):
        PreviousHandoverReportSchema(
            assignment_id=1,
            previous_session_started_at=started_at,
        )

    with pytest.raises(ValidationError):
        PreviousHandoverReportSchema(
            assignment_id=1,
            previous_driver_name="Ion Ionescu",
        )


def test_previous_handover_report_schema_invalid_types():
    started_at = now_utc()

    with pytest.raises(ValidationError):
        PreviousHandoverReportSchema(
            assignment_id="bad",
            previous_driver_name="Ion Ionescu",
            previous_session_started_at=started_at,
        )

    with pytest.raises(ValidationError):
        PreviousHandoverReportSchema(
            assignment_id=1,
            previous_driver_name="Ion Ionescu",
            previous_session_started_at="not-a-date",
        )


def test_previous_handover_report_schema_extra_forbidden():
    started_at = now_utc()

    with pytest.raises(ValidationError):
        PreviousHandoverReportSchema(
            assignment_id=1,
            previous_driver_name="Ion Ionescu",
            previous_session_started_at=started_at,
            extra_field="boom",
        )


# ================= CURRENT HANDOVER START =================


def test_current_handover_start_schema_valid_defaults():
    obj = CurrentHandoverStartSchema()

    assert obj.mileage_start is None
    assert obj.dashboard_warnings_start is None
    assert obj.damage_notes_start is None
    assert obj.notes_start is None
    assert obj.has_documents is False
    assert obj.has_medkit is False
    assert obj.has_extinguisher is False
    assert obj.has_warning_triangle is False
    assert obj.has_spare_wheel is False
    assert obj.is_completed is False


def test_current_handover_start_schema_valid_full():
    obj = CurrentHandoverStartSchema(
        mileage_start=100000,
        dashboard_warnings_start="check engine",
        damage_notes_start="front bumper scratched",
        notes_start="all good",
        has_documents=True,
        has_medkit=True,
        has_extinguisher=True,
        has_warning_triangle=True,
        has_spare_wheel=True,
        is_completed=True,
    )

    assert obj.mileage_start == 100000
    assert obj.dashboard_warnings_start == "check engine"
    assert obj.damage_notes_start == "front bumper scratched"
    assert obj.notes_start == "all good"
    assert obj.has_documents is True
    assert obj.has_medkit is True
    assert obj.has_extinguisher is True
    assert obj.has_warning_triangle is True
    assert obj.has_spare_wheel is True
    assert obj.is_completed is True


def test_current_handover_start_schema_invalid_types():
    with pytest.raises(ValidationError):
        CurrentHandoverStartSchema(
            mileage_start="bad",
        )


def test_current_handover_start_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        CurrentHandoverStartSchema(
            extra_field="boom",
        )


# ================= CURRENT HANDOVER END =================


def test_current_handover_end_schema_valid_defaults():
    obj = CurrentHandoverEndSchema()

    assert obj.mileage_end is None
    assert obj.dashboard_warnings_end is None
    assert obj.damage_notes_end is None
    assert obj.notes_end is None
    assert obj.is_completed is False


def test_current_handover_end_schema_valid_full():
    obj = CurrentHandoverEndSchema(
        mileage_end=100500,
        dashboard_warnings_end="oil",
        damage_notes_end="rear scratch",
        notes_end="needs service",
        is_completed=True,
    )

    assert obj.mileage_end == 100500
    assert obj.dashboard_warnings_end == "oil"
    assert obj.damage_notes_end == "rear scratch"
    assert obj.notes_end == "needs service"
    assert obj.is_completed is True


def test_current_handover_end_schema_invalid_types():
    with pytest.raises(ValidationError):
        CurrentHandoverEndSchema(
            mileage_end="bad",
        )


def test_current_handover_end_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        CurrentHandoverEndSchema(
            extra_field="boom",
        )


# ================= PAGE RESPONSE =================


def test_vehicle_session_page_response_schema_valid_minimal():
    started_at = now_utc()

    obj = VehicleSessionPageResponseSchema(
        session=CurrentSessionSchema(
            assignment_id=1,
            status="active",
            started_at=started_at,
        ),
        user=CurrentSessionUserSchema(
            id=1,
            full_name="Ana Popescu",
            unique_code="EMP001",
        ),
        vehicle=CurrentSessionVehicleSchema(
            id=10,
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2022,
            status="active",
            current_mileage=123456,
        ),
    )

    assert obj.session.assignment_id == 1
    assert obj.user.full_name == "Ana Popescu"
    assert obj.vehicle.license_plate == "B123ABC"
    assert obj.previous_handover_report is None
    assert obj.handover_start is None
    assert obj.handover_end is None


def test_vehicle_session_page_response_schema_valid_full():
    started_at = now_utc()
    ended_at = now_utc()

    obj = VehicleSessionPageResponseSchema(
        session=CurrentSessionSchema(
            assignment_id=1,
            status="active",
            started_at=started_at,
        ),
        user=CurrentSessionUserSchema(
            id=1,
            full_name="Ana Popescu",
            unique_code="EMP001",
        ),
        vehicle=CurrentSessionVehicleSchema(
            id=10,
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2022,
            status="active",
            current_mileage=123456,
        ),
        previous_handover_report=PreviousHandoverReportSchema(
            assignment_id=99,
            previous_driver_name="Ion Ionescu",
            previous_session_started_at=started_at,
            previous_session_ended_at=ended_at,
        ),
        handover_start=CurrentHandoverStartSchema(
            mileage_start=123000,
            dashboard_warnings_start="none",
            damage_notes_start="minor scratch",
            notes_start="ok",
            has_documents=True,
            has_medkit=True,
            has_extinguisher=True,
            has_warning_triangle=True,
            has_spare_wheel=True,
            is_completed=True,
        ),
        handover_end=CurrentHandoverEndSchema(
            mileage_end=123456,
            dashboard_warnings_end="oil",
            damage_notes_end="rear scratch",
            notes_end="needs check",
            is_completed=True,
        ),
    )

    assert obj.previous_handover_report is not None
    assert obj.handover_start is not None
    assert obj.handover_end is not None
    assert obj.previous_handover_report.previous_driver_name == "Ion Ionescu"
    assert obj.handover_start.has_documents is True
    assert obj.handover_end.mileage_end == 123456


def test_vehicle_session_page_response_schema_required_fields():
    started_at = now_utc()

    with pytest.raises(ValidationError):
        VehicleSessionPageResponseSchema(
            user=CurrentSessionUserSchema(
                id=1,
                full_name="Ana Popescu",
                unique_code="EMP001",
            ),
            vehicle=CurrentSessionVehicleSchema(
                id=10,
                brand="Dacia",
                model="Logan",
                license_plate="B123ABC",
                year=2022,
                status="active",
                current_mileage=123456,
            ),
        )

    with pytest.raises(ValidationError):
        VehicleSessionPageResponseSchema(
            session=CurrentSessionSchema(
                assignment_id=1,
                status="active",
                started_at=started_at,
            ),
            vehicle=CurrentSessionVehicleSchema(
                id=10,
                brand="Dacia",
                model="Logan",
                license_plate="B123ABC",
                year=2022,
                status="active",
                current_mileage=123456,
            ),
        )

    with pytest.raises(ValidationError):
        VehicleSessionPageResponseSchema(
            session=CurrentSessionSchema(
                assignment_id=1,
                status="active",
                started_at=started_at,
            ),
            user=CurrentSessionUserSchema(
                id=1,
                full_name="Ana Popescu",
                unique_code="EMP001",
            ),
        )


def test_vehicle_session_page_response_schema_invalid_nested_item():
    started_at = now_utc()

    with pytest.raises(ValidationError):
        VehicleSessionPageResponseSchema(
            session={
                "assignment_id": "bad",
                "status": "active",
                "started_at": started_at,
            },
            user=CurrentSessionUserSchema(
                id=1,
                full_name="Ana Popescu",
                unique_code="EMP001",
            ),
            vehicle=CurrentSessionVehicleSchema(
                id=10,
                brand="Dacia",
                model="Logan",
                license_plate="B123ABC",
                year=2022,
                status="active",
                current_mileage=123456,
            ),
        )


def test_vehicle_session_page_response_schema_extra_forbidden():
    started_at = now_utc()

    with pytest.raises(ValidationError):
        VehicleSessionPageResponseSchema(
            session=CurrentSessionSchema(
                assignment_id=1,
                status="active",
                started_at=started_at,
            ),
            user=CurrentSessionUserSchema(
                id=1,
                full_name="Ana Popescu",
                unique_code="EMP001",
            ),
            vehicle=CurrentSessionVehicleSchema(
                id=10,
                brand="Dacia",
                model="Logan",
                license_plate="B123ABC",
                year=2022,
                status="active",
                current_mileage=123456,
            ),
            extra_field="boom",
        )


# ================= SESSION ACCESS QUERY =================


def test_session_access_query_schema_valid():
    obj = SessionAccessQuerySchema(user_code="EMP001")

    assert obj.user_code == "EMP001"


def test_session_access_query_schema_required():
    with pytest.raises(ValidationError):
        SessionAccessQuerySchema()


def test_session_access_query_schema_invalid_length():
    with pytest.raises(ValidationError):
        SessionAccessQuerySchema(user_code="")

    with pytest.raises(ValidationError):
        SessionAccessQuerySchema(user_code="a" * 51)


def test_session_access_query_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        SessionAccessQuerySchema(
            user_code="EMP001",
            extra_field="boom",
        )
