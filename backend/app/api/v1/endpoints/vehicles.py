from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
import hashlib

from app.core.config import settings
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_assignment import AssignmentStatus, VehicleAssignment
from app.db.models.vehicle_handover_report import VehicleHandoverReport
from app.db.session import get_db
from app.schemas.vehicle import VehicleCreate, VehicleRead, VehicleUpdate
from app.schemas.vehicle_history import (
    VehicleHistoryItemSchema,
    VehicleHistoryResponse,
)
from app.schemas.vehicle_live_status import (
    VehicleLiveStatusItem,
    VehicleLiveStatusResponse,
)

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


def verify_admin_token(x_admin_token: str | None = Header(default=None)) -> None:
    if not x_admin_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Lipsește tokenul de admin.",
        )

    expected_token = hashlib.sha256(
        f"{settings.ADMIN_PASSWORD}:{settings.ADMIN_TOKEN_SECRET}".encode()
    ).hexdigest()

    if x_admin_token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token admin invalid.",
        )


@router.post(
    "/",
    response_model=VehicleRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_admin_token)],
)
async def create_vehicle(
    payload: VehicleCreate,
    db: AsyncSession = Depends(get_db),
) -> Vehicle:
    existing_vehicle = await db.execute(
        select(Vehicle).where(Vehicle.license_plate == payload.license_plate)
    )
    if existing_vehicle.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A vehicle with this license plate already exists.",
        )

    if payload.vin:
        existing_vin = await db.execute(
            select(Vehicle).where(Vehicle.vin == payload.vin)
        )
        if existing_vin.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A vehicle with this VIN already exists.",
            )

    vehicle = Vehicle(
        brand=payload.brand,
        model=payload.model,
        license_plate=payload.license_plate,
        year=payload.year,
        vin=payload.vin,
        status=payload.status,
        current_mileage=payload.current_mileage,
    )

    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle


@router.get(
    "/",
    response_model=list[VehicleRead],
    dependencies=[Depends(verify_admin_token)],
)
async def list_vehicles(
    db: AsyncSession = Depends(get_db),
) -> list[Vehicle]:
    result = await db.execute(select(Vehicle).order_by(Vehicle.id.desc()))
    return list(result.scalars().all())


@router.put(
    "/{vehicle_id}",
    response_model=VehicleRead,
    dependencies=[Depends(verify_admin_token)],
)
async def update_vehicle(
    vehicle_id: int,
    payload: VehicleUpdate,
    db: AsyncSession = Depends(get_db),
) -> Vehicle:
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()

    if vehicle is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found.",
        )

    if payload.brand is not None:
        vehicle.brand = payload.brand

    if payload.model is not None:
        vehicle.model = payload.model

    if payload.license_plate is not None:
        existing_vehicle = await db.execute(
            select(Vehicle).where(
                Vehicle.license_plate == payload.license_plate,
                Vehicle.id != vehicle_id,
            )
        )
        if existing_vehicle.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A vehicle with this license plate already exists.",
            )
        vehicle.license_plate = payload.license_plate

    if payload.year is not None:
        vehicle.year = payload.year

    if payload.vin is not None:
        existing_vin = await db.execute(
            select(Vehicle).where(
                Vehicle.vin == payload.vin,
                Vehicle.id != vehicle_id,
            )
        )
        if payload.vin and existing_vin.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A vehicle with this VIN already exists.",
            )
        vehicle.vin = payload.vin

    if payload.status is not None:
        vehicle.status = payload.status

    if payload.current_mileage is not None:
        vehicle.current_mileage = payload.current_mileage

    await db.commit()
    await db.refresh(vehicle)
    return vehicle


@router.delete(
    "/{vehicle_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_admin_token)],
)
async def delete_vehicle(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()

    if vehicle is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found.",
        )

    # 🔒 CHECK IMPORTANT
    active_assignment_result = await db.execute(
        select(VehicleAssignment).where(
            VehicleAssignment.vehicle_id == vehicle_id,
            VehicleAssignment.status == AssignmentStatus.ACTIVE,
        )
    )
    active_assignment = active_assignment_result.scalar_one_or_none()

    if active_assignment is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nu poți șterge mașina. Este în uz.",
        )

    await db.delete(vehicle)
    await db.commit()


@router.get("/live-status", response_model=VehicleLiveStatusResponse)
async def get_vehicles_live_status(
    db: AsyncSession = Depends(get_db),
) -> VehicleLiveStatusResponse:
    vehicles_result = await db.execute(
        select(Vehicle).order_by(Vehicle.license_plate.asc())
    )
    vehicles = list(vehicles_result.scalars().all())

    active_assignments_result = await db.execute(
        select(VehicleAssignment)
        .where(VehicleAssignment.status == AssignmentStatus.ACTIVE)
        .order_by(VehicleAssignment.started_at.desc())
    )
    active_assignments = list(active_assignments_result.scalars().all())

    active_by_vehicle_id: dict[int, VehicleAssignment] = {}
    for assignment in active_assignments:
        if assignment.vehicle_id not in active_by_vehicle_id:
            active_by_vehicle_id[assignment.vehicle_id] = assignment

    response_items: list[VehicleLiveStatusItem] = []

    for vehicle in vehicles:
        active_assignment = active_by_vehicle_id.get(vehicle.id)

        assigned_to_user_id = None
        assigned_to_name = None
        assigned_to_shift_number = None
        active_assignment_id = None
        availability = "free"

        if active_assignment is not None:
            await db.refresh(active_assignment, attribute_names=["user"])
            assigned_to_user_id = active_assignment.user.id
            assigned_to_name = active_assignment.user.full_name
            assigned_to_shift_number = active_assignment.user.shift_number
            active_assignment_id = active_assignment.id
            availability = "occupied"

        response_items.append(
            VehicleLiveStatusItem(
                vehicle_id=vehicle.id,
                brand=vehicle.brand,
                model=vehicle.model,
                license_plate=vehicle.license_plate,
                year=vehicle.year,
                vehicle_status=vehicle.status.value
                if hasattr(vehicle.status, "value")
                else str(vehicle.status),
                availability=availability,
                assigned_to_user_id=assigned_to_user_id,
                assigned_to_name=assigned_to_name,
                assigned_to_shift_number=assigned_to_shift_number,
                active_assignment_id=active_assignment_id,
            )
        )

    return VehicleLiveStatusResponse(vehicles=response_items)


@router.get("/{vehicle_id}/history", response_model=VehicleHistoryResponse)
async def get_vehicle_history(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db),
) -> VehicleHistoryResponse:
    vehicle_result = await db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id)
    )
    vehicle = vehicle_result.scalar_one_or_none()

    if vehicle is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found.",
        )

    assignments_result = await db.execute(
        select(VehicleAssignment)
        .where(VehicleAssignment.vehicle_id == vehicle_id)
        .order_by(desc(VehicleAssignment.started_at))
    )
    assignments = list(assignments_result.scalars().all())

    history_items: list[VehicleHistoryItemSchema] = []

    for assignment in assignments:
        await db.refresh(assignment, attribute_names=["user"])

        report_result = await db.execute(
            select(VehicleHandoverReport).where(
                VehicleHandoverReport.assignment_id == assignment.id
            )
        )
        report = report_result.scalar_one_or_none()

        history_items.append(
            VehicleHistoryItemSchema(
                assignment_id=assignment.id,
                driver_name=assignment.user.full_name,
                started_at=assignment.started_at,
                ended_at=assignment.ended_at,
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

    return VehicleHistoryResponse(
        vehicle_id=vehicle.id,
        history=history_items,
    )


@router.get("/{vehicle_id}", response_model=VehicleRead)
async def get_vehicle(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db),
) -> Vehicle:
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()

    if vehicle is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found.",
        )

    return vehicle