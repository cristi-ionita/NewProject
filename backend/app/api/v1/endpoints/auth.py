from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import (
    get_current_admin,
    get_user_by_code_or_404,
    ensure_user_is_active,
)
from app.core.config import settings
from app.core.security import generate_admin_token, hash_pin
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_assignment import AssignmentStatus, VehicleAssignment
from app.db.models.vehicle_handover_report import VehicleHandoverReport
from app.db.session import get_db
from app.schemas.auth import (
    ActiveSessionResponseSchema,
    EndSessionRequestSchema,
    EndSessionResponseSchema,
    LoginRequestSchema,
    LoginResponseSchema,
    StartSessionRequestSchema,
    StartSessionResponseSchema,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AdminLoginRequestSchema(BaseSchema):
    password: str = Field(..., min_length=1)


class AdminLoginResponseSchema(BaseSchema):
    token: str


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


async def get_user_by_login_identifier(
    db: AsyncSession,
    identifier: str,
) -> User | None:
    normalized = identifier.strip()

    if not normalized:
        return None

    result = await db.execute(
        select(User).where(
            or_(
                User.unique_code == normalized,
                User.username == normalized,
            )
        )
    )
    return result.scalar_one_or_none()


@router.post("/admin-login", response_model=AdminLoginResponseSchema)
async def admin_login(payload: AdminLoginRequestSchema) -> AdminLoginResponseSchema:
    if payload.password != settings.ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Parolă admin incorectă.",
        )

    token = generate_admin_token(payload.password)
    return AdminLoginResponseSchema(token=token)


@router.post("/login", response_model=LoginResponseSchema)
async def login(
    payload: LoginRequestSchema,
    db: AsyncSession = Depends(get_db),
) -> LoginResponseSchema:
    user = await get_user_by_login_identifier(db, payload.identifier)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilizatorul nu există.",
        )

    ensure_user_is_active(user)

    if user.pin_hash != hash_pin(payload.pin):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="PIN incorect.",
        )

    return LoginResponseSchema(
        user_id=user.id,
        full_name=user.full_name,
        shift_number=user.shift_number,
        unique_code=user.unique_code,
        role=user.role,
    )

@router.post("/mechanic-login", response_model=LoginResponseSchema)
async def mechanic_login(
    payload: LoginRequestSchema,
    db: AsyncSession = Depends(get_db),
) -> LoginResponseSchema:
    user = await get_user_by_login_identifier(db, payload.identifier)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilizatorul nu există.",
        )

    ensure_user_is_active(user)

    if user.pin_hash != hash_pin(payload.pin):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="PIN incorect.",
        )

    if user.role != "mechanic":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Contul nu este de tip mechanic.",
        )

    return LoginResponseSchema(
        user_id=user.id,
        full_name=user.full_name,
        shift_number=user.shift_number,
        unique_code=user.unique_code,
        role=user.role,
    )

@router.get("/active-session/{code}", response_model=ActiveSessionResponseSchema)
async def get_active_session(
    code: str,
    db: AsyncSession = Depends(get_db),
) -> ActiveSessionResponseSchema:
    user = await get_user_by_code_or_404(code, db)

    active_assignment = await get_active_assignment_for_user(db, user.id)

    if active_assignment is None:
        return ActiveSessionResponseSchema(has_active_session=False)

    await db.refresh(active_assignment, attribute_names=["vehicle"])

    return ActiveSessionResponseSchema(
        has_active_session=True,
        assignment_id=active_assignment.id,
        vehicle_id=active_assignment.vehicle.id,
        license_plate=active_assignment.vehicle.license_plate,
        brand=active_assignment.vehicle.brand,
        model=active_assignment.vehicle.model,
        started_at=active_assignment.started_at,
        status=active_assignment.status.value,
    )


@router.post("/start-session", response_model=StartSessionResponseSchema)
async def start_session(
    payload: StartSessionRequestSchema,
    db: AsyncSession = Depends(get_db),
) -> StartSessionResponseSchema:
    user = await get_user_by_code_or_404(payload.code, db)

    ensure_user_is_active(user)

    vehicle_result = await db.execute(
        select(Vehicle).where(
            Vehicle.license_plate == payload.license_plate.strip()
        )
    )
    vehicle = vehicle_result.scalar_one_or_none()

    if vehicle is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found.",
        )

    if await get_active_assignment_for_user(db, user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has an active vehicle session.",
        )

    if await get_active_assignment_for_vehicle(db, vehicle.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle is already assigned.",
        )

    assignment = VehicleAssignment(
        user_id=user.id,
        vehicle_id=vehicle.id,
        status=AssignmentStatus.ACTIVE,
    )

    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)

    return StartSessionResponseSchema(
        assignment_id=assignment.id,
        user_id=user.id,
        user_name=user.full_name,
        vehicle_id=vehicle.id,
        license_plate=vehicle.license_plate,
        started_at=assignment.started_at,
        status=assignment.status.value,
    )


@router.post("/end-session", response_model=EndSessionResponseSchema)
async def end_session(
    payload: EndSessionRequestSchema,
    db: AsyncSession = Depends(get_db),
) -> EndSessionResponseSchema:
    user = await get_user_by_code_or_404(payload.code, db)

    active_assignment = await get_active_assignment_for_user(db, user.id)
    if active_assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active session.",
        )

    report_result = await db.execute(
        select(VehicleHandoverReport).where(
            VehicleHandoverReport.assignment_id == active_assignment.id
        )
    )
    report = report_result.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completează predarea înainte.",
        )

    if not all([
        report.mileage_end,
        report.dashboard_warnings_end,
        report.damage_notes_end,
        report.notes_end,
    ]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Date predare incomplete.",
        )

    await db.refresh(active_assignment, attribute_names=["vehicle"])

    if report.mileage_end < active_assignment.vehicle.current_mileage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kilometraj invalid.",
        )

    active_assignment.vehicle.current_mileage = report.mileage_end
    active_assignment.status = AssignmentStatus.CLOSED
    active_assignment.ended_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(active_assignment)

    return EndSessionResponseSchema(
        assignment_id=active_assignment.id,
        user_id=active_assignment.user_id,
        vehicle_id=active_assignment.vehicle_id,
        ended_at=active_assignment.ended_at,
        status=active_assignment.status.value,
    )