from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field
from app.schemas.vehicle_history import (
    VehicleHistoryItemSchema,
    VehicleHistoryResponse,
)


class VehicleStatus(str, Enum):
    ACTIVE = "active"
    IN_SERVICE = "in_service"
    INACTIVE = "inactive"
    SOLD = "sold"


class VehicleBase(BaseModel):
    brand: str = Field(
        ...,
        json_schema_extra={"example": "Dacia"},
    )
    model: str = Field(
        ...,
        json_schema_extra={"example": "Logan"},
    )
    license_plate: str = Field(
        ...,
        json_schema_extra={"example": "B123ABC"},
    )
    year: int = Field(
        ...,
        json_schema_extra={"example": 2020},
    )
    vin: str | None = Field(
        default=None,
        json_schema_extra={"example": "WDB123456789"},
    )
    status: VehicleStatus = VehicleStatus.ACTIVE
    current_mileage: int = Field(
        default=0,
        json_schema_extra={"example": 15000},
    )


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    brand: str | None = None
    model: str | None = None
    license_plate: str | None = None
    year: int | None = None
    vin: str | None = None
    status: VehicleStatus | None = None
    current_mileage: int | None = None


class VehicleRead(VehicleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)