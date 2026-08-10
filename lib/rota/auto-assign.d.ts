import type { FairnessContext } from "./fairness";

export type EmptySlot = {
  bookingId: string;
  rotaRoleId: string;
  slotIndex: number;
  startAt: string;
  sortOrder: number;
};

export type FilledSlot = EmptySlot & { rotaPersonId: string };

export function autoAssign(input: {
  slots: EmptySlot[];
  context: FairnessContext;
}): { assignments: FilledSlot[]; unfilled: EmptySlot[] };
