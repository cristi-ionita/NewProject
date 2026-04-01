from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ORMBaseSchema(BaseSchema):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


class MyVehicleUserSchema(ORMBaseSchema):
    id: int
    full_name: str
    unique_code: str
    shift_number: str | None = None
    is_active: bool


class MyVehicleVehicleSchema(ORMBaseSchema):
    id: int
    brand: str
    model: str
    license_plate: str
    year: int
    vin: str | None = None
    status: str
    current_mileage: int


class MyVehicleAssignmentSchema(BaseSchema):
    id: int
    status: str
    started_at: datetime
    ended_at: datetime | None = None


class MyVehicleHandoverStartSchema(BaseSchema):
    mileage_start: int | None = None
    dashboard_warnings_start: str | None = None
    damage_notes_start: str | None = None
    notes_start: str | None = None
    has_documents: bool
    has_medkit: bool
    has_extinguisher: bool
    has_warning_triangle: bool
    has_spare_wheel: bool
    is_completed: bool


class MyVehicleHandoverEndSchema(BaseSchema):
    mileage_end: int | None = None
    dashboard_warnings_end: str | None = None
    damage_notes_end: str | None = None
    notes_end: str | None = None
    is_completed: bool


class MyVehicleIssueSchema(BaseSchema):
    id: int
    status: str
    need_service_in_km: int | None = None
    need_brakes: bool
    need_tires: bool
    need_oil: bool
    dashboard_checks: str | None = None
    other_problems: str | None = None
    created_at: datetime
    updated_at: datetime


class MyVehicleResponseSchema(BaseSchema):
    user: MyVehicleUserSchema
    vehicle: MyVehicleVehicleSchema | None = None
    assignment: MyVehicleAssignmentSchema | None = None
    handover_start: MyVehicleHandoverStartSchema | None = None
    handover_end: MyVehicleHandoverEndSchema | None = None
    open_issues: list[MyVehicleIssueSchema]