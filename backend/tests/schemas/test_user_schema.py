from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.schemas.user import (
    UserCreateRequestSchema,
    UserReadSchema,
    UserUpdateRequestSchema,
)


def test_user_create_request_schema_valid():
    obj = UserCreateRequestSchema(
        full_name="Ana Popescu",
        shift_number="2",
        pin="1234",
    )

    assert obj.full_name == "Ana Popescu"
    assert obj.shift_number == "2"
    assert obj.pin == "1234"


def test_user_create_request_schema_normalizes_full_name():
    obj = UserCreateRequestSchema(
        full_name="  ana   popescu  ",
        shift_number="2",
        pin="1234",
    )

    assert obj.full_name == "ana popescu"


def test_user_create_request_schema_strips_shift_number():
    obj = UserCreateRequestSchema(
        full_name="Ana Popescu",
        shift_number="  2  ",
        pin="1234",
    )

    assert obj.shift_number == "2"


def test_user_create_request_schema_strips_pin():
    obj = UserCreateRequestSchema(
        full_name="Ana Popescu",
        shift_number="2",
        pin=" 1234 ",
    )

    assert obj.pin == "1234"


def test_user_create_request_schema_full_name_required():
    with pytest.raises(ValidationError):
        UserCreateRequestSchema(
            full_name="",
            shift_number="2",
            pin="1234",
        )

    with pytest.raises(ValidationError):
        UserCreateRequestSchema(
            full_name="   ",
            shift_number="2",
            pin="1234",
        )


def test_user_create_request_schema_shift_number_required():
    with pytest.raises(ValidationError):
        UserCreateRequestSchema(
            full_name="Ana Popescu",
            shift_number="",
            pin="1234",
        )

    with pytest.raises(ValidationError):
        UserCreateRequestSchema(
            full_name="Ana Popescu",
            shift_number="   ",
            pin="1234",
        )


def test_user_create_request_schema_pin_invalid():
    with pytest.raises(ValidationError):
        UserCreateRequestSchema(
            full_name="Ana Popescu",
            shift_number="2",
            pin="12",
        )

    with pytest.raises(ValidationError):
        UserCreateRequestSchema(
            full_name="Ana Popescu",
            shift_number="2",
            pin="12345",
        )

    with pytest.raises(ValidationError):
        UserCreateRequestSchema(
            full_name="Ana Popescu",
            shift_number="2",
            pin="12ab",
        )


def test_user_create_request_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        UserCreateRequestSchema(
            full_name="Ana Popescu",
            shift_number="2",
            pin="1234",
            extra_field="boom",
        )


def test_user_update_request_schema_valid():
    obj = UserUpdateRequestSchema(
        full_name="Ana Popescu",
        shift_number="2",
        pin="1234",
        is_active=True,
    )

    assert obj.full_name == "Ana Popescu"
    assert obj.shift_number == "2"
    assert obj.pin == "1234"
    assert obj.is_active is True


def test_user_update_request_schema_normalizes_fields():
    obj = UserUpdateRequestSchema(
        full_name="  ana   popescu  ",
        shift_number="  2  ",
        pin=" 1234 ",
        is_active=False,
    )

    assert obj.full_name == "ana popescu"
    assert obj.shift_number == "2"
    assert obj.pin == "1234"
    assert obj.is_active is False


def test_user_update_request_schema_pin_optional():
    obj = UserUpdateRequestSchema(
        full_name="Ana Popescu",
        shift_number="2",
        pin=None,
        is_active=None,
    )

    assert obj.pin is None
    assert obj.is_active is None


def test_user_update_request_schema_required_fields():
    with pytest.raises(ValidationError):
        UserUpdateRequestSchema(
            shift_number="2",
            pin="1234",
        )

    with pytest.raises(ValidationError):
        UserUpdateRequestSchema(
            full_name="Ana Popescu",
            pin="1234",
        )


def test_user_update_request_schema_invalid_full_name():
    with pytest.raises(ValidationError):
        UserUpdateRequestSchema(
            full_name="",
            shift_number="2",
            pin="1234",
        )

    with pytest.raises(ValidationError):
        UserUpdateRequestSchema(
            full_name="   ",
            shift_number="2",
            pin="1234",
        )


def test_user_update_request_schema_invalid_shift_number():
    with pytest.raises(ValidationError):
        UserUpdateRequestSchema(
            full_name="Ana Popescu",
            shift_number="",
            pin="1234",
        )

    with pytest.raises(ValidationError):
        UserUpdateRequestSchema(
            full_name="Ana Popescu",
            shift_number="   ",
            pin="1234",
        )


def test_user_update_request_schema_invalid_pin():
    with pytest.raises(ValidationError):
        UserUpdateRequestSchema(
            full_name="Ana Popescu",
            shift_number="2",
            pin="12",
        )

    with pytest.raises(ValidationError):
        UserUpdateRequestSchema(
            full_name="Ana Popescu",
            shift_number="2",
            pin="12345",
        )

    with pytest.raises(ValidationError):
        UserUpdateRequestSchema(
            full_name="Ana Popescu",
            shift_number="2",
            pin="12ab",
        )


def test_user_update_request_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        UserUpdateRequestSchema(
            full_name="Ana Popescu",
            shift_number="2",
            pin="1234",
            extra_field="boom",
        )


def test_user_read_schema_valid():
    obj = UserReadSchema(
        id=1,
        full_name="Ana Popescu",
        shift_number="2",
        unique_code="EMP001",
        is_active=True,
    )

    assert obj.id == 1
    assert obj.full_name == "Ana Popescu"
    assert obj.shift_number == "2"
    assert obj.unique_code == "EMP001"
    assert obj.is_active is True


def test_user_read_schema_shift_number_optional():
    obj = UserReadSchema(
        id=1,
        full_name="Ana Popescu",
        shift_number=None,
        unique_code="EMP001",
        is_active=True,
    )

    assert obj.shift_number is None


def test_user_read_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        UserReadSchema(
            id=1,
            full_name="Ana Popescu",
            shift_number="2",
            unique_code="EMP001",
            is_active=True,
            extra_field="boom",
        )


def test_user_read_schema_model_validate_from_attributes():
    source = SimpleNamespace(
        id=1,
        full_name="Ana Popescu",
        shift_number="2",
        unique_code="EMP001",
        is_active=True,
    )

    result = UserReadSchema.model_validate(source)

    assert result.id == 1
    assert result.full_name == "Ana Popescu"
    assert result.shift_number == "2"
    assert result.unique_code == "EMP001"
    assert result.is_active is True





def test_user_create_schema_allows_none_shift_for_mechanic():
    obj = UserCreateRequestSchema(
        full_name="Ana Popescu",
        shift_number=None,
        pin="1234",
        role="mechanic",
    )

    assert obj.shift_number is None
    assert obj.role == "mechanic"


def test_user_create_schema_invalid_role():
    with pytest.raises(ValidationError) as exc:
        UserCreateRequestSchema(
            full_name="Ana Popescu",
            shift_number="2",
            pin="1234",
            role="admin",
        )

    assert "Rol invalid." in str(exc.value)


def test_user_update_schema_allows_none_shift_for_mechanic():
    obj = UserUpdateRequestSchema(
        full_name="Ana Popescu",
        shift_number=None,
        pin=None,
        is_active=True,
        role="mechanic",
    )

    assert obj.shift_number is None
    assert obj.role == "mechanic"


def test_user_update_schema_invalid_role():
    with pytest.raises(ValidationError) as exc:
        UserUpdateRequestSchema(
            full_name="Ana Popescu",
            shift_number="2",
            pin=None,
            is_active=True,
            role="admin",
        )

    assert "Rol invalid." in str(exc.value)