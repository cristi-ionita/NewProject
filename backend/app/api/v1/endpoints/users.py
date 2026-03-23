import hashlib
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.user import UserCreateRequest, UserResponse, UserUpdateRequest

router = APIRouter(prefix="/users", tags=["users"])


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


def normalize_full_name(name: str) -> str:
    return " ".join(word.capitalize() for word in name.strip().split())


def validate_shift_number(shift_number: str) -> str:
    value = shift_number.strip()

    if not value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Numărul de tură este obligatoriu.",
        )

    if not value.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Numărul de tură trebuie să conțină doar cifre.",
        )

    return value


def validate_pin(pin: str) -> str:
    value = pin.strip()

    if not value.isdigit() or len(value) != 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PIN-ul trebuie să fie format din 4 cifre.",
        )

    return value


def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()


@router.get("", response_model=list[UserResponse])
async def list_users(
    active_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
) -> list[UserResponse]:
    query = select(User)

    if active_only:
        query = query.where(User.is_active == True)

    query = query.order_by(User.full_name.asc())

    result = await db.execute(query)
    users = result.scalars().all()
    return [UserResponse.model_validate(user) for user in users]


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_admin_token)],
)
async def create_user(
    payload: UserCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    full_name = normalize_full_name(payload.full_name)
    shift_number = validate_shift_number(payload.shift_number)
    pin = validate_pin(payload.pin)

    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Numele este obligatoriu.",
        )

    existing_user_result = await db.execute(
        select(User).where(func.lower(User.full_name) == full_name.lower())
    )
    if existing_user_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Există deja un utilizator cu acest nume.",
        )

    existing_shift_result = await db.execute(
        select(User).where(
            User.shift_number == shift_number,
            User.is_active == True,
        )
    )
    if existing_shift_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tura nu este liberă.",
        )

    user = User(
        full_name=full_name,
        shift_number=shift_number,
        unique_code=uuid.uuid4().hex[:10],
        pin_hash=hash_pin(pin),
        password_hash="not-used",
        is_active=True,
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return UserResponse.model_validate(user)


@router.put(
    "/{user_id}",
    response_model=UserResponse,
    dependencies=[Depends(verify_admin_token)],
)
async def update_user(
    user_id: int,
    payload: UserUpdateRequest,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilizatorul nu există.",
        )

    full_name = normalize_full_name(payload.full_name)
    shift_number = validate_shift_number(payload.shift_number)

    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Numele este obligatoriu.",
        )

    if payload.pin:
        pin = validate_pin(payload.pin)
        user.pin_hash = hash_pin(pin)

    existing_name_result = await db.execute(
        select(User).where(
            func.lower(User.full_name) == full_name.lower(),
            User.id != user_id,
        )
    )
    if existing_name_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Există deja un utilizator cu acest nume.",
        )

    if payload.is_active:
        existing_shift_result = await db.execute(
            select(User).where(
                User.shift_number == shift_number,
                User.is_active == True,
                User.id != user_id,
            )
        )
        if existing_shift_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tura nu este liberă.",
            )

    user.full_name = full_name
    user.shift_number = shift_number
    user.is_active = payload.is_active

    await db.commit()
    await db.refresh(user)

    return UserResponse.model_validate(user)


@router.patch(
    "/{user_id}/deactivate",
    response_model=UserResponse,
    dependencies=[Depends(verify_admin_token)],
)
async def deactivate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilizatorul nu există.",
        )

    user.is_active = False

    await db.commit()
    await db.refresh(user)

    return UserResponse.model_validate(user)


@router.patch(
    "/{user_id}/activate",
    response_model=UserResponse,
    dependencies=[Depends(verify_admin_token)],
)
async def activate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilizatorul nu există.",
        )

    shift_number = validate_shift_number(user.shift_number or "")

    existing_shift_result = await db.execute(
        select(User).where(
            User.shift_number == shift_number,
            User.is_active == True,
            User.id != user_id,
        )
    )

    if existing_shift_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tura nu este liberă, utilizatorul nu poate fi activat.",
        )

    user.is_active = True

    await db.commit()
    await db.refresh(user)

    return UserResponse.model_validate(user)