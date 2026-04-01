from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DashboardUsersSummarySchema(BaseSchema):
    total: int
    active: int
    inactive: int


class DashboardVehiclesSummarySchema(BaseSchema):
    total: int
    active: int
    in_service: int
    inactive: int
    sold: int


class DashboardAssignmentsSummarySchema(BaseSchema):
    active: int
    closed: int


class DashboardIssuesSummarySchema(BaseSchema):
    open: int
    in_progress: int
    resolved: int
    total: int


class DashboardDocumentsSummarySchema(BaseSchema):
    total: int
    personal: int
    company: int
    contracts: int
    payslips: int
    driver_licenses: int


class DashboardRecentIssueSchema(BaseSchema):
    id: int
    vehicle_id: int
    vehicle_license_plate: str
    reported_by_user_id: int
    reported_by_name: str
    status: str
    created_at: datetime
    other_problems: str | None = None


class DashboardActiveAssignmentSchema(BaseSchema):
    assignment_id: int
    user_id: int
    user_name: str
    vehicle_id: int
    vehicle_license_plate: str
    vehicle_brand: str
    vehicle_model: str
    started_at: datetime


class AdminDashboardSummaryResponse(BaseSchema):
    users: DashboardUsersSummarySchema
    vehicles: DashboardVehiclesSummarySchema
    assignments: DashboardAssignmentsSummarySchema
    issues: DashboardIssuesSummarySchema
    documents: DashboardDocumentsSummarySchema
    recent_issues: list[DashboardRecentIssueSchema]
    active_assignments: list[DashboardActiveAssignmentSchema]