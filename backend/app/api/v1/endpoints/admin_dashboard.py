from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_admin
from app.db.models.document import Document, DocumentCategory, DocumentType
from app.db.models.user import User
from app.db.models.vehicle import Vehicle, VehicleStatus
from app.db.models.vehicle_assignment import AssignmentStatus, VehicleAssignment
from app.db.models.vehicle_issue import VehicleIssue, VehicleIssueStatus
from app.db.session import get_db

router = APIRouter(prefix="/admin-dashboard", tags=["admin-dashboard"])


# =========================
# HELPERS
# =========================

async def count(db: AsyncSession, model, *conditions) -> int:
    query = select(func.count(model))

    if conditions:
        query = query.where(*conditions)

    return int(await db.scalar(query) or 0)


# =========================
# SUMMARY
# =========================

@router.get("/summary")
async def dashboard_summary(
    db: AsyncSession = Depends(get_db),
    _: object = Depends(get_current_admin),
):
    # 🔹 USERS
    users_total = await count(db, User.id)
    users_active = await count(db, User.id, User.is_active.is_(True))
    users_inactive = await count(db, User.id, User.is_active.is_(False))

    # 🔹 VEHICLES
    vehicles_total = await count(db, Vehicle.id)
    vehicles_active = await count(db, Vehicle.id, Vehicle.status == VehicleStatus.ACTIVE)
    vehicles_in_service = await count(db, Vehicle.id, Vehicle.status == VehicleStatus.IN_SERVICE)
    vehicles_inactive = await count(db, Vehicle.id, Vehicle.status == VehicleStatus.INACTIVE)
    vehicles_sold = await count(db, Vehicle.id, Vehicle.status == VehicleStatus.SOLD)

    # 🔹 ASSIGNMENTS
    assignments_active = await count(
        db,
        VehicleAssignment.id,
        VehicleAssignment.status == AssignmentStatus.ACTIVE,
    )

    assignments_closed = await count(
        db,
        VehicleAssignment.id,
        VehicleAssignment.status == AssignmentStatus.CLOSED,
    )

    # 🔹 ISSUES
    issues_total = await count(db, VehicleIssue.id)
    issues_open = await count(db, VehicleIssue.id, VehicleIssue.status == VehicleIssueStatus.OPEN)
    issues_in_progress = await count(
        db,
        VehicleIssue.id,
        VehicleIssue.status == VehicleIssueStatus.IN_PROGRESS,
    )
    issues_resolved = await count(
        db,
        VehicleIssue.id,
        VehicleIssue.status == VehicleIssueStatus.RESOLVED,
    )

    # 🔹 DOCUMENTS
    documents_total = await count(db, Document.id)
    documents_personal = await count(
        db,
        Document.id,
        Document.category == DocumentCategory.PERSONAL,
    )
    documents_company = await count(
        db,
        Document.id,
        Document.category == DocumentCategory.COMPANY,
    )
    documents_contracts = await count(
        db,
        Document.id,
        Document.type == DocumentType.CONTRACT,
    )
    documents_payslips = await count(
        db,
        Document.id,
        Document.type == DocumentType.PAYSLIP,
    )
    documents_driver = await count(
        db,
        Document.id,
        Document.type == DocumentType.DRIVER_LICENSE,
    )

    # =========================
    # RECENT ISSUES (NO N+1)
    # =========================

    recent_issues = (
        await db.execute(
            select(
                VehicleIssue.id,
                VehicleIssue.status,
                VehicleIssue.created_at,
                VehicleIssue.other_problems,
                Vehicle.license_plate,
                User.full_name,
            )
            .join(Vehicle, Vehicle.id == VehicleIssue.vehicle_id)
            .join(User, User.id == VehicleIssue.reported_by_user_id)
            .order_by(VehicleIssue.created_at.desc())
            .limit(5)
        )
    ).all()

    # =========================
    # ACTIVE ASSIGNMENTS
    # =========================

    active_assignments = (
        await db.execute(
            select(
                VehicleAssignment.id,
                VehicleAssignment.started_at,
                Vehicle.license_plate,
                Vehicle.brand,
                Vehicle.model,
                User.full_name,
            )
            .join(User, User.id == VehicleAssignment.user_id)
            .join(Vehicle, Vehicle.id == VehicleAssignment.vehicle_id)
            .where(VehicleAssignment.status == AssignmentStatus.ACTIVE)
            .order_by(VehicleAssignment.started_at.desc())
            .limit(10)
        )
    ).all()

    return {
        "users": {
            "total": users_total,
            "active": users_active,
            "inactive": users_inactive,
        },
        "vehicles": {
            "total": vehicles_total,
            "active": vehicles_active,
            "in_service": vehicles_in_service,
            "inactive": vehicles_inactive,
            "sold": vehicles_sold,
        },
        "assignments": {
            "active": assignments_active,
            "closed": assignments_closed,
        },
        "issues": {
            "total": issues_total,
            "open": issues_open,
            "in_progress": issues_in_progress,
            "resolved": issues_resolved,
        },
        "documents": {
            "total": documents_total,
            "personal": documents_personal,
            "company": documents_company,
            "contracts": documents_contracts,
            "payslips": documents_payslips,
            "driver_licenses": documents_driver,
        },
        "recent_issues": [
            {
                "id": i.id,
                "status": i.status.value,
                "created_at": i.created_at,
                "vehicle": i.license_plate,
                "reported_by": i.full_name,
                "problem": i.other_problems,
            }
            for i in recent_issues
        ],
        "active_assignments": [
            {
                "id": a.id,
                "started_at": a.started_at,
                "vehicle": f"{a.brand} {a.model} ({a.license_plate})",
                "user": a.full_name,
            }
            for a in active_assignments
        ],
    }