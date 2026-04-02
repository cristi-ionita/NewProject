from datetime import UTC, date, datetime
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.schemas.employee_profile import (
    EmployeeProfileBaseSchema,
    EmployeeProfileCreateSchema,
    EmployeeProfileReadSchema,
    EmployeeProfileUpdateSchema,
)


def test_employee_profile_base_schema_valid():
    obj = EmployeeProfileBaseSchema(
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


def test_employee_profile_base_schema_required_fields():
    with pytest.raises(ValidationError):
        EmployeeProfileBaseSchema(
            last_name="Popescu",
        )

    with pytest.raises(ValidationError):
        EmployeeProfileBaseSchema(
            first_name="Ana",
        )


def test_employee_profile_base_schema_first_name_too_short():
    with pytest.raises(ValidationError):
        EmployeeProfileBaseSchema(
            first_name="",
            last_name="Popescu",
        )


def test_employee_profile_base_schema_last_name_too_short():
    with pytest.raises(ValidationError):
        EmployeeProfileBaseSchema(
            first_name="Ana",
            last_name="",
        )


def test_employee_profile_base_schema_first_name_too_long():
    with pytest.raises(ValidationError):
        EmployeeProfileBaseSchema(
            first_name="A" * 101,
            last_name="Popescu",
        )


def test_employee_profile_base_schema_last_name_too_long():
    with pytest.raises(ValidationError):
        EmployeeProfileBaseSchema(
            first_name="Ana",
            last_name="P" * 101,
        )


def test_employee_profile_base_schema_optional_fields_lengths():
    with pytest.raises(ValidationError):
        EmployeeProfileBaseSchema(
            first_name="Ana",
            last_name="Popescu",
            phone="1" * 31,
        )

    with pytest.raises(ValidationError):
        EmployeeProfileBaseSchema(
            first_name="Ana",
            last_name="Popescu",
            address="A" * 256,
        )

    with pytest.raises(ValidationError):
        EmployeeProfileBaseSchema(
            first_name="Ana",
            last_name="Popescu",
            position="P" * 101,
        )

    with pytest.raises(ValidationError):
        EmployeeProfileBaseSchema(
            first_name="Ana",
            last_name="Popescu",
            department="D" * 101,
        )

    with pytest.raises(ValidationError):
        EmployeeProfileBaseSchema(
            first_name="Ana",
            last_name="Popescu",
            iban="I" * 65,
        )

    with pytest.raises(ValidationError):
        EmployeeProfileBaseSchema(
            first_name="Ana",
            last_name="Popescu",
            emergency_contact_name="N" * 101,
        )

    with pytest.raises(ValidationError):
        EmployeeProfileBaseSchema(
            first_name="Ana",
            last_name="Popescu",
            emergency_contact_phone="1" * 31,
        )


def test_employee_profile_base_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        EmployeeProfileBaseSchema(
            first_name="Ana",
            last_name="Popescu",
            extra_field="boom",
        )


def test_employee_profile_create_schema_valid():
    obj = EmployeeProfileCreateSchema(
        user_id=1,
        first_name="Ana",
        last_name="Popescu",
        phone="0711111111",
        address="Bucuresti",
    )

    assert obj.user_id == 1
    assert obj.first_name == "Ana"
    assert obj.last_name == "Popescu"
    assert obj.phone == "0711111111"
    assert obj.address == "Bucuresti"


def test_employee_profile_create_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        EmployeeProfileCreateSchema(
            user_id=1,
            first_name="Ana",
            last_name="Popescu",
            extra_field="boom",
        )


def test_employee_profile_update_schema_all_optional():
    obj = EmployeeProfileUpdateSchema()

    assert obj.first_name is None
    assert obj.last_name is None
    assert obj.phone is None
    assert obj.address is None
    assert obj.position is None
    assert obj.department is None
    assert obj.hire_date is None
    assert obj.iban is None
    assert obj.emergency_contact_name is None
    assert obj.emergency_contact_phone is None
    assert obj.username is None
    assert obj.pin is None


def test_employee_profile_update_schema_valid():
    obj = EmployeeProfileUpdateSchema(
        first_name="Elena",
        last_name="Ionescu",
        phone="0799999999",
        address="Cluj",
        position="Manager",
        department="HR",
        hire_date=date(2023, 5, 5),
        iban="RO11BANK0000000000000000",
        emergency_contact_name="Ion",
        emergency_contact_phone="0700000000",
        username="elena123",
        pin="1234",
    )

    assert obj.first_name == "Elena"
    assert obj.last_name == "Ionescu"
    assert obj.phone == "0799999999"
    assert obj.address == "Cluj"
    assert obj.position == "Manager"
    assert obj.department == "HR"
    assert obj.hire_date == date(2023, 5, 5)
    assert obj.iban == "RO11BANK0000000000000000"
    assert obj.emergency_contact_name == "Ion"
    assert obj.emergency_contact_phone == "0700000000"
    assert obj.username == "elena123"
    assert obj.pin == "1234"


def test_employee_profile_update_schema_username_length():
    with pytest.raises(ValidationError):
        EmployeeProfileUpdateSchema(username="ab")

    with pytest.raises(ValidationError):
        EmployeeProfileUpdateSchema(username="a" * 51)


def test_employee_profile_update_schema_pin_length():
    with pytest.raises(ValidationError):
        EmployeeProfileUpdateSchema(pin="123")

    with pytest.raises(ValidationError):
        EmployeeProfileUpdateSchema(pin="12345")


def test_employee_profile_update_schema_optional_fields_lengths():
    with pytest.raises(ValidationError):
        EmployeeProfileUpdateSchema(first_name="A" * 101)

    with pytest.raises(ValidationError):
        EmployeeProfileUpdateSchema(last_name="B" * 101)

    with pytest.raises(ValidationError):
        EmployeeProfileUpdateSchema(phone="1" * 31)

    with pytest.raises(ValidationError):
        EmployeeProfileUpdateSchema(address="A" * 256)

    with pytest.raises(ValidationError):
        EmployeeProfileUpdateSchema(position="P" * 101)

    with pytest.raises(ValidationError):
        EmployeeProfileUpdateSchema(department="D" * 101)

    with pytest.raises(ValidationError):
        EmployeeProfileUpdateSchema(iban="I" * 65)

    with pytest.raises(ValidationError):
        EmployeeProfileUpdateSchema(emergency_contact_name="N" * 101)

    with pytest.raises(ValidationError):
        EmployeeProfileUpdateSchema(emergency_contact_phone="1" * 31)


def test_employee_profile_update_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        EmployeeProfileUpdateSchema(
            first_name="Ana",
            extra_field="boom",
        )


def test_employee_profile_read_schema_valid():
    created_at = datetime.now(UTC)
    updated_at = datetime.now(UTC)

    obj = EmployeeProfileReadSchema(
        id=10,
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
        created_at=created_at,
        updated_at=updated_at,
    )

    assert obj.id == 10
    assert obj.user_id == 1
    assert obj.first_name == "Ana"
    assert obj.last_name == "Popescu"
    assert obj.created_at == created_at
    assert obj.updated_at == updated_at


def test_employee_profile_read_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        EmployeeProfileReadSchema(
            id=10,
            user_id=1,
            first_name="Ana",
            last_name="Popescu",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            extra_field="boom",
        )


def test_employee_profile_read_schema_model_validate_from_attributes():
    source = SimpleNamespace(
        id=10,
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
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    result = EmployeeProfileReadSchema.model_validate(source)

    assert result.id == 10
    assert result.user_id == 1
    assert result.first_name == "Ana"
    assert result.last_name == "Popescu"
