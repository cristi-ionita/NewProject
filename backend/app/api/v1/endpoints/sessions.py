from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_assignment
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


def is_handover_start_completed(report: VehicleHandoverReport) -> bool:
    return any(
        [
            report.mileage_start is not None,
            report.dashboard_warnings_start is not None,
            report.damage_notes_start is not None,
            report.notes_start is not None,
            report.has_documents,
            report.has_medkit,
            report.has_extinguisher,
            report.has_warning_triangle,
            report.has_spare_wheel,
        ]
    )


def is_handover_end_completed(report: VehicleHandoverReport) -> bool:
    return any(
        [
            report.mileage_end is not None,
            report.dashboard_warnings_end is not None,
            report.damage_notes_end is not None,
            report.notes_end is not None,
        ]
    )


@router.get("/{assignment_id}", response_model=VehicleSessionPageResponseSchema)
async def get_session_page(
    assignment: VehicleAssignment = Depends(get_current_assignment),
    db: AsyncSession = Depends(get_db),
) -> VehicleSessionPageResponseSchema:
    await db.refresh(assignment, ["user", "vehicle"])

    previous_assignment = (
        (
            await db.execute(
                select(VehicleAssignment)
                .where(
                    VehicleAssignment.vehicle_id == assignment.vehicle_id,
                    VehicleAssignment.started_at < assignment.started_at,
                )
                .order_by(desc(VehicleAssignment.started_at))
                .limit(1)
            )
        )
        .scalars()
        .first()
    )

    previous_report = None
    if previous_assignment:
        await db.refresh(previous_assignment, ["user"])
        previous_report = PreviousHandoverReportSchema(
            assignment_id=previous_assignment.id,
            previous_driver_name=previous_assignment.user.full_name,
            previous_session_started_at=previous_assignment.started_at,
            previous_session_ended_at=previous_assignment.ended_at,
        )

    report = await get_handover_report(db, assignment.id)

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
    payload: HandoverStartRequestSchema,
    assignment: VehicleAssignment = Depends(get_current_assignment),
    db: AsyncSession = Depends(get_db),
) -> HandoverStartResponseSchema:
    report = await get_handover_report(db, assignment.id)

    if report and is_handover_start_completed(report):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Preluare deja completată.",
        )

    await db.refresh(assignment, ["vehicle"])

    if payload.mileage_start < assignment.vehicle.current_mileage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kilometri invalizi.",
        )

    if not report:
        report = VehicleHandoverReport(assignment_id=assignment.id)
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
    payload: HandoverEndRequestSchema,
    assignment: VehicleAssignment = Depends(get_current_assignment),
    db: AsyncSession = Depends(get_db),
) -> HandoverEndResponseSchema:
    report = await get_handover_report(db, assignment.id)

    if report is None or report.mileage_start is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lipsesc datele de preluare.",
        )

    if payload.mileage_end < report.mileage_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kilometri invalizi.",
        )

    report.mileage_end = payload.mileage_end
    report.dashboard_warnings_end = payload.dashboard_warnings_end
    report.damage_notes_end = payload.damage_notes_end
    report.notes_end = payload.notes_end

    await db.commit()
    await db.refresh(report)

    return HandoverEndResponseSchema.model_validate(report)