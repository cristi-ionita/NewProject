from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    unique_code: str
    pin: str


class LoginResponse(BaseModel):
    user_id: int
    full_name: str
    shift_number: str | None = None
    unique_code: str


class ActiveSessionResponse(BaseModel):
    has_active_session: bool
    assignment_id: int | None = None
    vehicle_id: int | None = None
    license_plate: str | None = None
    brand: str | None = None
    model: str | None = None
    started_at: datetime | None = None
    status: str | None = None


class StartSessionRequest(BaseModel):
    code: str
    license_plate: str


class StartSessionResponse(BaseModel):
    assignment_id: int
    user_id: int
    user_name: str
    vehicle_id: int
    license_plate: str
    started_at: datetime
    status: str

    model_config = ConfigDict(from_attributes=True)


class EndSessionRequest(BaseModel):
    code: str


class EndSessionResponse(BaseModel):
    assignment_id: int
    user_id: int
    vehicle_id: int
    ended_at: datetime
    status: str