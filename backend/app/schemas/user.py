from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ORMBaseSchema(BaseSchema):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


class UserCreateRequestSchema(BaseSchema):
    full_name: str = Field(..., min_length=1, max_length=150)
    shift_number: str | None = Field(default=None, max_length=20)
    pin: str = Field(..., min_length=4, max_length=4)
    role: str = Field(default="employee", min_length=1, max_length=20)

    @field_validator("full_name", mode="before")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        cleaned = " ".join(value.strip().split())
        if not cleaned:
            raise ValueError("Numele este obligatoriu.")
        return cleaned

    @field_validator("shift_number", mode="before")
    @classmethod
    def validate_shift_number(cls, value: str | None) -> str | None:
        if value is None:
            return None

        cleaned = value.strip()
        return cleaned or None

    @field_validator("pin", mode="before")
    @classmethod
    def validate_pin(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) != 4 or not cleaned.isdigit():
            raise ValueError("PIN-ul trebuie să fie format din 4 cifre.")
        return cleaned

    @field_validator("role", mode="before")
    @classmethod
    def validate_role(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if cleaned not in {"employee", "mechanic"}:
            raise ValueError("Rol invalid.")
        return cleaned

    @model_validator(mode="after")
    def validate_shift_for_role(self):
        if self.role != "mechanic" and not self.shift_number:
            raise ValueError("Numărul de tură este obligatoriu.")
        return self


class UserUpdateRequestSchema(BaseSchema):
    full_name: str = Field(..., min_length=1, max_length=150)
    shift_number: str | None = Field(default=None, max_length=20)
    pin: str | None = Field(default=None, min_length=4, max_length=4)
    is_active: bool | None = None
    role: str = Field(default="employee", min_length=1, max_length=20)

    @field_validator("full_name", mode="before")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        cleaned = " ".join(value.strip().split())
        if not cleaned:
            raise ValueError("Numele este obligatoriu.")
        return cleaned

    @field_validator("shift_number", mode="before")
    @classmethod
    def validate_shift_number(cls, value: str | None) -> str | None:
        if value is None:
            return None

        cleaned = value.strip()
        return cleaned or None

    @field_validator("pin", mode="before")
    @classmethod
    def validate_pin(cls, value: str | None) -> str | None:
        if value is None:
            return None

        cleaned = value.strip()
        if len(cleaned) != 4 or not cleaned.isdigit():
            raise ValueError("PIN-ul trebuie să fie format din 4 cifre.")
        return cleaned

    @field_validator("role", mode="before")
    @classmethod
    def validate_role(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if cleaned not in {"employee", "mechanic"}:
            raise ValueError("Rol invalid.")
        return cleaned

    @model_validator(mode="after")
    def validate_shift_for_role(self):
        if self.role != "mechanic" and not self.shift_number:
            raise ValueError("Numărul de tură este obligatoriu.")
        return self


class UserReadSchema(ORMBaseSchema):
    id: int
    full_name: str
    shift_number: str | None = None
    unique_code: str
    is_active: bool
    role: str