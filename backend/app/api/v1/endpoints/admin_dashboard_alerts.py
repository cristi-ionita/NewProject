from fastapi import APIRouter, Depends
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import get_current_admin
from app.db.models.document import Document, DocumentType
from app.db.models.employee_profile import EmployeeProfile
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_assignment import AssignmentStatus, VehicleAssignment
from app.db.models.vehicle_issue import VehicleIssue, VehicleIssueStatus
from app.db.session import get_db
from app.schemas.admin_dashboard_alerts import (
    DashboardOccupiedVehicleSchema,
    DashboardUserAlertSchema,
    DashboardVehicleIssueAlertSchema,
    OccupiedVehiclesResponse,
    UsersWithoutContractResponse,
    UsersWithoutDriverLicenseResponse,
    UsersWithoutProfileResponse,
    VehiclesWithOpenIssuesResponse,
)

router = APIRouter(prefix="/admin-dashboard-alerts", tags=["admin-dashboard-alerts"])


def build_user_alert(user: User) -> DashboardUserAlertSchema:
    return DashboardUserAlertSchema(
        user_id=user.id,
        full_name=user.full_name,
        unique_code=user.unique_code,
        shift_number=user.shift_number,
        is_active=user.is_active,
    )


@router.get("/users-without-profile", response_model=UsersWithoutProfileResponse)
async def get_users_without_profile(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
) -> UsersWithoutProfileResponse:
    result = await db.execute(
        select(User)
        .outerjoin(EmployeeProfile, EmployeeProfile.user_id == User.id)
        .where(EmployeeProfile.id.is_(None))
        .order_by(User.full_name.asc())
    )
    users = result.scalars().all()

    return UsersWithoutProfileResponse(
        users=[build_user_alert(user) for user in users]
    )


@router.get("/users-without-contract", response_model=UsersWithoutContractResponse)
async def get_users_without_contract(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
) -> UsersWithoutContractResponse:
    contract_subquery = (
        select(Document.user_id)
        .where(Document.type == DocumentType.CONTRACT)
        .distinct()
        .subquery()
    )

    result = await db.execute(
        select(User)
        .outerjoin(contract_subquery, contract_subquery.c.user_id == User.id)
        .where(contract_subquery.c.user_id.is_(None))
        .order_by(User.full_name.asc())
    )
    users = result.scalars().all()

    return UsersWithoutContractResponse(
        users=[build_user_alert(user) for user in users]
    )


@router.get(
    "/users-without-driver-license",
    response_model=UsersWithoutDriverLicenseResponse,
)
async def get_users_without_driver_license(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
) -> UsersWithoutDriverLicenseResponse:
    driver_license_subquery = (
        select(Document.user_id)
        .where(Document.type == DocumentType.DRIVER_LICENSE)
        .distinct()
        .subquery()
    )

    result = await db.execute(
        select(User)
        .outerjoin(driver_license_subquery, driver_license_subquery.c.user_id == User.id)
        .where(driver_license_subquery.c.user_id.is_(None))
        .order_by(User.full_name.asc())
    )
    users = result.scalars().all()

    return UsersWithoutDriverLicenseResponse(
        users=[build_user_alert(user) for user in users]
    )


@router.get("/vehicles-with-open-issues", response_model=VehiclesWithOpenIssuesResponse)
async def get_vehicles_with_open_issues(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
) -> VehiclesWithOpenIssuesResponse:
    vehicles_result = await db.execute(
        select(Vehicle).order_by(Vehicle.license_plate.asc())
    )
    vehicles = vehicles_result.scalars().all()

    response_items: list[DashboardVehicleIssueAlertSchema] = []

    for vehicle in vehicles:
        open_count = await db.scalar(
            select(func.count(VehicleIssue.id)).where(
                and_(
                    VehicleIssue.vehicle_id == vehicle.id,
                    VehicleIssue.status == VehicleIssueStatus.OPEN,
                )
            )
        ) or 0

        in_progress_count = await db.scalar(
            select(func.count(VehicleIssue.id)).where(
                and_(
                    VehicleIssue.vehicle_id == vehicle.id,
                    VehicleIssue.status == VehicleIssueStatus.IN_PROGRESS,
                )
            )
        ) or 0

        latest_issue_created_at = await db.scalar(
            select(func.max(VehicleIssue.created_at)).where(
                and_(
                    VehicleIssue.vehicle_id == vehicle.id,
                    VehicleIssue.status.in_(
                        [VehicleIssueStatus.OPEN, VehicleIssueStatus.IN_PROGRESS]
                    ),
                )
            )
        )

        if open_count > 0 or in_progress_count > 0:
            response_items.append(
                DashboardVehicleIssueAlertSchema(
                    vehicle_id=vehicle.id,
                    license_plate=vehicle.license_plate,
                    brand=vehicle.brand,
                    model=vehicle.model,
                    open_issues_count=int(open_count),
                    in_progress_issues_count=int(in_progress_count),
                    latest_issue_created_at=latest_issue_created_at,
                )
            )

    return VehiclesWithOpenIssuesResponse(vehicles=response_items)


@router.get("/occupied-vehicles", response_model=OccupiedVehiclesResponse)
async def get_occupied_vehicles(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
) -> OccupiedVehiclesResponse:
    result = await db.execute(
        select(VehicleAssignment, Vehicle, User)
        .join(Vehicle, Vehicle.id == VehicleAssignment.vehicle_id)
        .join(User, User.id == VehicleAssignment.user_id)
        .where(VehicleAssignment.status == AssignmentStatus.ACTIVE)
        .order_by(VehicleAssignment.started_at.desc())
    )
    rows = result.all()

    return OccupiedVehiclesResponse(
        vehicles=[
            DashboardOccupiedVehicleSchema(
                assignment_id=assignment.id,
                vehicle_id=vehicle.id,
                license_plate=vehicle.license_plate,
                brand=vehicle.brand,
                model=vehicle.model,
                user_id=user.id,
                user_name=user.full_name,
                started_at=assignment.started_at,
            )
            for assignment, vehicle, user in rows
        ]
    )