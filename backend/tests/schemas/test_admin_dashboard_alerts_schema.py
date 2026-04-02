from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.schemas.admin_dashboard_alerts import (
    DashboardOccupiedVehicleSchema,
    DashboardUserAlertSchema,
    DashboardVehicleIssueAlertSchema,
    OccupiedVehiclesResponse,
    UsersWithoutContractResponse,
    UsersWithoutDriverLicenseResponse,
    UsersWithoutProfileResponse,
    VehiclesWithOpenIssuesResponse,
)


def now_utc():
    return datetime.now(UTC)


# =========================
# DashboardUserAlertSchema
# =========================


def test_dashboard_user_alert_valid():
    data = {
        "user_id": 1,
        "full_name": "Ana Popescu",
        "unique_code": "EMP001",
        "shift_number": "1",
        "is_active": True,
    }

    obj = DashboardUserAlertSchema(**data)

    assert obj.user_id == 1
    assert obj.full_name == "Ana Popescu"
    assert obj.shift_number == "1"


def test_dashboard_user_alert_optional_shift():
    obj = DashboardUserAlertSchema(
        user_id=1,
        full_name="Ana Popescu",
        unique_code="EMP001",
        shift_number=None,
        is_active=True,
    )

    assert obj.shift_number is None


def test_dashboard_user_alert_extra_field_forbidden():
    with pytest.raises(ValidationError):
        DashboardUserAlertSchema(
            user_id=1,
            full_name="Ana",
            unique_code="EMP001",
            is_active=True,
            extra_field="boom",
        )


# =========================
# DashboardVehicleIssueAlertSchema
# =========================


def test_dashboard_vehicle_issue_alert_valid():
    obj = DashboardVehicleIssueAlertSchema(
        vehicle_id=10,
        license_plate="B-123-XYZ",
        brand="Dacia",
        model="Logan",
        open_issues_count=2,
        in_progress_issues_count=1,
        latest_issue_created_at=now_utc(),
    )

    assert obj.vehicle_id == 10


def test_dashboard_vehicle_issue_alert_optional_date():
    obj = DashboardVehicleIssueAlertSchema(
        vehicle_id=10,
        license_plate="B-123-XYZ",
        brand="Dacia",
        model="Logan",
        open_issues_count=0,
        in_progress_issues_count=0,
        latest_issue_created_at=None,
    )

    assert obj.latest_issue_created_at is None


def test_dashboard_vehicle_issue_alert_extra_forbidden():
    with pytest.raises(ValidationError):
        DashboardVehicleIssueAlertSchema(
            vehicle_id=10,
            license_plate="B-123-XYZ",
            brand="Dacia",
            model="Logan",
            open_issues_count=1,
            in_progress_issues_count=1,
            extra="bad",
        )


# =========================
# DashboardOccupiedVehicleSchema
# =========================


def test_dashboard_occupied_vehicle_valid():
    obj = DashboardOccupiedVehicleSchema(
        assignment_id=100,
        vehicle_id=10,
        license_plate="B-123-XYZ",
        brand="BMW",
        model="X5",
        user_id=1,
        user_name="Ion Popescu",
        started_at=now_utc(),
    )

    assert obj.assignment_id == 100


def test_dashboard_occupied_vehicle_extra_forbidden():
    with pytest.raises(ValidationError):
        DashboardOccupiedVehicleSchema(
            assignment_id=1,
            vehicle_id=1,
            license_plate="X",
            brand="B",
            model="M",
            user_id=1,
            user_name="Name",
            started_at=now_utc(),
            extra="nope",
        )


# =========================
# Response wrappers
# =========================


def test_users_without_profile_response():
    user = DashboardUserAlertSchema(
        user_id=1,
        full_name="Ana",
        unique_code="EMP",
        is_active=True,
    )

    resp = UsersWithoutProfileResponse(users=[user])
    assert len(resp.users) == 1


def test_users_without_contract_response():
    resp = UsersWithoutContractResponse(users=[])
    assert resp.users == []


def test_users_without_driver_license_response():
    resp = UsersWithoutDriverLicenseResponse(users=[])
    assert resp.users == []


def test_vehicles_with_open_issues_response():
    vehicle = DashboardVehicleIssueAlertSchema(
        vehicle_id=1,
        license_plate="B-1",
        brand="Dacia",
        model="Logan",
        open_issues_count=1,
        in_progress_issues_count=0,
    )

    resp = VehiclesWithOpenIssuesResponse(vehicles=[vehicle])
    assert resp.vehicles[0].vehicle_id == 1


def test_occupied_vehicles_response():
    vehicle = DashboardOccupiedVehicleSchema(
        assignment_id=1,
        vehicle_id=1,
        license_plate="B-1",
        brand="Dacia",
        model="Logan",
        user_id=1,
        user_name="Ion",
        started_at=now_utc(),
    )

    resp = OccupiedVehiclesResponse(vehicles=[vehicle])
    assert resp.vehicles[0].assignment_id == 1
