from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        from_attributes=True,
    )


class LoginRequestSchema(BaseSchema):
    identifier: str = Field(..., min_length=1, max_length=50)
    pin: str = Field(..., min_length=4, max_length=4)

    @field_validator("identifier", mode="before")
    @classmethod
    def validate_identifier(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("User is required.")
        return cleaned

    @field_validator("pin", mode="before")
    @classmethod
    def validate_pin(cls, value: str) -> str:
        cleaned = value.strip()

        if not cleaned:
            raise ValueError("PIN is required.")

        if len(cleaned) != 4:
            raise ValueError("PIN must be exactly 4 digits.")

        if not cleaned.isdigit():
            raise ValueError("PIN must contain only digits.")

        return cleaned


class LoginResponseSchema(BaseSchema):
    user_id: int
    full_name: str
    shift_number: str | None = None
    unique_code: str
    role: str


class ActiveSessionResponseSchema(BaseSchema):
    has_active_session: bool
    assignment_id: int | None = None
    vehicle_id: int | None = None
    license_plate: str | None = None
    brand: str | None = None
    model: str | None = None
    started_at: datetime | None = None
    status: str | None = None


class StartSessionRequestSchema(BaseSchema):
    license_plate: str = Field(..., min_length=1, max_length=20)

    @field_validator("license_plate", mode="before")
    @classmethod
    def validate_license_plate(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("License plate is required.")
        return cleaned


class StartSessionResponseSchema(BaseSchema):
    assignment_id: int
    user_id: int
    user_name: str
    vehicle_id: int
    license_plate: str
    started_at: datetime
    status: str


class EndSessionRequestSchema(BaseSchema):
    pass


class EndSessionResponseSchema(BaseSchema):
    assignment_id: int
    user_id: int
    vehicle_id: int
    ended_at: datetime
    status: str