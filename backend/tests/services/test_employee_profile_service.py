from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from app.services.employee_profile_service import EmployeeProfileService


class FakeScalarResult:
    def __init__(self, item):
        self._item = item

    def scalar_one_or_none(self):
        return self._item


def make_user(
    user_id=1,
    username="ana.popescu",
):
    return SimpleNamespace(
        id=user_id,
        username=username,
    )


def make_profile(
    user_id=1,
    first_name="Ana",
    last_name="Popescu",
):
    return SimpleNamespace(
        id=10,
        user_id=user_id,
        first_name=first_name,
        last_name=last_name,
        phone="0711111111",
        address="Bucuresti",
        position="Driver",
        department="Transport",
        hire_date=date(2024, 1, 10),
        iban="RO49AAAA1B31007593840000",
        emergency_contact_name="Maria",
        emergency_contact_phone="0722222222",
    )


def make_create_payload(
    user_id=1,
    first_name="Ana",
    last_name="Popescu",
    phone="0711111111",
    address="Bucuresti",
    position="Driver",
    department="Transport",
    hire_date=date(2024, 1, 10),
    iban="RO49AAAA1B31007593840000",
    emergency_contact_name="Maria",
    emergency_contact_phone="0722222222",
):
    return SimpleNamespace(
        user_id=user_id,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        address=address,
        position=position,
        department=department,
        hire_date=hire_date,
        iban=iban,
        emergency_contact_name=emergency_contact_name,
        emergency_contact_phone=emergency_contact_phone,
    )


def make_update_payload(data: dict):
    return SimpleNamespace(
        model_dump=lambda exclude_unset=True: data
    )


@pytest.mark.asyncio
async def test_get_by_user_id_returns_profile():
    profile = make_profile(user_id=1)

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(profile)

    result = await EmployeeProfileService.get_by_user_id(db, 1)

    assert result == profile


@pytest.mark.asyncio
async def test_get_by_user_id_returns_none():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    result = await EmployeeProfileService.get_by_user_id(db, 1)

    assert result is None


@pytest.mark.asyncio
async def test_ensure_user_exists_returns_user():
    user = make_user(user_id=1)

    db = AsyncMock()
    db.get.return_value = user

    result = await EmployeeProfileService.ensure_user_exists(db, 1)

    assert result == user


@pytest.mark.asyncio
async def test_ensure_user_exists_raises():
    db = AsyncMock()
    db.get.return_value = None

    with pytest.raises(ValueError) as exc:
        await EmployeeProfileService.ensure_user_exists(db, 1)

    assert str(exc.value) == "User not found."


@pytest.mark.asyncio
async def test_ensure_username_available_ok_when_no_user_found():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    result = await EmployeeProfileService.ensure_username_available(
        db,
        "new.username",
        1,
    )

    assert result is None


@pytest.mark.asyncio
async def test_ensure_username_available_ok_when_same_user():
    existing_user = make_user(user_id=1, username="same.username")

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(existing_user)

    result = await EmployeeProfileService.ensure_username_available(
        db,
        "same.username",
        1,
    )

    assert result is None


@pytest.mark.asyncio
async def test_ensure_username_available_raises():
    existing_user = make_user(user_id=2, username="taken.username")

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(existing_user)

    with pytest.raises(ValueError) as exc:
        await EmployeeProfileService.ensure_username_available(
            db,
            "taken.username",
            1,
        )

    assert str(exc.value) == "Username already in use."


@pytest.mark.asyncio
async def test_create_success(monkeypatch):
    payload = make_create_payload()

    monkeypatch.setattr(
        "app.services.employee_profile_service.EmployeeProfileService.ensure_user_exists",
        AsyncMock(return_value=make_user(user_id=1)),
    )
    monkeypatch.setattr(
        "app.services.employee_profile_service.EmployeeProfileService.get_by_user_id",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.services.employee_profile_service.EmployeeProfile",
        lambda **kwargs: SimpleNamespace(**kwargs),
    )

    db = AsyncMock()
    db.add = Mock()

    async def refresh_side_effect(profile):
        profile.id = 10

    db.refresh.side_effect = refresh_side_effect

    result = await EmployeeProfileService.create(db, payload)

    assert result.id == 10
    assert result.user_id == 1
    assert result.first_name == "Ana"
    assert result.last_name == "Popescu"
    assert result.phone == "0711111111"
    assert result.address == "Bucuresti"
    assert result.position == "Driver"
    assert result.department == "Transport"
    assert result.hire_date == date(2024, 1, 10)
    assert result.iban == "RO49AAAA1B31007593840000"
    assert result.emergency_contact_name == "Maria"
    assert result.emergency_contact_phone == "0722222222"

    db.add.assert_called_once()
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_raises_when_profile_already_exists(monkeypatch):
    payload = make_create_payload()
    existing_profile = make_profile(user_id=1)

    monkeypatch.setattr(
        "app.services.employee_profile_service.EmployeeProfileService.ensure_user_exists",
        AsyncMock(return_value=make_user(user_id=1)),
    )
    monkeypatch.setattr(
        "app.services.employee_profile_service.EmployeeProfileService.get_by_user_id",
        AsyncMock(return_value=existing_profile),
    )

    db = AsyncMock()

    with pytest.raises(ValueError) as exc:
        await EmployeeProfileService.create(db, payload)

    assert str(exc.value) == "Employee profile already exists for this user."


@pytest.mark.asyncio
async def test_create_rolls_back_on_commit_error(monkeypatch):
    payload = make_create_payload()

    monkeypatch.setattr(
        "app.services.employee_profile_service.EmployeeProfileService.ensure_user_exists",
        AsyncMock(return_value=make_user(user_id=1)),
    )
    monkeypatch.setattr(
        "app.services.employee_profile_service.EmployeeProfileService.get_by_user_id",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.services.employee_profile_service.EmployeeProfile",
        lambda **kwargs: SimpleNamespace(**kwargs),
    )

    db = AsyncMock()
    db.add = Mock()
    db.commit.side_effect = Exception("db failure")

    with pytest.raises(Exception) as exc:
        await EmployeeProfileService.create(db, payload)

    assert str(exc.value) == "db failure"
    db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_profile_fields_only():
    profile = make_profile(user_id=1)
    payload = make_update_payload({
        "first_name": "Elena",
        "phone": "0799999999",
    })

    db = AsyncMock()

    async def refresh_side_effect(obj):
        return None

    db.refresh.side_effect = refresh_side_effect

    result = await EmployeeProfileService.update(db, profile, payload)

    assert result == profile
    assert profile.first_name == "Elena"
    assert profile.phone == "0799999999"
    assert profile.last_name == "Popescu"

    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(profile)


@pytest.mark.asyncio
async def test_update_with_username_success(monkeypatch):
    profile = make_profile(user_id=1)
    user = make_user(user_id=1, username="old.username")
    payload = make_update_payload({
        "username": "  new.username  ",
        "first_name": "Elena",
    })

    monkeypatch.setattr(
        "app.services.employee_profile_service.EmployeeProfileService.ensure_username_available",
        AsyncMock(return_value=None),
    )

    db = AsyncMock()
    db.get.return_value = user

    result = await EmployeeProfileService.update(db, profile, payload)

    assert result == profile
    assert profile.first_name == "Elena"
    assert user.username == "new.username"

    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(profile)


@pytest.mark.asyncio
async def test_update_with_username_blank_sets_none():
    profile = make_profile(user_id=1)
    user = make_user(user_id=1, username="old.username")
    payload = make_update_payload({
        "username": "   ",
    })

    db = AsyncMock()
    db.get.return_value = user

    result = await EmployeeProfileService.update(db, profile, payload)

    assert result == profile
    assert user.username is None

    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(profile)


@pytest.mark.asyncio
async def test_update_with_username_user_missing_raises():
    profile = make_profile(user_id=1)
    payload = make_update_payload({
        "username": "new.username",
    })

    db = AsyncMock()
    db.get.return_value = None

    with pytest.raises(ValueError) as exc:
        await EmployeeProfileService.update(db, profile, payload)

    assert str(exc.value) == "User not found."


@pytest.mark.asyncio
async def test_update_rolls_back_on_commit_error():
    profile = make_profile(user_id=1)
    payload = make_update_payload({
        "first_name": "Elena",
    })

    db = AsyncMock()
    db.commit.side_effect = Exception("db failure")

    with pytest.raises(Exception) as exc:
        await EmployeeProfileService.update(db, profile, payload)

    assert str(exc.value) == "db failure"
    db.rollback.assert_awaited_once()