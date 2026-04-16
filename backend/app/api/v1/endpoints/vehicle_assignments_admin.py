from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_admin
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_assignment import AssignmentStatus, VehicleAssignment
from app.db.session import get_db
from app.schemas.vehicle_assignment_admin import (
    VehicleAssignmentCloseResponseSchema,
    VehicleAssignmentCreateRequestSchema,
    VehicleAssignmentListResponseSchema,
    VehicleAssignmentReadSchema,
)

router = APIRouter(
    prefix="/admin-assignments",
    tags=["admin-assignments"],
    dependencies=[Depends(get_current_admin)],
)


def parse_assignment_status(value: str) -> AssignmentStatus:
    normalized = value.strip().upper()

    try:
        return AssignmentStatus[normalized]
    except KeyError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status invalid.",
        ) from err


async def get_user_or_404(db: AsyncSession, user_id: int) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilizatorul nu există.",
        )

    return user


async def get_vehicle_or_404(db: AsyncSession, vehicle_id: int) -> Vehicle:
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()

    if vehicle is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mașina nu există.",
        )

    return vehicle


async def get_assignment_or_404(
    db: AsyncSession,
    assignment_id: int,
) -> VehicleAssignment:
    result = await db.execute(
        select(VehicleAssignment).where(VehicleAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()

    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Atribuirea nu există.",
        )

    return assignment


async def get_active_assignment_for_user(
    db: AsyncSession,
    user_id: int,
) -> VehicleAssignment | None:
    result = await db.execute(
        select(VehicleAssignment).where(
            VehicleAssignment.user_id == user_id,
            VehicleAssignment.status == AssignmentStatus.ACTIVE,
        )
    )
    return result.scalar_one_or_none()


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


def build_assignment_read(
    assignment: VehicleAssignment,
    user: User,
    vehicle: Vehicle,
) -> VehicleAssignmentReadSchema:
    return VehicleAssignmentReadSchema(
        id=assignment.id,
        user_id=user.id,
        user_name=user.full_name,
        vehicle_id=vehicle.id,
        vehicle_license_plate=vehicle.license_plate,
        vehicle_brand=vehicle.brand,
        vehicle_model=vehicle.model,
        status=assignment.status.value,
        started_at=assignment.started_at,
        ended_at=assignment.ended_at,
    )


@router.post(
    "",
    response_model=VehicleAssignmentReadSchema,
    status_code=status.HTTP_201_CREATED,
)
async def create_assignment(
    payload: VehicleAssignmentCreateRequestSchema,
    db: AsyncSession = Depends(get_db),
) -> VehicleAssignmentReadSchema:
    user = await get_user_or_404(db, payload.user_id)
    vehicle = await get_vehicle_or_404(db, payload.vehicle_id)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nu poți atribui o mașină unui utilizator inactiv.",
        )

    if await get_active_assignment_for_user(db, user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Utilizatorul are deja o mașină atribuită.",
        )

    if await get_active_assignment_for_vehicle(db, vehicle.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mașina este deja atribuită altui utilizator.",
        )

    assignment = VehicleAssignment(
        user_id=user.id,
        vehicle_id=vehicle.id,
        status=AssignmentStatus.ACTIVE,
    )

    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)

    return build_assignment_read(assignment, user, vehicle)


@router.get("", response_model=VehicleAssignmentListResponseSchema)
async def list_assignments(
    status_filter: str | None = Query(default=None, alias="status"),
    user_id: int | None = Query(default=None),
    vehicle_id: int | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> VehicleAssignmentListResponseSchema:
    query = (
        select(VehicleAssignment, User, Vehicle)
        .join(User, User.id == VehicleAssignment.user_id)
        .join(Vehicle, Vehicle.id == VehicleAssignment.vehicle_id)
    )

    if status_filter:
        query = query.where(
            VehicleAssignment.status == parse_assignment_status(status_filter)
        )

    if user_id is not None:
        query = query.where(VehicleAssignment.user_id == user_id)

    if vehicle_id is not None:
        query = query.where(VehicleAssignment.vehicle_id == vehicle_id)

    result = await db.execute(query.order_by(desc(VehicleAssignment.started_at)))
    rows = result.all()

    return VehicleAssignmentListResponseSchema(
        assignments=[
            build_assignment_read(assignment, user, vehicle)
            for assignment, user, vehicle in rows
        ]
    )


@router.patch(
    "/{assignment_id}/close",
    response_model=VehicleAssignmentCloseResponseSchema,
)
async def close_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
) -> VehicleAssignmentCloseResponseSchema:
    assignment = await get_assignment_or_404(db, assignment_id)

    if assignment.status != AssignmentStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Atribuirea este deja închisă.",
        )

    assignment.status = AssignmentStatus.CLOSED
    assignment.ended_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(assignment)

    return VehicleAssignmentCloseResponseSchema(
        id=assignment.id,
        status=assignment.status.value,
        ended_at=assignment.ended_at,
    )


@router.delete(
    "/{assignment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_closed_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
) -> Response:
    assignment = await get_assignment_or_404(db, assignment_id)

    if assignment.status == AssignmentStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nu poți șterge o atribuire activă. Închide-o mai întâi.",
        )

    await db.delete(assignment)
    await db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)