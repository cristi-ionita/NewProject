from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.db.models.vehicle_assignment import AssignmentStatus, VehicleAssignment
from app.db.models.vehicle_handover_report import VehicleHandoverReport
from app.db.models.vehicle_issue import VehicleIssue, VehicleIssueStatus
from app.db.session import get_db
from app.schemas.my_vehicle import (
    MyVehicleAssignmentSchema,
    MyVehicleHandoverEndSchema,
    MyVehicleHandoverStartSchema,
    MyVehicleIssueSchema,
    MyVehicleResponseSchema,
    MyVehicleUserSchema,
    MyVehicleVehicleSchema,
)

router = APIRouter(prefix="/my-vehicle", tags=["my-vehicle"])


# =========================
# HELPERS
# =========================


async def get_user_by_code_or_404(db: AsyncSession, code: str) -> User:
    user = (
        await db.execute(select(User).where(User.unique_code == code.strip()))
    ).scalar_one_or_none()

    if user is None:
        raise HTTPException(404, "User not found.")

    return user


def ensure_user_is_active(user: User) -> None:
    if not user.is_active:
        raise HTTPException(403, "User inactiv.")


async def get_active_assignment_for_user(
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


async def get_handover_report(
    db: AsyncSession,
    assignment_id: int,
) -> VehicleHandoverReport | None:
    return (
        await db.execute(
            select(VehicleHandoverReport).where(
                VehicleHandoverReport.assignment_id == assignment_id
            )
        )
    ).scalar_one_or_none()


# =========================
# BUILDERS
# =========================


def build_handover_start(report: VehicleHandoverReport) -> MyVehicleHandoverStartSchema:
    is_completed = (
        report.mileage_start is not None
        or report.dashboard_warnings_start is not None
        or report.damage_notes_start is not None
        or report.notes_start is not None
        or report.has_documents
        or report.has_medkit
        or report.has_extinguisher
        or report.has_warning_triangle
        or report.has_spare_wheel
    )

    return MyVehicleHandoverStartSchema(
        mileage_start=report.mileage_start,
        dashboard_warnings_start=report.dashboard_warnings_start,
        damage_notes_start=report.damage_notes_start,
        notes_start=report.notes_start,
        has_documents=report.has_documents,
        has_medkit=report.has_medkit,
        has_extinguisher=report.has_extinguisher,
        has_warning_triangle=report.has_warning_triangle,
        has_spare_wheel=report.has_spare_wheel,
        is_completed=is_completed,
    )


def build_handover_end(report: VehicleHandoverReport) -> MyVehicleHandoverEndSchema:
    is_completed = (
        report.mileage_end is not None
        or report.dashboard_warnings_end is not None
        or report.damage_notes_end is not None
        or report.notes_end is not None
    )

    return MyVehicleHandoverEndSchema(
        mileage_end=report.mileage_end,
        dashboard_warnings_end=report.dashboard_warnings_end,
        damage_notes_end=report.damage_notes_end,
        notes_end=report.notes_end,
        is_completed=is_completed,
    )


def build_issue(issue: VehicleIssue) -> MyVehicleIssueSchema:
    return MyVehicleIssueSchema(
        id=issue.id,
        status=issue.status.value,
        need_service_in_km=issue.need_service_in_km,
        need_brakes=issue.need_brakes,
        need_tires=issue.need_tires,
        need_oil=issue.need_oil,
        dashboard_checks=issue.dashboard_checks,
        other_problems=issue.other_problems,
        created_at=issue.created_at,
        updated_at=issue.updated_at,
    )


# =========================
# ENDPOINT
# =========================


@router.get("/{code}", response_model=MyVehicleResponseSchema)
async def get_my_vehicle_page(
    code: str,
    db: AsyncSession = Depends(get_db),
) -> MyVehicleResponseSchema:
    user = await get_user_by_code_or_404(db, code)
    ensure_user_is_active(user)

    assignment = await get_active_assignment_for_user(db, user.id)

    # ❗ fără mașină
    if assignment is None:
        return MyVehicleResponseSchema(
            user=MyVehicleUserSchema.model_validate(user),
            vehicle=None,
            assignment=None,
            handover_start=None,
            handover_end=None,
            open_issues=[],
        )

    await db.refresh(assignment, attribute_names=["vehicle"])

    report = await get_handover_report(db, assignment.id)

    issues = (
        (
            await db.execute(
                select(VehicleIssue)
                .where(
                    VehicleIssue.vehicle_id == assignment.vehicle_id,
                    VehicleIssue.status != VehicleIssueStatus.RESOLVED,
                )
                .order_by(VehicleIssue.created_at.desc())
            )
        )
        .scalars()
        .all()
    )

    return MyVehicleResponseSchema(
        user=MyVehicleUserSchema.model_validate(user),
        vehicle=MyVehicleVehicleSchema(
            id=assignment.vehicle.id,
            brand=assignment.vehicle.brand,
            model=assignment.vehicle.model,
            license_plate=assignment.vehicle.license_plate,
            year=assignment.vehicle.year,
            vin=assignment.vehicle.vin,
            status=assignment.vehicle.status.value,
            current_mileage=assignment.vehicle.current_mileage,
        ),
        assignment=MyVehicleAssignmentSchema(
            id=assignment.id,
            status=assignment.status.value,
            started_at=assignment.started_at,
            ended_at=assignment.ended_at,
        ),
        handover_start=build_handover_start(report) if report else None,
        handover_end=build_handover_end(report) if report else None,
        open_issues=[build_issue(issue) for issue in issues],
    )
