export const SCHOOL_LEAD_STATUSES = ["NEW", "CONTACTED", "ENROLLED", "REJECTED"] as const;
export const SCHOOL_PARTNER_APPLICATION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export const INSTRUCTOR_LEAD_STATUSES = ["NEW", "CONTACTED", "BOOKED", "REJECTED"] as const;
export const INSTRUCTOR_APPLICATION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export const INSTRUCTOR_COMPLAINT_STATUSES = ["NEW", "REVIEWING", "RESOLVED"] as const;

export type DrivingSchoolLeadStatus = (typeof SCHOOL_LEAD_STATUSES)[number];
export type DrivingSchoolPartnerApplicationStatus = (typeof SCHOOL_PARTNER_APPLICATION_STATUSES)[number];
export type DrivingInstructorLeadStatus = (typeof INSTRUCTOR_LEAD_STATUSES)[number];
export type DrivingInstructorApplicationStatus = (typeof INSTRUCTOR_APPLICATION_STATUSES)[number];
export type DrivingInstructorComplaintStatus = (typeof INSTRUCTOR_COMPLAINT_STATUSES)[number];

type StatusTone = "muted" | "warning" | "success" | "danger";
type StatusTransitionMap<T extends string> = Record<T, readonly T[]>;

const GENERIC_UI_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "NEW",
  "CONTACTED",
  "ENROLLED",
  "BOOKED",
  "REVIEWING",
  "RESOLVED",
  "VERIFIED",
  "COMPLETED",
  "VISIBLE",
  "HIDDEN",
  "BLOCKED",
  "DISABLED",
  "REVOKED",
  "TRIALING",
  "SUBMITTED",
  "REVIEWED",
  "PLANNED",
];

const KNOWN_STATUS_SET = new Set<string>([
  ...GENERIC_UI_STATUSES,
  ...SCHOOL_LEAD_STATUSES,
  ...SCHOOL_PARTNER_APPLICATION_STATUSES,
  ...INSTRUCTOR_LEAD_STATUSES,
  ...INSTRUCTOR_APPLICATION_STATUSES,
  ...INSTRUCTOR_COMPLAINT_STATUSES,
]);

const loggedUnknownStatuses = new Set<string>();

export const SCHOOL_LEAD_TRANSITIONS: StatusTransitionMap<DrivingSchoolLeadStatus> = {
  NEW: ["CONTACTED", "ENROLLED", "REJECTED"],
  CONTACTED: ["NEW", "ENROLLED", "REJECTED"],
  ENROLLED: ["CONTACTED", "REJECTED"],
  REJECTED: ["CONTACTED"],
};

export const SCHOOL_PARTNER_APPLICATION_TRANSITIONS: StatusTransitionMap<DrivingSchoolPartnerApplicationStatus> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["REJECTED"],
  REJECTED: ["PENDING"],
};

export const INSTRUCTOR_LEAD_TRANSITIONS: StatusTransitionMap<DrivingInstructorLeadStatus> = {
  NEW: ["CONTACTED", "BOOKED", "REJECTED"],
  CONTACTED: ["NEW", "BOOKED", "REJECTED"],
  BOOKED: ["CONTACTED", "REJECTED"],
  REJECTED: ["CONTACTED"],
};

export const INSTRUCTOR_APPLICATION_TRANSITIONS: StatusTransitionMap<DrivingInstructorApplicationStatus> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["REJECTED"],
  REJECTED: ["PENDING"],
};

export const INSTRUCTOR_COMPLAINT_TRANSITIONS: StatusTransitionMap<DrivingInstructorComplaintStatus> = {
  NEW: ["REVIEWING", "RESOLVED"],
  REVIEWING: ["NEW", "RESOLVED"],
  RESOLVED: ["REVIEWING"],
};

export function normalizeStatusToken(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();
}

function reportUnknownStatus(rawValue: string, normalized: string) {
  const key = `${rawValue}::${normalized}`;
  if (loggedUnknownStatuses.has(key)) {
    return;
  }

  loggedUnknownStatuses.add(key);
  if (typeof console !== "undefined" && typeof console.error === "function") {
    console.error("[admin-status] Unknown status received", { rawValue, normalized });
  }
}

export function formatStatusLabel(value: string | null | undefined): string {
  const normalized = normalizeStatusToken(value);
  if (!normalized) {
    return "UNKNOWN";
  }

  if (!KNOWN_STATUS_SET.has(normalized)) {
    reportUnknownStatus(value ?? "", normalized);
    return "UNKNOWN";
  }

  return normalized
    .split("_")
    .filter(Boolean)
    .map((part) => `${part[0] ?? ""}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

export function statusTone(value: string | null | undefined): StatusTone {
  const normalized = normalizeStatusToken(value);
  if (!normalized) {
    return "muted";
  }

  if (["APPROVED", "ACTIVE", "VERIFIED", "COMPLETED", "RESOLVED", "VISIBLE", "ENROLLED", "BOOKED"].includes(normalized)) {
    return "success";
  }
  if (["PENDING", "NEW", "CONTACTED", "REVIEWING", "TRIALING", "SUBMITTED", "REVIEWED"].includes(normalized)) {
    return "warning";
  }
  if (["REJECTED", "INACTIVE", "BLOCKED", "DISABLED", "HIDDEN", "REVOKED", "SUSPENDED"].includes(normalized)) {
    return "danger";
  }
  return "muted";
}

export function canTransitionStatus<T extends string>(
  currentStatus: string | null | undefined,
  nextStatus: T,
  transitions: StatusTransitionMap<T>,
): boolean {
  const normalizedCurrent = normalizeStatusToken(currentStatus) as T | null;
  if (!normalizedCurrent) {
    return true;
  }
  if (normalizedCurrent === nextStatus) {
    return true;
  }
  if (!(normalizedCurrent in transitions)) {
    return true;
  }

  return transitions[normalizedCurrent].includes(nextStatus);
}
