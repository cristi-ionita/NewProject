from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.schemas.admin_dashboard import (
    AdminDashboardSummaryResponse,
    DashboardActiveAssignmentSchema,
    DashboardAssignmentsSummarySchema,
    DashboardDocumentsSummarySchema,
    DashboardIssuesSummarySchema,
    DashboardRecentIssueSchema,
    DashboardUsersSummarySchema,
    DashboardVehiclesSummarySchema,
)


def test_dashboard_users_summary_schema_valid():
    obj = DashboardUsersSummarySchema(
        total=10,
        active=8,
        inactive=2,
    )

    assert obj.total == 10
    assert obj.active == 8
    assert obj.inactive == 2


def test_dashboard_users_summary_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        DashboardUsersSummarySchema(
            total=10,
            active=8,
            inactive=2,
            extra_field=1,
        )


def test_dashboard_vehicles_summary_schema_valid():
    obj = DashboardVehiclesSummarySchema(
        total=20,
        active=12,
        in_service=3,
        inactive=4,
        sold=1,
    )

    assert obj.total == 20
    assert obj.active == 12
    assert obj.in_service == 3
    assert obj.inactive == 4
    assert obj.sold == 1


def test_dashboard_vehicles_summary_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        DashboardVehiclesSummarySchema(
            total=20,
            active=12,
            in_service=3,
            inactive=4,
            sold=1,
            extra_field=1,
        )


def test_dashboard_assignments_summary_schema_valid():
    obj = DashboardAssignmentsSummarySchema(
        active=5,
        closed=7,
    )

    assert obj.active == 5
    assert obj.closed == 7


def test_dashboard_assignments_summary_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        DashboardAssignmentsSummarySchema(
            active=5,
            closed=7,
            extra_field=1,
        )


def test_dashboard_issues_summary_schema_valid():
    obj = DashboardIssuesSummarySchema(
        open=6,
        in_progress=2,
        resolved=9,
        total=17,
    )

    assert obj.open == 6
    assert obj.in_progress == 2
    assert obj.resolved == 9
    assert obj.total == 17


def test_dashboard_issues_summary_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        DashboardIssuesSummarySchema(
            open=6,
            in_progress=2,
            resolved=9,
            total=17,
            extra_field=1,
        )


def test_dashboard_documents_summary_schema_valid():
    obj = DashboardDocumentsSummarySchema(
        total=50,
        personal=30,
        company=20,
        contracts=11,
        payslips=22,
        driver_licenses=13,
    )

    assert obj.total == 50
    assert obj.personal == 30
    assert obj.company == 20
    assert obj.contracts == 11
    assert obj.payslips == 22
    assert obj.driver_licenses == 13


def test_dashboard_documents_summary_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        DashboardDocumentsSummarySchema(
            total=50,
            personal=30,
            company=20,
            contracts=11,
            payslips=22,
            driver_licenses=13,
            extra_field=1,
        )


def test_dashboard_recent_issue_schema_valid():
    now = datetime.now(timezone.utc)

    obj = DashboardRecentIssueSchema(
        id=1,
        vehicle_id=100,
        vehicle_license_plate="B-100-AAA",
        reported_by_user_id=10,
        reported_by_name="Ana Popescu",
        status="open",
        created_at=now,
        other_problems="flat tire",
    )

    assert obj.id == 1
    assert obj.vehicle_id == 100
    assert obj.other_problems == "flat tire"


def test_dashboard_recent_issue_schema_optional_other_problems():
    now = datetime.now(timezone.utc)

    obj = DashboardRecentIssueSchema(
        id=1,
        vehicle_id=100,
        vehicle_license_plate="B-100-AAA",
        reported_by_user_id=10,
        reported_by_name="Ana Popescu",
        status="open",
        created_at=now,
        other_problems=None,
    )

    assert obj.other_problems is None


def test_dashboard_recent_issue_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        DashboardRecentIssueSchema(
            id=1,
            vehicle_id=100,
            vehicle_license_plate="B-100-AAA",
            reported_by_user_id=10,
            reported_by_name="Ana Popescu",
            status="open",
            created_at=datetime.now(timezone.utc),
            extra_field=1,
        )


def test_dashboard_active_assignment_schema_valid():
    now = datetime.now(timezone.utc)

    obj = DashboardActiveAssignmentSchema(
        assignment_id=201,
        user_id=601,
        user_name="Cristi Marin",
        vehicle_id=2001,
        vehicle_license_plate="B-300-CCC",
        vehicle_brand="Skoda",
        vehicle_model="Octavia",
        started_at=now,
    )

    assert obj.assignment_id == 201
    assert obj.vehicle_brand == "Skoda"


def test_dashboard_active_assignment_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        DashboardActiveAssignmentSchema(
            assignment_id=201,
            user_id=601,
            user_name="Cristi Marin",
            vehicle_id=2001,
            vehicle_license_plate="B-300-CCC",
            vehicle_brand="Skoda",
            vehicle_model="Octavia",
            started_at=datetime.now(timezone.utc),
            extra_field=1,
        )


def test_admin_dashboard_summary_response_valid():
    now = datetime.now(timezone.utc)

    obj = AdminDashboardSummaryResponse(
        users=DashboardUsersSummarySchema(total=10, active=8, inactive=2),
        vehicles=DashboardVehiclesSummarySchema(
            total=20, active=12, in_service=3, inactive=4, sold=1
        ),
        assignments=DashboardAssignmentsSummarySchema(active=5, closed=7),
        issues=DashboardIssuesSummarySchema(
            open=6, in_progress=2, resolved=9, total=17
        ),
        documents=DashboardDocumentsSummarySchema(
            total=50, personal=30, company=20, contracts=11, payslips=22, driver_licenses=13
        ),
        recent_issues=[
            DashboardRecentIssueSchema(
                id=1,
                vehicle_id=100,
                vehicle_license_plate="B-100-AAA",
                reported_by_user_id=10,
                reported_by_name="Ana Popescu",
                status="open",
                created_at=now,
            )
        ],
        active_assignments=[
            DashboardActiveAssignmentSchema(
                assignment_id=201,
                user_id=601,
                user_name="Cristi Marin",
                vehicle_id=2001,
                vehicle_license_plate="B-300-CCC",
                vehicle_brand="Skoda",
                vehicle_model="Octavia",
                started_at=now,
            )
        ],
    )

    assert obj.users.total == 10
    assert len(obj.recent_issues) == 1


def test_admin_dashboard_summary_response_extra_forbidden():
    now = datetime.now(timezone.utc)

    with pytest.raises(ValidationError):
        AdminDashboardSummaryResponse(
            users=DashboardUsersSummarySchema(total=10, active=8, inactive=2),
            vehicles=DashboardVehiclesSummarySchema(
                total=20, active=12, in_service=3, inactive=4, sold=1
            ),
            assignments=DashboardAssignmentsSummarySchema(active=5, closed=7),
            issues=DashboardIssuesSummarySchema(
                open=6, in_progress=2, resolved=9, total=17
            ),
            documents=DashboardDocumentsSummarySchema(
                total=50, personal=30, company=20, contracts=11, payslips=22, driver_licenses=13
            ),
            recent_issues=[
                DashboardRecentIssueSchema(
                    id=1,
                    vehicle_id=100,
                    vehicle_license_plate="B-100-AAA",
                    reported_by_user_id=10,
                    reported_by_name="Ana Popescu",
                    status="open",
                    created_at=now,
                )
            ],
            active_assignments=[
                DashboardActiveAssignmentSchema(
                    assignment_id=201,
                    user_id=601,
                    user_name="Cristi Marin",
                    vehicle_id=2001,
                    vehicle_license_plate="B-300-CCC",
                    vehicle_brand="Skoda",
                    vehicle_model="Octavia",
                    started_at=now,
                )
            ],
            extra_field=1,
        )