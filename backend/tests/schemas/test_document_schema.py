from datetime import UTC, datetime
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.db.models.document import DocumentCategory, DocumentStatus, DocumentType
from app.schemas.document import (
    DocumentBaseSchema,
    DocumentCreateSchema,
    DocumentReadSchema,
    DocumentUpdateSchema,
)


def test_document_base_schema_valid():
    expires_at = datetime.now(UTC)

    obj = DocumentBaseSchema(
        type=DocumentType.CONTRACT,
        category=DocumentCategory.PERSONAL,
        status=DocumentStatus.ACTIVE,
        expires_at=expires_at,
    )

    assert obj.type == DocumentType.CONTRACT
    assert obj.category == DocumentCategory.PERSONAL
    assert obj.status == DocumentStatus.ACTIVE
    assert obj.expires_at == expires_at


def test_document_base_schema_default_status():
    obj = DocumentBaseSchema(
        type=DocumentType.CONTRACT,
        category=DocumentCategory.PERSONAL,
    )

    assert obj.status == DocumentStatus.ACTIVE
    assert obj.expires_at is None


def test_document_base_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        DocumentBaseSchema(
            type=DocumentType.CONTRACT,
            category=DocumentCategory.PERSONAL,
            extra_field="boom",
        )


def test_document_create_schema_valid():
    obj = DocumentCreateSchema(
        user_id=1,
        type=DocumentType.PAYSLIP,
        category=DocumentCategory.COMPANY,
        status=DocumentStatus.ACTIVE,
    )

    assert obj.user_id == 1
    assert obj.type == DocumentType.PAYSLIP
    assert obj.category == DocumentCategory.COMPANY
    assert obj.status == DocumentStatus.ACTIVE


def test_document_create_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        DocumentCreateSchema(
            user_id=1,
            type=DocumentType.CONTRACT,
            category=DocumentCategory.PERSONAL,
            extra_field="boom",
        )


def test_document_update_schema_valid_with_all_fields():
    expires_at = datetime.now(UTC)

    obj = DocumentUpdateSchema(
        type=DocumentType.DRIVER_LICENSE,
        category=DocumentCategory.PERSONAL,
        status=DocumentStatus.ACTIVE,
        expires_at=expires_at,
    )

    assert obj.type == DocumentType.DRIVER_LICENSE
    assert obj.category == DocumentCategory.PERSONAL
    assert obj.status == DocumentStatus.ACTIVE
    assert obj.expires_at == expires_at


def test_document_update_schema_all_optional():
    obj = DocumentUpdateSchema()

    assert obj.type is None
    assert obj.category is None
    assert obj.status is None
    assert obj.expires_at is None


def test_document_update_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        DocumentUpdateSchema(
            extra_field="boom",
        )


def test_document_read_schema_valid():
    created_at = datetime.now(UTC)
    updated_at = datetime.now(UTC)

    obj = DocumentReadSchema(
        id=10,
        user_id=1,
        uploaded_by=2,
        type=DocumentType.CONTRACT,
        category=DocumentCategory.PERSONAL,
        status=DocumentStatus.ACTIVE,
        expires_at=None,
        file_name="contract.pdf",
        mime_type="application/pdf",
        created_at=created_at,
        updated_at=updated_at,
    )

    assert obj.id == 10
    assert obj.user_id == 1
    assert obj.uploaded_by == 2
    assert obj.file_name == "contract.pdf"
    assert obj.mime_type == "application/pdf"
    assert obj.created_at == created_at
    assert obj.updated_at == updated_at


def test_document_read_schema_uploaded_by_optional():
    created_at = datetime.now(UTC)
    updated_at = datetime.now(UTC)

    obj = DocumentReadSchema(
        id=10,
        user_id=1,
        uploaded_by=None,
        type=DocumentType.CONTRACT,
        category=DocumentCategory.PERSONAL,
        status=DocumentStatus.ACTIVE,
        expires_at=None,
        file_name="contract.pdf",
        mime_type="application/pdf",
        created_at=created_at,
        updated_at=updated_at,
    )

    assert obj.uploaded_by is None


def test_document_read_schema_file_name_too_short():
    with pytest.raises(ValidationError):
        DocumentReadSchema(
            id=10,
            user_id=1,
            uploaded_by=None,
            type=DocumentType.CONTRACT,
            category=DocumentCategory.PERSONAL,
            status=DocumentStatus.ACTIVE,
            expires_at=None,
            file_name="",
            mime_type="application/pdf",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )


def test_document_read_schema_file_name_too_long():
    with pytest.raises(ValidationError):
        DocumentReadSchema(
            id=10,
            user_id=1,
            uploaded_by=None,
            type=DocumentType.CONTRACT,
            category=DocumentCategory.PERSONAL,
            status=DocumentStatus.ACTIVE,
            expires_at=None,
            file_name="a" * 256,
            mime_type="application/pdf",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )


def test_document_read_schema_mime_type_too_short():
    with pytest.raises(ValidationError):
        DocumentReadSchema(
            id=10,
            user_id=1,
            uploaded_by=None,
            type=DocumentType.CONTRACT,
            category=DocumentCategory.PERSONAL,
            status=DocumentStatus.ACTIVE,
            expires_at=None,
            file_name="contract.pdf",
            mime_type="",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )


def test_document_read_schema_mime_type_too_long():
    with pytest.raises(ValidationError):
        DocumentReadSchema(
            id=10,
            user_id=1,
            uploaded_by=None,
            type=DocumentType.CONTRACT,
            category=DocumentCategory.PERSONAL,
            status=DocumentStatus.ACTIVE,
            expires_at=None,
            file_name="contract.pdf",
            mime_type="a" * 101,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )


def test_document_read_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        DocumentReadSchema(
            id=10,
            user_id=1,
            uploaded_by=None,
            type=DocumentType.CONTRACT,
            category=DocumentCategory.PERSONAL,
            status=DocumentStatus.ACTIVE,
            expires_at=None,
            file_name="contract.pdf",
            mime_type="application/pdf",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            extra_field="boom",
        )


def test_document_read_schema_model_validate_from_attributes():
    obj = SimpleNamespace(
        id=10,
        user_id=1,
        uploaded_by=2,
        type=DocumentType.CONTRACT,
        category=DocumentCategory.PERSONAL,
        status=DocumentStatus.ACTIVE,
        expires_at=None,
        file_name="contract.pdf",
        mime_type="application/pdf",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )

    result = DocumentReadSchema.model_validate(obj)

    assert result.id == 10
    assert result.user_id == 1
    assert result.file_name == "contract.pdf"
    assert result.mime_type == "application/pdf"
