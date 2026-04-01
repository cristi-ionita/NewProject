from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_admin
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_assignment import AssignmentStatus, VehicleAssignment
from app.db.models.vehicle_handover_report import VehicleHandoverReport
from app.db.session import get_db
from app.schemas.vehicle import (
    VehicleCreateSchema,
    VehicleReadSchema,
    VehicleUpdateSchema,
)
from app.schemas.vehicle_history import (
    VehicleHistoryItemSchema,
    VehicleHistoryResponseSchema,
)
from app.schemas.vehicle_live_status import (
    VehicleLiveStatusItemSchema,
    VehicleLiveStatusResponseSchema,
)

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


# =========================
# HELPERS
# =========================

async def get_vehicle_or_404(db: AsyncSession, vehicle_id: int) -> Vehicle:
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()

    if not vehicle:
        raise HTTPException(404, "Vehicle not found.")

    return vehicle


async def ensure_unique_license_plate(
    db: AsyncSession,
    license_plate: str,
    exclude_vehicle_id: int | None = None,
):
    query = select(Vehicle).where(Vehicle.license_plate == license_plate)

    if exclude_vehicle_id:
        query = query.where(Vehicle.id != exclude_vehicle_id)

    if (await db.execute(query)).scalar_one_or_none():
        raise HTTPException(400, "License plate already exists.")


async def ensure_unique_vin(
    db: AsyncSession,
    vin: str,
    exclude_vehicle_id: int | None = None,
):
    query = select(Vehicle).where(Vehicle.vin == vin)

    if exclude_vehicle_id:
        query = query.where(Vehicle.id != exclude_vehicle_id)

    if (await db.execute(query)).scalar_one_or_none():
        raise HTTPException(400, "VIN already exists.")


async def get_active_assignment_for_vehicle(
    db: AsyncSession,
    vehicle_id: int,
) -> VehicleAssignment | None:
    result = await db.execute(
        select(VehicleAssignment).where(
            VehicleAssignment.vehicle_id == vehicle_id,
            VehicleAssignment.status == AssignmentStatus.ACTIVE,
        )
    )
    return result.scalar_one_or_none()


async def get_handover_report(
    db: AsyncSession,
    assignment_id: int,
) -> VehicleHandoverReport | None:
    result = await db.execute(
        select(VehicleHandoverReport).where(
            VehicleHandoverReport.assignment_id == assignment_id
        )
    )
    return result.scalar_one_or_none()


def build_vehicle_live_status_item(
    vehicle: Vehicle,
    assignment: VehicleAssignment | None,
) -> VehicleLiveStatusItemSchema:
    return VehicleLiveStatusItemSchema(
        vehicle_id=vehicle.id,
        brand=vehicle.brand,
        model=vehicle.model,
        license_plate=vehicle.license_plate,
        year=vehicle.year,
        vehicle_status=vehicle.status.value,
        availability="occupied" if assignment else "free",
        assigned_to_user_id=assignment.user.id if assignment else None,
        assigned_to_name=assignment.user.full_name if assignment else None,
        assigned_to_shift_number=assignment.user.shift_number if assignment else None,
        active_assignment_id=assignment.id if assignment else None,
    )


# =========================
# ENDPOINTS
# =========================

@router.post("", response_model=VehicleReadSchema, status_code=201)
async def create_vehicle(
    payload: VehicleCreateSchema,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    await ensure_unique_license_plate(db, payload.license_plate)

    if payload.vin:
        await ensure_unique_vin(db, payload.vin)

    vehicle = Vehicle(**payload.model_dump())

    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)

    return VehicleReadSchema.model_validate(vehicle)


@router.get("", response_model=list[VehicleReadSchema])
async def list_vehicles(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    result = await db.execute(select(Vehicle).order_by(Vehicle.id.desc()))
    return [VehicleReadSchema.model_validate(v) for v in result.scalars().all()]


@router.put("/{vehicle_id}", response_model=VehicleReadSchema)
async def update_vehicle(
    vehicle_id: int,
    payload: VehicleUpdateSchema,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    vehicle = await get_vehicle_or_404(db, vehicle_id)

    data = payload.model_dump(exclude_unset=True)

    if "license_plate" in data:
        await ensure_unique_license_plate(db, data["license_plate"], vehicle_id)

    if "vin" in data and data["vin"]:
        await ensure_unique_vin(db, data["vin"], vehicle_id)

    for field, value in data.items():
        setattr(vehicle, field, value)

    await db.commit()
    await db.refresh(vehicle)

    return VehicleReadSchema.model_validate(vehicle)


@router.delete("/{vehicle_id}", status_code=204)
async def delete_vehicle(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    vehicle = await get_vehicle_or_404(db, vehicle_id)

    if await get_active_assignment_for_vehicle(db, vehicle_id):
        raise HTTPException(400, "Nu poți șterge mașina. Este în uz.")

    await db.delete(vehicle)
    await db.commit()

    return Response(status_code=204)


@router.get("/live-status", response_model=VehicleLiveStatusResponseSchema)
async def get_live_status(db: AsyncSession = Depends(get_db)):
    vehicles = (await db.execute(
        select(Vehicle).order_by(Vehicle.license_plate)
    )).scalars().all()

    assignments = (await db.execute(
        select(VehicleAssignment)
        .where(VehicleAssignment.status == AssignmentStatus.ACTIVE)
        .order_by(VehicleAssignment.started_at.desc())
    )).scalars().all()

    active_map: dict[int, VehicleAssignment] = {}

    for a in assignments:
        if a.vehicle_id not in active_map:
            await db.refresh(a, ["user"])
            active_map[a.vehicle_id] = a

    return VehicleLiveStatusResponseSchema(
        vehicles=[
            build_vehicle_live_status_item(v, active_map.get(v.id))
            for v in vehicles
        ]
    )


@router.get("/{vehicle_id}/history", response_model=VehicleHistoryResponseSchema)
async def get_vehicle_history(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db),
):
    vehicle = await get_vehicle_or_404(db, vehicle_id)

    assignments = (await db.execute(
        select(VehicleAssignment)
        .where(VehicleAssignment.vehicle_id == vehicle_id)
        .order_by(desc(VehicleAssignment.started_at))
    )).scalars().all()

    history = []

    for a in assignments:
        await db.refresh(a, ["user"])
        report = await get_handover_report(db, a.id)

        history.append(
            VehicleHistoryItemSchema(
                assignment_id=a.id,
                driver_name=a.user.full_name,
                started_at=a.started_at,
                ended_at=a.ended_at,
                mileage_start=report.mileage_start if report else None,
                mileage_end=report.mileage_end if report else None,
                dashboard_warnings_start=report.dashboard_warnings_start if report else None,
                dashboard_warnings_end=report.dashboard_warnings_end if report else None,
                damage_notes_start=report.damage_notes_start if report else None,
                damage_notes_end=report.damage_notes_end if report else None,
                notes_start=report.notes_start if report else None,
                notes_end=report.notes_end if report else None,
                has_documents=report.has_documents if report else False,
                has_medkit=report.has_medkit if report else False,
                has_extinguisher=report.has_extinguisher if report else False,
                has_warning_triangle=report.has_warning_triangle if report else False,
                has_spare_wheel=report.has_spare_wheel if report else False,
            )
        )

    return VehicleHistoryResponseSchema(vehicle_id=vehicle.id, history=history)


@router.get("/{vehicle_id}", response_model=VehicleReadSchema)
async def get_vehicle(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db),
):
    return VehicleReadSchema.model_validate(
        await get_vehicle_or_404(db, vehicle_id)
    )