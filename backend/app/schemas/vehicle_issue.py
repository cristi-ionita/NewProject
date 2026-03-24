from datetime import datetime

from pydantic import BaseModel, Field


class VehicleIssueCreateRequest(BaseModel):
    user_code: str
    assignment_id: int
    need_service_in_km: int | None = Field(default=None, ge=0)
    need_brakes: bool = False
    need_tires: bool = False
    need_oil: bool = False
    dashboard_checks: str | None = None
    other_problems: str | None = None


class VehicleIssueCreateResponse(BaseModel):
    id: int
    vehicle_id: int
    assignment_id: int | None
    reported_by_user_id: int
    need_service_in_km: int | None
    need_brakes: bool
    need_tires: bool
    need_oil: bool
    dashboard_checks: str | None
    other_problems: str | None
    status: str
    created_at: datetime