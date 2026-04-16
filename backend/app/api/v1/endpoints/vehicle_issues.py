from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import (
    get_current_admin,
    get_current_driver,
    get_current_mechanic,
)
from app.db.models.user import User
from app.db.models.vehicle_assignment import AssignmentStatus, VehicleAssignment
from app.db.models.vehicle_issue import VehicleIssue, VehicleIssueStatus
from app.db.session import get_db
from app.schemas.vehicle_issue import (
    VehicleIssueCreateRequestSchema,
    VehicleIssueCreateResponseSchema,
    VehicleIssueUpdateRequestSchema,
)

router = APIRouter(prefix="/vehicle-issues", tags=["vehicle-issues"])


def parse_status(value: str) -> VehicleIssueStatus:
    try:
        return VehicleIssueStatus[value.strip().upper()]
    except KeyError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status invalid.",
        ) from err


async def get_issue_or_404(db: AsyncSession, issue_id: int) -> VehicleIssue:
    issue = (
        await db.execute(select(VehicleIssue).where(VehicleIssue.id == issue_id))
    ).scalar_one_or_none()

    if issue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found.",
        )

    return issue


async def get_active_assignment(
    db: AsyncSession,
    user_id: int,
) -> VehicleAssignment | None:
    return (
        await db.execute(
            select(VehicleAssignment).where(
                VehicleAssignment.user_id == user_id,
                VehicleAssignment.status == AssignmentStatus.ACTIVE,
            )
        )
    ).scalar_one_or_none()


def validate_issue_payload(payload: VehicleIssueCreateRequestSchema) -> None:
    if not any(
        [
            payload.need_service_in_km,
            payload.need_brakes,
            payload.need_tires,
            payload.need_oil,
            payload.dashboard_checks,
            payload.other_problems,
        ]
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trebuie să completezi cel puțin o problemă.",
        )


def serialize_issue(issue: VehicleIssue) -> dict:
    vehicle = getattr(issue, "vehicle", None)
    reported_by = getattr(issue, "reported_by", None)

    return {
        "id": issue.id,
        "vehicle_id": issue.vehicle_id,
        "vehicle_license_plate": vehicle.license_plate if vehicle else "",
        "vehicle_brand": vehicle.brand if vehicle else "",
        "vehicle_model": vehicle.model if vehicle else "",
        "assignment_id": issue.assignment_id,
        "reported_by_user_id": issue.reported_by_user_id,
        "reported_by_name": reported_by.full_name if reported_by else "",
        "need_service_in_km": issue.need_service_in_km,
        "need_brakes": issue.need_brakes,
        "need_tires": issue.need_tires,
        "need_oil": issue.need_oil,
        "dashboard_checks": issue.dashboard_checks,
        "other_problems": issue.other_problems,
        "status": issue.status.value,
        "assigned_mechanic_id": issue.assigned_mechanic_id,
        "scheduled_for": issue.scheduled_for,
        "scheduled_location": issue.scheduled_location,
        "created_at": issue.created_at,
        "updated_at": issue.updated_at,
    }


@router.post("", response_model=VehicleIssueCreateResponseSchema)
async def create_issue(
    payload: VehicleIssueCreateRequestSchema,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_driver),
) -> VehicleIssueCreateResponseSchema:
    assignment = await get_active_assignment(db, user.id)

    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nu ai mașină activă.",
        )

    validate_issue_payload(payload)

    issue = VehicleIssue(
        vehicle_id=assignment.vehicle_id,
        assignment_id=assignment.id,
        reported_by_user_id=user.id,
        need_service_in_km=payload.need_service_in_km,
        need_brakes=payload.need_brakes,
        need_tires=payload.need_tires,
        need_oil=payload.need_oil,
        dashboard_checks=payload.dashboard_checks,
        other_problems=payload.other_problems,
        status=VehicleIssueStatus.OPEN,
    )

    db.add(issue)
    await db.commit()
    await db.refresh(issue)

    return VehicleIssueCreateResponseSchema.model_validate(issue)


@router.get("/me")
async def my_issues(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_driver),
):
    result = await db.execute(
        select(VehicleIssue)
        .where(VehicleIssue.reported_by_user_id == user.id)
        .order_by(desc(VehicleIssue.created_at))
    )

    issues = result.scalars().all()

    for issue in issues:
        await db.refresh(issue, ["vehicle", "reported_by"])

    return {"issues": [serialize_issue(issue) for issue in issues]}


@router.get("/mechanic")
async def list_mechanic_issues(
    db: AsyncSession = Depends(get_db),
    mechanic: User = Depends(get_current_mechanic),
):
    result = await db.execute(
        select(VehicleIssue)
        .where(VehicleIssue.assigned_mechanic_id == mechanic.id)
        .order_by(desc(VehicleIssue.created_at))
    )

    issues = result.scalars().all()

    for issue in issues:
        await db.refresh(issue, ["vehicle", "reported_by"])

    return {"issues": [serialize_issue(issue) for issue in issues]}


@router.get("")
async def list_issues(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(VehicleIssue).order_by(desc(VehicleIssue.created_at))
    )

    issues = result.scalars().all()

    for issue in issues:
        await db.refresh(issue, ["vehicle", "reported_by"])

    return {"issues": [serialize_issue(issue) for issue in issues]}


@router.patch("/{issue_id}/status")
async def update_status(
    issue_id: int,
    payload: VehicleIssueUpdateRequestSchema,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    issue = await get_issue_or_404(db, issue_id)

    if payload.status is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status obligatoriu.",
        )

    issue.status = parse_status(payload.status)

    await db.commit()
    await db.refresh(issue, ["vehicle", "reported_by"])

    return serialize_issue(issue)


@router.patch("/{issue_id}/mechanic")
async def mechanic_update(
    issue_id: int,
    payload: VehicleIssueUpdateRequestSchema,
    db: AsyncSession = Depends(get_db),
    mechanic: User = Depends(get_current_mechanic),
):
    issue = await get_issue_or_404(db, issue_id)

    if payload.status is not None:
        issue.status = parse_status(payload.status)

    if payload.scheduled_for is not None:
        issue.scheduled_for = payload.scheduled_for

    if payload.scheduled_location is not None:
        issue.scheduled_location = payload.scheduled_location.strip()

    issue.assigned_mechanic_id = mechanic.id

    await db.commit()
    await db.refresh(issue, ["vehicle", "reported_by"])

    return serialize_issue(issue)