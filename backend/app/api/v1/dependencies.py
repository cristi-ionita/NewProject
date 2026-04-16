from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_admin_access_token
from app.db.models.user import User
from app.db.models.vehicle_assignment import VehicleAssignment
from app.db.session import get_db

admin_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    x_user_code: str | None = Header(default=None, alias="X-User-Code"),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not x_user_code:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    result = await db.execute(
        select(User).where(User.unique_code == x_user_code.strip())
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User inactive.",
        )

    return user


async def get_current_driver(
    user: User = Depends(get_current_user),
) -> User:
    if user.role not in {"employee", "mechanic"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Driver access required.",
        )

    return user


async def get_current_mechanic(
    user: User = Depends(get_current_user),
) -> User:
    if user.role != "mechanic":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mechanic access required.",
        )

    return user


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(admin_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required.",
        )

    token = credentials.credentials

    try:
        payload = decode_admin_access_token(token)
        user_id = int(payload["sub"])
    except (ValueError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin token.",
        )

    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.role == "admin",
            User.is_active.is_(True),
        )
    )
    admin_user = result.scalar_one_or_none()

    if admin_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin user not found or inactive.",
        )

    return admin_user


async def get_current_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_driver),
) -> VehicleAssignment:
    result = await db.execute(
        select(VehicleAssignment).where(
            VehicleAssignment.id == assignment_id
        )
    )
    assignment = result.scalar_one_or_none()

    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    if assignment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )

    return assignment