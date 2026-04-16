from datetime import datetime
from enum import Enum

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy import Enum as SqlEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class VehicleIssueStatus(str, Enum):
    OPEN = "open"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class VehicleIssue(Base):
    __tablename__ = "vehicle_issues"

    __table_args__ = (
        CheckConstraint(
            "need_service_in_km IS NULL OR need_service_in_km >= 0",
            name="ck_vehicle_issues_need_service_in_km_non_negative",
        ),
        CheckConstraint(
            "scheduled_location IS NULL OR char_length(trim(scheduled_location)) > 0",
            name="ck_vehicle_issues_scheduled_location_not_blank_if_present",
        ),
        CheckConstraint(
            "dashboard_checks IS NULL OR char_length(trim(dashboard_checks)) > 0",
            name="ck_vehicle_issues_dashboard_checks_not_blank_if_present",
        ),
        CheckConstraint(
            "other_problems IS NULL OR char_length(trim(other_problems)) > 0",
            name="ck_vehicle_issues_other_problems_not_blank_if_present",
        ),
        CheckConstraint(
            "status != 'scheduled' OR scheduled_for IS NOT NULL",
            name="ck_vehicle_issues_scheduled_requires_datetime",
        )
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    assignment_id: Mapped[int | None] = mapped_column(
        ForeignKey("vehicle_assignments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    reported_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    assigned_mechanic_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    need_service_in_km: Mapped[int | None] = mapped_column(Integer, nullable=True)

    need_brakes: Mapped[bool] = mapped_column(nullable=False, default=False)
    need_tires: Mapped[bool] = mapped_column(nullable=False, default=False)
    need_oil: Mapped[bool] = mapped_column(nullable=False, default=False)

    dashboard_checks: Mapped[str | None] = mapped_column(Text, nullable=True)
    other_problems: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[VehicleIssueStatus] = mapped_column(
        SqlEnum(
            VehicleIssueStatus,
            name="vehicle_issue_status",
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
            ),
            default=VehicleIssueStatus.OPEN,
            nullable=False,
    )

    scheduled_for: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    scheduled_location: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    vehicle = relationship("Vehicle")
    assignment = relationship("VehicleAssignment")
    reported_by_user = relationship(
        "User",
        foreign_keys=[reported_by_user_id],
    )
    assigned_mechanic = relationship(
        "User",
        foreign_keys=[assigned_mechanic_id],
    )
