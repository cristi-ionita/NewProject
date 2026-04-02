from datetime import UTC, date, datetime

import pytest
from pydantic import ValidationError

from app.schemas.leave_request import (
    LeaveRequestCreateResponseSchema,
    LeaveRequestCreateSchema,
    LeaveRequestItemSchema,
    LeaveRequestListResponseSchema,
    LeaveRequestReviewResponseSchema,
    LeaveRequestReviewSchema,
)


def test_leave_request_create_schema_valid():
    obj = LeaveRequestCreateSchema(
        user_code="EMP001",
        start_date=date(2026, 4, 1),
        end_date=date(2026, 4, 10),
        reason="Concediu",
    )

    assert obj.user_code == "EMP001"
    assert obj.start_date == date(2026, 4, 1)
    assert obj.end_date == date(2026, 4, 10)
    assert obj.reason == "Concediu"


def test_leave_request_create_schema_reason_cleaned():
    obj = LeaveRequestCreateSchema(
        user_code="EMP001",
        start_date=date(2026, 4, 1),
        end_date=date(2026, 4, 10),
        reason="  Concediu medical  ",
    )

    assert obj.reason == "Concediu medical"


def test_leave_request_create_schema_reason_empty_becomes_none():
    obj = LeaveRequestCreateSchema(
        user_code="EMP001",
        start_date=date(2026, 4, 1),
        end_date=date(2026, 4, 10),
        reason="   ",
    )

    assert obj.reason is None


def test_leave_request_create_schema_reason_none_stays_none():
    obj = LeaveRequestCreateSchema(
        user_code="EMP001",
        start_date=date(2026, 4, 1),
        end_date=date(2026, 4, 10),
        reason=None,
    )

    assert obj.reason is None


def test_leave_request_create_schema_invalid_end_date():
    with pytest.raises(ValidationError):
        LeaveRequestCreateSchema(
            user_code="EMP001",
            start_date=date(2026, 4, 10),
            end_date=date(2026, 4, 1),
            reason="Concediu",
        )


def test_leave_request_create_schema_user_code_too_short():
    with pytest.raises(ValidationError):
        LeaveRequestCreateSchema(
            user_code="",
            start_date=date(2026, 4, 1),
            end_date=date(2026, 4, 10),
            reason="Concediu",
        )


def test_leave_request_create_schema_user_code_too_long():
    with pytest.raises(ValidationError):
        LeaveRequestCreateSchema(
            user_code="A" * 51,
            start_date=date(2026, 4, 1),
            end_date=date(2026, 4, 10),
            reason="Concediu",
        )


def test_leave_request_create_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        LeaveRequestCreateSchema(
            user_code="EMP001",
            start_date=date(2026, 4, 1),
            end_date=date(2026, 4, 10),
            reason="Concediu",
            extra_field="boom",
        )


def test_leave_request_review_schema_valid():
    obj = LeaveRequestReviewSchema(status="approved")
    assert obj.status == "approved"


def test_leave_request_review_schema_normalizes_status():
    obj = LeaveRequestReviewSchema(status="  APPROVED  ")
    assert obj.status == "approved"


def test_leave_request_review_schema_rejected_valid():
    obj = LeaveRequestReviewSchema(status="rejected")
    assert obj.status == "rejected"


def test_leave_request_review_schema_pending_valid():
    obj = LeaveRequestReviewSchema(status="pending")
    assert obj.status == "pending"


def test_leave_request_review_schema_invalid_status():
    with pytest.raises(ValidationError):
        LeaveRequestReviewSchema(status="done")


def test_leave_request_review_schema_empty_status():
    with pytest.raises(ValidationError):
        LeaveRequestReviewSchema(status="")


def test_leave_request_review_schema_spaces_only_status():
    with pytest.raises(ValidationError):
        LeaveRequestReviewSchema(status="   ")


def test_leave_request_review_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        LeaveRequestReviewSchema(
            status="approved",
            extra_field="boom",
        )


def test_leave_request_item_schema_valid():
    now = datetime.now(UTC)

    obj = LeaveRequestItemSchema(
        id=1,
        user_id=10,
        user_name="Ana Popescu",
        user_code="EMP001",
        start_date=date(2026, 4, 1),
        end_date=date(2026, 4, 10),
        reason="Concediu",
        status="pending",
        reviewed_by_admin_id=None,
        reviewed_at=None,
        created_at=now,
    )

    assert obj.id == 1
    assert obj.user_id == 10
    assert obj.user_name == "Ana Popescu"
    assert obj.user_code == "EMP001"
    assert obj.reason == "Concediu"
    assert obj.status == "pending"
    assert obj.reviewed_by_admin_id is None
    assert obj.reviewed_at is None
    assert obj.created_at == now


def test_leave_request_item_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        LeaveRequestItemSchema(
            id=1,
            user_id=10,
            user_name="Ana Popescu",
            user_code="EMP001",
            start_date=date(2026, 4, 1),
            end_date=date(2026, 4, 10),
            reason="Concediu",
            status="pending",
            reviewed_by_admin_id=None,
            reviewed_at=None,
            created_at=datetime.now(UTC),
            extra_field="boom",
        )


def test_leave_request_list_response_schema_valid():
    item = LeaveRequestItemSchema(
        id=1,
        user_id=10,
        user_name="Ana Popescu",
        user_code="EMP001",
        start_date=date(2026, 4, 1),
        end_date=date(2026, 4, 10),
        reason="Concediu",
        status="pending",
        reviewed_by_admin_id=None,
        reviewed_at=None,
        created_at=datetime.now(UTC),
    )

    obj = LeaveRequestListResponseSchema(requests=[item])

    assert len(obj.requests) == 1
    assert obj.requests[0].id == 1


def test_leave_request_list_response_schema_empty_list():
    obj = LeaveRequestListResponseSchema(requests=[])
    assert obj.requests == []


def test_leave_request_list_response_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        LeaveRequestListResponseSchema(
            requests=[],
            extra_field="boom",
        )


def test_leave_request_create_response_schema_valid():
    now = datetime.now(UTC)

    obj = LeaveRequestCreateResponseSchema(
        id=1,
        user_id=10,
        start_date=date(2026, 4, 1),
        end_date=date(2026, 4, 10),
        reason="Concediu",
        status="pending",
        created_at=now,
    )

    assert obj.id == 1
    assert obj.user_id == 10
    assert obj.reason == "Concediu"
    assert obj.status == "pending"
    assert obj.created_at == now


def test_leave_request_create_response_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        LeaveRequestCreateResponseSchema(
            id=1,
            user_id=10,
            start_date=date(2026, 4, 1),
            end_date=date(2026, 4, 10),
            reason="Concediu",
            status="pending",
            created_at=datetime.now(UTC),
            extra_field="boom",
        )


def test_leave_request_review_response_schema_valid():
    now = datetime.now(UTC)

    obj = LeaveRequestReviewResponseSchema(
        id=1,
        status="approved",
        reviewed_by_admin_id=99,
        reviewed_at=now,
    )

    assert obj.id == 1
    assert obj.status == "approved"
    assert obj.reviewed_by_admin_id == 99
    assert obj.reviewed_at == now


def test_leave_request_review_response_schema_optional_fields():
    obj = LeaveRequestReviewResponseSchema(
        id=1,
        status="pending",
        reviewed_by_admin_id=None,
        reviewed_at=None,
    )

    assert obj.reviewed_by_admin_id is None
    assert obj.reviewed_at is None


def test_leave_request_review_response_schema_extra_forbidden():
    with pytest.raises(ValidationError):
        LeaveRequestReviewResponseSchema(
            id=1,
            status="approved",
            reviewed_by_admin_id=99,
            reviewed_at=datetime.now(UTC),
            extra_field="boom",
        )
