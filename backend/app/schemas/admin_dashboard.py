from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        from_attributes=True,
    )


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
    status: str
    created_at: datetime
    vehicle: str
    reported_by: str
    problem: str | None = None


class DashboardActiveAssignmentSchema(BaseSchema):
    id: int
    started_at: datetime
    vehicle: str
    user: str


class AdminDashboardSummaryResponse(BaseSchema):
    users: DashboardUsersSummarySchema
    vehicles: DashboardVehiclesSummarySchema
    assignments: DashboardAssignmentsSummarySchema
    issues: DashboardIssuesSummarySchema
    documents: DashboardDocumentsSummarySchema
    recent_issues: list[DashboardRecentIssueSchema]
    active_assignments: list[DashboardActiveAssignmentSchema]