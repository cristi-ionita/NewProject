from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        from_attributes=True,
    )


class VehicleIssueCreateRequestSchema(BaseSchema):
    assignment_id: int

    need_service_in_km: int | None = Field(default=None, ge=0)
    need_brakes: bool = False
    need_tires: bool = False
    need_oil: bool = False

    dashboard_checks: str | None = None
    other_problems: str | None = None

    @field_validator("dashboard_checks", "other_problems")
    @classmethod
    def clean_text_fields(cls, value: str | None) -> str | None:
        if value is None:
            return value

        cleaned = value.strip()
        return cleaned or None


class VehicleIssueUpdateRequestSchema(BaseSchema):
    status: str | None = None
    scheduled_for: datetime | None = None
    scheduled_location: str | None = Field(default=None, max_length=255)

    @field_validator("status", "scheduled_location")
    @classmethod
    def clean_optional_text_fields(cls, value: str | None) -> str | None:
        if value is None:
            return value

        cleaned = value.strip()
        return cleaned or None


class VehicleIssueCreateResponseSchema(BaseSchema):
    id: int
    vehicle_id: int
    assignment_id: int | None = None
    reported_by_user_id: int

    need_service_in_km: int | None = None
    need_brakes: bool
    need_tires: bool
    need_oil: bool

    dashboard_checks: str | None = None
    other_problems: str | None = None

    status: str
    assigned_mechanic_id: int | None = None
    scheduled_for: datetime | None = None
    scheduled_location: str | None = None

    created_at: datetime


class VehicleIssueListItemSchema(BaseSchema):
    id: int
    vehicle_id: int
    assignment_id: int | None = None
    reported_by_user_id: int

    need_service_in_km: int | None = None
    need_brakes: bool
    need_tires: bool
    need_oil: bool

    dashboard_checks: str | None = None
    other_problems: str | None = None

    status: str
    assigned_mechanic_id: int | None = None
    scheduled_for: datetime | None = None
    scheduled_location: str | None = None

    created_at: datetime
    updated_at: datetime