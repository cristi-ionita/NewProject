from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import (
    get_current_admin,
    get_current_driver,
)
from app.db.models.leave_request import LeaveRequest, LeaveStatus
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.leave_request import (
    LeaveRequestCreateSchema,
    LeaveRequestCreateResponseSchema,
    LeaveRequestItemSchema,
    LeaveRequestReviewSchema,
    LeaveRequestReviewResponseSchema,
)

router = APIRouter(prefix="/leave-requests", tags=["leave-requests"])


# =========================
# HELPERS
# =========================

def parse_status(value: str) -> LeaveStatus:
    try:
        return LeaveStatus(value.strip().lower())
    except ValueError:
        raise HTTPException(400, "Status invalid.")


async def get_leave_or_404(db: AsyncSession, leave_id: int) -> LeaveRequest:
    leave = (
        await db.execute(select(LeaveRequest).where(LeaveRequest.id == leave_id))
    ).scalar_one_or_none()

    if not leave:
        raise HTTPException(404, "Leave request not found.")

    return leave


# =========================
# CREATE (EMPLOYEE)
# =========================

@router.post("", response_model=LeaveRequestCreateResponseSchema)
async def create_leave(
    payload: LeaveRequestCreateSchema,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_driver),
):
    if payload.start_date > payload.end_date:
        raise HTTPException(400, "Interval invalid.")

    leave = LeaveRequest(
        user_id=user.id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason.strip(),
        status=LeaveStatus.PENDING,
    )

    db.add(leave)
    await db.commit()
    await db.refresh(leave)

    return LeaveRequestCreateResponseSchema.model_validate(leave)


# =========================
# MY LEAVES (EMPLOYEE)
# =========================

@router.get("/me")
async def my_leaves(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_driver),
):
    result = await db.execute(
        select(LeaveRequest)
        .where(LeaveRequest.user_id == user.id)
        .order_by(desc(LeaveRequest.created_at))
    )

    return {
        "requests": [
            LeaveRequestItemSchema.model_validate(l)
            for l in result.scalars().all()
        ]
    }


# =========================
# ADMIN LIST
# =========================

@router.get("")
async def list_all_leaves(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(LeaveRequest, User.full_name)
        .join(User, User.id == LeaveRequest.user_id)
        .order_by(desc(LeaveRequest.created_at))
    )

    return {
        "requests": [
            {
                "id": l.id,
                "user_id": l.user_id,
                "user_name": name,
                "start_date": l.start_date,
                "end_date": l.end_date,
                "reason": l.reason,
                "status": l.status.value,
                "reviewed_by_admin_id": l.reviewed_by_admin_id,
                "reviewed_at": l.reviewed_at,
                "created_at": l.created_at,
            }
            for l, name in result
        ]
    }


# =========================
# ADMIN REVIEW
# =========================

@router.patch("/{leave_id}", response_model=LeaveRequestReviewResponseSchema)
async def review_leave(
    leave_id: int,
    payload: LeaveRequestReviewSchema,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    leave = await get_leave_or_404(db, leave_id)

    if leave.status != LeaveStatus.PENDING:
        raise HTTPException(400, "Leave deja procesat.")

    leave.status = parse_status(payload.status)
    leave.reviewed_by_admin_id = admin.id
    leave.reviewed_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(leave)

    return LeaveRequestReviewResponseSchema.model_validate(leave)