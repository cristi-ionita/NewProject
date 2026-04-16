from __future__ import annotations

import shutil
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import get_current_admin, get_current_driver
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

ALLOWED_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
}


def validate_file(file: UploadFile) -> None:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tip fișier neacceptat.",
        )

    if not file.filename or not file.filename.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fișier invalid.",
        )

    if file.content_type == "application/pdf":
        header = file.file.read(4)
        file.file.seek(0)

        if header != b"%PDF":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fișier PDF invalid.",
            )


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


def save_file(file: UploadFile, user_id: int) -> tuple[str, str]:
    user_dir = UPLOAD_DIR / f"user_{user_id}"
    user_dir.mkdir(parents=True, exist_ok=True)

    original_name = Path(file.filename).name
    safe_name = f"{uuid.uuid4().hex}_{original_name}"
    path = user_dir / safe_name

    with path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return original_name, str(path)


async def get_document_or_404(db: AsyncSession, doc_id: int) -> Document:
    doc = (
        await db.execute(select(Document).where(Document.id == doc_id))
    ).scalar_one_or_none()

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    return doc


@router.post("/upload", response_model=DocumentReadSchema, status_code=status.HTTP_201_CREATED)
async def upload_my_document(
    type: str = Form(...),
    file: UploadFile = File(...),
    expires_at: datetime | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_driver),
) -> DocumentReadSchema:
    validate_file(file)

    original_name, path = save_file(file, current_user.id)

    document = Document(
        user_id=current_user.id,
        uploaded_by=current_user.id,
        type=parse_document_type(type),
        category=DocumentCategory.PERSONAL,
        status=DocumentStatus.ACTIVE,
        file_name=original_name,
        file_path=path,
        mime_type=file.content_type,
        expires_at=expires_at,
    )

    db.add(document)
    await db.commit()
    await db.refresh(document)

    return DocumentReadSchema.model_validate(document)


@router.get("/me", response_model=list[DocumentReadSchema])
async def get_my_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_driver),
) -> list[DocumentReadSchema]:
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    )

    return [DocumentReadSchema.model_validate(d) for d in result.scalars().all()]


@router.get("/{doc_id}/download")
async def download_my_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_driver),
):
    doc = await get_document_or_404(db, doc_id)

    if doc.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )

    path = Path(doc.file_path)

    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File missing.",
        )

    return FileResponse(path, filename=doc.file_name, media_type=doc.mime_type)


@router.delete("/{doc_id}")
async def delete_my_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_driver),
):
    doc = await get_document_or_404(db, doc_id)

    if doc.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )

    Path(doc.file_path).unlink(missing_ok=True)

    await db.delete(doc)
    await db.commit()

    return {"ok": True}


@router.get("/admin/{user_id}", response_model=list[DocumentReadSchema])
async def get_user_documents(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> list[DocumentReadSchema]:
    result = await db.execute(
        select(Document)
        .where(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
    )

    return [DocumentReadSchema.model_validate(d) for d in result.scalars().all()]


@router.get("/admin/{doc_id}/download")
async def admin_download_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    doc = await get_document_or_404(db, doc_id)

    path = Path(doc.file_path)

    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File missing.",
        )

    return FileResponse(path, filename=doc.file_name, media_type=doc.mime_type)


@router.delete("/admin/{doc_id}")
async def admin_delete_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    doc = await get_document_or_404(db, doc_id)

    Path(doc.file_path).unlink(missing_ok=True)

    await db.delete(doc)
    await db.commit()

    return {"ok": True}


@router.post(
    "/admin/upload/{user_id}",
    response_model=DocumentReadSchema,
    status_code=status.HTTP_201_CREATED,
)
async def admin_upload_document(
    user_id: int,
    type: str = Form(...),
    category: str = Form(...),
    file: UploadFile = File(...),
    expires_at: datetime | None = Form(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> DocumentReadSchema:
    validate_file(file)

    original_name, path = save_file(file, user_id)

    document = Document(
        user_id=user_id,
        uploaded_by=None,
        type=parse_document_type(type),
        category=parse_document_category(category),
        status=DocumentStatus.ACTIVE,
        file_name=original_name,
        file_path=path,
        mime_type=file.content_type,
        expires_at=expires_at,
    )

    db.add(document)
    await db.commit()
    await db.refresh(document)

    return DocumentReadSchema.model_validate(document)