from datetime import UTC, date, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.leave_requests import (
    create_leave_request,
    get_leave_or_404,
    list_all_leaves,
    list_my_leaves,
    parse_status,
    review_leave,
)
from app.db.models.leave_request import LeaveStatus


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
    full_name="Ana Popescu",
    unique_code="EMP001",
    is_active=True,
):
    return SimpleNamespace(
        id=user_id,
        full_name=full_name,
        unique_code=unique_code,
        is_active=is_active,
    )


def make_leave(
    leave_id=1,
    user_id=1,
    start_date=date(2026, 4, 1),
    end_date=date(2026, 4, 10),
    reason="Concediu",
    status=LeaveStatus.PENDING,
    reviewed_by_admin_id=None,
    reviewed_at=None,
    created_at=None,
):
    return SimpleNamespace(
        id=leave_id,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        reason=reason,
        status=status,
        reviewed_by_admin_id=reviewed_by_admin_id,
        reviewed_at=reviewed_at,
        created_at=created_at or datetime(2026, 3, 30, 10, 0, tzinfo=UTC),
    )


def make_create_payload(
    user_code="EMP001",
    start_date=date(2026, 4, 1),
    end_date=date(2026, 4, 10),
    reason="Concediu",
):
    return SimpleNamespace(
        user_code=user_code,
        start_date=start_date,
        end_date=end_date,
        reason=reason,
    )


def make_review_payload(status="approved"):
    return SimpleNamespace(status=status)


def test_parse_status_valid():
    assert parse_status("pending") == LeaveStatus.PENDING
    assert parse_status("PENDING") == LeaveStatus.PENDING
    assert parse_status(" Approved ") == LeaveStatus.APPROVED
    assert parse_status("rejected") == LeaveStatus.REJECTED


def test_parse_status_invalid():
    with pytest.raises(HTTPException) as exc:
        parse_status("something-wrong")

    assert exc.value.status_code == 400
    assert exc.value.detail == "Invalid status."


@pytest.mark.asyncio
async def test_get_leave_or_404_returns_leave():
    leave = make_leave(leave_id=10)

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(leave)

    result = await get_leave_or_404(db, 10)

    assert result == leave


@pytest.mark.asyncio
async def test_get_leave_or_404_not_found():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    with pytest.raises(HTTPException) as exc:
        await get_leave_or_404(db, 99)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Leave request not found."


@pytest.mark.asyncio
async def test_create_leave_request(monkeypatch):
    user = make_user(user_id=7, unique_code="EMP007")

    monkeypatch.setattr(
        "app.api.v1.endpoints.leave_requests.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.leave_requests.ensure_user_is_active",
        lambda user: None,
    )

    db = AsyncMock()
    db.add = Mock()

    async def refresh_side_effect(obj):
        obj.id = 101
        obj.created_at = datetime(2026, 3, 30, 12, 0, tzinfo=UTC)

    db.refresh.side_effect = refresh_side_effect

    payload = make_create_payload(
        user_code="EMP007",
        start_date=date(2026, 4, 1),
        end_date=date(2026, 4, 15),
        reason="Plecare",
    )

    result = await create_leave_request(payload=payload, db=db)

    assert result.id == 101
    assert result.user_id == 7
    assert result.start_date == date(2026, 4, 1)
    assert result.end_date == date(2026, 4, 15)
    assert result.reason == "Plecare"
    assert result.status == "pending"

    db.add.assert_called_once()
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once()


@pytest.mark.asyncio
async def test_list_my_leaves(monkeypatch):
    user = make_user(user_id=1, full_name="Ana", unique_code="EMP001")

    leave_1 = make_leave(
        leave_id=1,
        user_id=1,
        status=LeaveStatus.PENDING,
    )
    leave_2 = make_leave(
        leave_id=2,
        user_id=1,
        status=LeaveStatus.APPROVED,
        reason="Medical",
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.leave_requests.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.leave_requests.ensure_user_is_active",
        lambda user: None,
    )

    db = AsyncMock()
    db.execute.return_value = FakeResult(
        [
            (leave_1, user),
            (leave_2, user),
        ]
    )

    result = await list_my_leaves(code="EMP001", db=db)

    assert len(result.requests) == 2

    first = result.requests[0]
    assert first.id == 1
    assert first.user_id == 1
    assert first.user_name == "Ana"
    assert first.user_code == "EMP001"
    assert first.status == "pending"

    second = result.requests[1]
    assert second.id == 2
    assert second.reason == "Medical"
    assert second.status == "approved"


@pytest.mark.asyncio
async def test_list_all_leaves():
    user_1 = make_user(user_id=1, full_name="Ana", unique_code="EMP001")
    user_2 = make_user(user_id=2, full_name="Mihai", unique_code="EMP002")

    leave_1 = make_leave(
        leave_id=1,
        user_id=1,
        status=LeaveStatus.PENDING,
    )
    leave_2 = make_leave(
        leave_id=2,
        user_id=2,
        status=LeaveStatus.REJECTED,
        reason="Urgent",
    )

    admin = make_user(user_id=99, full_name="Admin", unique_code="ADMIN")

    db = AsyncMock()
    db.execute.return_value = FakeResult(
        [
            (leave_1, user_1),
            (leave_2, user_2),
        ]
    )

    result = await list_all_leaves(db=db, admin=admin)

    assert len(result.requests) == 2

    first = result.requests[0]
    assert first.id == 1
    assert first.user_name == "Ana"
    assert first.user_code == "EMP001"
    assert first.status == "pending"

    second = result.requests[1]
    assert second.id == 2
    assert second.user_name == "Mihai"
    assert second.user_code == "EMP002"
    assert second.status == "rejected"


@pytest.mark.asyncio
async def test_review_leave(monkeypatch):
    leave = make_leave(
        leave_id=20,
        user_id=3,
        status=LeaveStatus.PENDING,
    )
    admin = make_user(user_id=500, full_name="Admin")

    monkeypatch.setattr(
        "app.api.v1.endpoints.leave_requests.get_leave_or_404",
        AsyncMock(return_value=leave),
    )

    db = AsyncMock()

    payload = make_review_payload(status="approved")

    result = await review_leave(
        leave_id=20,
        payload=payload,
        db=db,
        admin=admin,
    )

    assert result.id == 20
    assert result.status == "approved"
    assert result.reviewed_by_admin_id == 500
    assert result.reviewed_at is not None

    assert leave.status == LeaveStatus.APPROVED
    assert leave.reviewed_by_admin_id == 500
    assert leave.reviewed_at is not None

    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(leave)


@pytest.mark.asyncio
async def test_review_leave_invalid_status(monkeypatch):
    leave = make_leave(
        leave_id=21,
        status=LeaveStatus.PENDING,
    )
    admin = make_user(user_id=500)

    monkeypatch.setattr(
        "app.api.v1.endpoints.leave_requests.get_leave_or_404",
        AsyncMock(return_value=leave),
    )

    db = AsyncMock()
    payload = make_review_payload(status="invalid-status")

    with pytest.raises(HTTPException) as exc:
        await review_leave(
            leave_id=21,
            payload=payload,
            db=db,
            admin=admin,
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == "Invalid status."
