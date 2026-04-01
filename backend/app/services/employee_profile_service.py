from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.employee_profile import EmployeeProfile
from app.db.models.user import User
from app.schemas.employee_profile import (
    EmployeeProfileCreateSchema,
    EmployeeProfileUpdateSchema,
)


class EmployeeProfileService:
    @staticmethod
    async def get_by_user_id(
        db: AsyncSession,
        user_id: int,
    ) -> EmployeeProfile | None:
        result = await db.execute(
            select(EmployeeProfile).where(EmployeeProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def ensure_user_exists(
        db: AsyncSession,
        user_id: int,
    ) -> User:
        user = await db.get(User, user_id)

        if user is None:
            raise ValueError("User not found.")

        return user

    @staticmethod
    async def ensure_username_available(
        db: AsyncSession,
        username: str,
        current_user_id: int,
    ) -> None:
        result = await db.execute(
            select(User).where(User.username == username)
        )
        existing_user = result.scalar_one_or_none()

        if existing_user is not None and existing_user.id != current_user_id:
            raise ValueError("Username already in use.")

    @staticmethod
    async def create(
        db: AsyncSession,
        payload: EmployeeProfileCreateSchema,
    ) -> EmployeeProfile:
        await EmployeeProfileService.ensure_user_exists(db, payload.user_id)

        existing_profile = await EmployeeProfileService.get_by_user_id(
            db,
            payload.user_id,
        )
        if existing_profile is not None:
            raise ValueError("Employee profile already exists for this user.")

        profile = EmployeeProfile(
            user_id=payload.user_id,
            first_name=payload.first_name,
            last_name=payload.last_name,
            phone=payload.phone,
            address=payload.address,
            position=payload.position,
            department=payload.department,
            hire_date=payload.hire_date,
            iban=payload.iban,
            emergency_contact_name=payload.emergency_contact_name,
            emergency_contact_phone=payload.emergency_contact_phone,
        )

        db.add(profile)

        try:
            await db.commit()
            await db.refresh(profile)
        except Exception:
            await db.rollback()
            raise

        return profile

    @staticmethod
    async def update(
        db: AsyncSession,
        profile: EmployeeProfile,
        payload: EmployeeProfileUpdateSchema,
    ) -> EmployeeProfile:
        update_data = payload.model_dump(exclude_unset=True)

        username = update_data.pop("username", None)

        for field_name, value in update_data.items():
            setattr(profile, field_name, value)

        if username is not None:
            normalized_username = username.strip() or None

            user = await db.get(User, profile.user_id)
            if user is None:
                raise ValueError("User not found.")

            if normalized_username is not None:
                await EmployeeProfileService.ensure_username_available(
                    db,
                    normalized_username,
                    user.id,
                )

            user.username = normalized_username

        try:
            await db.commit()
            await db.refresh(profile)
        except Exception:
            await db.rollback()
            raise

        return profile