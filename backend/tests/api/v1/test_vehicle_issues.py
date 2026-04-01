from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.vehicle_issues import (
    build_issue_list_item,
    clean_text,
    create_vehicle_issue,
    ensure_assignment_belongs_to_user,
    ensure_assignment_is_active,
    ensure_issue_payload_has_content,
    ensure_user_is_active,
    get_assignment_or_404,
    get_issue_or_404,
    get_user_by_code_or_404,
    list_my_vehicle_issues,
    list_vehicle_issues,
    list_vehicle_issues_for_mechanic,
    parse_issue_status,
    update_vehicle_issue_by_mechanic,
    update_vehicle_issue_status,
)
from app.db.models.vehicle_assignment import AssignmentStatus
from app.db.models.vehicle_issue import VehicleIssueStatus


class FakeScalarResult:
    def __init__(self, item):
        self._item = item

    def scalar_one_or_none(self):
        return self._item


class FakeResult:
    def __init__(self, items):
        self._items = items

    def all(self):
        return self._items


def make_user(
    user_id=1,
    unique_code="EMP001",
    full_name="Ana Popescu",
    is_active=True,
):
    return SimpleNamespace(
        id=user_id,
        unique_code=unique_code,
        full_name=full_name,
        is_active=is_active,
    )


def make_vehicle(
    vehicle_id=10,
    license_plate="B-123-XYZ",
    brand="Dacia",
    model="Logan",
):
    return SimpleNamespace(
        id=vehicle_id,
        license_plate=license_plate,
        brand=brand,
        model=model,
    )


def make_assignment(
    assignment_id=100,
    user_id=1,
    vehicle_id=10,
    status=AssignmentStatus.ACTIVE,
):
    return SimpleNamespace(
        id=assignment_id,
        user_id=user_id,
        vehicle_id=vehicle_id,
        status=status,
    )


def make_issue(
    issue_id=1,
    vehicle_id=10,
    assignment_id=100,
    reported_by_user_id=1,
    need_service_in_km=None,
    need_brakes=False,
    need_tires=False,
    need_oil=False,
    dashboard_checks=None,
    other_problems=None,
    status=VehicleIssueStatus.OPEN,
    assigned_mechanic_id=None,
    scheduled_for=None,
    scheduled_location=None,
    created_at=None,
    updated_at=None,
):
    return SimpleNamespace(
        id=issue_id,
        vehicle_id=vehicle_id,
        assignment_id=assignment_id,
        reported_by_user_id=reported_by_user_id,
        need_service_in_km=need_service_in_km,
        need_brakes=need_brakes,
        need_tires=need_tires,
        need_oil=need_oil,
        dashboard_checks=dashboard_checks,
        other_problems=other_problems,
        status=status,
        assigned_mechanic_id=assigned_mechanic_id,
        scheduled_for=scheduled_for,
        scheduled_location=scheduled_location,
        created_at=created_at or datetime(2026, 3, 30, 10, 0, tzinfo=timezone.utc),
        updated_at=updated_at or datetime(2026, 3, 30, 11, 0, tzinfo=timezone.utc),
    )


def make_create_payload(
    user_code="EMP001",
    assignment_id=100,
    need_service_in_km=None,
    need_brakes=False,
    need_tires=False,
    need_oil=False,
    dashboard_checks=None,
    other_problems=None,
):
    return SimpleNamespace(
        user_code=user_code,
        assignment_id=assignment_id,
        need_service_in_km=need_service_in_km,
        need_brakes=need_brakes,
        need_tires=need_tires,
        need_oil=need_oil,
        dashboard_checks=dashboard_checks,
        other_problems=other_problems,
    )


def make_status_payload(status="open"):
    return SimpleNamespace(status=status)


def make_mechanic_update_payload(
    status=None,
    scheduled_for=None,
    scheduled_location=None,
):
    return SimpleNamespace(
        status=status,
        scheduled_for=scheduled_for,
        scheduled_location=scheduled_location,
    )


def test_parse_issue_status_valid():
    assert parse_issue_status("open") == VehicleIssueStatus.OPEN
    assert parse_issue_status("OPEN") == VehicleIssueStatus.OPEN
    assert parse_issue_status(" in_progress ") == VehicleIssueStatus.IN_PROGRESS
    assert parse_issue_status("resolved") == VehicleIssueStatus.RESOLVED


def test_parse_issue_status_invalid():
    with pytest.raises(HTTPException) as exc:
        parse_issue_status("bad-status")

    assert exc.value.status_code == 400
    assert exc.value.detail == "Status invalid."


@pytest.mark.asyncio
async def test_get_user_by_code_or_404_returns_user():
    user = make_user()

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(user)

    result = await get_user_by_code_or_404(db, "EMP001")

    assert result == user


@pytest.mark.asyncio
async def test_get_user_by_code_or_404_not_found():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    with pytest.raises(HTTPException) as exc:
        await get_user_by_code_or_404(db, "EMP001")

    assert exc.value.status_code == 404
    assert exc.value.detail == "User not found."


@pytest.mark.asyncio
async def test_get_assignment_or_404_returns_assignment():
    assignment = make_assignment()

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(assignment)

    result = await get_assignment_or_404(db, 100)

    assert result == assignment


@pytest.mark.asyncio
async def test_get_assignment_or_404_not_found():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    with pytest.raises(HTTPException) as exc:
        await get_assignment_or_404(db, 999)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Session not found."


@pytest.mark.asyncio
async def test_get_issue_or_404_returns_issue():
    issue = make_issue()

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(issue)

    result = await get_issue_or_404(db, 1)

    assert result == issue


@pytest.mark.asyncio
async def test_get_issue_or_404_not_found():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    with pytest.raises(HTTPException) as exc:
        await get_issue_or_404(db, 999)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Issue not found."


def test_ensure_user_is_active_ok():
    user = make_user(is_active=True)
    ensure_user_is_active(user)


def test_ensure_user_is_active_raises():
    user = make_user(is_active=False)

    with pytest.raises(HTTPException) as exc:
        ensure_user_is_active(user)

    assert exc.value.status_code == 403
    assert exc.value.detail == "User inactiv."


def test_ensure_assignment_belongs_to_user_ok():
    assignment = make_assignment(user_id=1)
    user = make_user(user_id=1)

    ensure_assignment_belongs_to_user(assignment, user)


def test_ensure_assignment_belongs_to_user_raises():
    assignment = make_assignment(user_id=2)
    user = make_user(user_id=1)

    with pytest.raises(HTTPException) as exc:
        ensure_assignment_belongs_to_user(assignment, user)

    assert exc.value.status_code == 403
    assert exc.value.detail == "Nu ai voie să raportezi probleme pentru această sesiune."


def test_ensure_assignment_is_active_ok():
    assignment = make_assignment(status=AssignmentStatus.ACTIVE)
    ensure_assignment_is_active(assignment)


def test_ensure_assignment_is_active_raises():
    assignment = make_assignment(status=AssignmentStatus.CLOSED)

    with pytest.raises(HTTPException) as exc:
        ensure_assignment_is_active(assignment)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Poți raporta probleme doar pentru o sesiune activă."


def test_clean_text():
    assert clean_text("  abc  ") == "abc"
    assert clean_text("   ") is None
    assert clean_text(None) is None


def test_ensure_issue_payload_has_content_ok_with_flags():
    payload = make_create_payload(need_brakes=True)
    ensure_issue_payload_has_content(payload, None, None)


def test_ensure_issue_payload_has_content_ok_with_text():
    payload = make_create_payload()
    ensure_issue_payload_has_content(payload, "check engine", None)


def test_ensure_issue_payload_has_content_raises():
    payload = make_create_payload()

    with pytest.raises(HTTPException) as exc:
        ensure_issue_payload_has_content(payload, None, None)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Completează cel puțin o problemă sau observație."


def test_build_issue_list_item():
    issue = make_issue(
        issue_id=1,
        need_oil=True,
        other_problems="Brake noise",
        status=VehicleIssueStatus.IN_PROGRESS,
    )
    vehicle = make_vehicle(vehicle_id=10, license_plate="B-123-XYZ", brand="VW", model="Golf")
    user = make_user(user_id=1, full_name="Ana Popescu")

    result = build_issue_list_item(issue, vehicle, user)

    assert result.id == 1
    assert result.vehicle_id == 10
    assert result.vehicle_license_plate == "B-123-XYZ"
    assert result.vehicle_brand == "VW"
    assert result.vehicle_model == "Golf"
    assert result.reported_by_user_id == 1
    assert result.reported_by_name == "Ana Popescu"
    assert result.need_oil is True
    assert result.other_problems == "Brake noise"
    assert result.status == "in_progress"


@pytest.mark.asyncio
async def test_create_vehicle_issue(monkeypatch):
    user = make_user(user_id=1, unique_code="EMP001", is_active=True)
    assignment = make_assignment(
        assignment_id=100,
        user_id=1,
        vehicle_id=10,
        status=AssignmentStatus.ACTIVE,
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_issues.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_issues.get_assignment_or_404",
        AsyncMock(return_value=assignment),
    )

    db = AsyncMock()
    db.add = Mock()

    async def refresh_side_effect(obj):
        obj.id = 200
        obj.created_at = datetime(2026, 3, 30, 12, 0, tzinfo=timezone.utc)

    db.refresh.side_effect = refresh_side_effect

    payload = make_create_payload(
        user_code="EMP001",
        assignment_id=100,
        need_oil=True,
        dashboard_checks="  check engine  ",
        other_problems="  strange noise ",
    )

    result = await create_vehicle_issue(payload=payload, db=db)

    assert result.id == 200
    assert result.vehicle_id == 10
    assert result.assignment_id == 100
    assert result.reported_by_user_id == 1
    assert result.need_oil is True
    assert result.dashboard_checks == "check engine"
    assert result.other_problems == "strange noise"
    assert result.status == "open"

    db.add.assert_called_once()
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once()


@pytest.mark.asyncio
async def test_list_my_vehicle_issues(monkeypatch):
    user = make_user(user_id=1, unique_code="EMP001", is_active=True)
    vehicle = make_vehicle(vehicle_id=10)
    issue = make_issue(
        issue_id=1,
        vehicle_id=10,
        reported_by_user_id=1,
        status=VehicleIssueStatus.OPEN,
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_issues.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )

    db = AsyncMock()
    db.execute.return_value = FakeResult([
        (issue, vehicle, user),
    ])

    result = await list_my_vehicle_issues(
        code="EMP001",
        status_filter=None,
        db=db,
    )

    assert len(result.issues) == 1
    assert result.issues[0].id == 1
    assert result.issues[0].reported_by_name == "Ana Popescu"
    assert result.issues[0].status == "open"


@pytest.mark.asyncio
async def test_list_vehicle_issues():
    user = make_user(user_id=1, full_name="Ana Popescu")
    vehicle = make_vehicle(vehicle_id=10)
    issue = make_issue(
        issue_id=1,
        vehicle_id=10,
        reported_by_user_id=1,
        status=VehicleIssueStatus.RESOLVED,
    )

    db = AsyncMock()
    db.execute.return_value = FakeResult([
        (issue, vehicle, user),
    ])

    result = await list_vehicle_issues(
        status_filter="resolved",
        vehicle_id=None,
        reported_by_user_id=None,
        db=db,
        _=True,
    )

    assert len(result.issues) == 1
    assert result.issues[0].status == "resolved"


@pytest.mark.asyncio
async def test_list_vehicle_issues_for_mechanic():
    user = make_user(user_id=1, full_name="Ana Popescu")
    mechanic = make_user(user_id=99, full_name="Mechanic")
    vehicle = make_vehicle(vehicle_id=10)
    issue = make_issue(
        issue_id=1,
        vehicle_id=10,
        reported_by_user_id=1,
        status=VehicleIssueStatus.IN_PROGRESS,
    )

    db = AsyncMock()
    db.execute.return_value = FakeResult([
        (issue, vehicle, user),
    ])

    result = await list_vehicle_issues_for_mechanic(
        status_filter="in_progress",
        db=db,
        mechanic=mechanic,
    )

    assert len(result.issues) == 1
    assert result.issues[0].status == "in_progress"


@pytest.mark.asyncio
async def test_update_vehicle_issue_status_same_status(monkeypatch):
    issue = make_issue(
        issue_id=1,
        status=VehicleIssueStatus.OPEN,
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_issues.get_issue_or_404",
        AsyncMock(return_value=issue),
    )

    db = AsyncMock()
    payload = make_status_payload(status="open")

    result = await update_vehicle_issue_status(
        issue_id=1,
        payload=payload,
        db=db,
        _=True,
    )

    assert result.id == 1
    assert result.status == "open"
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_vehicle_issue_status_changes_status(monkeypatch):
    issue = make_issue(
        issue_id=1,
        status=VehicleIssueStatus.OPEN,
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_issues.get_issue_or_404",
        AsyncMock(return_value=issue),
    )

    db = AsyncMock()
    payload = make_status_payload(status="resolved")

    result = await update_vehicle_issue_status(
        issue_id=1,
        payload=payload,
        db=db,
        _=True,
    )

    assert result.id == 1
    assert result.status == "resolved"
    assert issue.status == VehicleIssueStatus.RESOLVED

    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(issue)


@pytest.mark.asyncio
async def test_update_vehicle_issue_by_mechanic(monkeypatch):
    issue = make_issue(
        issue_id=1,
        status=VehicleIssueStatus.OPEN,
        assigned_mechanic_id=None,
        scheduled_for=None,
        scheduled_location=None,
    )
    mechanic = make_user(user_id=50, full_name="Mechanic")

    monkeypatch.setattr(
        "app.api.v1.endpoints.vehicle_issues.get_issue_or_404",
        AsyncMock(return_value=issue),
    )

    db = AsyncMock()
    scheduled_for = datetime(2026, 4, 2, 9, 30, tzinfo=timezone.utc)
    payload = make_mechanic_update_payload(
        status="in_progress",
        scheduled_for=scheduled_for,
        scheduled_location="  Service Bucuresti  ",
    )

    result = await update_vehicle_issue_by_mechanic(
        issue_id=1,
        payload=payload,
        db=db,
        mechanic=mechanic,
    )

    assert result.id == 1
    assert result.status == "in_progress"
    assert result.assigned_mechanic_id == 50
    assert result.scheduled_for == scheduled_for
    assert result.scheduled_location == "Service Bucuresti"

    assert issue.status == VehicleIssueStatus.IN_PROGRESS
    assert issue.assigned_mechanic_id == 50
    assert issue.scheduled_for == scheduled_for
    assert issue.scheduled_location == "Service Bucuresti"

    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(issue)