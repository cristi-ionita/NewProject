from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ORMBaseSchema(BaseSchema):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


class ProfileUserInfoSchema(ORMBaseSchema):
    id: int
    full_name: str
    unique_code: str
    username: str | None = None
    shift_number: str | None = None
    is_active: bool


class ProfileEmployeeInfoSchema(ORMBaseSchema):
    first_name: str
    last_name: str
    phone: str | None = None
    address: str | None = None
    position: str | None = None
    department: str | None = None
    hire_date: date | None = None
    iban: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    created_at: datetime
    updated_at: datetime


class ProfileDocumentsSummarySchema(BaseSchema):
    total_documents: int
    personal_documents: int
    company_documents: int
    has_contract: bool
    has_payslip: bool
    has_driver_license: bool


class ProfileSummaryResponseSchema(BaseSchema):
    user: ProfileUserInfoSchema
    employee_profile: ProfileEmployeeInfoSchema | None = None
    documents_summary: ProfileDocumentsSummarySchema
