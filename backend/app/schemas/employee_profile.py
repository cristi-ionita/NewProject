from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        from_attributes=True,
    )


class EmployeeProfileBaseSchema(BaseSchema):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=30)
    address: str | None = Field(default=None, max_length=255)
    position: str | None = Field(default=None, max_length=100)
    department: str | None = Field(default=None, max_length=100)
    hire_date: date | None = None
    iban: str | None = Field(default=None, max_length=64)
    emergency_contact_name: str | None = Field(default=None, max_length=100)
    emergency_contact_phone: str | None = Field(default=None, max_length=30)


class EmployeeProfileCreateSchema(EmployeeProfileBaseSchema):
    user_id: int


class EmployeeProfileUpdateSchema(BaseSchema):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=30)
    address: str | None = Field(default=None, max_length=255)
    position: str | None = Field(default=None, max_length=100)
    department: str | None = Field(default=None, max_length=100)
    hire_date: date | None = None
    iban: str | None = Field(default=None, max_length=64)
    emergency_contact_name: str | None = Field(default=None, max_length=100)
    emergency_contact_phone: str | None = Field(default=None, max_length=30)
    username: str | None = Field(default=None, min_length=3, max_length=50)
    pin: str | None = Field(default=None, min_length=4, max_length=4)


class EmployeeProfileReadSchema(EmployeeProfileBaseSchema):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime