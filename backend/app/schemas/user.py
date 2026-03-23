from pydantic import BaseModel, ConfigDict


class UserCreateRequest(BaseModel):
    full_name: str
    shift_number: str
    pin: str


class UserUpdateRequest(BaseModel):
    full_name: str
    shift_number: str
    pin: str | None = None
    is_active: bool = True


class UserResponse(BaseModel):
    id: int
    full_name: str
    shift_number: str | None = None
    unique_code: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)