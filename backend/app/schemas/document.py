from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.db.models.document import DocumentCategory, DocumentStatus, DocumentType


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DocumentBaseSchema(BaseSchema):
    type: DocumentType
    category: DocumentCategory
    status: DocumentStatus = DocumentStatus.ACTIVE
    expires_at: datetime | None = None


class DocumentCreateSchema(DocumentBaseSchema):
    user_id: int


class DocumentUpdateSchema(BaseSchema):
    type: DocumentType | None = None
    category: DocumentCategory | None = None
    status: DocumentStatus | None = None
    expires_at: datetime | None = None


class DocumentReadSchema(DocumentBaseSchema):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    user_id: int
    uploaded_by: int | None = None
    file_name: str = Field(..., min_length=1, max_length=255)
    mime_type: str = Field(..., min_length=1, max_length=100)
    created_at: datetime
    updated_at: datetime
