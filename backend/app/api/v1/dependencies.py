from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_admin_token
from app.db.models.user import User
from app.db.session import get_db


admin_bearer = HTTPBearer(auto_error=False)


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(admin_bearer),
) -> bool:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required.",
        )

    token = credentials.credentials

    if not verify_admin_token(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin token.",
        )

    return True


async def get_user_by_code(
    code: str,
    db: AsyncSession,
) -> User | None:
    result = await db.execute(
        select(User).where(User.unique_code == code.strip())
    )
    return result.scalar_one_or_none()


async def get_user_by_code_or_404(
    code: str,
    db: AsyncSession,
) -> User:
    user = await get_user_by_code(code, db)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return user


def ensure_user_is_active(user: User) -> None:
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User inactiv.",
        )


def ensure_user_is_mechanic(user: User) -> None:
    if user.role != "mechanic":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mechanic access required.",
        )


async def get_current_mechanic(
    x_user_code: str | None = Header(default=None, alias="X-User-Code"),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not x_user_code:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mechanic authentication required.",
        )

    user = await get_user_by_code_or_404(x_user_code, db)
    ensure_user_is_active(user)
    ensure_user_is_mechanic(user)

    return user