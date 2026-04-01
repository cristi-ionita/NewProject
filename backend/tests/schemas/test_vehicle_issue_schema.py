from datetime import datetime, UTC

import pytest
from pydantic import ValidationError

from app.schemas.vehicle_issue import (
    VehicleIssueCreateRequestSchema,
    VehicleIssueCreateResponseSchema,
    VehicleIssueListItemSchema,
    VehicleIssueUpdateRequestSchema,
)


def now_utc():
    return datetime.now(UTC)


# ================= CREATE REQUEST =================

def test_vehicle_issue_create_request_schema_valid_minimal():
    obj = VehicleIssueCreateRequestSchema(
        user_code="EMP001",
        assignment_id=10,
    )

    assert obj.user_code == "EMP001"
    assert obj.assignment_id == 10
    assert obj.need_service_in_km is None
    assert obj.need_brakes is False
    assert obj.need_tires is False
    assert obj.need_oil is False
    assert obj.dashboard_checks is None
    assert obj.other_problems is None


def test_vehicle_issue_create_request_schema_valid_full():
    obj = VehicleIssueCreateRequestSchema(
        user_code="EMP001",
        assignment_id=10,
        need_service_in_km=1500,
        need_brakes=True,
        need_tires=True,
        need_oil=True,
        dashboard_checks="check engine",
        other_problems="front light broken",
    )

    assert obj.user_code == "EMP001"
    assert obj.assignment_id == 10
    assert obj.need_service_in_km == 1500
    assert obj.need_brakes is True
    assert obj.need_tires is True
    assert obj.need_oil is True
    assert obj.dashboard_checks == "check engine"
    assert obj.other_problems == "front light broken"


def test_vehicle_issue_create_request_schema_cleans_text_fields():
    obj = VehicleIssueCreateRequestSchema(
        user_code="  EMP001  ",
        assignment_id=10,
        dashboard_checks="  check engine  ",
        other_problems="  front light broken  ",
    )

    assert obj.user_code == "EMP001"
    assert obj.dashboard_checks == "check engine"
    assert obj.other_problems == "front light broken"


def test_vehicle_issue_create_request_schema_blank_optional_text_becomes_none():
    obj = VehicleIssueCreateRequestSchema(
        user_code="EMP001",
        assignment_id=10,
        dashboard_checks="   ",
        other_problems="   ",
    )

    assert obj.dashboard_checks is None
    assert obj.other_problems is None


def test_vehicle_issue_create_request_schema_required_fields():
    with pytest.raises(ValidationError):
        VehicleIssueCreateRequestSchema(
            assignment_id=10,
        )

    with pytest.raises(ValidationError):
        VehicleIssueCreateRequestSchema(
            user_code="EMP001",
        )


def test_vehicle_issue_create_request_schema_invalid_need_service_in_km():
    with pytest.raises(ValidationError):
        VehicleIssueCreateRequestSchema(
            user_code="EMP001",
            assignment_id=10,
            need_service_in_km=-1,
        )


def test_vehicle_issue_create_request_schema_invalid_types():
    with pytest.raises(ValidationError):
        VehicleIssueCreateRequestSchema(
            user_code=123,
            assignment_id=10,
        )

    with pytest.raises(ValidationError):
        VehicleIssueCreateRequestSchema(
            user_code="EMP001",
            assignment_id="bad",
        )


def test_vehicle_issue_create_request_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        VehicleIssueCreateRequestSchema(
            user_code="EMP001",
            assignment_id=10,
            extra_field="boom",
        )


# ================= UPDATE REQUEST =================

def test_vehicle_issue_update_request_schema_valid_minimal():
    obj = VehicleIssueUpdateRequestSchema()

    assert obj.status is None
    assert obj.scheduled_for is None
    assert obj.scheduled_location is None
    assert obj.assigned_mechanic_id is None


def test_vehicle_issue_update_request_schema_valid_full():
    scheduled_for = now_utc()

    obj = VehicleIssueUpdateRequestSchema(
        status="scheduled",
        scheduled_for=scheduled_for,
        scheduled_location="Service Center North",
        assigned_mechanic_id=7,
    )

    assert obj.status == "scheduled"
    assert obj.scheduled_for == scheduled_for
    assert obj.scheduled_location == "Service Center North"
    assert obj.assigned_mechanic_id == 7


def test_vehicle_issue_update_request_schema_cleans_optional_text_fields():
    obj = VehicleIssueUpdateRequestSchema(
        status="  scheduled  ",
        scheduled_location="  Service Center North  ",
    )

    assert obj.status == "scheduled"
    assert obj.scheduled_location == "Service Center North"


def test_vehicle_issue_update_request_schema_blank_optional_text_becomes_none():
    obj = VehicleIssueUpdateRequestSchema(
        status="   ",
        scheduled_location="   ",
    )

    assert obj.status is None
    assert obj.scheduled_location is None


def test_vehicle_issue_update_request_schema_invalid_scheduled_location_length():
    with pytest.raises(ValidationError):
        VehicleIssueUpdateRequestSchema(
            scheduled_location="a" * 256,
        )


def test_vehicle_issue_update_request_schema_invalid_types():
    with pytest.raises(ValidationError):
        VehicleIssueUpdateRequestSchema(
            scheduled_for="not-a-date",
        )

    with pytest.raises(ValidationError):
        VehicleIssueUpdateRequestSchema(
            assigned_mechanic_id="bad",
        )


def test_vehicle_issue_update_request_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        VehicleIssueUpdateRequestSchema(
            status="scheduled",
            extra_field="boom",
        )


# ================= CREATE RESPONSE =================

def test_vehicle_issue_create_response_schema_valid():
    created_at = now_utc()
    scheduled_for = now_utc()

    obj = VehicleIssueCreateResponseSchema(
        id=1,
        vehicle_id=100,
        assignment_id=10,
        reported_by_user_id=5,
        need_service_in_km=1500,
        need_brakes=True,
        need_tires=False,
        need_oil=True,
        dashboard_checks="check engine",
        other_problems="front light broken",
        status="open",
        assigned_mechanic_id=7,
        scheduled_for=scheduled_for,
        scheduled_location="Main Service",
        created_at=created_at,
    )

    assert obj.id == 1
    assert obj.vehicle_id == 100
    assert obj.assignment_id == 10
    assert obj.reported_by_user_id == 5
    assert obj.need_service_in_km == 1500
    assert obj.need_brakes is True
    assert obj.need_tires is False
    assert obj.need_oil is True
    assert obj.dashboard_checks == "check engine"
    assert obj.other_problems == "front light broken"
    assert obj.status == "open"
    assert obj.assigned_mechanic_id == 7
    assert obj.scheduled_for == scheduled_for
    assert obj.scheduled_location == "Main Service"
    assert obj.created_at == created_at


def test_vehicle_issue_create_response_schema_required_fields():
    created_at = now_utc()

    with pytest.raises(ValidationError):
        VehicleIssueCreateResponseSchema(
            vehicle_id=100,
            assignment_id=10,
            reported_by_user_id=5,
            need_brakes=True,
            need_tires=False,
            need_oil=True,
            status="open",
            created_at=created_at,
        )

    with pytest.raises(ValidationError):
        VehicleIssueCreateResponseSchema(
            id=1,
            assignment_id=10,
            reported_by_user_id=5,
            need_brakes=True,
            need_tires=False,
            need_oil=True,
            status="open",
            created_at=created_at,
        )


def test_vehicle_issue_create_response_schema_extra_forbidden():
    created_at = now_utc()

    with pytest.raises(ValidationError):
        VehicleIssueCreateResponseSchema(
            id=1,
            vehicle_id=100,
            assignment_id=10,
            reported_by_user_id=5,
            need_brakes=True,
            need_tires=False,
            need_oil=True,
            status="open",
            created_at=created_at,
            extra_field="boom",
        )


# ================= LIST ITEM =================

def test_vehicle_issue_list_item_schema_valid():
    created_at = now_utc()
    updated_at = now_utc()
    scheduled_for = now_utc()

    obj = VehicleIssueListItemSchema(
        id=1,
        vehicle_id=100,
        assignment_id=10,
        reported_by_user_id=5,
        need_service_in_km=1500,
        need_brakes=True,
        need_tires=False,
        need_oil=True,
        dashboard_checks="check engine",
        other_problems="front light broken",
        status="open",
        assigned_mechanic_id=7,
        scheduled_for=scheduled_for,
        scheduled_location="Main Service",
        created_at=created_at,
        updated_at=updated_at,
    )

    assert obj.id == 1
    assert obj.vehicle_id == 100
    assert obj.assignment_id == 10
    assert obj.reported_by_user_id == 5
    assert obj.need_service_in_km == 1500
    assert obj.need_brakes is True
    assert obj.need_tires is False
    assert obj.need_oil is True
    assert obj.dashboard_checks == "check engine"
    assert obj.other_problems == "front light broken"
    assert obj.status == "open"
    assert obj.assigned_mechanic_id == 7
    assert obj.scheduled_for == scheduled_for
    assert obj.scheduled_location == "Main Service"
    assert obj.created_at == created_at
    assert obj.updated_at == updated_at


def test_vehicle_issue_list_item_schema_optional_fields():
    created_at = now_utc()
    updated_at = now_utc()

    obj = VehicleIssueListItemSchema(
        id=1,
        vehicle_id=100,
        assignment_id=None,
        reported_by_user_id=5,
        need_service_in_km=None,
        need_brakes=False,
        need_tires=False,
        need_oil=False,
        dashboard_checks=None,
        other_problems=None,
        status="open",
        assigned_mechanic_id=None,
        scheduled_for=None,
        scheduled_location=None,
        created_at=created_at,
        updated_at=updated_at,
    )

    assert obj.assignment_id is None
    assert obj.need_service_in_km is None
    assert obj.dashboard_checks is None
    assert obj.other_problems is None
    assert obj.assigned_mechanic_id is None
    assert obj.scheduled_for is None
    assert obj.scheduled_location is None


def test_vehicle_issue_list_item_schema_invalid_types():
    created_at = now_utc()
    updated_at = now_utc()

    with pytest.raises(ValidationError):
        VehicleIssueListItemSchema(
            id="bad",
            vehicle_id=100,
            assignment_id=10,
            reported_by_user_id=5,
            need_service_in_km=1500,
            need_brakes=True,
            need_tires=False,
            need_oil=True,
            dashboard_checks="check engine",
            other_problems="front light broken",
            status="open",
            assigned_mechanic_id=7,
            scheduled_for=None,
            scheduled_location="Main Service",
            created_at=created_at,
            updated_at=updated_at,
        )

    with pytest.raises(ValidationError):
        VehicleIssueListItemSchema(
            id=1,
            vehicle_id=100,
            assignment_id=10,
            reported_by_user_id=5,
            need_service_in_km=1500,
            need_brakes=True,
            need_tires=False,
            need_oil=True,
            dashboard_checks="check engine",
            other_problems="front light broken",
            status="open",
            assigned_mechanic_id=7,
            scheduled_for=None,
            scheduled_location="Main Service",
            created_at="not-a-date",
            updated_at=updated_at,
        )


def test_vehicle_issue_list_item_schema_extra_forbidden():
    created_at = now_utc()
    updated_at = now_utc()

    with pytest.raises(ValidationError):
        VehicleIssueListItemSchema(
            id=1,
            vehicle_id=100,
            assignment_id=10,
            reported_by_user_id=5,
            need_service_in_km=1500,
            need_brakes=True,
            need_tires=False,
            need_oil=True,
            dashboard_checks="check engine",
            other_problems="front light broken",
            status="open",
            assigned_mechanic_id=7,
            scheduled_for=None,
            scheduled_location="Main Service",
            created_at=created_at,
            updated_at=updated_at,
            extra_field="boom",
        )