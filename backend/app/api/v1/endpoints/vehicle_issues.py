from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_admin, get_current_mechanic
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_assignment import AssignmentStatus, VehicleAssignment
from app.db.models.vehicle_issue import VehicleIssue, VehicleIssueStatus
from app.db.session import get_db
from app.schemas.vehicle_issue import (
    VehicleIssueCreateRequestSchema,
    VehicleIssueCreateResponseSchema,
    VehicleIssueUpdateRequestSchema,
)

router = APIRouter(prefix="/vehicle-issues", tags=["vehicle-issues"])


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class VehicleIssueListItemSchema(BaseSchema):
    id: int
    vehicle_id: int
    vehicle_license_plate: str
    vehicle_brand: str
    vehicle_model: str
    assignment_id: int | None = None
    reported_by_user_id: int
    reported_by_name: str
    need_service_in_km: int | None = None
    need_brakes: bool
    need_tires: bool
    need_oil: bool
    dashboard_checks: str | None = None
    other_problems: str | None = None
    status: str
    assigned_mechanic_id: int | None = None
    scheduled_for: datetime | None = None
    scheduled_location: str | None = None
    created_at: datetime
    updated_at: datetime


class VehicleIssueListResponseSchema(BaseSchema):
    issues: list[VehicleIssueListItemSchema]


class VehicleIssueStatusUpdateRequestSchema(BaseSchema):
    status: str = Field(..., min_length=1)


class VehicleIssueStatusUpdateResponseSchema(BaseSchema):
    id: int
    status: str
    updated_at: datetime


class VehicleIssueMechanicUpdateResponseSchema(BaseSchema):
    id: int
    status: str
    assigned_mechanic_id: int | None = None
    scheduled_for: datetime | None = None
    scheduled_location: str | None = None
    updated_at: datetime


def parse_issue_status(value: str) -> VehicleIssueStatus:
    try:
        return VehicleIssueStatus[value.strip().upper()]
    except KeyError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status invalid.",
        ) from err


async def get_user_by_code_or_404(db: AsyncSession, code: str) -> User:
    user = (
        await db.execute(select(User).where(User.unique_code == code.strip()))
    ).scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    return user


async def get_assignment_or_404(
    db: AsyncSession,
    assignment_id: int,
) -> VehicleAssignment:
    assignment = (
        await db.execute(select(VehicleAssignment).where(VehicleAssignment.id == assignment_id))
    ).scalar_one_or_none()

    if assignment is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    return assignment


async def get_issue_or_404(
    db: AsyncSession,
    issue_id: int,
) -> VehicleIssue:
    issue = (
        await db.execute(select(VehicleIssue).where(VehicleIssue.id == issue_id))
    ).scalar_one_or_none()

    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found.")

    return issue


def ensure_user_is_active(user: User) -> None:
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="User inactiv.",
        )


def ensure_assignment_belongs_to_user(
    assignment: VehicleAssignment,
    user: User,
) -> None:
    if assignment.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="Nu ai voie să raportezi probleme pentru această sesiune.",
        )


def ensure_assignment_is_active(
    assignment: VehicleAssignment,
) -> None:
    if assignment.status != AssignmentStatus.ACTIVE:
        raise HTTPException(
            status_code=400,
            detail="Poți raporta probleme doar pentru o sesiune activă.",
        )


def clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def ensure_issue_payload_has_content(
    payload: VehicleIssueCreateRequestSchema,
    dashboard_checks: str | None,
    other_problems: str | None,
) -> None:
    has_any_issue = (
        payload.need_service_in_km is not None
        or payload.need_brakes
        or payload.need_tires
        or payload.need_oil
        or bool(dashboard_checks)
        or bool(other_problems)
    )

    if not has_any_issue:
        raise HTTPException(
            status_code=400,
            detail="Completează cel puțin o problemă sau observație.",
        )


def build_issue_list_item(
    issue: VehicleIssue,
    vehicle: Vehicle,
    user: User,
) -> VehicleIssueListItemSchema:
    return VehicleIssueListItemSchema(
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
        status=issue.status.value,
        assigned_mechanic_id=issue.assigned_mechanic_id,
        scheduled_for=issue.scheduled_for,
        scheduled_location=issue.scheduled_location,
        created_at=issue.created_at,
        updated_at=issue.updated_at,
    )


@router.post(
    "",
    response_model=VehicleIssueCreateResponseSchema,
    status_code=status.HTTP_201_CREATED,
)
async def create_vehicle_issue(
    payload: VehicleIssueCreateRequestSchema,
    db: AsyncSession = Depends(get_db),
) -> VehicleIssueCreateResponseSchema:
    user = await get_user_by_code_or_404(db, payload.user_code)
    ensure_user_is_active(user)

    assignment = await get_assignment_or_404(db, payload.assignment_id)
    ensure_assignment_belongs_to_user(assignment, user)
    ensure_assignment_is_active(assignment)

    dashboard_checks = clean_text(payload.dashboard_checks)
    other_problems = clean_text(payload.other_problems)

    ensure_issue_payload_has_content(payload, dashboard_checks, other_problems)

    issue = VehicleIssue(
        vehicle_id=assignment.vehicle_id,
        assignment_id=assignment.id,
        reported_by_user_id=user.id,
        need_service_in_km=payload.need_service_in_km,
        need_brakes=payload.need_brakes,
        need_tires=payload.need_tires,
        need_oil=payload.need_oil,
        dashboard_checks=dashboard_checks,
        other_problems=other_problems,
        status=VehicleIssueStatus.OPEN,
    )

    db.add(issue)
    await db.commit()
    await db.refresh(issue)

    return VehicleIssueCreateResponseSchema(
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
        status=issue.status.value,
        assigned_mechanic_id=issue.assigned_mechanic_id,
        scheduled_for=issue.scheduled_for,
        scheduled_location=issue.scheduled_location,
        created_at=issue.created_at,
    )


@router.get("/me/{code}", response_model=VehicleIssueListResponseSchema)
async def list_my_vehicle_issues(
    code: str,
    status_filter: str | None = Query(default=None, alias="status"),
    db: AsyncSession = Depends(get_db),
) -> VehicleIssueListResponseSchema:
    user = await get_user_by_code_or_404(db, code)
    ensure_user_is_active(user)

    query = (
        select(VehicleIssue, Vehicle, User)
        .join(Vehicle, Vehicle.id == VehicleIssue.vehicle_id)
        .join(User, User.id == VehicleIssue.reported_by_user_id)
        .where(VehicleIssue.reported_by_user_id == user.id)
    )

    if status_filter:
        query = query.where(VehicleIssue.status == parse_issue_status(status_filter))

    result = await db.execute(query.order_by(desc(VehicleIssue.created_at)))

    return VehicleIssueListResponseSchema(
        issues=[
            build_issue_list_item(issue, vehicle, reported_user)
            for issue, vehicle, reported_user in result.all()
        ]
    )


@router.get("", response_model=VehicleIssueListResponseSchema)
async def list_vehicle_issues(
    status_filter: str | None = Query(default=None, alias="status"),
    vehicle_id: int | None = Query(default=None),
    reported_by_user_id: int | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
) -> VehicleIssueListResponseSchema:
    query = (
        select(VehicleIssue, Vehicle, User)
        .join(Vehicle, Vehicle.id == VehicleIssue.vehicle_id)
        .join(User, User.id == VehicleIssue.reported_by_user_id)
    )

    if status_filter:
        query = query.where(VehicleIssue.status == parse_issue_status(status_filter))

    if vehicle_id is not None:
        query = query.where(VehicleIssue.vehicle_id == vehicle_id)

    if reported_by_user_id is not None:
        query = query.where(VehicleIssue.reported_by_user_id == reported_by_user_id)

    result = await db.execute(query.order_by(desc(VehicleIssue.created_at)))

    return VehicleIssueListResponseSchema(
        issues=[
            build_issue_list_item(issue, vehicle, user) for issue, vehicle, user in result.all()
        ]
    )


@router.get("/mechanic", response_model=VehicleIssueListResponseSchema)
async def list_vehicle_issues_for_mechanic(
    status_filter: str | None = Query(default=None, alias="status"),
    db: AsyncSession = Depends(get_db),
    mechanic: User = Depends(get_current_mechanic),
) -> VehicleIssueListResponseSchema:
    query = (
        select(VehicleIssue, Vehicle, User)
        .join(Vehicle, Vehicle.id == VehicleIssue.vehicle_id)
        .join(User, User.id == VehicleIssue.reported_by_user_id)
    )

    if status_filter:
        query = query.where(VehicleIssue.status == parse_issue_status(status_filter))

    result = await db.execute(query.order_by(desc(VehicleIssue.created_at)))

    return VehicleIssueListResponseSchema(
        issues=[
            build_issue_list_item(issue, vehicle, user) for issue, vehicle, user in result.all()
        ]
    )


@router.patch(
    "/{issue_id}/status",
    response_model=VehicleIssueStatusUpdateResponseSchema,
)
async def update_vehicle_issue_status(
    issue_id: int,
    payload: VehicleIssueStatusUpdateRequestSchema,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
) -> VehicleIssueStatusUpdateResponseSchema:
    issue = await get_issue_or_404(db, issue_id)

    new_status = parse_issue_status(payload.status)

    if issue.status == new_status:
        return VehicleIssueStatusUpdateResponseSchema(
            id=issue.id,
            status=issue.status.value,
            updated_at=issue.updated_at,
        )

    issue.status = new_status

    await db.commit()
    await db.refresh(issue)

    return VehicleIssueStatusUpdateResponseSchema(
        id=issue.id,
        status=issue.status.value,
        updated_at=issue.updated_at,
    )


@router.patch(
    "/{issue_id}/mechanic",
    response_model=VehicleIssueMechanicUpdateResponseSchema,
)
async def update_vehicle_issue_by_mechanic(
    issue_id: int,
    payload: VehicleIssueUpdateRequestSchema,
    db: AsyncSession = Depends(get_db),
    mechanic: User = Depends(get_current_mechanic),
) -> VehicleIssueMechanicUpdateResponseSchema:
    issue = await get_issue_or_404(db, issue_id)

    if payload.status is not None:
        issue.status = parse_issue_status(payload.status)

    if payload.scheduled_for is not None:
        issue.scheduled_for = payload.scheduled_for

    if payload.scheduled_location is not None:
        issue.scheduled_location = clean_text(payload.scheduled_location)

    issue.assigned_mechanic_id = mechanic.id

    await db.commit()
    await db.refresh(issue)

    return VehicleIssueMechanicUpdateResponseSchema(
        id=issue.id,
        status=issue.status.value,
        assigned_mechanic_id=issue.assigned_mechanic_id,
        scheduled_for=issue.scheduled_for,
        scheduled_location=issue.scheduled_location,
        updated_at=issue.updated_at,
    )
