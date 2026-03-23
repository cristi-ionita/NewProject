from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class VehicleStatus(str, Enum):
    ACTIVE = "active"
    IN_SERVICE = "in_service"
    INACTIVE = "inactive"
    SOLD = "sold"


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    brand: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    license_plate: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)

    vin: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)

    status: Mapped[VehicleStatus] = mapped_column(
        SqlEnum(VehicleStatus, name="vehicle_status"),
        default=VehicleStatus.ACTIVE,
        nullable=False,
    )

    current_mileage: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

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