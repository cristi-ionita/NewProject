from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import (
    get_current_admin,
    get_current_driver,
)
from app.core.security import hash_pin
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.employee_profile import (
    EmployeeProfileCreateSchema,
    EmployeeProfileReadSchema,
    EmployeeProfileUpdateSchema,
)
from app.services.employee_profile_service import EmployeeProfileService

router = APIRouter(prefix="/employee-profiles", tags=["employee-profiles"])


# =========================
# HELPERS
# =========================

async def get_user_or_404(db: AsyncSession, user_id: int) -> User:
    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(404, "User not found.")

    return user


async def get_profile_or_404(db: AsyncSession, user_id: int):
    profile = await EmployeeProfileService.get_by_user_id(db, user_id)

    if not profile:
        raise HTTPException(404, "Employee profile not found.")

    return profile


def validate_pin(pin: str) -> str:
    pin = pin.strip()

    if not pin.isdigit() or len(pin) != 4:
        raise HTTPException(400, "PIN invalid.")

    return pin


# =========================
# ADMIN CREATE PROFILE
# =========================

@router.post("", response_model=EmployeeProfileReadSchema)
async def create_profile(
    payload: EmployeeProfileCreateSchema,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    try:
        profile = await EmployeeProfileService.create(db, payload)
    except ValueError as e:
        raise HTTPException(400, str(e))

    return EmployeeProfileReadSchema.model_validate(profile)


# =========================
# ADMIN GET PROFILE
# =========================

@router.get("/{user_id}", response_model=EmployeeProfileReadSchema)
async def get_profile(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    profile = await get_profile_or_404(db, user_id)
    return EmployeeProfileReadSchema.model_validate(profile)


# =========================
# ADMIN UPDATE PROFILE
# =========================

@router.put("/{user_id}", response_model=EmployeeProfileReadSchema)
async def update_profile(
    user_id: int,
    payload: EmployeeProfileUpdateSchema,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    profile = await get_profile_or_404(db, user_id)
    user = await get_user_or_404(db, user_id)

    data = payload.model_dump(exclude_unset=True)

    # 🔐 username / unique_code
    if "username" in data:
        new_code = data["username"].strip()

        if new_code:
            exists = await db.execute(
                select(User).where(
                    User.unique_code == new_code,
                    User.id != user.id,
                )
            )
            if exists.scalar_one_or_none():
                raise HTTPException(400, "Username deja folosit.")

            user.unique_code = new_code

    # 🔐 PIN
    if "pin" in data:
        user.pin_hash = hash_pin(validate_pin(data["pin"]))

    updated = await EmployeeProfileService.update(db, profile, payload)

    await db.commit()
    await db.refresh(updated)

    return EmployeeProfileReadSchema.model_validate(updated)


# =========================
# USER UPDATE OWN PROFILE
# =========================

@router.put("/me", status_code=204)
async def update_my_profile(
    payload: EmployeeProfileUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_driver),
):
    data = payload.model_dump(exclude_unset=True)

    # username
    if "username" in data:
        new_code = data["username"].strip()

        if not new_code:
            raise HTTPException(400, "Username obligatoriu.")

        exists = await db.execute(
            select(User).where(
                User.unique_code == new_code,
                User.id != current_user.id,
            )
        )

        if exists.scalar_one_or_none():
            raise HTTPException(400, "Username deja folosit.")

        current_user.unique_code = new_code

    # PIN
    if "pin" in data:
        current_user.pin_hash = hash_pin(validate_pin(data["pin"]))

    profile = await EmployeeProfileService.get_by_user_id(db, current_user.id)

    # dacă nu există → îl creăm
    if not profile:
        if not data.get("first_name") or not data.get("last_name"):
            raise HTTPException(
                400,
                "Pentru prima completare: first_name și last_name sunt obligatorii.",
            )

        create_payload = EmployeeProfileCreateSchema(
            user_id=current_user.id,
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
            phone=data.get("phone"),
            address=data.get("address"),
            position=data.get("position"),
            department=data.get("department"),
            hire_date=data.get("hire_date"),
            iban=data.get("iban"),
            emergency_contact_name=data.get("emergency_contact_name"),
            emergency_contact_phone=data.get("emergency_contact_phone"),
        )

        await EmployeeProfileService.create(db, create_payload)

    else:
        await EmployeeProfileService.update(db, profile, payload)

    await db.commit()

    return {"ok": True}