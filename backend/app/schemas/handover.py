from pydantic import BaseModel


class HandoverStartRequest(BaseModel):
    mileage_start: int | None = None
    dashboard_warnings_start: str | None = None
    damage_notes_start: str | None = None
    notes_start: str | None = None
    has_documents: bool = False
    has_medkit: bool = False
    has_extinguisher: bool = False
    has_warning_triangle: bool = False
    has_spare_wheel: bool = False


class HandoverStartResponse(BaseModel):
    assignment_id: int
    mileage_start: int | None = None
    dashboard_warnings_start: str | None = None
    damage_notes_start: str | None = None
    notes_start: str | None = None
    has_documents: bool
    has_medkit: bool
    has_extinguisher: bool
    has_warning_triangle: bool
    has_spare_wheel: bool

class HandoverEndRequest(BaseModel):
    mileage_end: int | None = None
    dashboard_warnings_end: str | None = None
    damage_notes_end: str | None = None
    notes_end: str | None = None


class HandoverEndResponse(BaseModel):
    assignment_id: int
    mileage_end: int | None = None
    dashboard_warnings_end: str | None = None
    damage_notes_end: str | None = None
    notes_end: str | None = None