from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.schemas.vehicle import (
    VehicleCreateSchema,
    VehicleReadSchema,
    VehicleStatus,
    VehicleUpdateSchema,
)


def now_utc():
    return datetime.now(UTC)


# ================= CREATE =================


def test_vehicle_create_schema_valid_minimal():
    obj = VehicleCreateSchema(
        brand="Dacia",
        model="Logan",
        license_plate="B123ABC",
        year=2020,
    )

    assert obj.brand == "Dacia"
    assert obj.model == "Logan"
    assert obj.license_plate == "B123ABC"
    assert obj.year == 2020
    assert obj.vin is None
    assert obj.status == VehicleStatus.ACTIVE
    assert obj.current_mileage == 0


def test_vehicle_create_schema_valid_full():
    obj = VehicleCreateSchema(
        brand="Ford",
        model="Focus",
        license_plate="CJ99XYZ",
        year=2022,
        vin="WDB123456789",
        status=VehicleStatus.IN_SERVICE,
        current_mileage=123456,
    )

    assert obj.brand == "Ford"
    assert obj.model == "Focus"
    assert obj.license_plate == "CJ99XYZ"
    assert obj.year == 2022
    assert obj.vin == "WDB123456789"
    assert obj.status == VehicleStatus.IN_SERVICE
    assert obj.current_mileage == 123456


def test_vehicle_create_schema_required_fields():
    with pytest.raises(ValidationError):
        VehicleCreateSchema(
            model="Logan",
            license_plate="B123ABC",
            year=2020,
        )

    with pytest.raises(ValidationError):
        VehicleCreateSchema(
            brand="Dacia",
            license_plate="B123ABC",
            year=2020,
        )

    with pytest.raises(ValidationError):
        VehicleCreateSchema(
            brand="Dacia",
            model="Logan",
            year=2020,
        )

    with pytest.raises(ValidationError):
        VehicleCreateSchema(
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
        )


def test_vehicle_create_schema_invalid_string_lengths():
    with pytest.raises(ValidationError):
        VehicleCreateSchema(
            brand="",
            model="Logan",
            license_plate="B123ABC",
            year=2020,
        )

    with pytest.raises(ValidationError):
        VehicleCreateSchema(
            brand="Dacia",
            model="",
            license_plate="B123ABC",
            year=2020,
        )

    with pytest.raises(ValidationError):
        VehicleCreateSchema(
            brand="Dacia",
            model="Logan",
            license_plate="",
            year=2020,
        )

    with pytest.raises(ValidationError):
        VehicleCreateSchema(
            brand="a" * 101,
            model="Logan",
            license_plate="B123ABC",
            year=2020,
        )

    with pytest.raises(ValidationError):
        VehicleCreateSchema(
            brand="Dacia",
            model="a" * 101,
            license_plate="B123ABC",
            year=2020,
        )

    with pytest.raises(ValidationError):
        VehicleCreateSchema(
            brand="Dacia",
            model="Logan",
            license_plate="a" * 21,
            year=2020,
        )

    with pytest.raises(ValidationError):
        VehicleCreateSchema(
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2020,
            vin="a" * 51,
        )


def test_vehicle_create_schema_invalid_year():
    with pytest.raises(ValidationError):
        VehicleCreateSchema(
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=1899,
        )

    with pytest.raises(ValidationError):
        VehicleCreateSchema(
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2101,
        )


def test_vehicle_create_schema_invalid_current_mileage():
    with pytest.raises(ValidationError):
        VehicleCreateSchema(
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2020,
            current_mileage=-1,
        )


def test_vehicle_create_schema_invalid_status():
    with pytest.raises(ValidationError):
        VehicleCreateSchema(
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2020,
            status="broken",
        )


def test_vehicle_create_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        VehicleCreateSchema(
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2020,
            extra_field="boom",
        )


# ================= UPDATE =================


def test_vehicle_update_schema_valid_empty():
    obj = VehicleUpdateSchema()

    assert obj.brand is None
    assert obj.model is None
    assert obj.license_plate is None
    assert obj.year is None
    assert obj.vin is None
    assert obj.status is None
    assert obj.current_mileage is None


def test_vehicle_update_schema_valid_full():
    obj = VehicleUpdateSchema(
        brand="Ford",
        model="Focus",
        license_plate="CJ99XYZ",
        year=2022,
        vin="WDB123456789",
        status=VehicleStatus.INACTIVE,
        current_mileage=99999,
    )

    assert obj.brand == "Ford"
    assert obj.model == "Focus"
    assert obj.license_plate == "CJ99XYZ"
    assert obj.year == 2022
    assert obj.vin == "WDB123456789"
    assert obj.status == VehicleStatus.INACTIVE
    assert obj.current_mileage == 99999


def test_vehicle_update_schema_accepts_partial_fields():
    obj = VehicleUpdateSchema(
        status=VehicleStatus.SOLD,
    )

    assert obj.status == VehicleStatus.SOLD
    assert obj.brand is None
    assert obj.model is None
    assert obj.license_plate is None
    assert obj.year is None
    assert obj.vin is None
    assert obj.current_mileage is None


def test_vehicle_update_schema_invalid_string_lengths():
    with pytest.raises(ValidationError):
        VehicleUpdateSchema(brand="")

    with pytest.raises(ValidationError):
        VehicleUpdateSchema(model="")

    with pytest.raises(ValidationError):
        VehicleUpdateSchema(license_plate="")

    with pytest.raises(ValidationError):
        VehicleUpdateSchema(brand="a" * 101)

    with pytest.raises(ValidationError):
        VehicleUpdateSchema(model="a" * 101)

    with pytest.raises(ValidationError):
        VehicleUpdateSchema(license_plate="a" * 21)

    with pytest.raises(ValidationError):
        VehicleUpdateSchema(vin="a" * 51)


def test_vehicle_update_schema_invalid_year():
    with pytest.raises(ValidationError):
        VehicleUpdateSchema(year=1899)

    with pytest.raises(ValidationError):
        VehicleUpdateSchema(year=2101)


def test_vehicle_update_schema_invalid_current_mileage():
    with pytest.raises(ValidationError):
        VehicleUpdateSchema(current_mileage=-1)


def test_vehicle_update_schema_invalid_status():
    with pytest.raises(ValidationError):
        VehicleUpdateSchema(status="broken")


def test_vehicle_update_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        VehicleUpdateSchema(
            status=VehicleStatus.ACTIVE,
            extra_field="boom",
        )


# ================= READ =================


def test_vehicle_read_schema_valid():
    created_at = now_utc()
    updated_at = now_utc()

    obj = VehicleReadSchema(
        id=1,
        brand="Dacia",
        model="Logan",
        license_plate="B123ABC",
        year=2020,
        vin="WDB123456789",
        status=VehicleStatus.ACTIVE,
        current_mileage=15000,
        created_at=created_at,
        updated_at=updated_at,
    )

    assert obj.id == 1
    assert obj.brand == "Dacia"
    assert obj.model == "Logan"
    assert obj.license_plate == "B123ABC"
    assert obj.year == 2020
    assert obj.vin == "WDB123456789"
    assert obj.status == VehicleStatus.ACTIVE
    assert obj.current_mileage == 15000
    assert obj.created_at == created_at
    assert obj.updated_at == updated_at


def test_vehicle_read_schema_defaults_from_base():
    created_at = now_utc()
    updated_at = now_utc()

    obj = VehicleReadSchema(
        id=1,
        brand="Dacia",
        model="Logan",
        license_plate="B123ABC",
        year=2020,
        created_at=created_at,
        updated_at=updated_at,
    )

    assert obj.vin is None
    assert obj.status == VehicleStatus.ACTIVE
    assert obj.current_mileage == 0


def test_vehicle_read_schema_required_fields():
    created_at = now_utc()
    updated_at = now_utc()

    with pytest.raises(ValidationError):
        VehicleReadSchema(
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2020,
            created_at=created_at,
            updated_at=updated_at,
        )

    with pytest.raises(ValidationError):
        VehicleReadSchema(
            id=1,
            model="Logan",
            license_plate="B123ABC",
            year=2020,
            created_at=created_at,
            updated_at=updated_at,
        )

    with pytest.raises(ValidationError):
        VehicleReadSchema(
            id=1,
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2020,
            updated_at=updated_at,
        )


def test_vehicle_read_schema_invalid_types():
    created_at = now_utc()
    updated_at = now_utc()

    with pytest.raises(ValidationError):
        VehicleReadSchema(
            id="bad",
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2020,
            created_at=created_at,
            updated_at=updated_at,
        )

    with pytest.raises(ValidationError):
        VehicleReadSchema(
            id=1,
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2020,
            created_at="not-a-date",
            updated_at=updated_at,
        )

    with pytest.raises(ValidationError):
        VehicleReadSchema(
            id=1,
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2020,
            created_at=created_at,
            updated_at="not-a-date",
        )


def test_vehicle_read_schema_extra_forbidden():
    created_at = now_utc()
    updated_at = now_utc()

    with pytest.raises(ValidationError):
        VehicleReadSchema(
            id=1,
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2020,
            created_at=created_at,
            updated_at=updated_at,
            extra_field="boom",
        )
