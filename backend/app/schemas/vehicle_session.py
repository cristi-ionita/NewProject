from datetime import datetime

from pydantic import BaseModel


class PreviousHandoverReportSchema(BaseModel):
    assignment_id: int
    previous_driver_name: str
    previous_session_started_at: datetime
    previous_session_ended_at: datetime | None = None


class CurrentSessionVehicleSchema(BaseModel):
    id: int
    brand: str
    model: str
    license_plate: str
    year: int
    status: str
    current_mileage: int


class CurrentSessionUserSchema(BaseModel):
    id: int
    full_name: str
    unique_code: str


class CurrentSessionSchema(BaseModel):
    assignment_id: int
    status: str
    started_at: datetime


class VehicleSessionPageResponse(BaseModel):
    session: CurrentSessionSchema
    user: CurrentSessionUserSchema
    vehicle: CurrentSessionVehicleSchema
    previous_handover_report: PreviousHandoverReportSchema | None = None