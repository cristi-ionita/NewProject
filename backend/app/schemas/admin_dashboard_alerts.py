from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DashboardUserAlertSchema(BaseSchema):
    user_id: int
    full_name: str
    unique_code: str
    shift_number: str | None = None
    is_active: bool


class DashboardVehicleIssueAlertSchema(BaseSchema):
    vehicle_id: int
    license_plate: str
    brand: str
    model: str
    open_issues_count: int
    in_progress_issues_count: int
    latest_issue_created_at: datetime | None = None


class DashboardOccupiedVehicleSchema(BaseSchema):
    assignment_id: int
    vehicle_id: int
    license_plate: str
    brand: str
    model: str
    user_id: int
    user_name: str
    started_at: datetime


class UsersWithoutProfileResponse(BaseSchema):
    users: list[DashboardUserAlertSchema]


class UsersWithoutContractResponse(BaseSchema):
    users: list[DashboardUserAlertSchema]


class UsersWithoutDriverLicenseResponse(BaseSchema):
    users: list[DashboardUserAlertSchema]


class VehiclesWithOpenIssuesResponse(BaseSchema):
    vehicles: list[DashboardVehicleIssueAlertSchema]


class OccupiedVehiclesResponse(BaseSchema):
    vehicles: list[DashboardOccupiedVehicleSchema]