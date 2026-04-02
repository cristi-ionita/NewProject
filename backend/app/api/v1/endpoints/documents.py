from __future__ import annotations

import shutil
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import (
    ensure_user_is_active,
    get_current_admin,
    get_user_by_code_or_404,
)
from app.core.constants import ALLOWED_DOCUMENT_CONTENT_TYPES
from app.db.models.document import (
    Document,
    DocumentCategory,
    DocumentStatus,
    DocumentType,
)
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.document import DocumentReadSchema

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = Path("uploads/documents")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# =========================
# HELPERS
# =========================


def parse_document_type(value: str) -> DocumentType:
    try:
        return DocumentType[value.strip().upper()]
    except KeyError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tip document invalid.",
        ) from err


def parse_document_category(value: str) -> DocumentCategory:
    try:
        return DocumentCategory[value.strip().upper()]
    except KeyError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Categorie document invalidă.",
        ) from err


def ensure_allowed_file(upload_file: UploadFile) -> None:
    if upload_file.content_type not in ALLOWED_DOCUMENT_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tip fișier neacceptat.",
        )

    if not upload_file.filename or not upload_file.filename.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fișier invalid.",
        )


def remove_file_if_exists(file_path: str) -> None:
    path = Path(file_path)
    if path.exists() and path.is_file():
        path.unlink()


def save_uploaded_file(upload_file: UploadFile, user_id: int) -> tuple[str, str, str]:
    user_dir = UPLOAD_DIR / f"user_{user_id}"
    user_dir.mkdir(parents=True, exist_ok=True)

    original_name = upload_file.filename.strip()
    safe_name = f"{uuid.uuid4().hex}_{original_name}"
    file_path = user_dir / safe_name

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)

    return original_name, str(file_path), upload_file.content_type or "application/octet-stream"


async def get_user_by_id_or_404(db: AsyncSession, user_id: int) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilizatorul nu există.",
        )

    return user


async def get_document_by_id_or_404(db: AsyncSession, document_id: int) -> Document:
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documentul nu există.",
        )

    return document


def build_document_query(user_id: int, category: str | None, type: str | None):
    query = select(Document).where(Document.user_id == user_id)

    if category:
        query = query.where(Document.category == parse_document_category(category))

    if type:
        query = query.where(Document.type == parse_document_type(type))

    return query.order_by(Document.created_at.desc())


# =========================
# ENDPOINTS
# =========================


@router.get("/admin/user/{user_id}", response_model=list[DocumentReadSchema])
async def get_user_documents_for_admin(
    user_id: int,
    category: str | None = None,
    type: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    user = await get_user_by_id_or_404(db, user_id)

    result = await db.execute(build_document_query(user.id, category, type))
    documents = result.scalars().all()

    return [DocumentReadSchema.model_validate(doc) for doc in documents]


@router.get("/me/{code}", response_model=list[DocumentReadSchema])
async def get_my_documents(
    code: str,
    category: str | None = None,
    type: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_code_or_404(code, db)
    ensure_user_is_active(user)

    result = await db.execute(build_document_query(user.id, category, type))
    documents = result.scalars().all()

    return [DocumentReadSchema.model_validate(doc) for doc in documents]


@router.post("/upload/{code}", response_model=DocumentReadSchema, status_code=201)
async def upload_my_document(
    code: str,
    type: str = Form(...),
    file: UploadFile = File(...),
    expires_at: datetime | None = Form(None),
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_code_or_404(code, db)
    ensure_user_is_active(user)

    ensure_allowed_file(file)

    file_name, file_path, mime_type = save_uploaded_file(file, user.id)

    document = Document(
        user_id=user.id,
        uploaded_by=user.id,
        type=parse_document_type(type),
        category=DocumentCategory.PERSONAL,
        status=DocumentStatus.ACTIVE,
        file_name=file_name,
        file_path=file_path,
        mime_type=mime_type,
        expires_at=expires_at,
    )

    db.add(document)
    await db.commit()
    await db.refresh(document)

    return DocumentReadSchema.model_validate(document)


@router.get("/{document_id}/download/{code}")
async def download_document(
    document_id: int,
    code: str,
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_code_or_404(code, db)
    ensure_user_is_active(user)

    document = await get_document_by_id_or_404(db, document_id)

    if document.user_id != user.id:
        raise HTTPException(status_code=403, detail="Acces interzis.")

    file_path = Path(document.file_path)

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Fișier lipsă.")

    return FileResponse(
        path=file_path,
        filename=document.file_name,
        media_type=document.mime_type,
    )


@router.get("/admin/{document_id}/download")
async def admin_download_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    document = await get_document_by_id_or_404(db, document_id)

    file_path = Path(document.file_path)

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Fișier lipsă.")

    return FileResponse(
        path=file_path,
        filename=document.file_name,
        media_type=document.mime_type,
    )


@router.delete("/me/{document_id}/{code}", status_code=204)
async def delete_my_document(
    document_id: int,
    code: str,
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_code_or_404(code, db)
    ensure_user_is_active(user)

    document = await get_document_by_id_or_404(db, document_id)

    if document.user_id != user.id:
        raise HTTPException(status_code=403, detail="Acces interzis.")

    if document.category != DocumentCategory.PERSONAL:
        raise HTTPException(status_code=403, detail="Doar documente personale.")

    remove_file_if_exists(document.file_path)

    await db.delete(document)
    await db.commit()

    return Response(status_code=204)


@router.delete("/admin/{document_id}", status_code=204)
async def admin_delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    document = await get_document_by_id_or_404(db, document_id)

    remove_file_if_exists(document.file_path)

    await db.delete(document)
    await db.commit()

    return Response(status_code=204)


@router.post("/admin/upload/{user_id}", response_model=DocumentReadSchema, status_code=201)
async def admin_upload_document(
    user_id: int,
    type: str = Form(...),
    category: str = Form(...),
    file: UploadFile = File(...),
    expires_at: datetime | None = Form(None),
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    user = await get_user_by_id_or_404(db, user_id)

    ensure_allowed_file(file)

    file_name, file_path, mime_type = save_uploaded_file(file, user.id)

    document = Document(
        user_id=user.id,
        uploaded_by=None,
        type=parse_document_type(type),
        category=parse_document_category(category),
        status=DocumentStatus.ACTIVE,
        file_name=file_name,
        file_path=file_path,
        mime_type=mime_type,
        expires_at=expires_at,
    )

    db.add(document)
    await db.commit()
    await db.refresh(document)

    return DocumentReadSchema.model_validate(document)