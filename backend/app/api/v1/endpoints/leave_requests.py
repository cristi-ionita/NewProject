from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import (
    ensure_user_is_active,
    get_current_admin,
    get_user_by_code_or_404,
)
from app.db.models.leave_request import LeaveRequest, LeaveStatus
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.leave_request import (
    LeaveRequestCreateResponseSchema,
    LeaveRequestCreateSchema,
    LeaveRequestItemSchema,
    LeaveRequestListResponseSchema,
    LeaveRequestReviewResponseSchema,
    LeaveRequestReviewSchema,
)

router = APIRouter(prefix="/leave-requests", tags=["leave-requests"])


def parse_status(value: str) -> LeaveStatus:
    try:
        return LeaveStatus(value.strip().lower())
    except ValueError as err:
        raise HTTPException(
            status_code=400,
            detail="Invalid status.",
        ) from err


async def get_leave_or_404(db: AsyncSession, leave_id: int) -> LeaveRequest:
    leave = (
        await db.execute(select(LeaveRequest).where(LeaveRequest.id == leave_id))
    ).scalar_one_or_none()

    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found.")

    return leave


@router.post(
    "",
    response_model=LeaveRequestCreateResponseSchema,
    status_code=status.HTTP_201_CREATED,
)
async def create_leave_request(
    payload: LeaveRequestCreateSchema,
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_code_or_404(payload.user_code, db)
    ensure_user_is_active(user)

    leave = LeaveRequest(
        user_id=user.id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason,
        status=LeaveStatus.PENDING,
    )

    db.add(leave)
    await db.commit()
    await db.refresh(leave)

    return LeaveRequestCreateResponseSchema(
        id=leave.id,
        user_id=leave.user_id,
        start_date=leave.start_date,
        end_date=leave.end_date,
        reason=leave.reason,
        status=leave.status.value,
        created_at=leave.created_at,
    )


@router.get("/me/{code}", response_model=LeaveRequestListResponseSchema)
async def list_my_leaves(
    code: str,
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_code_or_404(code, db)
    ensure_user_is_active(user)

    result = await db.execute(
        select(LeaveRequest, User)
        .join(User, User.id == LeaveRequest.user_id)
        .where(LeaveRequest.user_id == user.id)
        .order_by(desc(LeaveRequest.created_at))
    )

    return LeaveRequestListResponseSchema(
        requests=[
            LeaveRequestItemSchema(
                id=leave.id,
                user_id=leave.user_id,
                user_name=u.full_name,
                user_code=u.unique_code,
                start_date=leave.start_date,
                end_date=leave.end_date,
                reason=leave.reason,
                status=leave.status.value,
                reviewed_by_admin_id=leave.reviewed_by_admin_id,
                reviewed_at=leave.reviewed_at,
                created_at=leave.created_at,
            )
            for leave, u in result.all()
        ]
    )


@router.get("", response_model=LeaveRequestListResponseSchema)
async def list_all_leaves(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(LeaveRequest, User)
        .join(User, User.id == LeaveRequest.user_id)
        .order_by(desc(LeaveRequest.created_at))
    )

    return LeaveRequestListResponseSchema(
        requests=[
            LeaveRequestItemSchema(
                id=leave.id,
                user_id=leave.user_id,
                user_name=u.full_name,
                user_code=u.unique_code,
                start_date=leave.start_date,
                end_date=leave.end_date,
                reason=leave.reason,
                status=leave.status.value,
                reviewed_by_admin_id=leave.reviewed_by_admin_id,
                reviewed_at=leave.reviewed_at,
                created_at=leave.created_at,
            )
            for leave, u in result.all()
        ]
    )


@router.patch("/{leave_id}", response_model=LeaveRequestReviewResponseSchema)
async def review_leave(
    leave_id: int,
    payload: LeaveRequestReviewSchema,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    leave = await get_leave_or_404(db, leave_id)

    leave.status = parse_status(payload.status)
    leave.reviewed_by_admin_id = admin.id
    leave.reviewed_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(leave)

    return LeaveRequestReviewResponseSchema(
        id=leave.id,
        status=leave.status.value,
        reviewed_by_admin_id=leave.reviewed_by_admin_id,
        reviewed_at=leave.reviewed_at,
    )
