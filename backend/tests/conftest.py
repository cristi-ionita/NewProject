import os
import sys
from pathlib import Path
import pytest_asyncio

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

os.environ.setdefault("APP_ENV_FILE", ".env.test")
os.environ.setdefault("ADMIN_PASSWORD", "admin")
os.environ.setdefault("ADMIN_TOKEN_SECRET", "test-secret")

import asyncio

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.db.base import Base



@pytest_asyncio.fixture(scope="function")
async def engine():
    settings = get_settings()
    engine = create_async_engine(settings.database_url, future=True)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(engine):
    async with engine.connect() as connection:
        transaction = await connection.begin()

        async_session = sessionmaker(
            bind=connection,
            class_=AsyncSession,
            expire_on_commit=False,
        )

        async with async_session() as session:
            yield session

        await transaction.rollback()