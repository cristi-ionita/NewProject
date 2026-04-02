from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.api.v1.endpoints.admin_dashboard import (
    count_rows,
    get_admin_dashboard_summary,
)
from app.db.models.vehicle_issue import VehicleIssueStatus


class FakeResult:
    def __init__(self, items):
        self._items = items

    def all(self):
        return self._items


def make_issue(
    issue_id: int,
    vehicle_id: int,
    status,
    created_at,
    other_problems: str | None = None,
):
    return SimpleNamespace(
        id=issue_id,
        vehicle_id=vehicle_id,
        status=status,
        created_at=created_at,
        other_problems=other_problems,
    )


def make_vehicle(
    vehicle_id: int,
    license_plate: str,
    brand: str,
    model: str,
):
    return SimpleNamespace(
        id=vehicle_id,
        license_plate=license_plate,
        brand=brand,
        model=model,
    )


def make_user(
    user_id: int,
    full_name: str,
):
    return SimpleNamespace(
        id=user_id,
        full_name=full_name,
    )


def make_assignment(
    assignment_id: int,
    started_at,
):
    return SimpleNamespace(
        id=assignment_id,
        started_at=started_at,
    )


@pytest.mark.asyncio
async def test_count_rows_returns_scalar_value():
    db = AsyncMock()
    db.scalar.return_value = 7

    result = await count_rows(db, object())

    assert result == 7


@pytest.mark.asyncio
async def test_count_rows_returns_zero_when_scalar_is_none():
    db = AsyncMock()
    db.scalar.return_value = None

    result = await count_rows(db, object())

    assert result == 0


@pytest.mark.asyncio
async def test_get_admin_dashboard_summary():
    db = AsyncMock()

    # 18 apeluri count_rows -> db.scalar(...)
    db.scalar.side_effect = [
        10,
        8,
        2,  # users_total, users_active, users_inactive
        20,
        12,
        3,
        4,
        1,  # vehicles_total, active, in_service, inactive, sold
        5,
        7,  # assignments_active, assignments_closed
        6,
        2,
        9,
        17,  # issues_open, issues_in_progress, issues_resolved, issues_total
        50,
        30,
        20,
        11,
        22,
        13,  # documents_total, personal, company, contracts, payslips, driver_licenses
    ]

    issue_1 = make_issue(
        issue_id=101,
        vehicle_id=1001,
        status=VehicleIssueStatus.OPEN,
        created_at=datetime(2026, 3, 29, 10, 0, tzinfo=UTC),
        other_problems="flat tire",
    )
    vehicle_1 = make_vehicle(
        vehicle_id=1001,
        license_plate="B-100-AAA",
        brand="Dacia",
        model="Logan",
    )
    user_1 = make_user(
        user_id=501,
        full_name="Ana Popescu",
    )

    issue_2 = make_issue(
        issue_id=102,
        vehicle_id=1002,
        status="custom_status",
        created_at=datetime(2026, 3, 28, 9, 30, tzinfo=UTC),
        other_problems=None,
    )
    vehicle_2 = make_vehicle(
        vehicle_id=1002,
        license_plate="B-200-BBB",
        brand="VW",
        model="Golf",
    )
    user_2 = make_user(
        user_id=502,
        full_name="Mihai Ionescu",
    )

    assignment_1 = make_assignment(
        assignment_id=201,
        started_at=datetime(2026, 3, 27, 8, 0, tzinfo=UTC),
    )
    active_user_1 = make_user(
        user_id=601,
        full_name="Cristi Marin",
    )
    active_vehicle_1 = make_vehicle(
        vehicle_id=2001,
        license_plate="B-300-CCC",
        brand="Skoda",
        model="Octavia",
    )

    assignment_2 = make_assignment(
        assignment_id=202,
        started_at=datetime(2026, 3, 26, 7, 45, tzinfo=UTC),
    )
    active_user_2 = make_user(
        user_id=602,
        full_name="Elena Radu",
    )
    active_vehicle_2 = make_vehicle(
        vehicle_id=2002,
        license_plate="B-400-DDD",
        brand="Ford",
        model="Focus",
    )

    db.execute.side_effect = [
        FakeResult(
            [
                (issue_1, vehicle_1, user_1),
                (issue_2, vehicle_2, user_2),
            ]
        ),
        FakeResult(
            [
                (assignment_1, active_user_1, active_vehicle_1),
                (assignment_2, active_user_2, active_vehicle_2),
            ]
        ),
    ]

    response = await get_admin_dashboard_summary(db=db, _=True)

    # users
    assert response.users.total == 10
    assert response.users.active == 8
    assert response.users.inactive == 2

    # vehicles
    assert response.vehicles.total == 20
    assert response.vehicles.active == 12
    assert response.vehicles.in_service == 3
    assert response.vehicles.inactive == 4
    assert response.vehicles.sold == 1

    # assignments
    assert response.assignments.active == 5
    assert response.assignments.closed == 7

    # issues
    assert response.issues.open == 6
    assert response.issues.in_progress == 2
    assert response.issues.resolved == 9
    assert response.issues.total == 17

    # documents
    assert response.documents.total == 50
    assert response.documents.personal == 30
    assert response.documents.company == 20
    assert response.documents.contracts == 11
    assert response.documents.payslips == 22
    assert response.documents.driver_licenses == 13

    # recent issues
    assert len(response.recent_issues) == 2

    first_issue = response.recent_issues[0]
    assert first_issue.id == 101
    assert first_issue.vehicle_id == 1001
    assert first_issue.vehicle_license_plate == "B-100-AAA"
    assert first_issue.reported_by_user_id == 501
    assert first_issue.reported_by_name == "Ana Popescu"
    assert first_issue.status == "open"
    assert first_issue.other_problems == "flat tire"

    second_issue = response.recent_issues[1]
    assert second_issue.id == 102
    assert second_issue.status == "custom_status"

    # active assignments
    assert len(response.active_assignments) == 2

    first_assignment = response.active_assignments[0]
    assert first_assignment.assignment_id == 201
    assert first_assignment.user_id == 601
    assert first_assignment.user_name == "Cristi Marin"
    assert first_assignment.vehicle_id == 2001
    assert first_assignment.vehicle_license_plate == "B-300-CCC"
    assert first_assignment.vehicle_brand == "Skoda"
    assert first_assignment.vehicle_model == "Octavia"
    assert first_assignment.started_at == datetime(2026, 3, 27, 8, 0, tzinfo=UTC)

    second_assignment = response.active_assignments[1]
    assert second_assignment.assignment_id == 202
    assert second_assignment.user_id == 602
    assert second_assignment.user_name == "Elena Radu"
    assert second_assignment.vehicle_id == 2002
    assert second_assignment.vehicle_license_plate == "B-400-DDD"
    assert second_assignment.vehicle_brand == "Ford"
    assert second_assignment.vehicle_model == "Focus"
    assert second_assignment.started_at == datetime(2026, 3, 26, 7, 45, tzinfo=UTC)
