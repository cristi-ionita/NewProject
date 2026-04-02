from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.api.v1.dependencies import (
    ensure_user_is_active,
    ensure_user_is_mechanic,
    get_current_admin,
    get_current_mechanic,
    get_user_by_code,
    get_user_by_code_or_404,
)


class FakeScalarResult:
    def __init__(self, item):
        self._item = item

    def scalar_one_or_none(self):
        return self._item


def make_user(
    user_id=1,
    unique_code="EMP001",
    is_active=True,
    role="employee",
):
    return SimpleNamespace(
        id=user_id,
        unique_code=unique_code,
        is_active=is_active,
        role=role,
    )


def make_credentials(scheme="Bearer", token="valid-token"):
    return SimpleNamespace(
        scheme=scheme,
        credentials=token,
    )


@pytest.mark.asyncio
async def test_get_current_admin_success(monkeypatch):
    monkeypatch.setattr(
        "app.api.v1.dependencies.verify_admin_token",
        lambda token: token == "valid-token",
    )

    credentials = make_credentials(token="valid-token")

    result = await get_current_admin(credentials)

    assert result is True


@pytest.mark.asyncio
async def test_get_current_admin_missing_credentials():
    with pytest.raises(HTTPException) as exc:
        await get_current_admin(None)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Admin authentication required."


@pytest.mark.asyncio
async def test_get_current_admin_wrong_scheme():
    credentials = make_credentials(scheme="Basic", token="valid-token")

    with pytest.raises(HTTPException) as exc:
        await get_current_admin(credentials)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Admin authentication required."


@pytest.mark.asyncio
async def test_get_current_admin_invalid_token(monkeypatch):
    monkeypatch.setattr(
        "app.api.v1.dependencies.verify_admin_token",
        lambda token: False,
    )

    credentials = make_credentials(token="bad-token")

    with pytest.raises(HTTPException) as exc:
        await get_current_admin(credentials)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid admin token."


@pytest.mark.asyncio
async def test_get_user_by_code_returns_user():
    user = make_user(unique_code="EMP001")

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(user)

    result = await get_user_by_code("EMP001", db)

    assert result == user


@pytest.mark.asyncio
async def test_get_user_by_code_strips_value():
    user = make_user(unique_code="EMP001")

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(user)

    result = await get_user_by_code("  EMP001  ", db)

    assert result == user


@pytest.mark.asyncio
async def test_get_user_by_code_or_404_returns_user(monkeypatch):
    user = make_user(unique_code="EMP001")

    monkeypatch.setattr(
        "app.api.v1.dependencies.get_user_by_code",
        AsyncMock(return_value=user),
    )

    db = AsyncMock()
    result = await get_user_by_code_or_404("EMP001", db)

    assert result == user


@pytest.mark.asyncio
async def test_get_user_by_code_or_404_not_found(monkeypatch):
    monkeypatch.setattr(
        "app.api.v1.dependencies.get_user_by_code",
        AsyncMock(return_value=None),
    )

    db = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await get_user_by_code_or_404("EMP001", db)

    assert exc.value.status_code == 404
    assert exc.value.detail == "User not found."


def test_ensure_user_is_active_ok():
    user = make_user(is_active=True)
    ensure_user_is_active(user)


def test_ensure_user_is_active_raises():
    user = make_user(is_active=False)

    with pytest.raises(HTTPException) as exc:
        ensure_user_is_active(user)

    assert exc.value.status_code == 403
    assert exc.value.detail == "User inactiv."


def test_ensure_user_is_mechanic_ok():
    user = make_user(role="mechanic")
    ensure_user_is_mechanic(user)


def test_ensure_user_is_mechanic_raises():
    user = make_user(role="employee")

    with pytest.raises(HTTPException) as exc:
        ensure_user_is_mechanic(user)

    assert exc.value.status_code == 403
    assert exc.value.detail == "Mechanic access required."


@pytest.mark.asyncio
async def test_get_current_mechanic_success(monkeypatch):
    mechanic = make_user(unique_code="MECH001", is_active=True, role="mechanic")

    monkeypatch.setattr(
        "app.api.v1.dependencies.get_user_by_code_or_404",
        AsyncMock(return_value=mechanic),
    )

    db = AsyncMock()
    result = await get_current_mechanic(x_user_code="MECH001", db=db)

    assert result == mechanic


@pytest.mark.asyncio
async def test_get_current_mechanic_missing_header():
    db = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await get_current_mechanic(x_user_code=None, db=db)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Mechanic authentication required."


@pytest.mark.asyncio
async def test_get_current_mechanic_inactive_user(monkeypatch):
    inactive_mechanic = make_user(unique_code="MECH001", is_active=False, role="mechanic")

    monkeypatch.setattr(
        "app.api.v1.dependencies.get_user_by_code_or_404",
        AsyncMock(return_value=inactive_mechanic),
    )

    db = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await get_current_mechanic(x_user_code="MECH001", db=db)

    assert exc.value.status_code == 403
    assert exc.value.detail == "User inactiv."


@pytest.mark.asyncio
async def test_get_current_mechanic_not_mechanic(monkeypatch):
    user = make_user(unique_code="EMP001", is_active=True, role="employee")

    monkeypatch.setattr(
        "app.api.v1.dependencies.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )

    db = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await get_current_mechanic(x_user_code="EMP001", db=db)

    assert exc.value.status_code == 403
    assert exc.value.detail == "Mechanic access required."
