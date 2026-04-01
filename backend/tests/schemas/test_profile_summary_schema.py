from datetime import date, datetime, timezone
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.schemas.profile_summary import (
    ProfileDocumentsSummarySchema,
    ProfileEmployeeInfoSchema,
    ProfileSummaryResponseSchema,
    ProfileUserInfoSchema,
)


def test_profile_user_info_schema_valid():
    obj = ProfileUserInfoSchema(
        id=1,
        full_name="Ana Popescu",
        unique_code="EMP001",
        username="ana.popescu",
        shift_number="2",
        is_active=True,
    )

    assert obj.id == 1
    assert obj.full_name == "Ana Popescu"
    assert obj.unique_code == "EMP001"
    assert obj.username == "ana.popescu"
    assert obj.shift_number == "2"
    assert obj.is_active is True


def test_profile_user_info_schema_optional_fields():
    obj = ProfileUserInfoSchema(
        id=1,
        full_name="Ana Popescu",
        unique_code="EMP001",
        username=None,
        shift_number=None,
        is_active=True,
    )

    assert obj.username is None
    assert obj.shift_number is None


def test_profile_user_info_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        ProfileUserInfoSchema(
            id=1,
            full_name="Ana Popescu",
            unique_code="EMP001",
            is_active=True,
            extra_field="boom",
        )


def test_profile_user_info_schema_model_validate_from_attributes():
    source = SimpleNamespace(
        id=1,
        full_name="Ana Popescu",
        unique_code="EMP001",
        username="ana.popescu",
        shift_number="2",
        is_active=True,
    )

    result = ProfileUserInfoSchema.model_validate(source)

    assert result.id == 1
    assert result.full_name == "Ana Popescu"
    assert result.unique_code == "EMP001"
    assert result.username == "ana.popescu"
    assert result.shift_number == "2"
    assert result.is_active is True


def test_profile_employee_info_schema_valid():
    created_at = datetime.now(timezone.utc)
    updated_at = datetime.now(timezone.utc)

    obj = ProfileEmployeeInfoSchema(
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
        created_at=created_at,
        updated_at=updated_at,
    )

    assert obj.first_name == "Ana"
    assert obj.last_name == "Popescu"
    assert obj.phone == "0711111111"
    assert obj.address == "Bucuresti"
    assert obj.position == "Driver"
    assert obj.department == "Transport"
    assert obj.hire_date == date(2024, 1, 10)
    assert obj.iban == "RO49AAAA1B31007593840000"
    assert obj.emergency_contact_name == "Maria"
    assert obj.emergency_contact_phone == "0722222222"
    assert obj.created_at == created_at
    assert obj.updated_at == updated_at


def test_profile_employee_info_schema_optional_fields():
    created_at = datetime.now(timezone.utc)
    updated_at = datetime.now(timezone.utc)

    obj = ProfileEmployeeInfoSchema(
        first_name="Ana",
        last_name="Popescu",
        phone=None,
        address=None,
        position=None,
        department=None,
        hire_date=None,
        iban=None,
        emergency_contact_name=None,
        emergency_contact_phone=None,
        created_at=created_at,
        updated_at=updated_at,
    )

    assert obj.phone is None
    assert obj.address is None
    assert obj.position is None
    assert obj.department is None
    assert obj.hire_date is None
    assert obj.iban is None
    assert obj.emergency_contact_name is None
    assert obj.emergency_contact_phone is None
    assert obj.created_at == created_at
    assert obj.updated_at == updated_at


def test_profile_employee_info_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        ProfileEmployeeInfoSchema(
            first_name="Ana",
            last_name="Popescu",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            extra_field="boom",
        )


def test_profile_employee_info_schema_model_validate_from_attributes():
    source = SimpleNamespace(
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
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    result = ProfileEmployeeInfoSchema.model_validate(source)

    assert result.first_name == "Ana"
    assert result.last_name == "Popescu"
    assert result.phone == "0711111111"
    assert result.address == "Bucuresti"
    assert result.position == "Driver"
    assert result.department == "Transport"


def test_profile_documents_summary_schema_valid():
    obj = ProfileDocumentsSummarySchema(
        total_documents=5,
        personal_documents=3,
        company_documents=2,
        has_contract=True,
        has_payslip=False,
        has_driver_license=True,
    )

    assert obj.total_documents == 5
    assert obj.personal_documents == 3
    assert obj.company_documents == 2
    assert obj.has_contract is True
    assert obj.has_payslip is False
    assert obj.has_driver_license is True


def test_profile_documents_summary_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        ProfileDocumentsSummarySchema(
            total_documents=5,
            personal_documents=3,
            company_documents=2,
            has_contract=True,
            has_payslip=False,
            has_driver_license=True,
            extra_field="boom",
        )


def test_profile_summary_response_schema_valid_with_profile():
    created_at = datetime.now(timezone.utc)
    updated_at = datetime.now(timezone.utc)

    obj = ProfileSummaryResponseSchema(
        user=ProfileUserInfoSchema(
            id=1,
            full_name="Ana Popescu",
            unique_code="EMP001",
            username="ana.popescu",
            shift_number="2",
            is_active=True,
        ),
        employee_profile=ProfileEmployeeInfoSchema(
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
            created_at=created_at,
            updated_at=updated_at,
        ),
        documents_summary=ProfileDocumentsSummarySchema(
            total_documents=5,
            personal_documents=3,
            company_documents=2,
            has_contract=True,
            has_payslip=False,
            has_driver_license=True,
        ),
    )

    assert obj.user.id == 1
    assert obj.employee_profile is not None
    assert obj.employee_profile.first_name == "Ana"
    assert obj.documents_summary.total_documents == 5
    assert obj.documents_summary.has_driver_license is True


def test_profile_summary_response_schema_valid_without_profile():
    obj = ProfileSummaryResponseSchema(
        user=ProfileUserInfoSchema(
            id=1,
            full_name="Ana Popescu",
            unique_code="EMP001",
            username=None,
            shift_number=None,
            is_active=True,
        ),
        employee_profile=None,
        documents_summary=ProfileDocumentsSummarySchema(
            total_documents=0,
            personal_documents=0,
            company_documents=0,
            has_contract=False,
            has_payslip=False,
            has_driver_license=False,
        ),
    )

    assert obj.user.id == 1
    assert obj.employee_profile is None
    assert obj.documents_summary.total_documents == 0


def test_profile_summary_response_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        ProfileSummaryResponseSchema(
            user=ProfileUserInfoSchema(
                id=1,
                full_name="Ana Popescu",
                unique_code="EMP001",
                username=None,
                shift_number=None,
                is_active=True,
            ),
            employee_profile=None,
            documents_summary=ProfileDocumentsSummarySchema(
                total_documents=0,
                personal_documents=0,
                company_documents=0,
                has_contract=False,
                has_payslip=False,
                has_driver_license=False,
            ),
            extra_field="boom",
        )