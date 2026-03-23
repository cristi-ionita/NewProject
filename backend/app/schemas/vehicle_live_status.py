from pydantic import BaseModel


class VehicleLiveStatusItem(BaseModel):
    vehicle_id: int
    brand: str
    model: str
    license_plate: str
    year: int
    vehicle_status: str
    availability: str
    assigned_to_user_id: int | None = None
    assigned_to_name: str | None = None
    active_assignment_id: int | None = None


class VehicleLiveStatusResponse(BaseModel):
    vehicles: list[VehicleLiveStatusItem]