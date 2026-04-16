from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_pin(pin: str) -> str:
    return pwd_context.hash(pin.strip())


def verify_pin(pin: str, pin_hash: str | None) -> bool:
    if not pin_hash:
        return False
    return pwd_context.verify(pin.strip(), pin_hash)


def hash_password(password: str) -> str:
    return pwd_context.hash(password.strip())


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    return pwd_context.verify(password.strip(), password_hash)


def create_admin_access_token(user_id: int) -> str:
    expire = datetime.now(UTC) + timedelta(
        minutes=settings.ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "role": "admin",
        "type": "access",
        "exp": expire,
        "iat": datetime.now(UTC),
    }

    return jwt.encode(
        payload,
        settings.ADMIN_TOKEN_SECRET,
        algorithm=settings.ADMIN_TOKEN_ALGORITHM,
    )


def decode_admin_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.ADMIN_TOKEN_SECRET,
            algorithms=[settings.ADMIN_TOKEN_ALGORITHM],
        )
    except JWTError as exc:
        raise ValueError("Invalid admin token.") from exc

    if payload.get("type") != "access":
        raise ValueError("Invalid token type.")

    if payload.get("role") != "admin":
        raise ValueError("Invalid admin role.")

    if not payload.get("sub"):
        raise ValueError("Invalid token subject.")

    return payload