from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class VehicleIssueStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class VehicleIssue(Base):
    __tablename__ = "vehicle_issues"

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

    need_service_in_km: Mapped[int | None] = mapped_column(Integer, nullable=True)

    need_brakes: Mapped[bool] = mapped_column(nullable=False, default=False)
    need_tires: Mapped[bool] = mapped_column(nullable=False, default=False)
    need_oil: Mapped[bool] = mapped_column(nullable=False, default=False)

    dashboard_checks: Mapped[str | None] = mapped_column(Text, nullable=True)
    other_problems: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[VehicleIssueStatus] = mapped_column(
        SqlEnum(VehicleIssueStatus, name="vehicle_issue_status"),
        default=VehicleIssueStatus.OPEN,
        nullable=False,
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
    reported_by_user = relationship("User")