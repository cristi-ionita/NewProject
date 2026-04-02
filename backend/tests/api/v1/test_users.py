from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.users import (
    ResetPinSchema,
    activate_user,
    create_user,
    deactivate_user,
    ensure_shift_is_available,
    ensure_unique_full_name,
    get_user_or_404,
    hash_pin,
    list_users,
    normalize_full_name,
    normalize_role,
    reset_user_pin,
    update_user,
    validate_pin,
    validate_shift_number,
)


class FakeScalarResult:
    def __init__(self, item):
        self._item = item

    def scalar_one_or_none(self):
        return self._item


class FakeScalarsResult:
    def __init__(self, items):
        self._items = items

    def all(self):
        return self._items


class FakeResult:
    def __init__(self, items):
        self._items = items

    def scalars(self):
        return FakeScalarsResult(self._items)


def make_user(
    user_id=1,
    full_name="Ana Popescu",
    shift_number="1",
    unique_code="EMP001",
    pin_hash="old_hash",
    is_active=True,
):
    return SimpleNamespace(
        id=user_id,
        full_name=full_name,
        shift_number=shift_number,
        unique_code=unique_code,
        pin_hash=pin_hash,
        is_active=is_active,
    )


def make_user_schema_response(user):
    return SimpleNamespace(
        id=user.id,
        full_name=user.full_name,
        shift_number=user.shift_number,
        unique_code=user.unique_code,
        is_active=user.is_active,
    )


def make_create_payload(
    full_name="ana popescu",
    shift_number="1",
    pin="1234",
):
    return SimpleNamespace(
        full_name=full_name,
        shift_number=shift_number,
        pin=pin,
    )


def make_update_payload(
    full_name="ana popescu",
    shift_number="1",
    pin=None,
    is_active=None,
):
    return SimpleNamespace(
        full_name=full_name,
        shift_number=shift_number,
        pin=pin,
        is_active=is_active,
    )


def test_normalize_full_name():
    assert normalize_full_name("  aNA   pOpEsCu ") == "Ana Popescu"


def test_validate_shift_number_ok():
    assert validate_shift_number(" 12 ") == "12"


def test_validate_shift_number_empty():
    with pytest.raises(HTTPException) as exc:
        validate_shift_number("   ")

    assert exc.value.status_code == 400
    assert exc.value.detail == "Numărul de tură este obligatoriu."


def test_validate_shift_number_not_digits():
    with pytest.raises(HTTPException) as exc:
        validate_shift_number("1A")

    assert exc.value.status_code == 400
    assert exc.value.detail == "Numărul de tură trebuie să conțină doar cifre."


def test_validate_pin_ok():
    assert validate_pin(" 1234 ") == "1234"


def test_validate_pin_invalid():
    with pytest.raises(HTTPException) as exc:
        validate_pin("12ab")

    assert exc.value.status_code == 400
    assert exc.value.detail == "PIN-ul trebuie să fie format din 4 cifre."


def test_hash_pin():
    assert hash_pin("1234") == hash_pin("1234")
    assert hash_pin("1234") != hash_pin("4321")


@pytest.mark.asyncio
async def test_get_user_or_404_returns_user():
    user = make_user()

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(user)

    result = await get_user_or_404(db, 1)

    assert result == user


@pytest.mark.asyncio
async def test_get_user_or_404_not_found():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    with pytest.raises(HTTPException) as exc:
        await get_user_or_404(db, 99)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Utilizatorul nu există."


@pytest.mark.asyncio
async def test_ensure_unique_full_name_ok():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    await ensure_unique_full_name(db, "Ana Popescu")


@pytest.mark.asyncio
async def test_ensure_unique_full_name_raises():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(make_user())

    with pytest.raises(HTTPException) as exc:
        await ensure_unique_full_name(db, "Ana Popescu")

    assert exc.value.status_code == 400
    assert exc.value.detail == "Există deja un utilizator cu acest nume."


@pytest.mark.asyncio
async def test_ensure_shift_is_available_ok():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    await ensure_shift_is_available(db, "1")


@pytest.mark.asyncio
async def test_ensure_shift_is_available_raises():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(make_user())

    with pytest.raises(HTTPException) as exc:
        await ensure_shift_is_available(db, "1")

    assert exc.value.status_code == 400
    assert exc.value.detail == "Tura nu este liberă."


@pytest.mark.asyncio
async def test_list_users(monkeypatch):
    users = [
        make_user(user_id=1, full_name="Ana"),
        make_user(user_id=2, full_name="Mihai"),
    ]

    monkeypatch.setattr(
        "app.api.v1.endpoints.users.UserReadSchema.model_validate",
        lambda user: make_user_schema_response(user),
    )

    db = AsyncMock()
    db.execute.return_value = FakeResult(users)

    result = await list_users(active_only=False, db=db, _=True)

    assert len(result) == 2
    assert result[0].id == 1
    assert result[0].full_name == "Ana"
    assert result[1].id == 2
    assert result[1].full_name == "Mihai"


@pytest.mark.asyncio
async def test_create_user(monkeypatch):
    monkeypatch.setattr(
        "app.api.v1.endpoints.users.ensure_unique_full_name",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.users.ensure_shift_is_available",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.users.uuid.uuid4",
        lambda: SimpleNamespace(hex="abcdef1234567890"),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.users.UserReadSchema.model_validate",
        lambda user: make_user_schema_response(user),
    )

    db = AsyncMock()
    db.add = Mock()

    async def refresh_side_effect(user):
        user.id = 10

    db.refresh.side_effect = refresh_side_effect

    payload = make_create_payload(
        full_name="ana popescu",
        shift_number="2",
        pin="1234",
    )

    result = await create_user(payload=payload, db=db, _=True)

    assert result.id == 10
    assert result.full_name == "Ana Popescu"
    assert result.shift_number == "2"
    assert result.unique_code == "abcdef1234"
    assert result.is_active is True

    db.add.assert_called_once()
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_user_not_found(monkeypatch):
    monkeypatch.setattr(
        "app.api.v1.endpoints.users.get_user_or_404",
        AsyncMock(side_effect=HTTPException(404, "Utilizatorul nu există.")),
    )

    db = AsyncMock()
    payload = make_update_payload()

    with pytest.raises(HTTPException) as exc:
        await update_user(user_id=1, payload=payload, db=db, _=True)

    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_update_user_success_with_pin(monkeypatch):
    user = make_user(user_id=1, full_name="Old Name", shift_number="1", pin_hash="old_hash")

    monkeypatch.setattr(
        "app.api.v1.endpoints.users.get_user_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.users.ensure_unique_full_name",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.users.ensure_shift_is_available",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.users.UserReadSchema.model_validate",
        lambda u: make_user_schema_response(u),
    )

    db = AsyncMock()

    payload = make_update_payload(
        full_name="elena marin",
        shift_number="3",
        pin="1234",
        is_active=True,
    )

    result = await update_user(user_id=1, payload=payload, db=db, _=True)

    assert user.full_name == "Elena Marin"
    assert user.shift_number == "3"
    assert user.pin_hash == hash_pin("1234")
    assert result.full_name == "Elena Marin"
    assert result.shift_number == "3"

    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(user)


@pytest.mark.asyncio
async def test_update_user_inactive_does_not_check_shift(monkeypatch):
    user = make_user(user_id=1, is_active=True)

    ensure_shift_mock = AsyncMock(return_value=None)

    monkeypatch.setattr(
        "app.api.v1.endpoints.users.get_user_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.users.ensure_unique_full_name",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.users.ensure_shift_is_available",
        ensure_shift_mock,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.users.UserReadSchema.model_validate",
        lambda u: make_user_schema_response(u),
    )

    db = AsyncMock()
    payload = make_update_payload(
        full_name="ana popescu",
        shift_number="5",
        is_active=False,
    )

    result = await update_user(user_id=1, payload=payload, db=db, _=True)

    assert result.is_active is False
    ensure_shift_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_reset_user_pin(monkeypatch):
    user = make_user(user_id=1, pin_hash="old_hash")

    monkeypatch.setattr(
        "app.api.v1.endpoints.users.get_user_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.users.UserReadSchema.model_validate",
        lambda u: make_user_schema_response(u),
    )

    db = AsyncMock()
    payload = ResetPinSchema(new_pin="1234")

    result = await reset_user_pin(user_id=1, payload=payload, db=db, _=True)

    assert user.pin_hash == hash_pin("1234")
    assert result.id == 1

    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(user)


@pytest.mark.asyncio
async def test_deactivate_user(monkeypatch):
    user = make_user(user_id=1, is_active=True)

    monkeypatch.setattr(
        "app.api.v1.endpoints.users.get_user_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.users.UserReadSchema.model_validate",
        lambda u: make_user_schema_response(u),
    )

    db = AsyncMock()

    result = await deactivate_user(user_id=1, db=db, _=True)

    assert user.is_active is False
    assert result.is_active is False

    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(user)


@pytest.mark.asyncio
async def test_activate_user(monkeypatch):
    user = make_user(user_id=1, is_active=False, shift_number="2")

    monkeypatch.setattr(
        "app.api.v1.endpoints.users.get_user_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.users.ensure_shift_is_available",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.users.UserReadSchema.model_validate",
        lambda u: make_user_schema_response(u),
    )

    db = AsyncMock()

    result = await activate_user(user_id=1, db=db, _=True)

    assert user.is_active is True
    assert result.is_active is True

    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(user)


def test_normalize_role_invalid():
    with pytest.raises(HTTPException) as exc:
        normalize_role("admin")

    assert exc.value.status_code == 400
    assert exc.value.detail == "Rol invalid."


@pytest.mark.asyncio
async def test_list_users_active_only(monkeypatch):
    user = make_user(user_id=1, is_active=True)

    fake_result = Mock()
    fake_result.scalars.return_value.all.return_value = [user]

    db = AsyncMock()
    db.execute.return_value = fake_result

    monkeypatch.setattr(
        "app.api.v1.endpoints.users.UserReadSchema.model_validate",
        lambda u: make_user_schema_response(u),
    )

    result = await list_users(active_only=True, db=db, _=True)

    assert len(result) == 1
    db.execute.assert_called_once()


@pytest.mark.asyncio
async def test_ensure_unique_full_name_excludes_current_user():
    db = AsyncMock()

    fake_result = Mock()
    fake_result.scalar_one_or_none.return_value = None
    db.execute.return_value = fake_result

    await ensure_unique_full_name(
        db=db,
        full_name="Ana Popescu",
        exclude_user_id=1,
    )

    db.execute.assert_called_once()


@pytest.mark.asyncio
async def test_ensure_shift_is_available_excludes_current_user():
    db = AsyncMock()

    fake_result = Mock()
    fake_result.scalar_one_or_none.return_value = None
    db.execute.return_value = fake_result

    await ensure_shift_is_available(
        db=db,
        shift_number="2",
        exclude_user_id=1,
    )

    db.execute.assert_called_once()
