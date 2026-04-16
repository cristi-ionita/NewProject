from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_admin
from app.core.security import hash_pin
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.user import (
    UserCreateRequestSchema,
    UserReadSchema,
    UserUpdateRequestSchema,
)

router = APIRouter(prefix="/users", tags=["users"])


def normalize_name(name: str) -> str:
    return " ".join(word.capitalize() for word in name.strip().split())


def validate_pin(pin: str) -> str:
    value = pin.strip()

    if not value.isdigit() or len(value) != 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PIN invalid (4 cifre).",
        )

    return value


def validate_role(role: str) -> str:
    value = role.strip().lower()

    if value not in {"employee", "mechanic"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rol invalid.",
        )

    return value


def validate_shift(shift: str | None) -> str | None:
    if not shift:
        return None

    value = shift.strip()

    if not value.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tura trebuie să fie numerică.",
        )

    return value


async def get_user_or_404(db: AsyncSession, user_id: int) -> User:
    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return user


async def ensure_unique_name(
    db: AsyncSession,
    name: str,
    exclude_id: int | None = None,
) -> None:
    query = select(User).where(func.lower(User.full_name) == name.lower())

    if exclude_id is not None:
        query = query.where(User.id != exclude_id)

    existing = (await db.execute(query)).scalar_one_or_none()

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Există deja un utilizator cu acest nume.",
        )


async def ensure_shift_free(
    db: AsyncSession,
    shift: str,
    exclude_id: int | None = None,
) -> None:
    query = select(User).where(
        User.shift_number == shift,
        User.is_active.is_(True),
    )

    if exclude_id is not None:
        query = query.where(User.id != exclude_id)

    existing = (await db.execute(query)).scalar_one_or_none()

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tura este ocupată.",
        )


@router.get("", response_model=list[UserReadSchema])
async def list_users(
    active_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> list[UserReadSchema]:
    query = select(User)

    if active_only:
        query = query.where(User.is_active.is_(True))

    result = await db.execute(query.order_by(User.full_name.asc()))

    return [UserReadSchema.model_validate(user) for user in result.scalars().all()]


@router.post("", response_model=UserReadSchema, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreateRequestSchema,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> UserReadSchema:
    name = normalize_name(payload.full_name)
    role = validate_role(payload.role)
    pin = validate_pin(payload.pin)

    await ensure_unique_name(db, name)

    shift = None
    if role != "mechanic":
        shift = validate_shift(payload.shift_number)
        if shift:
            await ensure_shift_free(db, shift)

    user = User(
        full_name=name,
        unique_code=uuid.uuid4().hex[:10],
        shift_number=shift,
        pin_hash=hash_pin(pin),
        password_hash="not-used",
        role=role,
        is_active=True,
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
    _: User = Depends(get_current_admin),
) -> UserReadSchema:
    user = await get_user_or_404(db, user_id)

    name = normalize_name(payload.full_name)
    role = validate_role(payload.role)

    await ensure_unique_name(db, name, user.id)

    shift = None
    will_be_active = payload.is_active if payload.is_active is not None else user.is_active

    if role != "mechanic":
        shift = validate_shift(payload.shift_number)
        if shift and will_be_active:
            await ensure_shift_free(db, shift, user.id)

    if payload.pin:
        user.pin_hash = hash_pin(validate_pin(payload.pin))

    user.full_name = name
    user.role = role
    user.shift_number = shift

    if payload.is_active is not None:
        user.is_active = payload.is_active

    await db.commit()
    await db.refresh(user)

    return UserReadSchema.model_validate(user)


@router.patch("/{user_id}/reset-pin", response_model=UserReadSchema)
async def reset_pin(
    user_id: int,
    new_pin: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> UserReadSchema:
    user = await get_user_or_404(db, user_id)

    user.pin_hash = hash_pin(validate_pin(new_pin))

    await db.commit()
    await db.refresh(user)

    return UserReadSchema.model_validate(user)


@router.patch("/{user_id}/activate", response_model=UserReadSchema)
async def activate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> UserReadSchema:
    user = await get_user_or_404(db, user_id)

    if user.role != "mechanic" and user.shift_number:
        await ensure_shift_free(db, user.shift_number, user.id)

    user.is_active = True

    await db.commit()
    await db.refresh(user)

    return UserReadSchema.model_validate(user)


@router.patch("/{user_id}/deactivate", response_model=UserReadSchema)
async def deactivate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> UserReadSchema:
    user = await get_user_or_404(db, user_id)

    user.is_active = False

    await db.commit()
    await db.refresh(user)

    return UserReadSchema.model_validate(user)