from datetime import date, datetime, UTC
import uuid

import pytest
from sqlalchemy.exc import IntegrityError

from app.db.models.leave_request import LeaveRequest, LeaveStatus
from app.db.models.user import User


def _unique_suffix() -> str:
    return uuid.uuid4().hex[:8]


def make_valid_user(**overrides) -> User:
    suffix = _unique_suffix()
    data = {
        "full_name": f"Leave User {suffix}",
        "unique_code": f"LEAVE-{suffix}",
        "username": f"leave_{suffix}",
        "password_hash": "hashed-password",
        "role": "employee",
        "is_active": True,
    }
    data.update(overrides)
    return User(**data)


@pytest.mark.asyncio
async def test_leave_request_rejects_end_date_before_start_date(db_session):
    user = make_valid_user()
    db_session.add(user)
    await db_session.flush()

    leave_request = LeaveRequest(
        user_id=user.id,
        start_date=date(2026, 4, 10),
        end_date=date(2026, 4, 9),
        status=LeaveStatus.PENDING,
    )
    db_session.add(leave_request)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_leave_request_rejects_blank_reason(db_session):
    user = make_valid_user()
    db_session.add(user)
    await db_session.flush()

    leave_request = LeaveRequest(
        user_id=user.id,
        start_date=date(2026, 4, 10),
        end_date=date(2026, 4, 12),
        reason="   ",
        status=LeaveStatus.PENDING,
    )
    db_session.add(leave_request)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_leave_request_pending_cannot_have_review_fields(db_session):
    user = make_valid_user()
    admin = make_valid_user(role="admin")
    db_session.add_all([user, admin])
    await db_session.flush()

    leave_request = LeaveRequest(
        user_id=user.id,
        start_date=date(2026, 4, 10),
        end_date=date(2026, 4, 12),
        status=LeaveStatus.PENDING,
        reviewed_by_admin_id=admin.id,
        reviewed_at=datetime.now(UTC),
    )
    db_session.add(leave_request)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_leave_request_approved_requires_review_fields(db_session):
    user = make_valid_user()
    db_session.add(user)
    await db_session.flush()

    leave_request = LeaveRequest(
        user_id=user.id,
        start_date=date(2026, 4, 10),
        end_date=date(2026, 4, 12),
        status=LeaveStatus.APPROVED,
        reviewed_by_admin_id=None,
        reviewed_at=None,
    )
    db_session.add(leave_request)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_leave_request_rejected_requires_review_fields(db_session):
    user = make_valid_user()
    db_session.add(user)
    await db_session.flush()

    leave_request = LeaveRequest(
        user_id=user.id,
        start_date=date(2026, 4, 10),
        end_date=date(2026, 4, 12),
        status=LeaveStatus.REJECTED,
        reviewed_by_admin_id=None,
        reviewed_at=None,
    )
    db_session.add(leave_request)

    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_leave_request_allows_valid_reviewed_request(db_session):
    user = make_valid_user()
    admin = make_valid_user(role="admin")
    db_session.add_all([user, admin])
    await db_session.flush()

    leave_request = LeaveRequest(
        user_id=user.id,
        start_date=date(2026, 4, 10),
        end_date=date(2026, 4, 12),
        reason="Concediu planificat",
        status=LeaveStatus.APPROVED,
        reviewed_by_admin_id=admin.id,
        reviewed_at=datetime.now(UTC),
    )
    db_session.add(leave_request)

    await db_session.flush()