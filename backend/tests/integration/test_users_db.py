import pytest
from sqlalchemy import select

from app.api.v1.dependencies import get_user_by_code
from app.db.models.user import User


@pytest.mark.asyncio
async def test_get_user_by_code_returns_real_user_from_db(db_session):
    user = User(
        full_name="Ana Popescu",
        shift_number="2",
        unique_code="EMP001",
        username="ana.popescu",
        pin_hash="hashed-pin",
        password_hash="dummy-password-hash",
        is_active=True,
        role="employee",
    )

    db_session.add(user)
    await db_session.commit()

    result = await get_user_by_code("EMP001", db_session)

    assert result is not None
    assert result.unique_code == "EMP001"
    assert result.full_name == "Ana Popescu"

    db_result = await db_session.execute(
        select(User).where(User.unique_code == "EMP001")
    )
    persisted_user = db_result.scalar_one_or_none()

    assert persisted_user is not None
    assert persisted_user.username == "ana.popescu"