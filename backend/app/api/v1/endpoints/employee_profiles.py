from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import (
    get_current_admin,
    get_user_by_code_or_404,
)
from app.core.security import hash_pin
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.employee_profile import (
    EmployeeProfileCreateSchema,
    EmployeeProfileReadSchema,
    EmployeeProfileUpdateSchema,
)
from app.schemas.profile_summary import ProfileSummaryResponseSchema
from app.services.employee_profile_service import EmployeeProfileService
from app.services.profile_summary_service import ProfileSummaryService

router = APIRouter(prefix="/employee-profiles", tags=["employee-profiles"])


async def get_employee_profile_or_404(
    db: AsyncSession,
    user_id: int,
):
    profile = await EmployeeProfileService.get_by_user_id(db, user_id)

    if profile is None:
        raise HTTPException(404, "Employee profile not found.")

    return profile


def ensure_user_is_active(summary) -> None:
    if not summary.user.is_active:
        raise HTTPException(403, "User inactiv.")


@router.post(
    "",
    response_model=EmployeeProfileReadSchema,
    status_code=status.HTTP_201_CREATED,
)
async def create_employee_profile(
    payload: EmployeeProfileCreateSchema,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
) -> EmployeeProfileReadSchema:
    try:
        profile = await EmployeeProfileService.create(db, payload)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    return EmployeeProfileReadSchema.model_validate(profile)


@router.get(
    "/{user_id}",
    response_model=EmployeeProfileReadSchema,
)
async def get_employee_profile_by_user_id(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
) -> EmployeeProfileReadSchema:
    profile = await get_employee_profile_or_404(db, user_id)
    return EmployeeProfileReadSchema.model_validate(profile)


@router.put(
    "/{user_id}",
    response_model=EmployeeProfileReadSchema,
)
async def update_employee_profile(
    user_id: int,
    payload: EmployeeProfileUpdateSchema,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
) -> EmployeeProfileReadSchema:
    profile = await get_employee_profile_or_404(db, user_id)

    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()

    if user is None:
        raise HTTPException(404, "User not found.")

    update_data = payload.model_dump(exclude_unset=True)

    if "username" in update_data:
        normalized_code = (update_data["username"] or "").strip()

        if normalized_code:
            existing_user_result = await db.execute(
                select(User).where(
                    User.unique_code == normalized_code,
                    User.id != user.id,
                )
            )
            existing_user = existing_user_result.scalar_one_or_none()

            if existing_user is not None:
                raise HTTPException(400, "Acest username este deja folosit.")

            user.unique_code = normalized_code

    if "pin" in update_data:
        pin = (update_data["pin"] or "").strip()

        if not pin.isdigit() or len(pin) != 4:
            raise HTTPException(400, "PIN-ul trebuie să fie format din 4 cifre.")

        user.pin_hash = hash_pin(pin)

    updated_profile = await EmployeeProfileService.update(
        db,
        profile,
        payload,
    )

    await db.commit()
    await db.refresh(updated_profile)

    return EmployeeProfileReadSchema.model_validate(updated_profile)


@router.put(
    "/me/{code}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def update_my_employee_profile(
    code: str,
    payload: EmployeeProfileUpdateSchema,
    db: AsyncSession = Depends(get_db),
) -> Response:
    user = await get_user_by_code_or_404(code, db)

    if not user.is_active:
        raise HTTPException(403, "User inactiv.")

    update_data = payload.model_dump(exclude_unset=True)

    # username-ul editat în UI = unique_code în DB
    if "username" in update_data:
        normalized_code = (update_data["username"] or "").strip()

        if not normalized_code:
            raise HTTPException(400, "Username-ul este obligatoriu.")

        existing_user_result = await db.execute(
            select(User).where(
                User.unique_code == normalized_code,
                User.id != user.id,
            )
        )
        existing_user = existing_user_result.scalar_one_or_none()

        if existing_user is not None:
            raise HTTPException(400, "Acest username este deja folosit.")

        user.unique_code = normalized_code

    if "pin" in update_data:
        pin = (update_data["pin"] or "").strip()

        if not pin.isdigit() or len(pin) != 4:
            raise HTTPException(400, "PIN-ul trebuie să fie format din 4 cifre.")

        user.pin_hash = hash_pin(pin)

    profile = await EmployeeProfileService.get_by_user_id(db, user.id)

    profile_fields = {
        "first_name",
        "last_name",
        "phone",
        "address",
        "position",
        "department",
        "hire_date",
        "iban",
        "emergency_contact_name",
        "emergency_contact_phone",
    }

    wants_profile_update = any(field in update_data for field in profile_fields)

    if wants_profile_update:
        if profile is None:
            first_name = (update_data.get("first_name") or "").strip()
            last_name = (update_data.get("last_name") or "").strip()

            if not first_name or not last_name:
                raise HTTPException(
                    400,
                    "Pentru prima completare a profilului, prenumele și numele sunt obligatorii.",
                )

            create_payload = EmployeeProfileCreateSchema(
                user_id=user.id,
                first_name=first_name,
                last_name=last_name,
                phone=update_data.get("phone"),
                address=update_data.get("address"),
                position=update_data.get("position"),
                department=update_data.get("department"),
                hire_date=update_data.get("hire_date"),
                iban=update_data.get("iban"),
                emergency_contact_name=update_data.get("emergency_contact_name"),
                emergency_contact_phone=update_data.get("emergency_contact_phone"),
            )

            await EmployeeProfileService.create(db, create_payload)
        else:
            await EmployeeProfileService.update(
                db,
                profile,
                payload,
            )

    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/summary/admin/{user_id}",
    response_model=ProfileSummaryResponseSchema,
)
async def get_profile_summary_for_admin(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(get_current_admin),
) -> ProfileSummaryResponseSchema:
    summary = await ProfileSummaryService.get_by_user_id(db, user_id)

    if summary is None:
        raise HTTPException(404, "User not found.")

    return summary


@router.get(
    "/summary/me/{code}",
    response_model=ProfileSummaryResponseSchema,
)
async def get_profile_summary_for_user(
    code: str,
    db: AsyncSession = Depends(get_db),
) -> ProfileSummaryResponseSchema:
    summary = await ProfileSummaryService.get_by_unique_code(db, code)

    if summary is None:
        raise HTTPException(404, "User not found.")

    ensure_user_is_active(summary)

    return summary
