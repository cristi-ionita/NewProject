from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ORMBaseSchema(BaseSchema):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


class VehicleStatus(str, Enum):
    ACTIVE = "active"
    IN_SERVICE = "in_service"
    INACTIVE = "inactive"
    SOLD = "sold"


class VehicleBaseSchema(BaseSchema):
    brand: str = Field(
        ...,
        min_length=1,
        max_length=100,
        json_schema_extra={"example": "Dacia"},
    )
    model: str = Field(
        ...,
        min_length=1,
        max_length=100,
        json_schema_extra={"example": "Logan"},
    )
    license_plate: str = Field(
        ...,
        min_length=1,
        max_length=20,
        json_schema_extra={"example": "B123ABC"},
    )
    year: int = Field(
        ...,
        ge=1900,
        le=2100,
        json_schema_extra={"example": 2020},
    )
    vin: str | None = Field(
        default=None,
        max_length=50,
        json_schema_extra={"example": "WDB123456789"},
    )
    status: VehicleStatus = VehicleStatus.ACTIVE
    current_mileage: int = Field(
        default=0,
        ge=0,
        json_schema_extra={"example": 15000},
    )


class VehicleCreateSchema(VehicleBaseSchema):
    pass


class VehicleUpdateSchema(BaseSchema):
    brand: str | None = Field(default=None, min_length=1, max_length=100)
    model: str | None = Field(default=None, min_length=1, max_length=100)
    license_plate: str | None = Field(default=None, min_length=1, max_length=20)
    year: int | None = Field(default=None, ge=1900, le=2100)
    vin: str | None = Field(default=None, max_length=50)
    status: VehicleStatus | None = None
    current_mileage: int | None = Field(default=None, ge=0)


class VehicleReadSchema(VehicleBaseSchema, ORMBaseSchema):
    id: int
    created_at: datetime
    updated_at: datetime
