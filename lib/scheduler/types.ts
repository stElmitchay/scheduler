export const activityTypes = [
  "Service",
  "Rehearsal",
  "Prayer",
  "Cleaning",
  "Meeting",
  "Evangelism",
  "Social",
  "Other",
] as const;

export type ActivityType = (typeof activityTypes)[number];

export const spaceOptionalActivityTypes = [
  "Evangelism",
  "Social",
  "Other",
] as const satisfies readonly ActivityType[];

export function activityTypeAllowsOptionalSpace(activityType: ActivityType) {
  return (spaceOptionalActivityTypes as readonly ActivityType[]).includes(
    activityType,
  );
}

export type BookingStatus = "confirmed" | "pending" | "cancelled";

export type Space = {
  id: string;
  name: string;
};

export type Department = {
  id: string;
  name: string;
};

export type Booking = {
  id: string;
  departmentId: string;
  departmentName: string;
  spaceId: string | null;
  spaceName: string;
  activityType: ActivityType;
  activityName: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
};

export type AccessContext =
  | { kind: "department"; departmentId: string; departmentName: string }
  | { kind: "pastor" };

export type BookingFormInput = {
  accessCode: string;
  departmentId?: string;
  bookingId?: string;
  spaceId?: string;
  activityType: ActivityType;
  activityName: string;
  startAt: string;
  endAt: string;
  repeatWeekly: boolean;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string };
