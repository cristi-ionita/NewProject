from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.core.db_error_map import extract_integrity_error_message, map_integrity_error
from app.core.i18n import get_language_from_headers, translate

logger = logging.getLogger("app")


def make_json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value

    if isinstance(value, dict):
        return {str(key): make_json_safe(item) for key, item in value.items()}

    if isinstance(value, (list, tuple, set)):
        return [make_json_safe(item) for item in value]

    return str(value)


def normalize_validation_errors(errors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [make_json_safe(error) for error in errors]


def build_error_response(
    error: str,
    code: str,
    message: str,
    details: list[dict[str, Any]] | None = None,
    status_code: int = status.HTTP_400_BAD_REQUEST,
) -> JSONResponse:
    payload: dict[str, Any] = {
        "error": error,
        "code": code,
        "message": message,
    }

    if details:
        payload["details"] = make_json_safe(details)

    return JSONResponse(
        status_code=status_code,
        content=payload,
    )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request,
        exc: HTTPException,
    ) -> JSONResponse:
        logger.warning(
            "HTTPException %s %s -> %s",
            request.method,
            request.url.path,
            exc.detail,
        )

        language = get_language_from_headers(request.headers)

        error = "HTTP_ERROR"
        code = "errors.http.bad_request"

        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            error = "UNAUTHORIZED"
            code = "errors.http.unauthorized"
        elif exc.status_code == status.HTTP_403_FORBIDDEN:
            error = "FORBIDDEN"
            code = "errors.http.forbidden"
        elif exc.status_code == status.HTTP_404_NOT_FOUND:
            error = "NOT_FOUND"
            code = "errors.http.not_found"
        elif exc.status_code == status.HTTP_400_BAD_REQUEST:
            error = "BAD_REQUEST"
            code = "errors.http.bad_request"

        fallback_message = str(exc.detail) if exc.detail is not None else code
        message = translate(code, language, fallback=fallback_message)

        return build_error_response(
            error=error,
            code=code,
            message=message,
            status_code=exc.status_code,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        raw_errors = exc.errors()

        logger.warning(
            "Validation error %s %s -> %s",
            request.method,
            request.url.path,
            raw_errors,
        )

        language = get_language_from_headers(request.headers)
        code = "errors.validation.invalid_request"

        return build_error_response(
            error="VALIDATION_ERROR",
            code=code,
            message=translate(code, language),
            details=normalize_validation_errors(raw_errors),
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(
        request: Request,
        exc: IntegrityError,
    ) -> JSONResponse:
        logger.warning(
            "IntegrityError %s %s -> %s",
            request.method,
            request.url.path,
            extract_integrity_error_message(exc),
        )

        db = getattr(request.state, "db", None)
        if db is not None:
            try:
                await db.rollback()
            except Exception:
                pass

        language = get_language_from_headers(request.headers)
        error, code, status_code = map_integrity_error(exc)
        message = translate(code, language)

        return build_error_response(
            error=error,
            code=code,
            message=message,
            status_code=status_code,
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        logger.exception(
            "Unhandled exception on %s %s",
            request.method,
            request.url.path,
        )

        language = get_language_from_headers(request.headers)
        code = "errors.internal"

        return build_error_response(
            error="INTERNAL_SERVER_ERROR",
            code=code,
            message=translate(code, language),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )