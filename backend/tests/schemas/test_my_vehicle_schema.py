from datetime import UTC, datetime
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.schemas.my_vehicle import (
    MyVehicleAssignmentSchema,
    MyVehicleHandoverEndSchema,
    MyVehicleHandoverStartSchema,
    MyVehicleIssueSchema,
    MyVehicleResponseSchema,
    MyVehicleUserSchema,
    MyVehicleVehicleSchema,
)


def test_my_vehicle_user_schema_valid():
    obj = MyVehicleUserSchema(
        id=1,
        full_name="Ana Popescu",
        unique_code="EMP001",
        shift_number="2",
        is_active=True,
    )

    assert obj.id == 1
    assert obj.full_name == "Ana Popescu"
    assert obj.unique_code == "EMP001"
    assert obj.shift_number == "2"
    assert obj.is_active is True


def test_my_vehicle_user_schema_shift_optional():
    obj = MyVehicleUserSchema(
        id=1,
        full_name="Ana Popescu",
        unique_code="EMP001",
        shift_number=None,
        is_active=True,
    )

    assert obj.shift_number is None


def test_my_vehicle_user_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        MyVehicleUserSchema(
            id=1,
            full_name="Ana Popescu",
            unique_code="EMP001",
            is_active=True,
            extra_field="boom",
        )


def test_my_vehicle_user_schema_model_validate_from_attributes():
    source = SimpleNamespace(
        id=1,
        full_name="Ana Popescu",
        unique_code="EMP001",
        shift_number="2",
        is_active=True,
    )

    result = MyVehicleUserSchema.model_validate(source)

    assert result.id == 1
    assert result.full_name == "Ana Popescu"
    assert result.unique_code == "EMP001"
    assert result.shift_number == "2"
    assert result.is_active is True


def test_my_vehicle_vehicle_schema_valid():
    obj = MyVehicleVehicleSchema(
        id=10,
        brand="Dacia",
        model="Logan",
        license_plate="B-123-XYZ",
        year=2022,
        vin="VIN123456789",
        status="active",
        current_mileage=120000,
    )

    assert obj.id == 10
    assert obj.brand == "Dacia"
    assert obj.model == "Logan"
    assert obj.license_plate == "B-123-XYZ"
    assert obj.year == 2022
    assert obj.vin == "VIN123456789"
    assert obj.status == "active"
    assert obj.current_mileage == 120000


def test_my_vehicle_vehicle_schema_vin_optional():
    obj = MyVehicleVehicleSchema(
        id=10,
        brand="Dacia",
        model="Logan",
        license_plate="B-123-XYZ",
        year=2022,
        vin=None,
        status="active",
        current_mileage=120000,
    )

    assert obj.vin is None


def test_my_vehicle_vehicle_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        MyVehicleVehicleSchema(
            id=10,
            brand="Dacia",
            model="Logan",
            license_plate="B-123-XYZ",
            year=2022,
            status="active",
            current_mileage=120000,
            extra_field="boom",
        )


def test_my_vehicle_vehicle_schema_model_validate_from_attributes():
    source = SimpleNamespace(
        id=10,
        brand="Dacia",
        model="Logan",
        license_plate="B-123-XYZ",
        year=2022,
        vin="VIN123456789",
        status="active",
        current_mileage=120000,
    )

    result = MyVehicleVehicleSchema.model_validate(source)

    assert result.id == 10
    assert result.brand == "Dacia"
    assert result.model == "Logan"
    assert result.license_plate == "B-123-XYZ"
    assert result.year == 2022
    assert result.vin == "VIN123456789"
    assert result.status == "active"
    assert result.current_mileage == 120000


def test_my_vehicle_assignment_schema_valid():
    now = datetime.now(UTC)

    obj = MyVehicleAssignmentSchema(
        id=100,
        status="active",
        started_at=now,
        ended_at=None,
    )

    assert obj.id == 100
    assert obj.status == "active"
    assert obj.started_at == now
    assert obj.ended_at is None


def test_my_vehicle_assignment_schema_with_ended_at():
    started = datetime.now(UTC)
    ended = datetime.now(UTC)

    obj = MyVehicleAssignmentSchema(
        id=100,
        status="closed",
        started_at=started,
        ended_at=ended,
    )

    assert obj.status == "closed"
    assert obj.started_at == started
    assert obj.ended_at == ended


def test_my_vehicle_assignment_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        MyVehicleAssignmentSchema(
            id=100,
            status="active",
            started_at=datetime.now(UTC),
            extra_field="boom",
        )


def test_my_vehicle_handover_start_schema_valid():
    obj = MyVehicleHandoverStartSchema(
        mileage_start=120000,
        dashboard_warnings_start="none",
        damage_notes_start="small scratch",
        notes_start="ok",
        has_documents=True,
        has_medkit=True,
        has_extinguisher=True,
        has_warning_triangle=True,
        has_spare_wheel=True,
        is_completed=True,
    )

    assert obj.mileage_start == 120000
    assert obj.dashboard_warnings_start == "none"
    assert obj.damage_notes_start == "small scratch"
    assert obj.notes_start == "ok"
    assert obj.has_documents is True
    assert obj.has_medkit is True
    assert obj.has_extinguisher is True
    assert obj.has_warning_triangle is True
    assert obj.has_spare_wheel is True
    assert obj.is_completed is True


def test_my_vehicle_handover_start_schema_optional_fields():
    obj = MyVehicleHandoverStartSchema(
        mileage_start=None,
        dashboard_warnings_start=None,
        damage_notes_start=None,
        notes_start=None,
        has_documents=False,
        has_medkit=False,
        has_extinguisher=False,
        has_warning_triangle=False,
        has_spare_wheel=False,
        is_completed=False,
    )

    assert obj.mileage_start is None
    assert obj.dashboard_warnings_start is None
    assert obj.damage_notes_start is None
    assert obj.notes_start is None
    assert obj.is_completed is False


def test_my_vehicle_handover_start_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        MyVehicleHandoverStartSchema(
            mileage_start=None,
            dashboard_warnings_start=None,
            damage_notes_start=None,
            notes_start=None,
            has_documents=False,
            has_medkit=False,
            has_extinguisher=False,
            has_warning_triangle=False,
            has_spare_wheel=False,
            is_completed=False,
            extra_field="boom",
        )


def test_my_vehicle_handover_end_schema_valid():
    obj = MyVehicleHandoverEndSchema(
        mileage_end=120500,
        dashboard_warnings_end="none",
        damage_notes_end="same scratch",
        notes_end="returned ok",
        is_completed=True,
    )

    assert obj.mileage_end == 120500
    assert obj.dashboard_warnings_end == "none"
    assert obj.damage_notes_end == "same scratch"
    assert obj.notes_end == "returned ok"
    assert obj.is_completed is True


def test_my_vehicle_handover_end_schema_optional_fields():
    obj = MyVehicleHandoverEndSchema(
        mileage_end=None,
        dashboard_warnings_end=None,
        damage_notes_end=None,
        notes_end=None,
        is_completed=False,
    )

    assert obj.mileage_end is None
    assert obj.dashboard_warnings_end is None
    assert obj.damage_notes_end is None
    assert obj.notes_end is None
    assert obj.is_completed is False


def test_my_vehicle_handover_end_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        MyVehicleHandoverEndSchema(
            mileage_end=None,
            dashboard_warnings_end=None,
            damage_notes_end=None,
            notes_end=None,
            is_completed=False,
            extra_field="boom",
        )


def test_my_vehicle_issue_schema_valid():
    created = datetime.now(UTC)
    updated = datetime.now(UTC)

    obj = MyVehicleIssueSchema(
        id=1,
        status="open",
        need_service_in_km=5000,
        need_brakes=False,
        need_tires=True,
        need_oil=False,
        dashboard_checks="check engine",
        other_problems="noise",
        created_at=created,
        updated_at=updated,
    )

    assert obj.id == 1
    assert obj.status == "open"
    assert obj.need_service_in_km == 5000
    assert obj.need_brakes is False
    assert obj.need_tires is True
    assert obj.need_oil is False
    assert obj.dashboard_checks == "check engine"
    assert obj.other_problems == "noise"
    assert obj.created_at == created
    assert obj.updated_at == updated


def test_my_vehicle_issue_schema_optional_fields():
    created = datetime.now(UTC)
    updated = datetime.now(UTC)

    obj = MyVehicleIssueSchema(
        id=1,
        status="open",
        need_service_in_km=None,
        need_brakes=False,
        need_tires=False,
        need_oil=False,
        dashboard_checks=None,
        other_problems=None,
        created_at=created,
        updated_at=updated,
    )

    assert obj.need_service_in_km is None
    assert obj.dashboard_checks is None
    assert obj.other_problems is None


def test_my_vehicle_issue_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        MyVehicleIssueSchema(
            id=1,
            status="open",
            need_service_in_km=None,
            need_brakes=False,
            need_tires=False,
            need_oil=False,
            dashboard_checks=None,
            other_problems=None,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            extra_field="boom",
        )


def test_my_vehicle_response_schema_valid_with_full_data():
    now = datetime.now(UTC)

    obj = MyVehicleResponseSchema(
        user=MyVehicleUserSchema(
            id=1,
            full_name="Ana Popescu",
            unique_code="EMP001",
            shift_number="2",
            is_active=True,
        ),
        vehicle=MyVehicleVehicleSchema(
            id=10,
            brand="Dacia",
            model="Logan",
            license_plate="B-123-XYZ",
            year=2022,
            vin="VIN123",
            status="active",
            current_mileage=120000,
        ),
        assignment=MyVehicleAssignmentSchema(
            id=100,
            status="active",
            started_at=now,
            ended_at=None,
        ),
        handover_start=MyVehicleHandoverStartSchema(
            mileage_start=120000,
            dashboard_warnings_start="none",
            damage_notes_start="small scratch",
            notes_start="ok",
            has_documents=True,
            has_medkit=True,
            has_extinguisher=True,
            has_warning_triangle=True,
            has_spare_wheel=True,
            is_completed=True,
        ),
        handover_end=MyVehicleHandoverEndSchema(
            mileage_end=120500,
            dashboard_warnings_end="none",
            damage_notes_end="same scratch",
            notes_end="returned ok",
            is_completed=True,
        ),
        open_issues=[
            MyVehicleIssueSchema(
                id=1,
                status="open",
                need_service_in_km=5000,
                need_brakes=False,
                need_tires=True,
                need_oil=False,
                dashboard_checks="check engine",
                other_problems="noise",
                created_at=now,
                updated_at=now,
            )
        ],
    )

    assert obj.user.id == 1
    assert obj.vehicle.id == 10
    assert obj.assignment.id == 100
    assert obj.handover_start.is_completed is True
    assert obj.handover_end.is_completed is True
    assert len(obj.open_issues) == 1
    assert obj.open_issues[0].id == 1


def test_my_vehicle_response_schema_valid_without_vehicle():
    obj = MyVehicleResponseSchema(
        user=MyVehicleUserSchema(
            id=1,
            full_name="Ana Popescu",
            unique_code="EMP001",
            shift_number=None,
            is_active=True,
        ),
        vehicle=None,
        assignment=None,
        handover_start=None,
        handover_end=None,
        open_issues=[],
    )

    assert obj.user.id == 1
    assert obj.vehicle is None
    assert obj.assignment is None
    assert obj.handover_start is None
    assert obj.handover_end is None
    assert obj.open_issues == []


def test_my_vehicle_response_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        MyVehicleResponseSchema(
            user=MyVehicleUserSchema(
                id=1,
                full_name="Ana Popescu",
                unique_code="EMP001",
                shift_number=None,
                is_active=True,
            ),
            open_issues=[],
            extra_field="boom",
        )
