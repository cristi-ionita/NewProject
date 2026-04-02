from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.document import Document, DocumentCategory, DocumentType
from app.db.models.employee_profile import EmployeeProfile
from app.db.models.user import User
from app.schemas.profile_summary import (
    ProfileDocumentsSummarySchema,
    ProfileEmployeeInfoSchema,
    ProfileSummaryResponseSchema,
    ProfileUserInfoSchema,
)


class ProfileSummaryService:
    @staticmethod
    async def get_user_by_id(
        db: AsyncSession,
        user_id: int,
    ) -> User | None:
        user_result = await db.execute(select(User).where(User.id == user_id))
        return user_result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_unique_code(
        db: AsyncSession,
        code: str,
    ) -> User | None:
        user_result = await db.execute(select(User).where(User.unique_code == code.strip()))
        return user_result.scalar_one_or_none()

    @staticmethod
    async def get_employee_profile(
        db: AsyncSession,
        user_id: int,
    ) -> EmployeeProfile | None:
        profile_result = await db.execute(
            select(EmployeeProfile).where(EmployeeProfile.user_id == user_id)
        )
        return profile_result.scalar_one_or_none()

    @staticmethod
    async def get_documents(
        db: AsyncSession,
        user_id: int,
    ) -> list[Document]:
        documents_result = await db.execute(select(Document).where(Document.user_id == user_id))
        return list(documents_result.scalars().all())

    @staticmethod
    def build_documents_summary(
        documents: list[Document],
    ) -> ProfileDocumentsSummarySchema:
        total_documents = len(documents)
        personal_documents = sum(
            1 for document in documents if document.category == DocumentCategory.PERSONAL
        )
        company_documents = sum(
            1 for document in documents if document.category == DocumentCategory.COMPANY
        )

        has_contract = any(document.type == DocumentType.CONTRACT for document in documents)
        has_payslip = any(document.type == DocumentType.PAYSLIP for document in documents)
        has_driver_license = any(
            document.type == DocumentType.DRIVER_LICENSE for document in documents
        )

        return ProfileDocumentsSummarySchema(
            total_documents=total_documents,
            personal_documents=personal_documents,
            company_documents=company_documents,
            has_contract=has_contract,
            has_payslip=has_payslip,
            has_driver_license=has_driver_license,
        )

    @staticmethod
    async def get_by_user_id(
        db: AsyncSession,
        user_id: int,
    ) -> ProfileSummaryResponseSchema | None:
        user = await ProfileSummaryService.get_user_by_id(db, user_id)
        if user is None:
            return None

        employee_profile = await ProfileSummaryService.get_employee_profile(
            db,
            user.id,
        )
        documents = await ProfileSummaryService.get_documents(db, user.id)

        return ProfileSummaryResponseSchema(
            user=ProfileUserInfoSchema.model_validate(user),
            employee_profile=(
                ProfileEmployeeInfoSchema.model_validate(employee_profile)
                if employee_profile is not None
                else None
            ),
            documents_summary=ProfileSummaryService.build_documents_summary(documents),
        )

    @staticmethod
    async def get_by_unique_code(
        db: AsyncSession,
        code: str,
    ) -> ProfileSummaryResponseSchema | None:
        user = await ProfileSummaryService.get_user_by_unique_code(db, code)
        if user is None:
            return None

        return await ProfileSummaryService.get_by_user_id(db, user.id)
