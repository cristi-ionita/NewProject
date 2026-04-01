import hashlib

from app.core.config import settings


def hash_pin(pin: str) -> str:
    cleaned_pin = pin.strip()
    return hashlib.sha256(cleaned_pin.encode()).hexdigest()


def generate_admin_token(password: str) -> str:
    raw = f"{password}:{settings.ADMIN_TOKEN_SECRET}"
    return hashlib.sha256(raw.encode()).hexdigest()


def verify_admin_token(token: str) -> bool:
    expected_token = generate_admin_token(settings.ADMIN_PASSWORD)
    return token == expected_token