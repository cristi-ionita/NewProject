from pydantic import BaseModel, ConfigDict, Field, field_validator


MAX_REALISTIC_MILEAGE = 5_000_000


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class HandoverStartRequestSchema(BaseSchema):
    user_code: str = Field(..., min_length=1, max_length=50)
    mileage_start: int = Field(..., ge=0, le=MAX_REALISTIC_MILEAGE)
    dashboard_warnings_start: str = Field(..., min_length=1)
    damage_notes_start: str = Field(..., min_length=1)
    notes_start: str = Field(..., min_length=1)
    has_documents: bool
    has_medkit: bool
    has_extinguisher: bool
    has_warning_triangle: bool
    has_spare_wheel: bool

    @field_validator(
        "user_code",
        "dashboard_warnings_start",
        "damage_notes_start",
        "notes_start",
    )
    @classmethod
    def validate_non_empty_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Câmp obligatoriu.")
        return cleaned


class HandoverStartResponseSchema(BaseSchema):
    assignment_id: int
    mileage_start: int
    dashboard_warnings_start: str
    damage_notes_start: str
    notes_start: str
    has_documents: bool
    has_medkit: bool
    has_extinguisher: bool
    has_warning_triangle: bool
    has_spare_wheel: bool


class HandoverEndRequestSchema(BaseSchema):
    user_code: str = Field(..., min_length=1, max_length=50)
    mileage_end: int = Field(..., ge=0, le=MAX_REALISTIC_MILEAGE)
    dashboard_warnings_end: str = Field(..., min_length=1)
    damage_notes_end: str = Field(..., min_length=1)
    notes_end: str = Field(..., min_length=1)

    @field_validator(
        "user_code",
        "dashboard_warnings_end",
        "damage_notes_end",
        "notes_end",
    )
    @classmethod
    def validate_non_empty_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Câmp obligatoriu.")
        return cleaned


class HandoverEndResponseSchema(BaseSchema):
    assignment_id: int
    mileage_end: int
    dashboard_warnings_end: str
    damage_notes_end: str
    notes_end: str