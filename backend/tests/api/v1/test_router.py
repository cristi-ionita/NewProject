from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.router import api_router


def create_test_app():
    app = FastAPI()
    app.include_router(api_router)
    return app


def test_health_route_exists():
    app = create_test_app()
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_auth_routes_registered():
    app = create_test_app()
    routes = [r.path for r in app.routes]

    assert any("/auth" in path for path in routes)


def test_sessions_routes_registered():
    app = create_test_app()
    routes = [r.path for r in app.routes]

    assert any("/sessions" in path for path in routes)


def test_my_vehicle_routes_registered():
    app = create_test_app()
    routes = [r.path for r in app.routes]

    assert any("/my-vehicle" in path for path in routes)


def test_users_routes_registered():
    app = create_test_app()
    routes = [r.path for r in app.routes]

    assert any("/users" in path for path in routes)


def test_vehicles_routes_registered():
    app = create_test_app()
    routes = [r.path for r in app.routes]

    assert any("/vehicles" in path for path in routes)


def test_vehicle_issues_routes_registered():
    app = create_test_app()
    routes = [r.path for r in app.routes]

    assert any("/vehicle-issues" in path for path in routes)


def test_documents_routes_registered():
    app = create_test_app()
    routes = [r.path for r in app.routes]

    assert any("/documents" in path for path in routes)


def test_employee_profiles_routes_registered():
    app = create_test_app()
    routes = [r.path for r in app.routes]

    assert any("/employee-profiles" in path for path in routes)


def test_vehicle_assignments_admin_routes_registered():
    app = create_test_app()
    routes = [r.path for r in app.routes]

    assert any("/admin-assignments" in path for path in routes)


def test_admin_dashboard_routes_registered():
    app = create_test_app()
    routes = [r.path for r in app.routes]

    assert any("/admin-dashboard" in path for path in routes)


def test_admin_dashboard_alerts_routes_registered():
    app = create_test_app()
    routes = [r.path for r in app.routes]

    assert any("/admin-dashboard-alerts" in path for path in routes)


def test_leave_requests_routes_registered():
    app = create_test_app()
    routes = [r.path for r in app.routes]

    assert any("/leave-requests" in path for path in routes)
