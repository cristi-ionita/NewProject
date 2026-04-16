from __future__ import annotations

from fastapi import status
from sqlalchemy.exc import IntegrityError

CONSTRAINT_TO_ERROR_CODE: dict[str, str] = {
    "ck_users_full_name_not_blank": "users.full_name.blank",
    "ck_users_unique_code_not_blank": "users.unique_code.blank",
    "ck_users_role_valid": "users.role.invalid",
    "ck_vehicles_brand_not_blank": "vehicles.brand.blank",
    "ck_vehicles_model_not_blank": "vehicles.model.blank",
    "ck_vehicles_license_plate_not_blank": "vehicles.license_plate.blank",
    "ck_vehicles_year_min_1900": "vehicles.year.invalid",
    "ck_vehicles_current_mileage_non_negative": "vehicles.current_mileage.invalid",
    "ck_vehicles_vin_not_blank_if_present": "vehicles.vin.blank",
    "ck_employee_profiles_first_name_not_blank": "employee_profiles.first_name.blank",
    "ck_employee_profiles_last_name_not_blank": "employee_profiles.last_name.blank",
    "ck_vehicle_assignments_ended_at_after_started_at": "vehicle_assignments.date_range.invalid",
    "ck_vehicle_assignments_status_matches_ended_at": "vehicle_assignments.status.invalid",
    "ux_vehicle_assignments_active_vehicle": "vehicle_assignments.active_vehicle.conflict",
    "ux_vehicle_assignments_active_user": "vehicle_assignments.active_user.conflict",
    "ck_vehicle_issues_need_service_in_km_non_negative": "vehicle_issues.need_service_in_km.invalid",
    "ck_vehicle_issues_scheduled_location_not_blank_if_present": "vehicle_issues.scheduled_location.blank",
    "ck_vehicle_issues_dashboard_checks_not_blank_if_present": "vehicle_issues.dashboard_checks.blank",
    "ck_vehicle_issues_other_problems_not_blank_if_present": "vehicle_issues.other_problems.blank",
    "ck_vehicle_issues_scheduled_requires_datetime": "vehicle_issues.scheduled_requires_datetime",
    "ck_leave_requests_end_date_after_start_date": "leave_requests.date_range.invalid",
    "ck_leave_requests_reason_not_blank_if_present": "leave_requests.reason.blank",
    "ck_leave_requests_review_fields_match_status": "leave_requests.review_fields.invalid",
}


def extract_integrity_error_message(exc: IntegrityError) -> str:
    original = getattr(exc, "orig", None)
    if original is None:
        return str(exc)

    detail = getattr(original, "detail", None)
    if detail:
        return str(detail)

    return str(original)


def extract_constraint_name(exc: IntegrityError) -> str | None:
    original = getattr(exc, "orig", None)
    if original is None:
        return None

    constraint_name = getattr(original, "constraint_name", None)
    if constraint_name:
        return str(constraint_name)

    text = str(original)

    for name in CONSTRAINT_TO_ERROR_CODE:
        if name in text:
            return name

    return None


def map_integrity_error(exc: IntegrityError) -> tuple[str, str, int]:
    message = extract_integrity_error_message(exc)
    constraint_name = extract_constraint_name(exc)
    text = f"{message} {constraint_name or ''}".lower()

    if constraint_name and constraint_name in CONSTRAINT_TO_ERROR_CODE:
        code = CONSTRAINT_TO_ERROR_CODE[constraint_name]
        if constraint_name.startswith("ux_"):
            return ("CONFLICT", code, status.HTTP_409_CONFLICT)
        return ("BAD_REQUEST", code, status.HTTP_400_BAD_REQUEST)

    if "duplicate key" in text or "unique" in text:
        return ("CONFLICT", "errors.db.unique_violation", status.HTTP_409_CONFLICT)

    if "foreign key" in text:
        return ("BAD_REQUEST", "errors.db.foreign_key_violation", status.HTTP_400_BAD_REQUEST)

    return ("BAD_REQUEST", "errors.db.constraint_violation", status.HTTP_400_BAD_REQUEST)