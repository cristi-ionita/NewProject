from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.db.models.vehicle_assignment import VehicleAssignment
from app.db.models.vehicle_handover_report import VehicleHandoverReport
from app.db.session import get_db
from app.schemas.handover import (
    HandoverEndRequest,
    HandoverEndResponse,
    HandoverStartRequest,
    HandoverStartResponse,
)
from app.schemas.vehicle_session import (
    CurrentSessionSchema,
    CurrentSessionUserSchema,
    CurrentSessionVehicleSchema,
    PreviousHandoverReportSchema,
    VehicleSessionPageResponse,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("/{assignment_id}", response_model=VehicleSessionPageResponse)
async def get_session_page(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
) -> VehicleSessionPageResponse:
    assignment_result = await db.execute(
        select(VehicleAssignment).where(VehicleAssignment.id == assignment_id)
    )
    assignment = assignment_result.scalar_one_or_none()

    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    await db.refresh(assignment, attribute_names=["user", "vehicle"])

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

    previous_report_data = None

    if previous_assignment is not None:
        await db.refresh(previous_assignment, attribute_names=["user"])

        previous_report_data = PreviousHandoverReportSchema(
            assignment_id=previous_assignment.id,
            previous_driver_name=previous_assignment.user.full_name,
            previous_session_started_at=previous_assignment.started_at,
            previous_session_ended_at=previous_assignment.ended_at,
        )

    return VehicleSessionPageResponse(
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
            status=assignment.vehicle.status.value
            if hasattr(assignment.vehicle.status, "value")
            else str(assignment.vehicle.status),
            current_mileage=assignment.vehicle.current_mileage,
        ),
        previous_handover_report=previous_report_data,
    )


@router.post(
    "/{assignment_id}/handover-start",
    response_model=HandoverStartResponse,
)
async def save_handover_start(
    assignment_id: int,
    payload: HandoverStartRequest,
    db: AsyncSession = Depends(get_db),
) -> HandoverStartResponse:
    assignment_result = await db.execute(
        select(VehicleAssignment).where(VehicleAssignment.id == assignment_id)
    )
    assignment = assignment_result.scalar_one_or_none()

    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    report_result = await db.execute(
        select(VehicleHandoverReport).where(
            VehicleHandoverReport.assignment_id == assignment_id
        )
    )
    report = report_result.scalar_one_or_none()

    if report is None:
        report = VehicleHandoverReport(
            assignment_id=assignment_id,
        )
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

    return HandoverStartResponse(
        assignment_id=report.assignment_id,
        mileage_start=report.mileage_start,
        dashboard_warnings_start=report.dashboard_warnings_start,
        damage_notes_start=report.damage_notes_start,
        notes_start=report.notes_start,
        has_documents=report.has_documents,
        has_medkit=report.has_medkit,
        has_extinguisher=report.has_extinguisher,
        has_warning_triangle=report.has_warning_triangle,
        has_spare_wheel=report.has_spare_wheel,
    )


@router.post(
    "/{assignment_id}/handover-end",
    response_model=HandoverEndResponse,
)
async def save_handover_end(
    assignment_id: int,
    payload: HandoverEndRequest,
    db: AsyncSession = Depends(get_db),
) -> HandoverEndResponse:
    assignment_result = await db.execute(
        select(VehicleAssignment).where(VehicleAssignment.id == assignment_id)
    )
    assignment = assignment_result.scalar_one_or_none()

    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    report_result = await db.execute(
        select(VehicleHandoverReport).where(
            VehicleHandoverReport.assignment_id == assignment_id
        )
    )
    report = report_result.scalar_one_or_none()

    if report is None:
        report = VehicleHandoverReport(
            assignment_id=assignment_id,
        )
        db.add(report)

    report.mileage_end = payload.mileage_end
    report.dashboard_warnings_end = payload.dashboard_warnings_end
    report.damage_notes_end = payload.damage_notes_end
    report.notes_end = payload.notes_end

    await db.commit()
    await db.refresh(report)

    return HandoverEndResponse(
        assignment_id=report.assignment_id,
        mileage_end=report.mileage_end,
        dashboard_warnings_end=report.dashboard_warnings_end,
        damage_notes_end=report.damage_notes_end,
        notes_end=report.notes_end,
    )