import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.api.v1.dependencies import get_current_admin
from app.db.models.user import User
from app.db.session import get_db
from app.main import app


def override_get_current_admin():
    return True


client = TestClient(app)


def test_list_users_returns_empty_list_initially():
    app.dependency_overrides[get_current_admin] = override_get_current_admin

    response = client.get("/api/v1/users")

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_users_returns_created_user(db_session: AsyncSession):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_current_admin] = override_get_current_admin
    app.dependency_overrides[get_db] = override_get_db

    user = User(
        full_name="Ion Popescu",
        shift_number="1",
        unique_code="EMP123",
        username="ion.popescu",
        pin_hash="hashed-pin",
        password_hash="hashed-pass",
        is_active=True,
        role="employee",
    )

    db_session.add(user)
    await db_session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/users")

    assert response.status_code == 200

    data = response.json()
    assert len(data) == 1
    assert data[0]["full_name"] == "Ion Popescu"

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_create_user_creates_user_in_db(db_session: AsyncSession):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_current_admin] = override_get_current_admin
    app.dependency_overrides[get_db] = override_get_db

    payload = {
        "full_name": "Maria Ionescu",
        "shift_number": "2",
        "pin": "1234",
        "role": "employee",
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/v1/users", json=payload)

    assert response.status_code == 201

    data = response.json()
    assert data["full_name"] == "Maria Ionescu"
    assert data["shift_number"] == "2"
    assert data["role"] == "employee"
    assert data["is_active"] is True
    assert data["unique_code"]

    result = await db_session.execute(
        select(User).where(User.full_name == "Maria Ionescu")
    )
    created_user = result.scalar_one_or_none()

    assert created_user is not None
    assert created_user.shift_number == "2"
    assert created_user.role == "employee"
    assert created_user.pin_hash is not None

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_list_users_active_only_returns_only_active_users(db_session: AsyncSession):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_current_admin] = override_get_current_admin
    app.dependency_overrides[get_db] = override_get_db

    active_user = User(
        full_name="Ana Active",
        shift_number="1",
        unique_code="EMP201",
        username="ana.active",
        pin_hash="hashed-pin",
        password_hash="hashed-pass",
        is_active=True,
        role="employee",
    )
    inactive_user = User(
        full_name="Ion Inactiv",
        shift_number="2",
        unique_code="EMP202",
        username="ion.inactiv",
        pin_hash="hashed-pin",
        password_hash="hashed-pass",
        is_active=False,
        role="employee",
    )

    db_session.add_all([active_user, inactive_user])
    await db_session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/users?active_only=true")

    assert response.status_code == 200

    data = response.json()
    assert len(data) == 1
    assert data[0]["full_name"] == "Ana Active"
    assert data[0]["is_active"] is True

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_create_user_fails_when_shift_already_taken(db_session: AsyncSession):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_current_admin] = override_get_current_admin
    app.dependency_overrides[get_db] = override_get_db

    payload = {
        "full_name": "User One",
        "shift_number": "1",
        "pin": "1234",
        "role": "employee",
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response1 = await ac.post("/api/v1/users", json=payload)

        assert response1.status_code == 201

        response2 = await ac.post("/api/v1/users", json=payload)

    assert response2.status_code == 400
    assert response2.json()["detail"] == "Tura nu este liberă."

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_create_user_fails_when_full_name_not_unique(db_session: AsyncSession):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_current_admin] = override_get_current_admin
    app.dependency_overrides[get_db] = override_get_db

    payload = {
        "full_name": "Duplicate User",
        "shift_number": "1",
        "pin": "1234",
        "role": "employee",
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response1 = await ac.post("/api/v1/users", json=payload)
        assert response1.status_code == 201

        # schimbăm shift-ul ca să nu pice din testul anterior
        payload2 = {
            "full_name": "Duplicate User",
            "shift_number": "2",
            "pin": "1234",
            "role": "employee",
        }

        response2 = await ac.post("/api/v1/users", json=payload2)

    assert response2.status_code == 400
    assert "există" in response2.json()["detail"].lower()

    app.dependency_overrides.clear()