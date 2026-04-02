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
from app.schemas.admin_dashboard import (
    AdminDashboardSummaryResponse,
    DashboardActiveAssignmentSchema,
    DashboardAssignmentsSummarySchema,
    DashboardDocumentsSummarySchema,
    DashboardIssuesSummarySchema,
    DashboardRecentIssueSchema,
    DashboardUsersSummarySchema,
    DashboardVehiclesSummarySchema,
)

router = APIRouter(prefix="/admin-dashboard", tags=["admin-dashboard"])


async def count_rows(
    db: AsyncSession,
    model_field,
    *conditions,
) -> int:
    query = select(func.count(model_field))
    if conditions:
        query = query.where(*conditions)
    return int(await db.scalar(query) or 0)


@router.get("/summary", response_model=AdminDashboardSummaryResponse)
async def get_admin_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
) -> AdminDashboardSummaryResponse:
    users_total = await count_rows(db, User.id)
    users_active = await count_rows(db, User.id, User.is_active.is_(True))
    users_inactive = await count_rows(db, User.id, User.is_active.is_(False))

    vehicles_total = await count_rows(db, Vehicle.id)
    vehicles_active = await count_rows(db, Vehicle.id, Vehicle.status == VehicleStatus.ACTIVE)
    vehicles_in_service = await count_rows(
        db, Vehicle.id, Vehicle.status == VehicleStatus.IN_SERVICE
    )
    vehicles_inactive = await count_rows(db, Vehicle.id, Vehicle.status == VehicleStatus.INACTIVE)
    vehicles_sold = await count_rows(db, Vehicle.id, Vehicle.status == VehicleStatus.SOLD)

    assignments_active = await count_rows(
        db,
        VehicleAssignment.id,
        VehicleAssignment.status == AssignmentStatus.ACTIVE,
    )
    assignments_closed = await count_rows(
        db,
        VehicleAssignment.id,
        VehicleAssignment.status == AssignmentStatus.CLOSED,
    )

    issues_open = await count_rows(
        db,
        VehicleIssue.id,
        VehicleIssue.status == VehicleIssueStatus.OPEN,
    )
    issues_in_progress = await count_rows(
        db,
        VehicleIssue.id,
        VehicleIssue.status == VehicleIssueStatus.IN_PROGRESS,
    )
    issues_resolved = await count_rows(
        db,
        VehicleIssue.id,
        VehicleIssue.status == VehicleIssueStatus.RESOLVED,
    )
    issues_total = await count_rows(db, VehicleIssue.id)

    documents_total = await count_rows(db, Document.id)
    documents_personal = await count_rows(
        db,
        Document.id,
        Document.category == DocumentCategory.PERSONAL,
    )
    documents_company = await count_rows(
        db,
        Document.id,
        Document.category == DocumentCategory.COMPANY,
    )
    documents_contracts = await count_rows(
        db,
        Document.id,
        Document.type == DocumentType.CONTRACT,
    )
    documents_payslips = await count_rows(
        db,
        Document.id,
        Document.type == DocumentType.PAYSLIP,
    )
    documents_driver_licenses = await count_rows(
        db,
        Document.id,
        Document.type == DocumentType.DRIVER_LICENSE,
    )

    recent_issues_result = await db.execute(
        select(VehicleIssue, Vehicle, User)
        .join(Vehicle, Vehicle.id == VehicleIssue.vehicle_id)
        .join(User, User.id == VehicleIssue.reported_by_user_id)
        .order_by(VehicleIssue.created_at.desc())
        .limit(5)
    )
    recent_issue_rows = recent_issues_result.all()

    active_assignments_result = await db.execute(
        select(VehicleAssignment, User, Vehicle)
        .join(User, User.id == VehicleAssignment.user_id)
        .join(Vehicle, Vehicle.id == VehicleAssignment.vehicle_id)
        .where(VehicleAssignment.status == AssignmentStatus.ACTIVE)
        .order_by(VehicleAssignment.started_at.desc())
        .limit(10)
    )
    active_assignment_rows = active_assignments_result.all()

    return AdminDashboardSummaryResponse(
        users=DashboardUsersSummarySchema(
            total=users_total,
            active=users_active,
            inactive=users_inactive,
        ),
        vehicles=DashboardVehiclesSummarySchema(
            total=vehicles_total,
            active=vehicles_active,
            in_service=vehicles_in_service,
            inactive=vehicles_inactive,
            sold=vehicles_sold,
        ),
        assignments=DashboardAssignmentsSummarySchema(
            active=assignments_active,
            closed=assignments_closed,
        ),
        issues=DashboardIssuesSummarySchema(
            open=issues_open,
            in_progress=issues_in_progress,
            resolved=issues_resolved,
            total=issues_total,
        ),
        documents=DashboardDocumentsSummarySchema(
            total=documents_total,
            personal=documents_personal,
            company=documents_company,
            contracts=documents_contracts,
            payslips=documents_payslips,
            driver_licenses=documents_driver_licenses,
        ),
        recent_issues=[
            DashboardRecentIssueSchema(
                id=issue.id,
                vehicle_id=issue.vehicle_id,
                vehicle_license_plate=vehicle.license_plate,
                reported_by_user_id=user.id,
                reported_by_name=user.full_name,
                status=issue.status.value if hasattr(issue.status, "value") else str(issue.status),
                created_at=issue.created_at,
                other_problems=issue.other_problems,
            )
            for issue, vehicle, user in recent_issue_rows
        ],
        active_assignments=[
            DashboardActiveAssignmentSchema(
                assignment_id=assignment.id,
                user_id=user.id,
                user_name=user.full_name,
                vehicle_id=vehicle.id,
                vehicle_license_plate=vehicle.license_plate,
                vehicle_brand=vehicle.brand,
                vehicle_model=vehicle.model,
                started_at=assignment.started_at,
            )
            for assignment, user, vehicle in active_assignment_rows
        ],
    )
