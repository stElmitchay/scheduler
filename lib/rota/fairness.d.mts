import type { RotaWarning } from "./types.js";

export type FairnessPerson = {
  id: string;
  name: string;
  isActive: boolean;
  unavailability: { startDate: string; endDate: string }[];
};

export type FairnessContext = {
  people: FairnessPerson[];
  occurrences: { bookingId: string; startAt: string }[];
  assignments: { bookingId: string; rotaPersonId: string }[];
  maxServesPerMonth: number;
  monthKey: string;
};

export type PersonSummary = {
  personId: string;
  name: string;
  monthCount: number;
  overCap: boolean;
  aboveAverage: boolean;
  underUsed: boolean;
  consecutiveWeeks: number;
};

export function monthKeyOf(startAt: string): string;
export function weekIndex(dateKey: string): number;
export function checkCandidate(input: {
  personId: string;
  bookingId: string;
  context: FairnessContext;
}): RotaWarning[];
export function summarizePeriod(context: FairnessContext): PersonSummary[];
