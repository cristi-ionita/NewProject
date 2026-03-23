from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class VehicleHandoverReport(Base):
    __tablename__ = "vehicle_handover_reports"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    assignment_id: Mapped[int] = mapped_column(
        ForeignKey("vehicle_assignments.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    mileage_start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mileage_end: Mapped[int | None] = mapped_column(Integer, nullable=True)

    dashboard_warnings_start: Mapped[str | None] = mapped_column(Text, nullable=True)
    dashboard_warnings_end: Mapped[str | None] = mapped_column(Text, nullable=True)

    damage_notes_start: Mapped[str | None] = mapped_column(Text, nullable=True)
    damage_notes_end: Mapped[str | None] = mapped_column(Text, nullable=True)

    notes_start: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes_end: Mapped[str | None] = mapped_column(Text, nullable=True)

    has_documents: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_medkit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_extinguisher: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_warning_triangle: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_spare_wheel: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

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

    assignment = relationship("VehicleAssignment")
