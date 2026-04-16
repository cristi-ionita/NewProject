from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from fastapi.testclient import TestClient
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError

from app.core.exceptions import register_exception_handlers


class FakeOrig:
    def __init__(self, detail: str, constraint_name: str | None = None) -> None:
        self.detail = detail
        self.constraint_name = constraint_name

    def __str__(self) -> str:
        return self.detail


class FakeDB:
    def __init__(self) -> None:
        self.rolled_back = False

    async def rollback(self) -> None:
        self.rolled_back = True


class PayloadSchema(BaseModel):
    name: str
    age: int


def create_test_app() -> FastAPI:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/http-error")
    async def http_error() -> None:
        raise HTTPException(status_code=404, detail="Custom not found detail")

    @app.post("/validation-error")
    async def validation_error(payload: PayloadSchema) -> dict[str, str]:
        return {"ok": "ok"}

    @app.get("/integrity-check")
    async def integrity_check(request: Request) -> None:
        fake_db = FakeDB()
        request.state.db = fake_db
        request.app.state.fake_db = fake_db

        raise IntegrityError(
            statement="INSERT INTO users ...",
            params={},
            orig=FakeOrig(
                detail='new row for relation "users" violates check constraint "ck_users_full_name_not_blank"',
                constraint_name="ck_users_full_name_not_blank",
            ),
        )

    @app.get("/integrity-unique")
    async def integrity_unique(request: Request) -> None:
        fake_db = FakeDB()
        request.state.db = fake_db
        request.app.state.fake_db = fake_db

        raise IntegrityError(
            statement="INSERT INTO vehicle_assignments ...",
            params={},
            orig=FakeOrig(
                detail='duplicate key value violates unique constraint "ux_vehicle_assignments_active_user"',
                constraint_name="ux_vehicle_assignments_active_user",
            ),
        )

    @app.get("/internal-error")
    async def internal_error() -> None:
        raise RuntimeError("boom")

    return app


def test_http_exception_is_translated_to_english():
    client = TestClient(create_test_app())

    response = client.get(
        "/http-error",
        headers={"Accept-Language": "en"},
    )

    assert response.status_code == 404
    assert response.json() == {
        "error": "NOT_FOUND",
        "code": "errors.http.not_found",
        "message": "The resource was not found.",
    }


def test_validation_error_is_translated_to_german():
    client = TestClient(create_test_app())

    response = client.post(
        "/validation-error",
        headers={"Accept-Language": "de"},
        json={"name": "Ion", "age": "not-an-int"},
    )

    body = response.json()

    assert response.status_code == 422
    assert body["error"] == "VALIDATION_ERROR"
    assert body["code"] == "errors.validation.invalid_request"
    assert body["message"] == "Die gesendeten Daten sind ungültig."
    assert "details" in body


def test_integrity_check_constraint_is_translated_to_romanian_and_rolls_back():
    app = create_test_app()
    client = TestClient(app)

    response = client.get(
        "/integrity-check",
        headers={"Accept-Language": "ro"},
    )

    assert response.status_code == 400
    assert response.json() == {
        "error": "BAD_REQUEST",
        "code": "users.full_name.blank",
        "message": "Numele complet nu poate fi gol.",
    }
    assert app.state.fake_db.rolled_back is True


def test_integrity_unique_constraint_is_translated_to_english_and_returns_409():
    app = create_test_app()
    client = TestClient(app)

    response = client.get(
        "/integrity-unique",
        headers={"Accept-Language": "en"},
    )

    assert response.status_code == 409
    assert response.json() == {
        "error": "CONFLICT",
        "code": "vehicle_assignments.active_user.conflict",
        "message": "The user already has an active vehicle assignment.",
    }
    assert app.state.fake_db.rolled_back is True


def test_internal_error_is_translated_to_german():
    client = TestClient(create_test_app(), raise_server_exceptions=False)

    response = client.get(
        "/internal-error",
        headers={"Accept-Language": "de"},
    )

    assert response.status_code == 500
    assert response.json() == {
        "error": "INTERNAL_SERVER_ERROR",
        "code": "errors.internal",
        "message": "Ein interner Fehler ist aufgetreten.",
    }


def test_unknown_language_falls_back_to_romanian():
    client = TestClient(create_test_app())

    response = client.get(
        "/http-error",
        headers={"Accept-Language": "fr"},
    )

    assert response.status_code == 404
    assert response.json() == {
        "error": "NOT_FOUND",
        "code": "errors.http.not_found",
        "message": "Resursa nu a fost găsită.",
    }