from datetime import datetime, timezone
import hashlib

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import datetime, timezone
from app.db.models.vehicle_handover_report import VehicleHandoverReport
from app.core.config import settings
from app.db.models.user import User
from app.db.models.vehicle import Vehicle
from app.db.models.vehicle_assignment import (
    AssignmentStatus,
    VehicleAssignment,
)
from app.db.session import get_db
from app.schemas.auth import (
    ActiveSessionResponse,
    EndSessionRequest,
    EndSessionResponse,
    LoginRequest,
    LoginResponse,
    StartSessionRequest,
    StartSessionResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class AdminLoginRequest(BaseModel):
    password: str


class AdminLoginResponse(BaseModel):
    token: str


def generate_admin_token(password: str) -> str:
    raw = f"{password}:{settings.ADMIN_TOKEN_SECRET}"
    return hashlib.sha256(raw.encode()).hexdigest()


@router.post("/admin-login", response_model=AdminLoginResponse)
async def admin_login(payload: AdminLoginRequest):
    if payload.password != settings.ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Parolă admin incorectă.",
        )

    token = generate_admin_token(payload.password)

    return {"token": token}


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    user = (
        await db.execute(
            select(User).where(User.unique_code == payload.unique_code)
        )
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="User invalid.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User inactiv.")

    hashed_input = hashlib.sha256(payload.pin.encode()).hexdigest()

    if user.pin_hash != hashed_input:
        raise HTTPException(status_code=401, detail="PIN incorect.")

    return LoginResponse(
        user_id=user.id,
        full_name=user.full_name,
        shift_number=user.shift_number,
        unique_code=user.unique_code,
    )

@router.get("/active-session/{code}", response_model=ActiveSessionResponse)
async def get_active_session(
    code: str,
    db: AsyncSession = Depends(get_db),
) -> ActiveSessionResponse:
    user_result = await db.execute(
        select(User).where(User.unique_code == code.strip())
    )
    user = user_result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    active_assignment_result = await db.execute(
        select(VehicleAssignment).where(
            VehicleAssignment.user_id == user.id,
            VehicleAssignment.status == AssignmentStatus.ACTIVE,
        )
    )
    active_assignment = active_assignment_result.scalar_one_or_none()

    if active_assignment is None:
        return ActiveSessionResponse(has_active_session=False)

    await db.refresh(active_assignment, attribute_names=["vehicle"])

    return ActiveSessionResponse(
        has_active_session=True,
        assignment_id=active_assignment.id,
        vehicle_id=active_assignment.vehicle.id,
        license_plate=active_assignment.vehicle.license_plate,
        brand=active_assignment.vehicle.brand,
        model=active_assignment.vehicle.model,
        started_at=active_assignment.started_at,
        status=active_assignment.status.value,
    )


@router.post("/start-session", response_model=StartSessionResponse)
async def start_session(
    payload: StartSessionRequest,
    db: AsyncSession = Depends(get_db),
) -> StartSessionResponse:
    user_result = await db.execute(
        select(User).where(User.unique_code == payload.code.strip())
    )
    user = user_result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive.",
        )

    vehicle_result = await db.execute(
        select(Vehicle).where(Vehicle.license_plate == payload.license_plate.strip())
    )
    vehicle = vehicle_result.scalar_one_or_none()

    if vehicle is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found.",
        )

    active_user_assignment_result = await db.execute(
        select(VehicleAssignment).where(
            VehicleAssignment.user_id == user.id,
            VehicleAssignment.status == AssignmentStatus.ACTIVE,
        )
    )
    active_user_assignment = active_user_assignment_result.scalar_one_or_none()

    if active_user_assignment is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has an active vehicle session.",
        )

    active_vehicle_assignment_result = await db.execute(
        select(VehicleAssignment).where(
            VehicleAssignment.vehicle_id == vehicle.id,
            VehicleAssignment.status == AssignmentStatus.ACTIVE,
        )
    )
    active_vehicle_assignment = active_vehicle_assignment_result.scalar_one_or_none()

    if active_vehicle_assignment is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle is already assigned to another user.",
        )

    assignment = VehicleAssignment(
        user_id=user.id,
        vehicle_id=vehicle.id,
        status=AssignmentStatus.ACTIVE,
    )

    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)

    return StartSessionResponse(
        assignment_id=assignment.id,
        user_id=user.id,
        user_name=user.full_name,
        vehicle_id=vehicle.id,
        license_plate=vehicle.license_plate,
        started_at=assignment.started_at,
        status=assignment.status.value,
    )


@router.post("/end-session", response_model=EndSessionResponse)
async def end_session(
    payload: EndSessionRequest,
    db: AsyncSession = Depends(get_db),
) -> EndSessionResponse:
    user_result = await db.execute(
        select(User).where(User.unique_code == payload.code.strip())
    )
    user = user_result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    active_assignment_result = await db.execute(
        select(VehicleAssignment).where(
            VehicleAssignment.user_id == user.id,
            VehicleAssignment.status == AssignmentStatus.ACTIVE,
        )
    )
    active_assignment = active_assignment_result.scalar_one_or_none()

    if active_assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active vehicle session found for this user.",
        )

    report_result = await db.execute(
        select(VehicleHandoverReport).where(
            VehicleHandoverReport.assignment_id == active_assignment.id
        )
    )
    report = report_result.scalar_one_or_none()

    if report is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nu poți preda mașina fără să completezi datele de predare.",
        )

    handover_end_completed = (
        report.mileage_end is not None
        and report.dashboard_warnings_end is not None
        and report.dashboard_warnings_end.strip() != ""
        and report.damage_notes_end is not None
        and report.damage_notes_end.strip() != ""
        and report.notes_end is not None
        and report.notes_end.strip() != ""
    )

    if not handover_end_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completează toate datele de predare înainte să predai mașina.",
        )

    active_assignment.status = AssignmentStatus.CLOSED
    active_assignment.ended_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(active_assignment)

    return EndSessionResponse(
        assignment_id=active_assignment.id,
        user_id=active_assignment.user_id,
        vehicle_id=active_assignment.vehicle_id,
        ended_at=active_assignment.ended_at,
        status=active_assignment.status.value,
    )