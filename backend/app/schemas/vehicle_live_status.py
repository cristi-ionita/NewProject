from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class VehicleLiveStatusItemSchema(BaseSchema):
    vehicle_id: int
    brand: str
    model: str
    license_plate: str
    year: int
    vehicle_status: str
    availability: str

    assigned_to_user_id: int | None = None
    assigned_to_name: str | None = None
    assigned_to_shift_number: str | None = None
    active_assignment_id: int | None = None


class VehicleLiveStatusResponseSchema(BaseSchema):
    vehicles: list[VehicleLiveStatusItemSchema]