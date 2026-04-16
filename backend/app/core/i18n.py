from __future__ import annotations

from collections.abc import Mapping

SUPPORTED_LANGUAGES = {"ro", "en", "de"}
DEFAULT_LANGUAGE = "de"

TRANSLATIONS: dict[str, dict[str, str]] = {
    "ro": {
        "errors.http.bad_request": "Cererea este invalidă.",
        "errors.http.unauthorized": "Nu ești autentificat.",
        "errors.http.forbidden": "Nu ai permisiunea necesară.",
        "errors.http.not_found": "Resursa nu a fost găsită.",
        "errors.validation.invalid_request": "Datele trimise sunt invalide.",
        "errors.internal": "A apărut o eroare internă.",
        "errors.db.constraint_violation": "Operația nu a putut fi finalizată din cauza unei constrângeri de date.",
        "errors.db.unique_violation": "Există deja o înregistrare cu aceste date unice.",
        "errors.db.foreign_key_violation": "Referința către o resursă asociată este invalidă.",
        "users.full_name.blank": "Numele complet nu poate fi gol.",
        "users.unique_code.blank": "Codul unic nu poate fi gol.",
        "users.role.invalid": "Rolul utilizatorului este invalid.",
        "vehicles.brand.blank": "Marca vehiculului nu poate fi goală.",
        "vehicles.model.blank": "Modelul vehiculului nu poate fi gol.",
        "vehicles.license_plate.blank": "Numărul de înmatriculare nu poate fi gol.",
        "vehicles.year.invalid": "Anul vehiculului trebuie să fie cel puțin 1900.",
        "vehicles.current_mileage.invalid": "Kilometrajul nu poate fi negativ.",
        "vehicles.vin.blank": "VIN-ul nu poate fi gol dacă este completat.",
        "employee_profiles.first_name.blank": "Prenumele nu poate fi gol.",
        "employee_profiles.last_name.blank": "Numele de familie nu poate fi gol.",
        "vehicle_assignments.date_range.invalid": "Data de încheiere nu poate fi înaintea datei de început.",
        "vehicle_assignments.status.invalid": "Statusul alocării nu este compatibil cu data de încheiere.",
        "vehicle_assignments.active_vehicle.conflict": "Vehiculul are deja o alocare activă.",
        "vehicle_assignments.active_user.conflict": "Utilizatorul are deja un vehicul alocat activ.",
        "vehicle_issues.need_service_in_km.invalid": "Valoarea pentru service în kilometri nu poate fi negativă.",
        "vehicle_issues.scheduled_location.blank": "Locația programării nu poate fi goală.",
        "vehicle_issues.dashboard_checks.blank": "Câmpul pentru verificările din bord nu poate fi gol.",
        "vehicle_issues.other_problems.blank": "Câmpul pentru alte probleme nu poate fi gol.",
        "vehicle_issues.scheduled_requires_datetime": "Pentru statusul programat, data și ora programării sunt obligatorii.",
        "leave_requests.date_range.invalid": "Data de sfârșit nu poate fi înaintea datei de început.",
        "leave_requests.reason.blank": "Motivul nu poate fi gol dacă este completat.",
        "leave_requests.review_fields.invalid": "Câmpurile de review nu corespund statusului cererii de concediu.",
    },
    "en": {
        "errors.http.bad_request": "The request is invalid.",
        "errors.http.unauthorized": "You are not authenticated.",
        "errors.http.forbidden": "You do not have permission to perform this action.",
        "errors.http.not_found": "The resource was not found.",
        "errors.validation.invalid_request": "The submitted data is invalid.",
        "errors.internal": "An internal error occurred.",
        "errors.db.constraint_violation": "The operation could not be completed because of a data constraint violation.",
        "errors.db.unique_violation": "A record with these unique values already exists.",
        "errors.db.foreign_key_violation": "The reference to a related resource is invalid.",
        "users.full_name.blank": "Full name cannot be blank.",
        "users.unique_code.blank": "Unique code cannot be blank.",
        "users.role.invalid": "User role is invalid.",
        "vehicles.brand.blank": "Vehicle brand cannot be blank.",
        "vehicles.model.blank": "Vehicle model cannot be blank.",
        "vehicles.license_plate.blank": "License plate cannot be blank.",
        "vehicles.year.invalid": "Vehicle year must be at least 1900.",
        "vehicles.current_mileage.invalid": "Current mileage cannot be negative.",
        "vehicles.vin.blank": "VIN cannot be blank when provided.",
        "employee_profiles.first_name.blank": "First name cannot be blank.",
        "employee_profiles.last_name.blank": "Last name cannot be blank.",
        "vehicle_assignments.date_range.invalid": "End date cannot be earlier than start date.",
        "vehicle_assignments.status.invalid": "Assignment status is not compatible with the end date.",
        "vehicle_assignments.active_vehicle.conflict": "The vehicle already has an active assignment.",
        "vehicle_assignments.active_user.conflict": "The user already has an active vehicle assignment.",
        "vehicle_issues.need_service_in_km.invalid": "The service-in-km value cannot be negative.",
        "vehicle_issues.scheduled_location.blank": "Scheduled location cannot be blank.",
        "vehicle_issues.dashboard_checks.blank": "Dashboard checks cannot be blank.",
        "vehicle_issues.other_problems.blank": "Other problems cannot be blank.",
        "vehicle_issues.scheduled_requires_datetime": "A scheduled issue must have a scheduled date and time.",
        "leave_requests.date_range.invalid": "End date cannot be earlier than start date.",
        "leave_requests.reason.blank": "Reason cannot be blank when provided.",
        "leave_requests.review_fields.invalid": "Review fields do not match the leave request status.",
    },
    "de": {
        "errors.http.bad_request": "Die Anfrage ist ungültig.",
        "errors.http.unauthorized": "Du bist nicht authentifiziert.",
        "errors.http.forbidden": "Du hast keine Berechtigung für diese Aktion.",
        "errors.http.not_found": "Die Ressource wurde nicht gefunden.",
        "errors.validation.invalid_request": "Die gesendeten Daten sind ungültig.",
        "errors.internal": "Ein interner Fehler ist aufgetreten.",
        "errors.db.constraint_violation": "Der Vorgang konnte aufgrund einer Datenbeschränkung nicht abgeschlossen werden.",
        "errors.db.unique_violation": "Ein Datensatz mit diesen eindeutigen Werten existiert bereits.",
        "errors.db.foreign_key_violation": "Die Referenz auf eine verknüpfte Ressource ist ungültig.",
        "users.full_name.blank": "Der vollständige Name darf nicht leer sein.",
        "users.unique_code.blank": "Der eindeutige Code darf nicht leer sein.",
        "users.role.invalid": "Die Benutzerrolle ist ungültig.",
        "vehicles.brand.blank": "Die Fahrzeugmarke darf nicht leer sein.",
        "vehicles.model.blank": "Das Fahrzeugmodell darf nicht leer sein.",
        "vehicles.license_plate.blank": "Das Kennzeichen darf nicht leer sein.",
        "vehicles.year.invalid": "Das Baujahr des Fahrzeugs muss mindestens 1900 sein.",
        "vehicles.current_mileage.invalid": "Der Kilometerstand darf nicht negativ sein.",
        "vehicles.vin.blank": "Die VIN darf nicht leer sein, wenn sie angegeben wird.",
        "employee_profiles.first_name.blank": "Der Vorname darf nicht leer sein.",
        "employee_profiles.last_name.blank": "Der Nachname darf nicht leer sein.",
        "vehicle_assignments.date_range.invalid": "Das Enddatum darf nicht vor dem Startdatum liegen.",
        "vehicle_assignments.status.invalid": "Der Status der Zuweisung passt nicht zum Enddatum.",
        "vehicle_assignments.active_vehicle.conflict": "Das Fahrzeug hat bereits eine aktive Zuweisung.",
        "vehicle_assignments.active_user.conflict": "Der Benutzer hat bereits eine aktive Fahrzeugzuweisung.",
        "vehicle_issues.need_service_in_km.invalid": "Der Kilometerwert für den Service darf nicht negativ sein.",
        "vehicle_issues.scheduled_location.blank": "Der Terminort darf nicht leer sein.",
        "vehicle_issues.dashboard_checks.blank": "Das Feld für Armaturenbrett-Prüfungen darf nicht leer sein.",
        "vehicle_issues.other_problems.blank": "Das Feld für weitere Probleme darf nicht leer sein.",
        "vehicle_issues.scheduled_requires_datetime": "Ein geplanter Vorgang muss ein Termin-Datum und eine Uhrzeit haben.",
        "leave_requests.date_range.invalid": "Das Enddatum darf nicht vor dem Startdatum liegen.",
        "leave_requests.reason.blank": "Der Grund darf nicht leer sein, wenn er angegeben wird.",
        "leave_requests.review_fields.invalid": "Die Prüfungsfelder passen nicht zum Status des Urlaubsantrags.",
    },
}


def normalize_language(value: str | None) -> str:
    if not value:
        return DEFAULT_LANGUAGE

    lowered = value.lower().strip()

    for part in lowered.split(","):
        token = part.split(";")[0].strip()
        if not token:
            continue

        base = token.split("-")[0]
        if base in SUPPORTED_LANGUAGES:
            return base

    return DEFAULT_LANGUAGE


def translate(code: str, language: str, fallback: str | None = None) -> str:
    lang = normalize_language(language)
    lang_messages = TRANSLATIONS.get(lang, {})

    if code in lang_messages:
        return lang_messages[code]

    fallback_messages = TRANSLATIONS[DEFAULT_LANGUAGE]
    if code in fallback_messages:
        return fallback_messages[code]

    return fallback or code


def get_language_from_headers(headers: Mapping[str, str]) -> str:
    return normalize_language(headers.get("accept-language"))