from datetime import datetime
from enum import Enum

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, func, text
from sqlalchemy import Enum as SqlEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AssignmentStatus(str, Enum):
    ACTIVE = "active"
    CLOSED = "closed"


class VehicleAssignment(Base):
    __tablename__ = "vehicle_assignments"

    __table_args__ = (
        CheckConstraint(
            "ended_at IS NULL OR ended_at >= started_at",
            name="ck_vehicle_assignments_ended_at_after_started_at",
        ),
        CheckConstraint(
            "(status = 'active' AND ended_at IS NULL) "
            "OR (status = 'closed' AND ended_at IS NOT NULL)",
            name="ck_vehicle_assignments_status_matches_ended_at",
        ),
        Index(
            "ux_vehicle_assignments_active_vehicle",
            "vehicle_id",
            unique=True,
            postgresql_where=text("status = 'active' AND ended_at IS NULL"),
        ),
        Index(
            "ux_vehicle_assignments_active_user",
            "user_id",
            unique=True,
            postgresql_where=text("status = 'active' AND ended_at IS NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    status: Mapped[AssignmentStatus] = mapped_column(
        SqlEnum(
            AssignmentStatus,
            name="assignment_status",
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        default=AssignmentStatus.ACTIVE,
        nullable=False,
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user = relationship("User")
    vehicle = relationship("Vehicle")