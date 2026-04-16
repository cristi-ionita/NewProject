from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        from_attributes=True,
    )


class LeaveRequestCreateSchema(BaseSchema):
    start_date: date
    end_date: date
    reason: str | None = None

    @field_validator("reason")
    @classmethod
    def clean_reason(cls, value: str | None) -> str | None:
        if value is None:
            return None

        cleaned = value.strip()
        return cleaned or None

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, value: date, info):
        start_date = info.data.get("start_date")
        if start_date and value < start_date:
            raise ValueError("End date must be after or equal to start date.")
        return value


class LeaveRequestReviewSchema(BaseSchema):
    status: str = Field(..., min_length=1)

    @field_validator("status")
    @classmethod
    def normalize_status(cls, value: str) -> str:
        cleaned = value.strip().lower()

        allowed = {"pending", "approved", "rejected"}
        if cleaned not in allowed:
            raise ValueError("Status must be one of: pending, approved, rejected.")

        return cleaned


class LeaveRequestItemSchema(BaseSchema):
    id: int
    user_id: int
    user_name: str
    user_code: str | None = None
    start_date: date
    end_date: date
    reason: str | None = None
    status: str
    reviewed_by_admin_id: int | None = None
    reviewed_at: datetime | None = None
    created_at: datetime


class LeaveRequestListResponseSchema(BaseSchema):
    requests: list[LeaveRequestItemSchema]


class LeaveRequestCreateResponseSchema(BaseSchema):
    id: int
    user_id: int
    start_date: date
    end_date: date
    reason: str | None = None
    status: str
    created_at: datetime


class LeaveRequestReviewResponseSchema(BaseSchema):
    id: int
    status: str
    reviewed_by_admin_id: int | None = None
    reviewed_at: datetime | None = None