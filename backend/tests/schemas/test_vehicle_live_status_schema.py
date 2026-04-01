from pydantic import ValidationError
import pytest

from app.schemas.vehicle_live_status import (
    VehicleLiveStatusItemSchema,
    VehicleLiveStatusResponseSchema,
)


# ================= ITEM =================

def test_vehicle_live_status_item_schema_valid_minimal_assignment():
    obj = VehicleLiveStatusItemSchema(
        vehicle_id=1,
        brand="Dacia",
        model="Logan",
        license_plate="B123ABC",
        year=2020,
        vehicle_status="active",
        availability="available",
    )

    assert obj.vehicle_id == 1
    assert obj.brand == "Dacia"
    assert obj.model == "Logan"
    assert obj.license_plate == "B123ABC"
    assert obj.year == 2020
    assert obj.vehicle_status == "active"
    assert obj.availability == "available"
    assert obj.assigned_to_user_id is None
    assert obj.assigned_to_name is None
    assert obj.assigned_to_shift_number is None
    assert obj.active_assignment_id is None


def test_vehicle_live_status_item_schema_valid_full_assignment():
    obj = VehicleLiveStatusItemSchema(
        vehicle_id=2,
        brand="Ford",
        model="Focus",
        license_plate="CJ99XYZ",
        year=2022,
        vehicle_status="in_service",
        availability="assigned",
        assigned_to_user_id=10,
        assigned_to_name="Ana Popescu",
        assigned_to_shift_number="2",
        active_assignment_id=100,
    )

    assert obj.vehicle_id == 2
    assert obj.brand == "Ford"
    assert obj.model == "Focus"
    assert obj.license_plate == "CJ99XYZ"
    assert obj.year == 2022
    assert obj.vehicle_status == "in_service"
    assert obj.availability == "assigned"
    assert obj.assigned_to_user_id == 10
    assert obj.assigned_to_name == "Ana Popescu"
    assert obj.assigned_to_shift_number == "2"
    assert obj.active_assignment_id == 100


def test_vehicle_live_status_item_schema_required_fields():
    with pytest.raises(ValidationError):
        VehicleLiveStatusItemSchema(
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2020,
            vehicle_status="active",
            availability="available",
        )

    with pytest.raises(ValidationError):
        VehicleLiveStatusItemSchema(
            vehicle_id=1,
            model="Logan",
            license_plate="B123ABC",
            year=2020,
            vehicle_status="active",
            availability="available",
        )

    with pytest.raises(ValidationError):
        VehicleLiveStatusItemSchema(
            vehicle_id=1,
            brand="Dacia",
            license_plate="B123ABC",
            year=2020,
            vehicle_status="active",
            availability="available",
        )


def test_vehicle_live_status_item_schema_invalid_types():
    with pytest.raises(ValidationError):
        VehicleLiveStatusItemSchema(
            vehicle_id="bad",
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2020,
            vehicle_status="active",
            availability="available",
        )

    with pytest.raises(ValidationError):
        VehicleLiveStatusItemSchema(
            vehicle_id=1,
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year="bad",
            vehicle_status="active",
            availability="available",
        )

    with pytest.raises(ValidationError):
        VehicleLiveStatusItemSchema(
            vehicle_id=1,
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2020,
            vehicle_status="active",
            availability="available",
            assigned_to_user_id="bad",
        )

    with pytest.raises(ValidationError):
        VehicleLiveStatusItemSchema(
            vehicle_id=1,
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2020,
            vehicle_status="active",
            availability="available",
            active_assignment_id="bad",
        )


def test_vehicle_live_status_item_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        VehicleLiveStatusItemSchema(
            vehicle_id=1,
            brand="Dacia",
            model="Logan",
            license_plate="B123ABC",
            year=2020,
            vehicle_status="active",
            availability="available",
            extra_field="boom",
        )


# ================= RESPONSE =================

def test_vehicle_live_status_response_schema_valid():
    response = VehicleLiveStatusResponseSchema(
        vehicles=[
            VehicleLiveStatusItemSchema(
                vehicle_id=1,
                brand="Dacia",
                model="Logan",
                license_plate="B123ABC",
                year=2020,
                vehicle_status="active",
                availability="available",
            ),
            VehicleLiveStatusItemSchema(
                vehicle_id=2,
                brand="Ford",
                model="Focus",
                license_plate="CJ99XYZ",
                year=2022,
                vehicle_status="in_service",
                availability="assigned",
                assigned_to_user_id=10,
                assigned_to_name="Ana Popescu",
                assigned_to_shift_number="2",
                active_assignment_id=100,
            ),
        ]
    )

    assert len(response.vehicles) == 2
    assert response.vehicles[0].vehicle_id == 1
    assert response.vehicles[0].brand == "Dacia"
    assert response.vehicles[1].vehicle_id == 2
    assert response.vehicles[1].assigned_to_name == "Ana Popescu"


def test_vehicle_live_status_response_schema_empty():
    response = VehicleLiveStatusResponseSchema(vehicles=[])

    assert response.vehicles == []


def test_vehicle_live_status_response_schema_invalid_item():
    with pytest.raises(ValidationError):
        VehicleLiveStatusResponseSchema(
            vehicles=[
                {
                    "vehicle_id": "bad",
                    "brand": "Dacia",
                    "model": "Logan",
                    "license_plate": "B123ABC",
                    "year": 2020,
                    "vehicle_status": "active",
                    "availability": "available",
                }
            ]
        )


def test_vehicle_live_status_response_schema_required_fields():
    with pytest.raises(ValidationError):
        VehicleLiveStatusResponseSchema()


def test_vehicle_live_status_response_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        VehicleLiveStatusResponseSchema(
            vehicles=[],
            extra_field="boom",
        )