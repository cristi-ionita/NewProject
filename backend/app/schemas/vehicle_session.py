from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CurrentSessionSchema(BaseSchema):
    assignment_id: int
    status: str
    started_at: datetime


class CurrentSessionUserSchema(BaseSchema):
    id: int
    full_name: str
    unique_code: str


class CurrentSessionVehicleSchema(BaseSchema):
    id: int
    brand: str
    model: str
    license_plate: str
    year: int
    status: str
    current_mileage: int


class PreviousHandoverReportSchema(BaseSchema):
    assignment_id: int
    previous_driver_name: str
    previous_session_started_at: datetime
    previous_session_ended_at: datetime | None = None


class CurrentHandoverStartSchema(BaseSchema):
    mileage_start: int | None = None
    dashboard_warnings_start: str | None = None
    damage_notes_start: str | None = None
    notes_start: str | None = None

    has_documents: bool = False
    has_medkit: bool = False
    has_extinguisher: bool = False
    has_warning_triangle: bool = False
    has_spare_wheel: bool = False

    is_completed: bool = False


class CurrentHandoverEndSchema(BaseSchema):
    mileage_end: int | None = None
    dashboard_warnings_end: str | None = None
    damage_notes_end: str | None = None
    notes_end: str | None = None
    is_completed: bool = False


class VehicleSessionPageResponseSchema(BaseSchema):
    session: CurrentSessionSchema
    user: CurrentSessionUserSchema
    vehicle: CurrentSessionVehicleSchema
    previous_handover_report: PreviousHandoverReportSchema | None = None
    handover_start: CurrentHandoverStartSchema | None = None
    handover_end: CurrentHandoverEndSchema | None = None


class SessionAccessQuerySchema(BaseSchema):
    user_code: str = Field(..., min_length=1, max_length=50)