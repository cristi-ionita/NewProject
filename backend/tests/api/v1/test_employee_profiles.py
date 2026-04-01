from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.employee_profiles import (
    create_employee_profile,
    ensure_user_is_active,
    get_employee_profile_by_user_id,
    get_employee_profile_or_404,
    get_profile_summary_for_admin,
    get_profile_summary_for_user,
    update_employee_profile,
    update_my_employee_profile,
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
    pin_hash="old_hash",
):
    return SimpleNamespace(
        id=user_id,
        unique_code=unique_code,
        is_active=is_active,
        pin_hash=pin_hash,
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


def make_profile_schema_response(profile):
    return SimpleNamespace(
        id=profile.id,
        user_id=profile.user_id,
        first_name=profile.first_name,
        last_name=profile.last_name,
        phone=profile.phone,
        address=profile.address,
        position=profile.position,
        department=profile.department,
        hire_date=profile.hire_date,
        iban=profile.iban,
        emergency_contact_name=profile.emergency_contact_name,
        emergency_contact_phone=profile.emergency_contact_phone,
    )


def make_summary(user=None):
    if user is None:
        user = make_user()
    return SimpleNamespace(user=user)


@pytest.mark.asyncio
async def test_get_employee_profile_or_404_returns_profile(monkeypatch):
    profile = make_profile()

    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.EmployeeProfileService.get_by_user_id",
        AsyncMock(return_value=profile),
    )

    db = AsyncMock()
    result = await get_employee_profile_or_404(db, 1)

    assert result == profile


@pytest.mark.asyncio
async def test_get_employee_profile_or_404_not_found(monkeypatch):
    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.EmployeeProfileService.get_by_user_id",
        AsyncMock(return_value=None),
    )

    db = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await get_employee_profile_or_404(db, 1)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Employee profile not found."


def test_ensure_user_is_active_ok():
    summary = make_summary(user=make_user(is_active=True))
    ensure_user_is_active(summary)


def test_ensure_user_is_active_raises():
    summary = make_summary(user=make_user(is_active=False))

    with pytest.raises(HTTPException) as exc:
        ensure_user_is_active(summary)

    assert exc.value.status_code == 403
    assert exc.value.detail == "User inactiv."


@pytest.mark.asyncio
async def test_create_employee_profile_success(monkeypatch):
    profile = make_profile()

    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.EmployeeProfileService.create",
        AsyncMock(return_value=profile),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.EmployeeProfileReadSchema.model_validate",
        lambda p: make_profile_schema_response(p),
    )

    payload = SimpleNamespace()

    db = AsyncMock()
    result = await create_employee_profile(payload=payload, db=db, _=True)

    assert result.user_id == 1
    assert result.first_name == "Ana"
    assert result.last_name == "Popescu"


@pytest.mark.asyncio
async def test_create_employee_profile_value_error(monkeypatch):
    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.EmployeeProfileService.create",
        AsyncMock(side_effect=ValueError("bad payload")),
    )

    payload = SimpleNamespace()
    db = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await create_employee_profile(payload=payload, db=db, _=True)

    assert exc.value.status_code == 400
    assert exc.value.detail == "bad payload"


@pytest.mark.asyncio
async def test_get_employee_profile_by_user_id(monkeypatch):
    profile = make_profile()

    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.get_employee_profile_or_404",
        AsyncMock(return_value=profile),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.EmployeeProfileReadSchema.model_validate",
        lambda p: make_profile_schema_response(p),
    )

    db = AsyncMock()
    result = await get_employee_profile_by_user_id(user_id=1, db=db, _=True)

    assert result.user_id == 1
    assert result.first_name == "Ana"


@pytest.mark.asyncio
async def test_update_employee_profile_user_not_found(monkeypatch):
    profile = make_profile()

    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.get_employee_profile_or_404",
        AsyncMock(return_value=profile),
    )

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    payload = SimpleNamespace(model_dump=lambda exclude_unset=True: {})

    with pytest.raises(HTTPException) as exc:
        await update_employee_profile(user_id=1, payload=payload, db=db, _=True)

    assert exc.value.status_code == 404
    assert exc.value.detail == "User not found."


@pytest.mark.asyncio
async def test_update_employee_profile_duplicate_username(monkeypatch):
    profile = make_profile()
    user = make_user(user_id=1, unique_code="EMP001")
    existing_user = make_user(user_id=2, unique_code="NEWCODE")

    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.get_employee_profile_or_404",
        AsyncMock(return_value=profile),
    )

    db = AsyncMock()
    db.execute.side_effect = [
        FakeScalarResult(user),
        FakeScalarResult(existing_user),
    ]

    payload = SimpleNamespace(
        model_dump=lambda exclude_unset=True: {"username": " NEWCODE "}
    )

    with pytest.raises(HTTPException) as exc:
        await update_employee_profile(user_id=1, payload=payload, db=db, _=True)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Acest username este deja folosit."


@pytest.mark.asyncio
async def test_update_employee_profile_invalid_pin(monkeypatch):
    profile = make_profile()
    user = make_user(user_id=1)

    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.get_employee_profile_or_404",
        AsyncMock(return_value=profile),
    )

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(user)

    payload = SimpleNamespace(
        model_dump=lambda exclude_unset=True: {"pin": "12ab"}
    )

    with pytest.raises(HTTPException) as exc:
        await update_employee_profile(user_id=1, payload=payload, db=db, _=True)

    assert exc.value.status_code == 400
    assert exc.value.detail == "PIN-ul trebuie să fie format din 4 cifre."


@pytest.mark.asyncio
async def test_update_employee_profile_success(monkeypatch):
    profile = make_profile()
    updated_profile = make_profile(first_name="Elena")
    user = make_user(user_id=1, unique_code="EMP001")

    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.get_employee_profile_or_404",
        AsyncMock(return_value=profile),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.EmployeeProfileService.update",
        AsyncMock(return_value=updated_profile),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.hash_pin",
        lambda pin: f"hashed-{pin}",
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.EmployeeProfileReadSchema.model_validate",
        lambda p: make_profile_schema_response(p),
    )

    db = AsyncMock()
    db.execute.side_effect = [
        FakeScalarResult(user),
        FakeScalarResult(None),
    ]

    payload = SimpleNamespace(
        model_dump=lambda exclude_unset=True: {
            "username": " NEW001 ",
            "pin": "1234",
            "first_name": "Elena",
        }
    )

    result = await update_employee_profile(user_id=1, payload=payload, db=db, _=True)

    assert user.unique_code == "NEW001"
    assert user.pin_hash == "hashed-1234"
    assert result.first_name == "Elena"
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(updated_profile)


@pytest.mark.asyncio
async def test_update_my_employee_profile_inactive_user(monkeypatch):
    user = make_user(user_id=1, is_active=False)

    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )

    db = AsyncMock()
    payload = SimpleNamespace(model_dump=lambda exclude_unset=True: {})

    with pytest.raises(HTTPException) as exc:
        await update_my_employee_profile(code="EMP001", payload=payload, db=db)

    assert exc.value.status_code == 403
    assert exc.value.detail == "User inactiv."


@pytest.mark.asyncio
async def test_update_my_employee_profile_empty_username(monkeypatch):
    user = make_user(user_id=1, is_active=True)

    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )

    db = AsyncMock()
    payload = SimpleNamespace(
        model_dump=lambda exclude_unset=True: {"username": "   "}
    )

    with pytest.raises(HTTPException) as exc:
        await update_my_employee_profile(code="EMP001", payload=payload, db=db)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Username-ul este obligatoriu."


@pytest.mark.asyncio
async def test_update_my_employee_profile_duplicate_username(monkeypatch):
    user = make_user(user_id=1, is_active=True)
    existing_user = make_user(user_id=2, unique_code="USED")

    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(existing_user)

    payload = SimpleNamespace(
        model_dump=lambda exclude_unset=True: {"username": "USED"}
    )

    with pytest.raises(HTTPException) as exc:
        await update_my_employee_profile(code="EMP001", payload=payload, db=db)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Acest username este deja folosit."


@pytest.mark.asyncio
async def test_update_my_employee_profile_invalid_pin(monkeypatch):
    user = make_user(user_id=1, is_active=True)

    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )

    db = AsyncMock()
    payload = SimpleNamespace(
        model_dump=lambda exclude_unset=True: {"pin": "12"}
    )

    with pytest.raises(HTTPException) as exc:
        await update_my_employee_profile(code="EMP001", payload=payload, db=db)

    assert exc.value.status_code == 400
    assert exc.value.detail == "PIN-ul trebuie să fie format din 4 cifre."


@pytest.mark.asyncio
async def test_update_my_employee_profile_first_fill_requires_names(monkeypatch):
    user = make_user(user_id=1, is_active=True)

    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.EmployeeProfileService.get_by_user_id",
        AsyncMock(return_value=None),
    )

    db = AsyncMock()
    payload = SimpleNamespace(
        model_dump=lambda exclude_unset=True: {
            "phone": "0711111111",
            "first_name": "   ",
            "last_name": "",
        }
    )

    with pytest.raises(HTTPException) as exc:
        await update_my_employee_profile(code="EMP001", payload=payload, db=db)

    assert exc.value.status_code == 400
    assert "prenumele și numele sunt obligatorii" in exc.value.detail


@pytest.mark.asyncio
async def test_update_my_employee_profile_creates_profile(monkeypatch):
    user = make_user(user_id=1, is_active=True)

    create_mock = AsyncMock()
    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.EmployeeProfileService.get_by_user_id",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.EmployeeProfileService.create",
        create_mock,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.hash_pin",
        lambda pin: f"hashed-{pin}",
    )

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    payload = SimpleNamespace(
        model_dump=lambda exclude_unset=True: {
            "username": "NEW001",
            "pin": "1234",
            "first_name": "Ana",
            "last_name": "Popescu",
            "phone": "0711111111",
        }
    )

    response = await update_my_employee_profile(code="EMP001", payload=payload, db=db)

    assert response.status_code == 204
    assert user.unique_code == "NEW001"
    assert user.pin_hash == "hashed-1234"
    create_mock.assert_awaited_once()
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_my_employee_profile_updates_existing_profile(monkeypatch):
    user = make_user(user_id=1, is_active=True)
    profile = make_profile()

    update_mock = AsyncMock()

    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.EmployeeProfileService.get_by_user_id",
        AsyncMock(return_value=profile),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.EmployeeProfileService.update",
        update_mock,
    )

    db = AsyncMock()
    payload = SimpleNamespace(
        model_dump=lambda exclude_unset=True: {
            "phone": "0799999999",
        }
    )

    response = await update_my_employee_profile(code="EMP001", payload=payload, db=db)

    assert response.status_code == 204
    update_mock.assert_awaited_once_with(db, profile, payload)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_profile_summary_for_admin_not_found(monkeypatch):
    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.ProfileSummaryService.get_by_user_id",
        AsyncMock(return_value=None),
    )

    db = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await get_profile_summary_for_admin(user_id=1, db=db, _=True)

    assert exc.value.status_code == 404
    assert exc.value.detail == "User not found."


@pytest.mark.asyncio
async def test_get_profile_summary_for_admin_success(monkeypatch):
    summary = make_summary()

    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.ProfileSummaryService.get_by_user_id",
        AsyncMock(return_value=summary),
    )

    db = AsyncMock()
    result = await get_profile_summary_for_admin(user_id=1, db=db, _=True)

    assert result == summary


@pytest.mark.asyncio
async def test_get_profile_summary_for_user_not_found(monkeypatch):
    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.ProfileSummaryService.get_by_unique_code",
        AsyncMock(return_value=None),
    )

    db = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await get_profile_summary_for_user(code="EMP001", db=db)

    assert exc.value.status_code == 404
    assert exc.value.detail == "User not found."


@pytest.mark.asyncio
async def test_get_profile_summary_for_user_inactive(monkeypatch):
    summary = make_summary(user=make_user(is_active=False))

    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.ProfileSummaryService.get_by_unique_code",
        AsyncMock(return_value=summary),
    )

    db = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await get_profile_summary_for_user(code="EMP001", db=db)

    assert exc.value.status_code == 403
    assert exc.value.detail == "User inactiv."


@pytest.mark.asyncio
async def test_get_profile_summary_for_user_success(monkeypatch):
    summary = make_summary(user=make_user(is_active=True))

    monkeypatch.setattr(
        "app.api.v1.endpoints.employee_profiles.ProfileSummaryService.get_by_unique_code",
        AsyncMock(return_value=summary),
    )

    db = AsyncMock()
    result = await get_profile_summary_for_user(code="EMP001", db=db)

    assert result == summary