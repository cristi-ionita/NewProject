from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class VehicleAssignmentCreateRequestSchema(BaseSchema):
    user_id: int
    vehicle_id: int


class VehicleAssignmentReadSchema(BaseSchema):
    id: int
    user_id: int
    user_name: str
    vehicle_id: int
    vehicle_license_plate: str
    vehicle_brand: str
    vehicle_model: str
    status: str
    started_at: datetime
    ended_at: datetime | None = None


class VehicleAssignmentListResponseSchema(BaseSchema):
    assignments: list[VehicleAssignmentReadSchema]


class VehicleAssignmentCloseResponseSchema(BaseSchema):
    id: int
    status: str
    ended_at: datetime