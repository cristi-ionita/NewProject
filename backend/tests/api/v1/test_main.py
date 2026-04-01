from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_root():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "Flota API is running"}


def test_api_v1_health():
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_openapi_exists():
    response = client.get("/openapi.json")

    assert response.status_code == 200
    data = response.json()

    assert data["info"]["title"] == app.title
    assert data["info"]["version"] == "1.0.0"


def test_docs_exists():
    response = client.get("/docs")
    assert response.status_code == 200


def test_redoc_exists():
    response = client.get("/redoc")
    assert response.status_code == 200


def test_cors_preflight_for_root():
    response = client.options(
        "/",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_cors_preflight_for_api():
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:5173"