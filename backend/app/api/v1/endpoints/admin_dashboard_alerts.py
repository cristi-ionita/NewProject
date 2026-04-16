from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_admin
from app.db.models.document import Document, DocumentType
from app.db.models.employee_profile import EmployeeProfile
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_assignment import AssignmentStatus, VehicleAssignment
from app.db.models.vehicle_issue import VehicleIssue, VehicleIssueStatus
from app.db.session import get_db

router = APIRouter(prefix="/admin-dashboard-alerts", tags=["admin-dashboard-alerts"])


# =========================
# USERS WITHOUT PROFILE
# =========================

@router.get("/users-without-profile")
async def users_without_profile(
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_admin),
):
    result = await db.execute(
        select(User.id, User.full_name, User.unique_code)
        .outerjoin(EmployeeProfile, EmployeeProfile.user_id == User.id)
        .where(EmployeeProfile.id.is_(None))
        .order_by(User.full_name)
    )

    return {"users": [dict(row._mapping) for row in result]}


# =========================
# USERS WITHOUT CONTRACT
# =========================

@router.get("/users-without-contract")
async def users_without_contract(
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_admin),
):
    sub = (
        select(Document.user_id)
        .where(Document.type == DocumentType.CONTRACT)
        .distinct()
        .subquery()
    )

    result = await db.execute(
        select(User.id, User.full_name)
        .outerjoin(sub, sub.c.user_id == User.id)
        .where(sub.c.user_id.is_(None))
        .order_by(User.full_name)
    )

    return {"users": [dict(row._mapping) for row in result]}


# =========================
# USERS WITHOUT LICENSE
# =========================

@router.get("/users-without-driver-license")
async def users_without_license(
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_admin),
):
    sub = (
        select(Document.user_id)
        .where(Document.type == DocumentType.DRIVER_LICENSE)
        .distinct()
        .subquery()
    )

    result = await db.execute(
        select(User.id, User.full_name)
        .outerjoin(sub, sub.c.user_id == User.id)
        .where(sub.c.user_id.is_(None))
        .order_by(User.full_name)
    )

    return {"users": [dict(row._mapping) for row in result]}


# =========================
# VEHICLES WITH ISSUES (OPTIMIZED)
# =========================

@router.get("/vehicles-with-issues")
async def vehicles_with_issues(
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_admin),
):
    result = await db.execute(
        select(
            Vehicle.id,
            Vehicle.license_plate,
            Vehicle.brand,
            Vehicle.model,
            func.count(VehicleIssue.id).label("issues_count"),
        )
        .join(VehicleIssue, VehicleIssue.vehicle_id == Vehicle.id)
        .where(
            VehicleIssue.status.in_(
                [VehicleIssueStatus.OPEN, VehicleIssueStatus.IN_PROGRESS]
            )
        )
        .group_by(Vehicle.id)
        .order_by(func.count(VehicleIssue.id).desc())
    )

    return {"vehicles": [dict(row._mapping) for row in result]}


# =========================
# OCCUPIED VEHICLES
# =========================

@router.get("/occupied-vehicles")
async def occupied_vehicles(
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_admin),
):
    result = await db.execute(
        select(
            VehicleAssignment.id,
            Vehicle.license_plate,
            Vehicle.brand,
            Vehicle.model,
            User.full_name,
            VehicleAssignment.started_at,
        )
        .join(Vehicle, Vehicle.id == VehicleAssignment.vehicle_id)
        .join(User, User.id == VehicleAssignment.user_id)
        .where(VehicleAssignment.status == AssignmentStatus.ACTIVE)
        .order_by(VehicleAssignment.started_at.desc())
    )

    return {
        "vehicles": [
            {
                "assignment_id": r.id,
                "vehicle": f"{r.brand} {r.model} ({r.license_plate})",
                "user": r.full_name,
                "started_at": r.started_at,
            }
            for r in result
        ]
    }