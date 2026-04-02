from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import (
    get_user_by_code_or_404,
)
from app.db.models.vehicle_assignment import VehicleAssignment
from app.db.models.vehicle_handover_report import VehicleHandoverReport
from app.db.session import get_db
from app.schemas.handover import (
    HandoverEndRequestSchema,
    HandoverEndResponseSchema,
    HandoverStartRequestSchema,
    HandoverStartResponseSchema,
)
from app.schemas.vehicle_session import (
    CurrentHandoverEndSchema,
    CurrentHandoverStartSchema,
    CurrentSessionSchema,
    CurrentSessionUserSchema,
    CurrentSessionVehicleSchema,
    PreviousHandoverReportSchema,
    VehicleSessionPageResponseSchema,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


# =========================
# HELPERS
# =========================


async def get_assignment_or_404(
    db: AsyncSession,
    assignment_id: int,
) -> VehicleAssignment:
    result = await db.execute(
        select(VehicleAssignment).where(VehicleAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(status_code=404, detail="Session not found.")

    return assignment


async def get_handover_report(
    db: AsyncSession,
    assignment_id: int,
) -> VehicleHandoverReport | None:
    result = await db.execute(
        select(VehicleHandoverReport).where(VehicleHandoverReport.assignment_id == assignment_id)
    )
    return result.scalar_one_or_none()


def ensure_session_belongs_to_user(assignment, user):
    if assignment.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="Nu ai voie să accesezi această sesiune.",
        )


def is_handover_start_completed(report):
    return any(
        [
            report.mileage_start,
            report.dashboard_warnings_start,
            report.damage_notes_start,
            report.notes_start,
            report.has_documents,
            report.has_medkit,
            report.has_extinguisher,
            report.has_warning_triangle,
            report.has_spare_wheel,
        ]
    )


def is_handover_end_completed(report):
    return any(
        [
            report.mileage_end,
            report.dashboard_warnings_end,
            report.damage_notes_end,
            report.notes_end,
        ]
    )


# =========================
# ENDPOINTS
# =========================


@router.get("/{assignment_id}", response_model=VehicleSessionPageResponseSchema)
async def get_session_page(
    assignment_id: int,
    user_code: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_code_or_404(user_code, db)
    assignment = await get_assignment_or_404(db, assignment_id)

    ensure_session_belongs_to_user(assignment, user)

    await db.refresh(assignment, attribute_names=["user", "vehicle"])

    # previous assignment
    previous_assignment_result = await db.execute(
        select(VehicleAssignment)
        .where(
            VehicleAssignment.vehicle_id == assignment.vehicle_id,
            VehicleAssignment.started_at < assignment.started_at,
        )
        .order_by(desc(VehicleAssignment.started_at))
        .limit(1)
    )
    previous_assignment = previous_assignment_result.scalar_one_or_none()

    previous_report = None
    if previous_assignment:
        await db.refresh(previous_assignment, attribute_names=["user"])
        previous_report = PreviousHandoverReportSchema(
            assignment_id=previous_assignment.id,
            previous_driver_name=previous_assignment.user.full_name,
            previous_session_started_at=previous_assignment.started_at,
            previous_session_ended_at=previous_assignment.ended_at,
        )

    report = await get_handover_report(db, assignment_id)

    return VehicleSessionPageResponseSchema(
        session=CurrentSessionSchema(
            assignment_id=assignment.id,
            status=assignment.status.value,
            started_at=assignment.started_at,
        ),
        user=CurrentSessionUserSchema(
            id=assignment.user.id,
            full_name=assignment.user.full_name,
            unique_code=assignment.user.unique_code,
        ),
        vehicle=CurrentSessionVehicleSchema(
            id=assignment.vehicle.id,
            brand=assignment.vehicle.brand,
            model=assignment.vehicle.model,
            license_plate=assignment.vehicle.license_plate,
            year=assignment.vehicle.year,
            status=assignment.vehicle.status.value,
            current_mileage=assignment.vehicle.current_mileage,
        ),
        previous_handover_report=previous_report,
        handover_start=(
            CurrentHandoverStartSchema(
                mileage_start=report.mileage_start,
                dashboard_warnings_start=report.dashboard_warnings_start,
                damage_notes_start=report.damage_notes_start,
                notes_start=report.notes_start,
                has_documents=report.has_documents,
                has_medkit=report.has_medkit,
                has_extinguisher=report.has_extinguisher,
                has_warning_triangle=report.has_warning_triangle,
                has_spare_wheel=report.has_spare_wheel,
                is_completed=is_handover_start_completed(report),
            )
            if report
            else None
        ),
        handover_end=(
            CurrentHandoverEndSchema(
                mileage_end=report.mileage_end,
                dashboard_warnings_end=report.dashboard_warnings_end,
                damage_notes_end=report.damage_notes_end,
                notes_end=report.notes_end,
                is_completed=is_handover_end_completed(report),
            )
            if report
            else None
        ),
    )


@router.post("/{assignment_id}/handover-start", response_model=HandoverStartResponseSchema)
async def save_handover_start(
    assignment_id: int,
    payload: HandoverStartRequestSchema,
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_code_or_404(payload.user_code, db)
    assignment = await get_assignment_or_404(db, assignment_id)

    ensure_session_belongs_to_user(assignment, user)

    report = await get_handover_report(db, assignment_id)

    if report and is_handover_start_completed(report):
        raise HTTPException(400, "Datele de preluare au fost deja salvate.")

    await db.refresh(assignment, attribute_names=["vehicle"])

    if payload.mileage_start < assignment.vehicle.current_mileage:
        raise HTTPException(400, "Kilometri invalizi.")

    if not report:
        report = VehicleHandoverReport(assignment_id=assignment_id)
        db.add(report)

    report.mileage_start = payload.mileage_start
    report.dashboard_warnings_start = payload.dashboard_warnings_start
    report.damage_notes_start = payload.damage_notes_start
    report.notes_start = payload.notes_start
    report.has_documents = payload.has_documents
    report.has_medkit = payload.has_medkit
    report.has_extinguisher = payload.has_extinguisher
    report.has_warning_triangle = payload.has_warning_triangle
    report.has_spare_wheel = payload.has_spare_wheel

    await db.commit()
    await db.refresh(report)

    return HandoverStartResponseSchema.model_validate(report)


@router.post("/{assignment_id}/handover-end", response_model=HandoverEndResponseSchema)
async def save_handover_end(
    assignment_id: int,
    payload: HandoverEndRequestSchema,
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_code_or_404(payload.user_code, db)
    assignment = await get_assignment_or_404(db, assignment_id)

    ensure_session_belongs_to_user(assignment, user)

    report = await get_handover_report(db, assignment_id)

    if not report or report.mileage_start is None:
        raise HTTPException(400, "Lipsesc datele de preluare.")

    if payload.mileage_end < report.mileage_start:
        raise HTTPException(400, "Kilometri invalizi.")

    report.mileage_end = payload.mileage_end
    report.dashboard_warnings_end = payload.dashboard_warnings_end
    report.damage_notes_end = payload.damage_notes_end
    report.notes_end = payload.notes_end

    await db.commit()
    await db.refresh(report)

    return HandoverEndResponseSchema.model_validate(report)
