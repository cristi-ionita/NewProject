from io import BytesIO

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.document import Document
from app.db.models.user import User
from app.db.session import get_db
from app.main import app


@pytest.mark.asyncio
async def test_upload_my_document_creates_document_in_db(db_session: AsyncSession):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    user = User(
        full_name="Maria Upload",
        shift_number="1",
        unique_code="EMP900",
        username="maria.upload",
        pin_hash="hashed-pin",
        password_hash="hashed-pass",
        is_active=True,
        role="employee",
    )

    db_session.add(user)
    await db_session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/documents/upload/EMP900",
            data={"type": "other"},
            files={"file": ("test.pdf", BytesIO(b"fake pdf content"), "application/pdf")},
        )

    assert response.status_code == 201

    data = response.json()
    assert data["user_id"] == user.id
    assert data["category"] == "personal"
    assert data["status"] == "active"

    result = await db_session.execute(
        select(Document).where(Document.user_id == user.id)
    )
    created_document = result.scalar_one_or_none()

    assert created_document is not None
    assert created_document.user_id == user.id
    assert created_document.file_name == "test.pdf"
    assert created_document.mime_type == "application/pdf"

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_upload_my_document_fails_with_invalid_type(db_session: AsyncSession):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    user = User(
        full_name="Invalid Type User",
        shift_number="1",
        unique_code="EMP901",
        username="invalid.type",
        pin_hash="hashed-pin",
        password_hash="hashed-pass",
        is_active=True,
        role="employee",
    )

    db_session.add(user)
    await db_session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/documents/upload/EMP901",
            data={"type": "invalid_type"},
            files={"file": ("test.pdf", BytesIO(b"fake pdf content"), "application/pdf")},
        )

    assert response.status_code == 400
    assert "invalid" in response.json()["detail"].lower()

    app.dependency_overrides.clear()