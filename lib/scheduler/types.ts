export type BookingStatus = "confirmed" | "cancelled";

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
  spaceId: string;
  spaceName: string;
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
  spaceId: string;
  activityName: string;
  startAt: string;
  endAt: string;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string };
