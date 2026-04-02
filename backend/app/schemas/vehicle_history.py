from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class VehicleHistoryItemSchema(BaseSchema):
    assignment_id: int
    driver_name: str
    started_at: datetime
    ended_at: datetime | None = None

    mileage_start: int | None = None
    mileage_end: int | None = None

    dashboard_warnings_start: str | None = None
    dashboard_warnings_end: str | None = None

    damage_notes_start: str | None = None
    damage_notes_end: str | None = None

    notes_start: str | None = None
    notes_end: str | None = None

    has_documents: bool = False
    has_medkit: bool = False
    has_extinguisher: bool = False
    has_warning_triangle: bool = False
    has_spare_wheel: bool = False


class VehicleHistoryResponseSchema(BaseSchema):
    vehicle_id: int
    history: list[VehicleHistoryItemSchema]
