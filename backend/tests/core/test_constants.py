from app.core.constants import (
    ALLOWED_DOCUMENT_CONTENT_TYPES,
    MAX_REALISTIC_MILEAGE,
)


def test_allowed_document_content_types_contains_expected_values():
    assert "application/pdf" in ALLOWED_DOCUMENT_CONTENT_TYPES
    assert "image/png" in ALLOWED_DOCUMENT_CONTENT_TYPES
    assert "image/jpeg" in ALLOWED_DOCUMENT_CONTENT_TYPES
    assert "image/jpg" in ALLOWED_DOCUMENT_CONTENT_TYPES


def test_allowed_document_content_types_has_expected_size():
    assert len(ALLOWED_DOCUMENT_CONTENT_TYPES) == 4


def test_max_realistic_mileage_value():
    assert MAX_REALISTIC_MILEAGE == 5_000_000