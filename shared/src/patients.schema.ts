export const PATIENT_STATUSES = [
  "inquiry",
  "onboarding",
  "active",
  "churned",
] as const;

export type PatientStatus = (typeof PATIENT_STATUSES)[number];

// Matches the varchar(n) limits in the patients migration (PLAN.md §6).
// The migration keeps its own fixed values rather than importing these.
export const PATIENT_FIELD_MAX_LENGTHS = {
  firstName: 100,
  middleName: 100,
  lastName: 100,
  addressLine1: 255,
  addressLine2: 255,
  city: 100,
  region: 100,
  postalCode: 20,
  country: 2,
} as const;
