import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.models.user import User

settings = get_settings()

engine = create_async_engine(settings.database_url, future=True)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

ADMIN_USERNAME = "administrator"
ADMIN_PASSWORD = "admin"


async def create_admin():
    async with SessionLocal() as db:
        result = await db.execute(
            select(User).where(User.role == "admin")
        )
        existing_admin = result.scalar_one_or_none()

        if existing_admin:
            print("❗ Admin already exists.")
            return

        admin = User(
            full_name="Administrator",
            username=ADMIN_USERNAME,
            unique_code="admin",
            password_hash=hash_password(ADMIN_PASSWORD),
            pin_hash=None,
            shift_number=None,
            role="admin",
            is_active=True,
        )

        db.add(admin)
        await db.commit()
        await db.refresh(admin)

        print("✅ Admin created successfully!")
        print(f"Username: {ADMIN_USERNAME}")
        print("Password: [hidden for security]")


if __name__ == "__main__":
    asyncio.run(create_admin())