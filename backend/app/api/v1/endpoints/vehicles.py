from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_admin
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_assignment import AssignmentStatus, VehicleAssignment
from app.db.session import get_db
from app.schemas.vehicle import (
    VehicleCreateSchema,
    VehicleReadSchema,
    VehicleUpdateSchema,
)
from app.schemas.vehicle_live_status import VehicleLiveStatusResponseSchema

router = APIRouter(
    prefix="/vehicles",
    tags=["vehicles"],
    dependencies=[Depends(get_current_admin)],
)


async def get_vehicle_or_404(db: AsyncSession, vehicle_id: int) -> Vehicle:
    vehicle = (
        await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    ).scalar_one_or_none()

    if vehicle is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found.",
        )

    return vehicle


async def ensure_unique_license_plate(
    db: AsyncSession,
    license_plate: str,
    exclude_id: int | None = None,
) -> None:
    query = select(Vehicle).where(
        Vehicle.license_plate == license_plate.strip().upper()
    )

    if exclude_id is not None:
        query = query.where(Vehicle.id != exclude_id)

    existing = (await db.execute(query)).scalar_one_or_none()

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="License plate already exists.",
        )


async def ensure_unique_vin(
    db: AsyncSession,
    vin: str,
    exclude_id: int | None = None,
) -> None:
    query = select(Vehicle).where(Vehicle.vin == vin.strip())

    if exclude_id is not None:
        query = query.where(Vehicle.id != exclude_id)

    existing = (await db.execute(query)).scalar_one_or_none()

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="VIN already exists.",
        )


async def has_active_assignment(db: AsyncSession, vehicle_id: int) -> bool:
    result = await db.execute(
        select(VehicleAssignment).where(
            VehicleAssignment.vehicle_id == vehicle_id,
            VehicleAssignment.status == AssignmentStatus.ACTIVE,
        )
    )
    return result.scalar_one_or_none() is not None


@router.post("", response_model=VehicleReadSchema, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    payload: VehicleCreateSchema,
    db: AsyncSession = Depends(get_db),
) -> VehicleReadSchema:
    data = payload.model_dump()
    data["license_plate"] = payload.license_plate.strip().upper()

    await ensure_unique_license_plate(db, data["license_plate"])

    if data.get("vin"):
        await ensure_unique_vin(db, data["vin"])

    vehicle = Vehicle(**data)

    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)

    return VehicleReadSchema.model_validate(vehicle)


@router.get("", response_model=list[VehicleReadSchema])
async def list_vehicles(
    db: AsyncSession = Depends(get_db),
) -> list[VehicleReadSchema]:
    result = await db.execute(select(Vehicle).order_by(Vehicle.id.desc()))

    return [
        VehicleReadSchema.model_validate(v)
        for v in result.scalars().all()
    ]


@router.get("/live-status", response_model=VehicleLiveStatusResponseSchema)
async def get_live_status(
    db: AsyncSession = Depends(get_db),
) -> VehicleLiveStatusResponseSchema:
    vehicles = (
        await db.execute(select(Vehicle).order_by(Vehicle.license_plate))
    ).scalars().all()

    assignments = (
        await db.execute(
            select(VehicleAssignment).where(
                VehicleAssignment.status == AssignmentStatus.ACTIVE
            )
        )
    ).scalars().all()

    active_map: dict[int, VehicleAssignment] = {}

    for assignment in assignments:
        if assignment.vehicle_id not in active_map:
            await db.refresh(assignment, ["user"])
            active_map[assignment.vehicle_id] = assignment

    response = []

    for vehicle in vehicles:
        assignment = active_map.get(vehicle.id)

        response.append(
            {
                "vehicle_id": vehicle.id,
                "brand": vehicle.brand,
                "model": vehicle.model,
                "license_plate": vehicle.license_plate,
                "year": vehicle.year,
                "vehicle_status": vehicle.status.value,
                "availability": "occupied" if assignment else "free",
                "assigned_to_user_id": assignment.user_id if assignment else None,
                "assigned_to_name": assignment.user.full_name if assignment else None,
                "assigned_to_shift_number": assignment.user.shift_number if assignment else None,
                "active_assignment_id": assignment.id if assignment else None,
            }
        )

    return VehicleLiveStatusResponseSchema(vehicles=response)


@router.get("/{vehicle_id}", response_model=VehicleReadSchema)
async def get_vehicle(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db),
) -> VehicleReadSchema:
    vehicle = await get_vehicle_or_404(db, vehicle_id)
    return VehicleReadSchema.model_validate(vehicle)


@router.put("/{vehicle_id}", response_model=VehicleReadSchema)
async def update_vehicle(
    vehicle_id: int,
    payload: VehicleUpdateSchema,
    db: AsyncSession = Depends(get_db),
) -> VehicleReadSchema:
    vehicle = await get_vehicle_or_404(db, vehicle_id)

    data = payload.model_dump(exclude_unset=True)

    if "license_plate" in data:
        normalized = data["license_plate"].strip().upper()
        await ensure_unique_license_plate(db, normalized, vehicle_id)
        data["license_plate"] = normalized

    if "vin" in data and data["vin"]:
        await ensure_unique_vin(db, data["vin"], vehicle_id)

    for field, value in data.items():
        setattr(vehicle, field, value)

    await db.commit()
    await db.refresh(vehicle)

    return VehicleReadSchema.model_validate(vehicle)


@router.delete("/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db),
):
    vehicle = await get_vehicle_or_404(db, vehicle_id)

    if await has_active_assignment(db, vehicle_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle is currently assigned.",
        )

    await db.delete(vehicle)
    await db.commit()

    return {"ok": True}