from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        from_attributes=True,
    )


class SimpleUserAlertSchema(BaseSchema):
    id: int
    full_name: str
    unique_code: str | None = None


class VehicleIssuesAlertSchema(BaseSchema):
    id: int
    license_plate: str
    brand: str
    model: str
    issues_count: int


class OccupiedVehicleAlertSchema(BaseSchema):
    assignment_id: int
    vehicle: str
    user: str
    started_at: datetime


class UsersWithoutProfileResponse(BaseSchema):
    users: list[SimpleUserAlertSchema]


class UsersWithoutContractResponse(BaseSchema):
    users: list[SimpleUserAlertSchema]


class UsersWithoutDriverLicenseResponse(BaseSchema):
    users: list[SimpleUserAlertSchema]


class VehiclesWithOpenIssuesResponse(BaseSchema):
    vehicles: list[VehicleIssuesAlertSchema]


class OccupiedVehiclesResponse(BaseSchema):
    vehicles: list[OccupiedVehicleAlertSchema]