from unittest.mock import AsyncMock, Mock

import pytest

from app.db import session as session_module


def test_get_engine_builds_engine(monkeypatch):
    fake_settings = Mock(database_url="postgresql+asyncpg://user:pass@localhost:5432/test_db")
    fake_engine = object()
    create_async_engine_mock = Mock(return_value=fake_engine)

    session_module.get_engine.cache_clear()

    monkeypatch.setattr(session_module, "get_settings", Mock(return_value=fake_settings))
    monkeypatch.setattr(session_module, "create_async_engine", create_async_engine_mock)

    result = session_module.get_engine()

    assert result is fake_engine
    create_async_engine_mock.assert_called_once_with(
        fake_settings.database_url,
        echo=False,
        pool_pre_ping=True,
    )


def test_get_session_local_builds_sessionmaker(monkeypatch):
    fake_engine = object()
    fake_session_local = object()
    async_sessionmaker_mock = Mock(return_value=fake_session_local)

    session_module.get_session_local.cache_clear()

    monkeypatch.setattr(session_module, "get_engine", Mock(return_value=fake_engine))
    monkeypatch.setattr(session_module, "async_sessionmaker", async_sessionmaker_mock)

    result = session_module.get_session_local()

    assert result is fake_session_local
    async_sessionmaker_mock.assert_called_once_with(
        bind=fake_engine,
        class_=session_module.AsyncSession,
        expire_on_commit=False,
    )


@pytest.mark.asyncio
async def test_get_db_yields_session_and_closes_it(monkeypatch):
    session_module.get_session_local.cache_clear()

    fake_session = AsyncMock()

    class FakeSessionContext:
        async def __aenter__(self):
            return fake_session

        async def __aexit__(self, exc_type, exc, tb):
            return None

    fake_session_local = Mock(return_value=FakeSessionContext())

    monkeypatch.setattr(session_module, "get_session_local", Mock(return_value=fake_session_local))

    gen = session_module.get_db()
    yielded = await anext(gen)

    assert yielded is fake_session

    with pytest.raises(StopAsyncIteration):
        await anext(gen)

    fake_session.close.assert_awaited_once()
