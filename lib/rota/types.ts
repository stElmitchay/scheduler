export type RotaSettings = {
  departmentId: string;
  shareSlug: string;
  maxServesPerMonth: number;
};

export type RotaRole = {
  id: string;
  rotaServiceId: string;
  name: string;
  slotCount: number;
  sortOrder: number;
};

export type RotaService = {
  id: string;
  departmentId: string;
  serviceName: string;
  roles: RotaRole[];
};

export type RotaUnavailability = {
  id: string;
  rotaPersonId: string;
  startDate: string;
  endDate: string;
};

export type RotaPerson = {
  id: string;
  departmentId: string;
  name: string;
  isActive: boolean;
  unavailability: RotaUnavailability[];
};

export type RotaPeriodStatus = "draft" | "published";

export type RotaPeriod = {
  id: string;
  departmentId: string;
  month: string;
  status: RotaPeriodStatus;
  publishedAt: string | null;
};

export type RotaOccurrence = {
  bookingId: string;
  rotaServiceId: string;
  serviceName: string;
  startAt: string;
};

export type RotaAssignment = {
  id: string;
  bookingId: string;
  rotaRoleId: string;
  slotIndex: number;
  rotaPersonId: string;
};

export type RotaWarningCode =
  | "inactive"
  | "unavailable"
  | "same_service"
  | "same_day"
  | "over_cap"
  | "above_average"
  | "consecutive_weeks";

export type RotaWarning = {
  code: RotaWarningCode;
  severity: "block" | "warn";
  message: string;
};

export type RotaPayload = {
  departmentId: string;
  departmentName: string;
  settings: RotaSettings;
  services: RotaService[];
  people: RotaPerson[];
  periods: RotaPeriod[];
  serviceNameOptions: string[];
};

export type PeriodPayload = {
  period: RotaPeriod;
  occurrences: RotaOccurrence[];
  assignments: RotaAssignment[];
  historyOccurrences: RotaOccurrence[];
  historyAssignments: RotaAssignment[];
};

export type RotaActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string }
  | { ok: "expired"; message: string };
