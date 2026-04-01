import hashlib
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_admin
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.user import (
    UserCreateRequestSchema,
    UserReadSchema,
    UserUpdateRequestSchema,
)

router = APIRouter(prefix="/users", tags=["users"])


def normalize_full_name(name: str) -> str:
    return " ".join(word.capitalize() for word in name.strip().split())


def normalize_role(role: str) -> str:
    value = role.strip().lower()

    if value not in {"employee", "mechanic"}:
        raise HTTPException(400, "Rol invalid.")

    return value


def validate_shift_number(shift_number: str) -> str:
    value = shift_number.strip()

    if not value:
        raise HTTPException(400, "Numărul de tură este obligatoriu.")

    if not value.isdigit():
        raise HTTPException(400, "Numărul de tură trebuie să conțină doar cifre.")

    return value


def validate_pin(pin: str) -> str:
    value = pin.strip()

    if not value.isdigit() or len(value) != 4:
        raise HTTPException(400, "PIN-ul trebuie să fie format din 4 cifre.")

    return value


def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()


async def get_user_or_404(db: AsyncSession, user_id: int) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(404, "Utilizatorul nu există.")

    return user


async def ensure_unique_full_name(
    db: AsyncSession,
    full_name: str,
    exclude_user_id: int | None = None,
) -> None:
    query = select(User).where(func.lower(User.full_name) == full_name.lower())

    if exclude_user_id:
        query = query.where(User.id != exclude_user_id)

    if (await db.execute(query)).scalar_one_or_none():
        raise HTTPException(400, "Există deja un utilizator cu acest nume.")


async def ensure_shift_is_available(
    db: AsyncSession,
    shift_number: str,
    exclude_user_id: int | None = None,
) -> None:
    query = select(User).where(
        User.shift_number == shift_number,
        User.is_active.is_(True),
    )

    if exclude_user_id:
        query = query.where(User.id != exclude_user_id)

    if (await db.execute(query)).scalar_one_or_none():
        raise HTTPException(400, "Tura nu este liberă.")


class ResetPinSchema(BaseModel):
    new_pin: str = Field(..., min_length=4, max_length=4)


@router.get("", response_model=list[UserReadSchema])
async def list_users(
    active_only: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    query = select(User)

    if active_only:
        query = query.where(User.is_active.is_(True))

    result = await db.execute(query.order_by(User.full_name.asc()))
    return [UserReadSchema.model_validate(u) for u in result.scalars().all()]


@router.post("", response_model=UserReadSchema, status_code=201)
async def create_user(
    payload: UserCreateRequestSchema,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    full_name = normalize_full_name(payload.full_name)
    role = normalize_role(payload.role)
    pin = validate_pin(payload.pin)

    shift_number: str | None = None
    if role != "mechanic":
        shift_number = validate_shift_number(payload.shift_number or "")
        await ensure_shift_is_available(db, shift_number)

    await ensure_unique_full_name(db, full_name)

    user = User(
        full_name=full_name,
        shift_number=shift_number,
        unique_code=uuid.uuid4().hex[:10],
        pin_hash=hash_pin(pin),
        password_hash="not-used",
        is_active=True,
        role=role,
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return UserReadSchema.model_validate(user)


@router.put("/{user_id}", response_model=UserReadSchema)
async def update_user(
    user_id: int,
    payload: UserUpdateRequestSchema,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    user = await get_user_or_404(db, user_id)

    full_name = normalize_full_name(payload.full_name)
    role = normalize_role(payload.role)

    await ensure_unique_full_name(db, full_name, user_id)

    will_be_active = payload.is_active if payload.is_active is not None else user.is_active

    shift_number: str | None = None
    if role != "mechanic":
        shift_number = validate_shift_number(payload.shift_number or "")
        if will_be_active:
            await ensure_shift_is_available(db, shift_number, user_id)

    if payload.pin:
        user.pin_hash = hash_pin(validate_pin(payload.pin))

    user.full_name = full_name
    user.role = role
    user.shift_number = shift_number

    if payload.is_active is not None:
        user.is_active = payload.is_active

    await db.commit()
    await db.refresh(user)

    return UserReadSchema.model_validate(user)


@router.patch("/{user_id}/reset-pin", response_model=UserReadSchema)
async def reset_user_pin(
    user_id: int,
    payload: ResetPinSchema,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    user = await get_user_or_404(db, user_id)

    pin = validate_pin(payload.new_pin)
    user.pin_hash = hash_pin(pin)

    await db.commit()
    await db.refresh(user)

    return UserReadSchema.model_validate(user)


@router.patch("/{user_id}/deactivate", response_model=UserReadSchema)
async def deactivate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    user = await get_user_or_404(db, user_id)

    user.is_active = False

    await db.commit()
    await db.refresh(user)

    return UserReadSchema.model_validate(user)


@router.patch("/{user_id}/activate", response_model=UserReadSchema)
async def activate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    user = await get_user_or_404(db, user_id)

    if user.role != "mechanic":
        shift_number = validate_shift_number(user.shift_number or "")
        await ensure_shift_is_available(db, shift_number, user_id)

    user.is_active = True

    await db.commit()
    await db.refresh(user)

    return UserReadSchema.model_validate(user)