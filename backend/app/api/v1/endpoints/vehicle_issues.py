from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_assignment import AssignmentStatus, VehicleAssignment
from app.db.models.vehicle_issue import VehicleIssue
from app.db.session import get_db
from app.schemas.vehicle_issue import (
    VehicleIssueCreateRequest,
    VehicleIssueCreateResponse,
)

router = APIRouter(prefix="/vehicle-issues", tags=["vehicle-issues"])


class VehicleIssueListItem(BaseModel):
    id: int
    vehicle_id: int
    vehicle_license_plate: str
    vehicle_brand: str
    vehicle_model: str
    assignment_id: int | None
    reported_by_user_id: int
    reported_by_name: str
    need_service_in_km: int | None
    need_brakes: bool
    need_tires: bool
    need_oil: bool
    dashboard_checks: str | None
    other_problems: str | None
    status: str
    created_at: datetime


class VehicleIssueListResponse(BaseModel):
    issues: list[VehicleIssueListItem]


@router.post(
    "",
    response_model=VehicleIssueCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_vehicle_issue(
    payload: VehicleIssueCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> VehicleIssueCreateResponse:
    user_result = await db.execute(
        select(User).where(User.unique_code == payload.user_code.strip())
    )
    user = user_result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    assignment_result = await db.execute(
        select(VehicleAssignment).where(VehicleAssignment.id == payload.assignment_id)
    )
    assignment = assignment_result.scalar_one_or_none()

    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    if assignment.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nu ai voie să raportezi probleme pentru această sesiune.",
        )

    if assignment.status != AssignmentStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Poți raporta probleme doar pentru o sesiune activă.",
        )

    cleaned_dashboard_checks = (
        payload.dashboard_checks.strip() if payload.dashboard_checks else None
    )
    cleaned_other_problems = (
        payload.other_problems.strip() if payload.other_problems else None
    )

    has_any_issue = (
        payload.need_service_in_km is not None
        or payload.need_brakes
        or payload.need_tires
        or payload.need_oil
        or bool(cleaned_dashboard_checks)
        or bool(cleaned_other_problems)
    )

    if not has_any_issue:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completează cel puțin o problemă sau observație.",
        )

    issue = VehicleIssue(
        vehicle_id=assignment.vehicle_id,
        assignment_id=assignment.id,
        reported_by_user_id=user.id,
        need_service_in_km=payload.need_service_in_km,
        need_brakes=payload.need_brakes,
        need_tires=payload.need_tires,
        need_oil=payload.need_oil,
        dashboard_checks=cleaned_dashboard_checks,
        other_problems=cleaned_other_problems,
    )

    db.add(issue)
    await db.commit()
    await db.refresh(issue)

    return VehicleIssueCreateResponse(
        id=issue.id,
        vehicle_id=issue.vehicle_id,
        assignment_id=issue.assignment_id,
        reported_by_user_id=issue.reported_by_user_id,
        need_service_in_km=issue.need_service_in_km,
        need_brakes=issue.need_brakes,
        need_tires=issue.need_tires,
        need_oil=issue.need_oil,
        dashboard_checks=issue.dashboard_checks,
        other_problems=issue.other_problems,
        status=issue.status.value if hasattr(issue.status, "value") else str(issue.status),
        created_at=issue.created_at,
    )


@router.get("", response_model=VehicleIssueListResponse)
async def list_vehicle_issues(
    db: AsyncSession = Depends(get_db),
) -> VehicleIssueListResponse:
    result = await db.execute(
        select(VehicleIssue)
        .order_by(desc(VehicleIssue.created_at))
    )
    issues = list(result.scalars().all())

    response_items: list[VehicleIssueListItem] = []

    for issue in issues:
        vehicle_result = await db.execute(
            select(Vehicle).where(Vehicle.id == issue.vehicle_id)
        )
        vehicle = vehicle_result.scalar_one()

        user_result = await db.execute(
            select(User).where(User.id == issue.reported_by_user_id)
        )
        user = user_result.scalar_one()

        response_items.append(
            VehicleIssueListItem(
                id=issue.id,
                vehicle_id=issue.vehicle_id,
                vehicle_license_plate=vehicle.license_plate,
                vehicle_brand=vehicle.brand,
                vehicle_model=vehicle.model,
                assignment_id=issue.assignment_id,
                reported_by_user_id=issue.reported_by_user_id,
                reported_by_name=user.full_name,
                need_service_in_km=issue.need_service_in_km,
                need_brakes=issue.need_brakes,
                need_tires=issue.need_tires,
                need_oil=issue.need_oil,
                dashboard_checks=issue.dashboard_checks,
                other_problems=issue.other_problems,
                status=issue.status.value if hasattr(issue.status, "value") else str(issue.status),
                created_at=issue.created_at,
            )
        )

    return VehicleIssueListResponse(issues=response_items)