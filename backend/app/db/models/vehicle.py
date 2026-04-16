from datetime import datetime
from enum import Enum

from sqlalchemy import CheckConstraint, DateTime, Integer, String, func
from sqlalchemy import Enum as SqlEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class VehicleStatus(str, Enum):
    ACTIVE = "active"
    IN_SERVICE = "in_service"
    INACTIVE = "inactive"
    SOLD = "sold"


class Vehicle(Base):
    __tablename__ = "vehicles"

    __table_args__ = (
        CheckConstraint(
            "char_length(trim(brand)) > 0",
            name="ck_vehicles_brand_not_blank",
        ),
        CheckConstraint(
            "char_length(trim(model)) > 0",
            name="ck_vehicles_model_not_blank",
        ),
        CheckConstraint(
            "char_length(trim(license_plate)) > 0",
            name="ck_vehicles_license_plate_not_blank",
        ),
        CheckConstraint(
            "year >= 1900",
            name="ck_vehicles_year_min_1900",
        ),
        CheckConstraint(
            "current_mileage >= 0",
            name="ck_vehicles_current_mileage_non_negative",
        ),
        CheckConstraint(
            "vin IS NULL OR char_length(trim(vin)) > 0",
            name="ck_vehicles_vin_not_blank_if_present",
        ),
    )

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
