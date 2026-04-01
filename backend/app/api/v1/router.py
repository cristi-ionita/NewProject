from fastapi import APIRouter

# Core / public endpoints
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.sessions import router as sessions_router
from app.api.v1.endpoints.my_vehicle import router as my_vehicle_router

# Core resources
from app.api.v1.endpoints.users import router as users_router
from app.api.v1.endpoints.vehicles import router as vehicles_router
from app.api.v1.endpoints.vehicle_issues import router as vehicle_issues_router
from app.api.v1.endpoints.documents import router as documents_router
from app.api.v1.endpoints.employee_profiles import router as employee_profiles_router
from app.api.v1.endpoints.leave_requests import router as leave_requests_router

# Admin / management
from app.api.v1.endpoints.vehicle_assignments_admin import (
    router as vehicle_assignments_admin_router,
)
from app.api.v1.endpoints.admin_dashboard import router as admin_dashboard_router
from app.api.v1.endpoints.admin_dashboard_alerts import (
    router as admin_dashboard_alerts_router,
)


api_router = APIRouter()

# Health & auth
api_router.include_router(health_router)
api_router.include_router(auth_router)

# User flow (driver side)
api_router.include_router(sessions_router)
api_router.include_router(my_vehicle_router)

# Core entities
api_router.include_router(users_router)
api_router.include_router(vehicles_router)
api_router.include_router(vehicle_issues_router)
api_router.include_router(documents_router)
api_router.include_router(employee_profiles_router)

# Admin
api_router.include_router(vehicle_assignments_admin_router)
api_router.include_router(admin_dashboard_router)
api_router.include_router(admin_dashboard_alerts_router)
api_router.include_router(leave_requests_router)