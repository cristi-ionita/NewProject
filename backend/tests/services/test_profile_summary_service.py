from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.db.models.document import DocumentCategory, DocumentType
from app.services.profile_summary_service import ProfileSummaryService


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
    unique_code="EMP001",
    full_name="Ana Popescu",
    shift_number="1",
    is_active=True,
):
    return SimpleNamespace(
        id=user_id,
        unique_code=unique_code,
        full_name=full_name,
        shift_number=shift_number,
        is_active=is_active,
    )


def make_employee_profile(
    user_id=1,
    first_name="Ana",
    last_name="Popescu",
    phone="0711111111",
    address="Bucuresti",
    position="Driver",
    department="Transport",
    hire_date=None,
    iban="RO49AAAA1B31007593840000",
    emergency_contact_name="Maria",
    emergency_contact_phone="0722222222",
):
    return SimpleNamespace(
        id=10,
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


def make_document(
    user_id=1,
    category=DocumentCategory.PERSONAL,
    doc_type=DocumentType.CONTRACT,
):
    return SimpleNamespace(
        id=1,
        user_id=user_id,
        category=category,
        type=doc_type,
    )


def make_user_schema_response(user):
    return SimpleNamespace(
        id=user.id,
        unique_code=user.unique_code,
        full_name=user.full_name,
        shift_number=user.shift_number,
        is_active=user.is_active,
    )


def make_employee_profile_schema_response(profile):
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


@pytest.mark.asyncio
async def test_get_user_by_id_returns_user():
    user = make_user(user_id=1)

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(user)

    result = await ProfileSummaryService.get_user_by_id(db, 1)

    assert result == user


@pytest.mark.asyncio
async def test_get_user_by_id_returns_none():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    result = await ProfileSummaryService.get_user_by_id(db, 1)

    assert result is None


@pytest.mark.asyncio
async def test_get_user_by_unique_code_returns_user():
    user = make_user(user_id=1, unique_code="EMP001")

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(user)

    result = await ProfileSummaryService.get_user_by_unique_code(db, "EMP001")

    assert result == user


@pytest.mark.asyncio
async def test_get_user_by_unique_code_strips_code():
    user = make_user(user_id=1, unique_code="EMP001")

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(user)

    result = await ProfileSummaryService.get_user_by_unique_code(db, "  EMP001  ")

    assert result == user


@pytest.mark.asyncio
async def test_get_employee_profile_returns_profile():
    profile = make_employee_profile(user_id=1)

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(profile)

    result = await ProfileSummaryService.get_employee_profile(db, 1)

    assert result == profile


@pytest.mark.asyncio
async def test_get_employee_profile_returns_none():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    result = await ProfileSummaryService.get_employee_profile(db, 1)

    assert result is None


@pytest.mark.asyncio
async def test_get_documents_returns_list():
    documents = [
        make_document(user_id=1, category=DocumentCategory.PERSONAL, doc_type=DocumentType.CONTRACT),
        make_document(user_id=1, category=DocumentCategory.COMPANY, doc_type=DocumentType.PAYSLIP),
    ]

    db = AsyncMock()
    db.execute.return_value = FakeResult(documents)

    result = await ProfileSummaryService.get_documents(db, 1)

    assert result == documents
    assert len(result) == 2


def test_build_documents_summary_empty():
    result = ProfileSummaryService.build_documents_summary([])

    assert result.total_documents == 0
    assert result.personal_documents == 0
    assert result.company_documents == 0
    assert result.has_contract is False
    assert result.has_payslip is False
    assert result.has_driver_license is False


def test_build_documents_summary_mixed_documents():
    documents = [
        make_document(user_id=1, category=DocumentCategory.PERSONAL, doc_type=DocumentType.CONTRACT),
        make_document(user_id=1, category=DocumentCategory.COMPANY, doc_type=DocumentType.PAYSLIP),
        make_document(user_id=1, category=DocumentCategory.PERSONAL, doc_type=DocumentType.DRIVER_LICENSE),
    ]

    result = ProfileSummaryService.build_documents_summary(documents)

    assert result.total_documents == 3
    assert result.personal_documents == 2
    assert result.company_documents == 1
    assert result.has_contract is True
    assert result.has_payslip is True
    assert result.has_driver_license is True


@pytest.mark.asyncio
async def test_get_by_user_id_returns_none_when_user_missing(monkeypatch):
    monkeypatch.setattr(
        "app.services.profile_summary_service.ProfileSummaryService.get_user_by_id",
        AsyncMock(return_value=None),
    )

    db = AsyncMock()
    result = await ProfileSummaryService.get_by_user_id(db, 1)

    assert result is None


@pytest.mark.asyncio
async def test_get_by_user_id_with_profile(monkeypatch):
    user = make_user(user_id=1)
    profile = make_employee_profile(user_id=1)
    documents = [
        make_document(user_id=1, category=DocumentCategory.PERSONAL, doc_type=DocumentType.CONTRACT),
        make_document(user_id=1, category=DocumentCategory.COMPANY, doc_type=DocumentType.PAYSLIP),
    ]

    monkeypatch.setattr(
        "app.services.profile_summary_service.ProfileSummaryService.get_user_by_id",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.services.profile_summary_service.ProfileSummaryService.get_employee_profile",
        AsyncMock(return_value=profile),
    )
    monkeypatch.setattr(
        "app.services.profile_summary_service.ProfileSummaryService.get_documents",
        AsyncMock(return_value=documents),
    )
    monkeypatch.setattr(
        "app.services.profile_summary_service.ProfileUserInfoSchema.model_validate",
        lambda u: make_user_schema_response(u),
    )
    monkeypatch.setattr(
        "app.services.profile_summary_service.ProfileEmployeeInfoSchema.model_validate",
        lambda p: make_employee_profile_schema_response(p),
    )
    monkeypatch.setattr(
        "app.services.profile_summary_service.ProfileSummaryResponseSchema",
        lambda **kwargs: SimpleNamespace(**kwargs),
    )

    db = AsyncMock()
    result = await ProfileSummaryService.get_by_user_id(db, 1)

    assert result is not None
    assert result.user.id == 1
    assert result.user.unique_code == "EMP001"
    assert result.employee_profile is not None
    assert result.employee_profile.first_name == "Ana"
    assert result.documents_summary.total_documents == 2
    assert result.documents_summary.personal_documents == 1
    assert result.documents_summary.company_documents == 1
    assert result.documents_summary.has_contract is True
    assert result.documents_summary.has_payslip is True
    assert result.documents_summary.has_driver_license is False


@pytest.mark.asyncio
async def test_get_by_user_id_without_profile(monkeypatch):
    user = make_user(user_id=1)
    documents = [
        make_document(user_id=1, category=DocumentCategory.PERSONAL, doc_type=DocumentType.DRIVER_LICENSE),
    ]

    monkeypatch.setattr(
        "app.services.profile_summary_service.ProfileSummaryService.get_user_by_id",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.services.profile_summary_service.ProfileSummaryService.get_employee_profile",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.services.profile_summary_service.ProfileSummaryService.get_documents",
        AsyncMock(return_value=documents),
    )
    monkeypatch.setattr(
        "app.services.profile_summary_service.ProfileUserInfoSchema.model_validate",
        lambda u: make_user_schema_response(u),
    )
    monkeypatch.setattr(
        "app.services.profile_summary_service.ProfileSummaryResponseSchema",
        lambda **kwargs: SimpleNamespace(**kwargs),
    )

    db = AsyncMock()
    result = await ProfileSummaryService.get_by_user_id(db, 1)

    assert result is not None
    assert result.user.id == 1
    assert result.employee_profile is None
    assert result.documents_summary.total_documents == 1
    assert result.documents_summary.has_driver_license is True


@pytest.mark.asyncio
async def test_get_by_unique_code_returns_none_when_user_missing(monkeypatch):
    monkeypatch.setattr(
        "app.services.profile_summary_service.ProfileSummaryService.get_user_by_unique_code",
        AsyncMock(return_value=None),
    )

    db = AsyncMock()
    result = await ProfileSummaryService.get_by_unique_code(db, "EMP001")

    assert result is None


@pytest.mark.asyncio
async def test_get_by_unique_code_returns_summary(monkeypatch):
    user = make_user(user_id=5, unique_code="EMP005")
    summary = SimpleNamespace(ok=True)

    monkeypatch.setattr(
        "app.services.profile_summary_service.ProfileSummaryService.get_user_by_unique_code",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.services.profile_summary_service.ProfileSummaryService.get_by_user_id",
        AsyncMock(return_value=summary),
    )

    db = AsyncMock()
    result = await ProfileSummaryService.get_by_unique_code(db, "EMP005")

    assert result == summary