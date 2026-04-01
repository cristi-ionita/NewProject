import pytest
from pydantic import ValidationError

from app.schemas.handover import (
    HandoverEndRequestSchema,
    HandoverEndResponseSchema,
    HandoverStartRequestSchema,
    HandoverStartResponseSchema,
    MAX_REALISTIC_MILEAGE,
)


def test_handover_start_request_schema_valid():
    obj = HandoverStartRequestSchema(
        user_code=" EMP001 ",
        mileage_start=120000,
        dashboard_warnings_start=" none ",
        damage_notes_start=" small scratch ",
        notes_start=" all good ",
        has_documents=True,
        has_medkit=True,
        has_extinguisher=True,
        has_warning_triangle=True,
        has_spare_wheel=True,
    )

    assert obj.user_code == "EMP001"
    assert obj.mileage_start == 120000
    assert obj.dashboard_warnings_start == "none"
    assert obj.damage_notes_start == "small scratch"
    assert obj.notes_start == "all good"
    assert obj.has_documents is True
    assert obj.has_medkit is True
    assert obj.has_extinguisher is True
    assert obj.has_warning_triangle is True
    assert obj.has_spare_wheel is True


def test_handover_start_request_schema_required_fields():
    with pytest.raises(ValidationError):
        HandoverStartRequestSchema(
            mileage_start=100,
            dashboard_warnings_start="ok",
            damage_notes_start="ok",
            notes_start="ok",
            has_documents=True,
            has_medkit=True,
            has_extinguisher=True,
            has_warning_triangle=True,
            has_spare_wheel=True,
        )


def test_handover_start_request_schema_invalid_empty_text():
    with pytest.raises(ValidationError):
        HandoverStartRequestSchema(
            user_code="   ",
            mileage_start=100,
            dashboard_warnings_start="ok",
            damage_notes_start="ok",
            notes_start="ok",
            has_documents=True,
            has_medkit=True,
            has_extinguisher=True,
            has_warning_triangle=True,
            has_spare_wheel=True,
        )

    with pytest.raises(ValidationError):
        HandoverStartRequestSchema(
            user_code="EMP001",
            mileage_start=100,
            dashboard_warnings_start="   ",
            damage_notes_start="ok",
            notes_start="ok",
            has_documents=True,
            has_medkit=True,
            has_extinguisher=True,
            has_warning_triangle=True,
            has_spare_wheel=True,
        )

    with pytest.raises(ValidationError):
        HandoverStartRequestSchema(
            user_code="EMP001",
            mileage_start=100,
            dashboard_warnings_start="ok",
            damage_notes_start="   ",
            notes_start="ok",
            has_documents=True,
            has_medkit=True,
            has_extinguisher=True,
            has_warning_triangle=True,
            has_spare_wheel=True,
        )

    with pytest.raises(ValidationError):
        HandoverStartRequestSchema(
            user_code="EMP001",
            mileage_start=100,
            dashboard_warnings_start="ok",
            damage_notes_start="ok",
            notes_start="   ",
            has_documents=True,
            has_medkit=True,
            has_extinguisher=True,
            has_warning_triangle=True,
            has_spare_wheel=True,
        )


def test_handover_start_request_schema_invalid_mileage():
    with pytest.raises(ValidationError):
        HandoverStartRequestSchema(
            user_code="EMP001",
            mileage_start=-1,
            dashboard_warnings_start="ok",
            damage_notes_start="ok",
            notes_start="ok",
            has_documents=True,
            has_medkit=True,
            has_extinguisher=True,
            has_warning_triangle=True,
            has_spare_wheel=True,
        )

    with pytest.raises(ValidationError):
        HandoverStartRequestSchema(
            user_code="EMP001",
            mileage_start=MAX_REALISTIC_MILEAGE + 1,
            dashboard_warnings_start="ok",
            damage_notes_start="ok",
            notes_start="ok",
            has_documents=True,
            has_medkit=True,
            has_extinguisher=True,
            has_warning_triangle=True,
            has_spare_wheel=True,
        )


def test_handover_start_request_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        HandoverStartRequestSchema(
            user_code="EMP001",
            mileage_start=100,
            dashboard_warnings_start="ok",
            damage_notes_start="ok",
            notes_start="ok",
            has_documents=True,
            has_medkit=True,
            has_extinguisher=True,
            has_warning_triangle=True,
            has_spare_wheel=True,
            extra_field="boom",
        )


def test_handover_start_response_schema_valid():
    obj = HandoverStartResponseSchema(
        assignment_id=100,
        mileage_start=120000,
        dashboard_warnings_start="none",
        damage_notes_start="small scratch",
        notes_start="all good",
        has_documents=True,
        has_medkit=True,
        has_extinguisher=True,
        has_warning_triangle=True,
        has_spare_wheel=True,
    )

    assert obj.assignment_id == 100
    assert obj.mileage_start == 120000
    assert obj.dashboard_warnings_start == "none"
    assert obj.damage_notes_start == "small scratch"
    assert obj.notes_start == "all good"
    assert obj.has_documents is True


def test_handover_start_response_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        HandoverStartResponseSchema(
            assignment_id=100,
            mileage_start=120000,
            dashboard_warnings_start="none",
            damage_notes_start="small scratch",
            notes_start="all good",
            has_documents=True,
            has_medkit=True,
            has_extinguisher=True,
            has_warning_triangle=True,
            has_spare_wheel=True,
            extra_field="boom",
        )


def test_handover_end_request_schema_valid():
    obj = HandoverEndRequestSchema(
        user_code=" EMP001 ",
        mileage_end=120500,
        dashboard_warnings_end=" none ",
        damage_notes_end=" small scratch ",
        notes_end=" returned ok ",
    )

    assert obj.user_code == "EMP001"
    assert obj.mileage_end == 120500
    assert obj.dashboard_warnings_end == "none"
    assert obj.damage_notes_end == "small scratch"
    assert obj.notes_end == "returned ok"


def test_handover_end_request_schema_invalid_empty_text():
    with pytest.raises(ValidationError):
        HandoverEndRequestSchema(
            user_code="   ",
            mileage_end=120500,
            dashboard_warnings_end="ok",
            damage_notes_end="ok",
            notes_end="ok",
        )

    with pytest.raises(ValidationError):
        HandoverEndRequestSchema(
            user_code="EMP001",
            mileage_end=120500,
            dashboard_warnings_end="   ",
            damage_notes_end="ok",
            notes_end="ok",
        )

    with pytest.raises(ValidationError):
        HandoverEndRequestSchema(
            user_code="EMP001",
            mileage_end=120500,
            dashboard_warnings_end="ok",
            damage_notes_end="   ",
            notes_end="ok",
        )

    with pytest.raises(ValidationError):
        HandoverEndRequestSchema(
            user_code="EMP001",
            mileage_end=120500,
            dashboard_warnings_end="ok",
            damage_notes_end="ok",
            notes_end="   ",
        )


def test_handover_end_request_schema_invalid_mileage():
    with pytest.raises(ValidationError):
        HandoverEndRequestSchema(
            user_code="EMP001",
            mileage_end=-1,
            dashboard_warnings_end="ok",
            damage_notes_end="ok",
            notes_end="ok",
        )

    with pytest.raises(ValidationError):
        HandoverEndRequestSchema(
            user_code="EMP001",
            mileage_end=MAX_REALISTIC_MILEAGE + 1,
            dashboard_warnings_end="ok",
            damage_notes_end="ok",
            notes_end="ok",
        )


def test_handover_end_request_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        HandoverEndRequestSchema(
            user_code="EMP001",
            mileage_end=120500,
            dashboard_warnings_end="ok",
            damage_notes_end="ok",
            notes_end="ok",
            extra_field="boom",
        )


def test_handover_end_response_schema_valid():
    obj = HandoverEndResponseSchema(
        assignment_id=100,
        mileage_end=120500,
        dashboard_warnings_end="none",
        damage_notes_end="small scratch",
        notes_end="returned ok",
    )

    assert obj.assignment_id == 100
    assert obj.mileage_end == 120500
    assert obj.dashboard_warnings_end == "none"
    assert obj.damage_notes_end == "small scratch"
    assert obj.notes_end == "returned ok"


def test_handover_end_response_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        HandoverEndResponseSchema(
            assignment_id=100,
            mileage_end=120500,
            dashboard_warnings_end="none",
            damage_notes_end="small scratch",
            notes_end="returned ok",
            extra_field="boom",
        )