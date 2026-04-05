"""
AUTOTEST Shared admin status enums and normalization helpers
"""

from __future__ import annotations

import re
from enum import Enum
from typing import Any, TypeVar

from core.logger import get_logger

logger = get_logger(__name__)


class AdminStatusEnum(str, Enum):
    """Base enum for canonical admin-managed statuses."""

    def __str__(self) -> str:
        return self.value


class DrivingSchoolLeadStatus(AdminStatusEnum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    ENROLLED = "ENROLLED"
    REJECTED = "REJECTED"


class DrivingSchoolPartnerApplicationStatus(AdminStatusEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class DrivingInstructorLeadStatus(AdminStatusEnum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    BOOKED = "BOOKED"
    REJECTED = "REJECTED"


class DrivingInstructorApplicationStatus(AdminStatusEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class DrivingInstructorComplaintStatus(AdminStatusEnum):
    NEW = "NEW"
    REVIEWING = "REVIEWING"
    RESOLVED = "RESOLVED"


EnumT = TypeVar("EnumT", bound=AdminStatusEnum)


def _normalize_status_token(value: Any) -> str:
    if isinstance(value, AdminStatusEnum):
        return value.value
    if not isinstance(value, str):
        raise ValueError("Status must be a string")

    normalized = re.sub(r"[^A-Z0-9]+", "_", value.strip().upper()).strip("_")
    if not normalized:
        raise ValueError("Status cannot be empty")
    return normalized


_STATUS_ALIASES: dict[type[AdminStatusEnum], dict[str, AdminStatusEnum]] = {
    DrivingSchoolLeadStatus: {
        "NEW": DrivingSchoolLeadStatus.NEW,
        "PENDING": DrivingSchoolLeadStatus.NEW,
        "CONTACTED": DrivingSchoolLeadStatus.CONTACTED,
        "QUALIFIED": DrivingSchoolLeadStatus.CONTACTED,
        "ENROLLED": DrivingSchoolLeadStatus.ENROLLED,
        "CLOSED": DrivingSchoolLeadStatus.ENROLLED,
        "REJECTED": DrivingSchoolLeadStatus.REJECTED,
        "DECLINED": DrivingSchoolLeadStatus.REJECTED,
    },
    DrivingSchoolPartnerApplicationStatus: {
        "NEW": DrivingSchoolPartnerApplicationStatus.PENDING,
        "PENDING": DrivingSchoolPartnerApplicationStatus.PENDING,
        "WAITING": DrivingSchoolPartnerApplicationStatus.PENDING,
        "SUBMITTED": DrivingSchoolPartnerApplicationStatus.PENDING,
        "REVIEW": DrivingSchoolPartnerApplicationStatus.PENDING,
        "REVIEWING": DrivingSchoolPartnerApplicationStatus.PENDING,
        "IN_REVIEW": DrivingSchoolPartnerApplicationStatus.PENDING,
        "UNDER_REVIEW": DrivingSchoolPartnerApplicationStatus.PENDING,
        "APPROVED": DrivingSchoolPartnerApplicationStatus.APPROVED,
        "ACCEPTED": DrivingSchoolPartnerApplicationStatus.APPROVED,
        "VERIFIED": DrivingSchoolPartnerApplicationStatus.APPROVED,
        "REJECTED": DrivingSchoolPartnerApplicationStatus.REJECTED,
        "DECLINED": DrivingSchoolPartnerApplicationStatus.REJECTED,
        "DENIED": DrivingSchoolPartnerApplicationStatus.REJECTED,
    },
    DrivingInstructorLeadStatus: {
        "NEW": DrivingInstructorLeadStatus.NEW,
        "PENDING": DrivingInstructorLeadStatus.NEW,
        "CONTACTED": DrivingInstructorLeadStatus.CONTACTED,
        "QUALIFIED": DrivingInstructorLeadStatus.CONTACTED,
        "BOOKED": DrivingInstructorLeadStatus.BOOKED,
        "CLOSED": DrivingInstructorLeadStatus.BOOKED,
        "REJECTED": DrivingInstructorLeadStatus.REJECTED,
        "DECLINED": DrivingInstructorLeadStatus.REJECTED,
    },
    DrivingInstructorApplicationStatus: {
        "NEW": DrivingInstructorApplicationStatus.PENDING,
        "PENDING": DrivingInstructorApplicationStatus.PENDING,
        "WAITING": DrivingInstructorApplicationStatus.PENDING,
        "SUBMITTED": DrivingInstructorApplicationStatus.PENDING,
        "REVIEW": DrivingInstructorApplicationStatus.PENDING,
        "REVIEWING": DrivingInstructorApplicationStatus.PENDING,
        "IN_REVIEW": DrivingInstructorApplicationStatus.PENDING,
        "UNDER_REVIEW": DrivingInstructorApplicationStatus.PENDING,
        "APPROVED": DrivingInstructorApplicationStatus.APPROVED,
        "ACCEPTED": DrivingInstructorApplicationStatus.APPROVED,
        "VERIFIED": DrivingInstructorApplicationStatus.APPROVED,
        "REJECTED": DrivingInstructorApplicationStatus.REJECTED,
        "DECLINED": DrivingInstructorApplicationStatus.REJECTED,
        "DENIED": DrivingInstructorApplicationStatus.REJECTED,
    },
    DrivingInstructorComplaintStatus: {
        "NEW": DrivingInstructorComplaintStatus.NEW,
        "PENDING": DrivingInstructorComplaintStatus.NEW,
        "REVIEW": DrivingInstructorComplaintStatus.REVIEWING,
        "REVIEWING": DrivingInstructorComplaintStatus.REVIEWING,
        "IN_REVIEW": DrivingInstructorComplaintStatus.REVIEWING,
        "UNDER_REVIEW": DrivingInstructorComplaintStatus.REVIEWING,
        "RESOLVED": DrivingInstructorComplaintStatus.RESOLVED,
        "CLOSED": DrivingInstructorComplaintStatus.RESOLVED,
        "REJECTED": DrivingInstructorComplaintStatus.RESOLVED,
    },
}

_STATUS_FALLBACKS: dict[type[AdminStatusEnum], AdminStatusEnum] = {
    DrivingSchoolLeadStatus: DrivingSchoolLeadStatus.NEW,
    DrivingSchoolPartnerApplicationStatus: DrivingSchoolPartnerApplicationStatus.PENDING,
    DrivingInstructorLeadStatus: DrivingInstructorLeadStatus.NEW,
    DrivingInstructorApplicationStatus: DrivingInstructorApplicationStatus.PENDING,
    DrivingInstructorComplaintStatus: DrivingInstructorComplaintStatus.NEW,
}

_STATUS_TRANSITIONS: dict[type[AdminStatusEnum], dict[AdminStatusEnum, set[AdminStatusEnum]]] = {
    DrivingSchoolLeadStatus: {
        DrivingSchoolLeadStatus.NEW: {
            DrivingSchoolLeadStatus.CONTACTED,
            DrivingSchoolLeadStatus.ENROLLED,
            DrivingSchoolLeadStatus.REJECTED,
        },
        DrivingSchoolLeadStatus.CONTACTED: {
            DrivingSchoolLeadStatus.NEW,
            DrivingSchoolLeadStatus.ENROLLED,
            DrivingSchoolLeadStatus.REJECTED,
        },
        DrivingSchoolLeadStatus.ENROLLED: {
            DrivingSchoolLeadStatus.CONTACTED,
            DrivingSchoolLeadStatus.REJECTED,
        },
        DrivingSchoolLeadStatus.REJECTED: {
            DrivingSchoolLeadStatus.CONTACTED,
        },
    },
    DrivingSchoolPartnerApplicationStatus: {
        DrivingSchoolPartnerApplicationStatus.PENDING: {
            DrivingSchoolPartnerApplicationStatus.APPROVED,
            DrivingSchoolPartnerApplicationStatus.REJECTED,
        },
        DrivingSchoolPartnerApplicationStatus.APPROVED: {
            DrivingSchoolPartnerApplicationStatus.REJECTED,
        },
        DrivingSchoolPartnerApplicationStatus.REJECTED: {
            DrivingSchoolPartnerApplicationStatus.PENDING,
        },
    },
    DrivingInstructorLeadStatus: {
        DrivingInstructorLeadStatus.NEW: {
            DrivingInstructorLeadStatus.CONTACTED,
            DrivingInstructorLeadStatus.BOOKED,
            DrivingInstructorLeadStatus.REJECTED,
        },
        DrivingInstructorLeadStatus.CONTACTED: {
            DrivingInstructorLeadStatus.NEW,
            DrivingInstructorLeadStatus.BOOKED,
            DrivingInstructorLeadStatus.REJECTED,
        },
        DrivingInstructorLeadStatus.BOOKED: {
            DrivingInstructorLeadStatus.CONTACTED,
            DrivingInstructorLeadStatus.REJECTED,
        },
        DrivingInstructorLeadStatus.REJECTED: {
            DrivingInstructorLeadStatus.CONTACTED,
        },
    },
    DrivingInstructorApplicationStatus: {
        DrivingInstructorApplicationStatus.PENDING: {
            DrivingInstructorApplicationStatus.APPROVED,
            DrivingInstructorApplicationStatus.REJECTED,
        },
        DrivingInstructorApplicationStatus.APPROVED: {
            DrivingInstructorApplicationStatus.REJECTED,
        },
        DrivingInstructorApplicationStatus.REJECTED: {
            DrivingInstructorApplicationStatus.PENDING,
        },
    },
    DrivingInstructorComplaintStatus: {
        DrivingInstructorComplaintStatus.NEW: {
            DrivingInstructorComplaintStatus.REVIEWING,
            DrivingInstructorComplaintStatus.RESOLVED,
        },
        DrivingInstructorComplaintStatus.REVIEWING: {
            DrivingInstructorComplaintStatus.NEW,
            DrivingInstructorComplaintStatus.RESOLVED,
        },
        DrivingInstructorComplaintStatus.RESOLVED: {
            DrivingInstructorComplaintStatus.REVIEWING,
        },
    },
}


def parse_status_value(enum_cls: type[EnumT], value: Any) -> EnumT:
    normalized = _normalize_status_token(value)
    resolved = _STATUS_ALIASES[enum_cls].get(normalized)
    if resolved is None:
        allowed = ", ".join(member.value for member in enum_cls)
        raise ValueError(f"Invalid status '{value}'. Allowed values: {allowed}")
    return resolved  # type: ignore[return-value]


def coerce_status_value(
    enum_cls: type[EnumT],
    value: Any,
    *,
    context: str,
    fallback: EnumT | None = None,
) -> EnumT:
    try:
        return parse_status_value(enum_cls, value)
    except ValueError:
        resolved_fallback = fallback or _STATUS_FALLBACKS[enum_cls]
        logger.warning(
            "Unknown legacy status encountered; coercing to fallback",
            extra={
                "event": "admin_status_coerced",
                "metadata": {
                    "context": context,
                    "received": value,
                    "fallback": resolved_fallback.value,
                    "status_family": enum_cls.__name__,
                },
            },
        )
        return resolved_fallback  # type: ignore[return-value]


def ensure_status_transition(enum_cls: type[EnumT], current: Any, next_status: Any) -> EnumT:
    resolved_current = coerce_status_value(
        enum_cls,
        current,
        context=f"{enum_cls.__name__}.current",
    )
    resolved_next = parse_status_value(enum_cls, next_status)

    if resolved_current == resolved_next:
        return resolved_next

    allowed = _STATUS_TRANSITIONS[enum_cls].get(resolved_current, set())
    if resolved_next not in allowed:
        allowed_values = ", ".join(status.value for status in sorted(allowed, key=lambda item: item.value)) or "none"
        raise ValueError(
            f"Invalid status transition: {resolved_current.value} -> {resolved_next.value}. Allowed: {allowed_values}"
        )
    return resolved_next


def status_display_label(value: Any) -> str:
    normalized = _normalize_status_token(value)
    return " ".join(part.capitalize() for part in normalized.split("_") if part)

