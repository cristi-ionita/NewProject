import io
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException, UploadFile
from starlette.responses import FileResponse

from app.api.v1.endpoints.documents import (
    admin_delete_document,
    admin_download_document,
    admin_upload_document,
    build_document_query,
    delete_my_document,
    download_document,
    ensure_allowed_file,
    get_document_by_id_or_404,
    get_my_documents,
    get_user_by_id_or_404,
    get_user_documents_for_admin,
    parse_document_category,
    parse_document_type,
    remove_file_if_exists,
    save_uploaded_file,
    upload_my_document,
)
from app.db.models.document import Document, DocumentCategory, DocumentStatus, DocumentType


class FakeScalarsResult:
    def __init__(self, items):
        self._items = items

    def all(self):
        return self._items


class FakeScalarResult:
    def __init__(self, item):
        self._item = item

    def scalar_one_or_none(self):
        return self._item


class FakeResult:
    def __init__(self, items):
        self._items = items

    def scalars(self):
        return FakeScalarsResult(self._items)


def make_user(user_id=1, unique_code="EMP001", is_active=True):
    return SimpleNamespace(
        id=user_id,
        unique_code=unique_code,
        is_active=is_active,
    )


def make_document(
    document_id=1,
    user_id=1,
    category=DocumentCategory.PERSONAL,
    doc_type=DocumentType.CONTRACT,
    file_name="test.pdf",
    file_path="uploads/documents/user_1/test.pdf",
    mime_type="application/pdf",
    expires_at=None,
    uploaded_by=1,
):
    doc = Document(
        user_id=user_id,
        uploaded_by=uploaded_by,
        type=doc_type,
        category=category,
        status=DocumentStatus.ACTIVE,
        file_name=file_name,
        file_path=file_path,
        mime_type=mime_type,
        expires_at=expires_at,
    )
    doc.id = document_id
    doc.created_at = datetime(2026, 3, 30, 10, 0, tzinfo=timezone.utc)
    return doc


def make_document_schema_response(document):
    return SimpleNamespace(
        id=document.id,
        user_id=document.user_id,
        uploaded_by=document.uploaded_by,
        type=document.type.value if hasattr(document.type, "value") else str(document.type),
        category=document.category.value if hasattr(document.category, "value") else str(document.category),
        status=document.status.value if hasattr(document.status, "value") else str(document.status),
        file_name=document.file_name,
        file_path=document.file_path,
        mime_type=document.mime_type,
        expires_at=document.expires_at,
        created_at=document.created_at,
    )


def make_upload_file(filename="doc.pdf", content_type="application/pdf", content=b"hello"):
    file_obj = io.BytesIO(content)
    return UploadFile(filename=filename, file=file_obj, headers={"content-type": content_type})


def test_parse_document_type_valid():
    result = parse_document_type(" contract ")
    assert result == DocumentType.CONTRACT


def test_parse_document_type_invalid():
    with pytest.raises(HTTPException) as exc:
        parse_document_type("invalid")

    assert exc.value.status_code == 400
    assert exc.value.detail == "Tip document invalid."


def test_parse_document_category_valid():
    result = parse_document_category(" personal ")
    assert result == DocumentCategory.PERSONAL


def test_parse_document_category_invalid():
    with pytest.raises(HTTPException) as exc:
        parse_document_category("invalid")

    assert exc.value.status_code == 400
    assert exc.value.detail == "Categorie document invalidă."


def test_ensure_allowed_file_valid():
    file = make_upload_file()
    ensure_allowed_file(file)


def test_ensure_allowed_file_invalid_content_type():
    file = make_upload_file(content_type="text/plain")

    with pytest.raises(HTTPException) as exc:
        ensure_allowed_file(file)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Tip fișier neacceptat."


def test_ensure_allowed_file_invalid_filename():
    file = make_upload_file(filename="   ")

    with pytest.raises(HTTPException) as exc:
        ensure_allowed_file(file)

    assert exc.value.status_code == 400
    assert exc.value.detail == "Fișier invalid."


def test_remove_file_if_exists(tmp_path):
    file_path = tmp_path / "demo.pdf"
    file_path.write_bytes(b"abc")

    assert file_path.exists() is True

    remove_file_if_exists(str(file_path))

    assert file_path.exists() is False


def test_remove_file_if_exists_no_error_for_missing_file(tmp_path):
    file_path = tmp_path / "missing.pdf"
    remove_file_if_exists(str(file_path))
    assert file_path.exists() is False


def test_save_uploaded_file(tmp_path, monkeypatch):
    monkeypatch.setattr("app.api.v1.endpoints.documents.UPLOAD_DIR", tmp_path)

    file = make_upload_file(filename="contract.pdf", content_type="application/pdf", content=b"content")

    original_name, file_path, mime_type = save_uploaded_file(file, user_id=7)

    assert original_name == "contract.pdf"
    assert mime_type == "application/pdf"

    saved_path = Path(file_path)
    assert saved_path.exists() is True
    assert saved_path.read_bytes() == b"content"
    assert "user_7" in file_path
    assert saved_path.name.endswith("_contract.pdf")


@pytest.mark.asyncio
async def test_get_user_by_id_or_404_returns_user():
    user = make_user(user_id=5)

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(user)

    result = await get_user_by_id_or_404(db, 5)

    assert result == user


@pytest.mark.asyncio
async def test_get_user_by_id_or_404_not_found():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    with pytest.raises(HTTPException) as exc:
        await get_user_by_id_or_404(db, 99)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Utilizatorul nu există."


@pytest.mark.asyncio
async def test_get_document_by_id_or_404_returns_document():
    document = make_document(document_id=3)

    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(document)

    result = await get_document_by_id_or_404(db, 3)

    assert result == document


@pytest.mark.asyncio
async def test_get_document_by_id_or_404_not_found():
    db = AsyncMock()
    db.execute.return_value = FakeScalarResult(None)

    with pytest.raises(HTTPException) as exc:
        await get_document_by_id_or_404(db, 88)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Documentul nu există."


def test_build_document_query_without_filters():
    query = build_document_query(user_id=1, category=None, type=None)
    text = str(query)

    assert "documents.user_id" in text


def test_build_document_query_with_filters():
    query = build_document_query(user_id=1, category="personal", type="contract")
    text = str(query)

    assert "documents.user_id" in text
    assert "documents.category" in text
    assert "documents.type" in text


@pytest.mark.asyncio
async def test_get_user_documents_for_admin(monkeypatch):
    user = make_user(user_id=1)
    documents = [
        make_document(document_id=1, user_id=1),
        make_document(document_id=2, user_id=1, file_name="doc2.pdf"),
    ]

    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.get_user_by_id_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.DocumentReadSchema.model_validate",
        lambda doc: make_document_schema_response(doc),
    )

    db = AsyncMock()
    db.execute.return_value = FakeResult(documents)

    response = await get_user_documents_for_admin(
        user_id=1,
        category=None,
        type=None,
        db=db,
        _=True,
    )

    assert len(response) == 2
    assert response[0].id == 1
    assert response[1].file_name == "doc2.pdf"


@pytest.mark.asyncio
async def test_get_my_documents(monkeypatch):
    user = make_user(user_id=1, unique_code="EMP001")
    documents = [
        make_document(document_id=1, user_id=1),
    ]

    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.ensure_user_is_active",
        lambda user: None,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.DocumentReadSchema.model_validate",
        lambda doc: make_document_schema_response(doc),
    )

    db = AsyncMock()
    db.execute.return_value = FakeResult(documents)

    response = await get_my_documents(
        code="EMP001",
        category=None,
        type=None,
        db=db,
    )

    assert len(response) == 1
    assert response[0].id == 1
    assert response[0].user_id == 1


@pytest.mark.asyncio
async def test_upload_my_document(monkeypatch):
    user = make_user(user_id=7, unique_code="EMP007")
    file = make_upload_file(filename="contract.pdf")

    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.ensure_user_is_active",
        lambda user: None,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.ensure_allowed_file",
        lambda upload_file: None,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.save_uploaded_file",
        lambda upload_file, user_id: (
            "contract.pdf",
            "uploads/documents/user_7/saved_contract.pdf",
            "application/pdf",
        ),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.DocumentReadSchema.model_validate",
        lambda doc: make_document_schema_response(doc),
    )

    db = AsyncMock()
    db.add = Mock()

    async def refresh_side_effect(obj):
        obj.id = 100
        obj.created_at = datetime(2026, 3, 30, 12, 0, tzinfo=timezone.utc)

    db.refresh.side_effect = refresh_side_effect

    response = await upload_my_document(
        code="EMP007",
        type="contract",
        file=file,
        expires_at=None,
        db=db,
    )

    assert response.id == 100
    assert response.user_id == 7
    assert response.file_name == "contract.pdf"
    assert response.file_path == "uploads/documents/user_7/saved_contract.pdf"
    assert response.mime_type == "application/pdf"
    assert response.type == "contract"
    assert response.category == "personal"
    assert response.status == "active"

    db.add.assert_called_once()
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once()


@pytest.mark.asyncio
async def test_download_document_forbidden(monkeypatch):
    user = make_user(user_id=1)
    document = make_document(document_id=10, user_id=2)

    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.ensure_user_is_active",
        lambda user: None,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.get_document_by_id_or_404",
        AsyncMock(return_value=document),
    )

    db = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await download_document(document_id=10, code="EMP001", db=db)

    assert exc.value.status_code == 403
    assert exc.value.detail == "Acces interzis."


@pytest.mark.asyncio
async def test_download_document_missing_file(monkeypatch):
    user = make_user(user_id=1)
    document = make_document(document_id=10, user_id=1, file_path="missing.pdf")

    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.ensure_user_is_active",
        lambda user: None,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.get_document_by_id_or_404",
        AsyncMock(return_value=document),
    )

    db = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await download_document(document_id=10, code="EMP001", db=db)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Fișier lipsă."


@pytest.mark.asyncio
async def test_download_document_success(tmp_path, monkeypatch):
    user = make_user(user_id=1)
    file_path = tmp_path / "file.pdf"
    file_path.write_bytes(b"abc")

    document = make_document(
        document_id=10,
        user_id=1,
        file_name="file.pdf",
        file_path=str(file_path),
        mime_type="application/pdf",
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.ensure_user_is_active",
        lambda user: None,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.get_document_by_id_or_404",
        AsyncMock(return_value=document),
    )

    db = AsyncMock()

    response = await download_document(document_id=10, code="EMP001", db=db)

    assert isinstance(response, FileResponse)
    assert Path(response.path) == file_path
    assert response.media_type == "application/pdf"


@pytest.mark.asyncio
async def test_admin_download_document_success(tmp_path, monkeypatch):
    file_path = tmp_path / "admin_file.pdf"
    file_path.write_bytes(b"abc")

    document = make_document(
        document_id=11,
        file_name="admin_file.pdf",
        file_path=str(file_path),
        mime_type="application/pdf",
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.get_document_by_id_or_404",
        AsyncMock(return_value=document),
    )

    db = AsyncMock()

    response = await admin_download_document(document_id=11, db=db, _=True)

    assert isinstance(response, FileResponse)
    assert Path(response.path) == file_path
    assert response.media_type == "application/pdf"


@pytest.mark.asyncio
async def test_delete_my_document_forbidden_if_not_owner(monkeypatch):
    user = make_user(user_id=1)
    document = make_document(document_id=10, user_id=2)

    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.ensure_user_is_active",
        lambda user: None,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.get_document_by_id_or_404",
        AsyncMock(return_value=document),
    )

    db = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await delete_my_document(document_id=10, code="EMP001", db=db)

    assert exc.value.status_code == 403
    assert exc.value.detail == "Acces interzis."


@pytest.mark.asyncio
async def test_delete_my_document_forbidden_if_not_personal(monkeypatch):
    user = make_user(user_id=1)
    document = make_document(
        document_id=10,
        user_id=1,
        category=DocumentCategory.COMPANY,
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.ensure_user_is_active",
        lambda user: None,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.get_document_by_id_or_404",
        AsyncMock(return_value=document),
    )

    db = AsyncMock()

    with pytest.raises(HTTPException) as exc:
        await delete_my_document(document_id=10, code="EMP001", db=db)

    assert exc.value.status_code == 403
    assert exc.value.detail == "Doar documente personale."


@pytest.mark.asyncio
async def test_delete_my_document_success(monkeypatch):
    user = make_user(user_id=1)
    document = make_document(
        document_id=10,
        user_id=1,
        category=DocumentCategory.PERSONAL,
        file_path="uploads/documents/user_1/doc.pdf",
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.get_user_by_code_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.ensure_user_is_active",
        lambda user: None,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.get_document_by_id_or_404",
        AsyncMock(return_value=document),
    )

    removed_paths = []
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.remove_file_if_exists",
        lambda path: removed_paths.append(path),
    )

    db = AsyncMock()

    response = await delete_my_document(document_id=10, code="EMP001", db=db)

    assert response.status_code == 204
    assert removed_paths == ["uploads/documents/user_1/doc.pdf"]
    db.delete.assert_awaited_once_with(document)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_admin_delete_document_success(monkeypatch):
    document = make_document(
        document_id=10,
        file_path="uploads/documents/user_1/doc.pdf",
    )

    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.get_document_by_id_or_404",
        AsyncMock(return_value=document),
    )

    removed_paths = []
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.remove_file_if_exists",
        lambda path: removed_paths.append(path),
    )

    db = AsyncMock()

    response = await admin_delete_document(document_id=10, db=db, _=True)

    assert response.status_code == 204
    assert removed_paths == ["uploads/documents/user_1/doc.pdf"]
    db.delete.assert_awaited_once_with(document)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_admin_upload_document(monkeypatch):
    user = make_user(user_id=9)
    file = make_upload_file(filename="license.pdf")

    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.get_user_by_id_or_404",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.ensure_allowed_file",
        lambda upload_file: None,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.save_uploaded_file",
        lambda upload_file, user_id: (
            "license.pdf",
            "uploads/documents/user_9/saved_license.pdf",
            "application/pdf",
        ),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.documents.DocumentReadSchema.model_validate",
        lambda doc: make_document_schema_response(doc),
    )

    db = AsyncMock()
    db.add = Mock()

    async def refresh_side_effect(obj):
        obj.id = 222
        obj.created_at = datetime(2026, 3, 30, 13, 0, tzinfo=timezone.utc)

    db.refresh.side_effect = refresh_side_effect

    response = await admin_upload_document(
        user_id=9,
        type="driver_license",
        category="company",
        file=file,
        expires_at=None,
        db=db,
        _=True,
    )

    assert response.id == 222
    assert response.user_id == 9
    assert response.uploaded_by is None
    assert response.file_name == "license.pdf"
    assert response.file_path == "uploads/documents/user_9/saved_license.pdf"
    assert response.mime_type == "application/pdf"
    assert response.type == "driver_license"
    assert response.category == "company"
    assert response.status == "active"

    db.add.assert_called_once()
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once()