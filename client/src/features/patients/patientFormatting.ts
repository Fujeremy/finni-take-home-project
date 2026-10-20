import type { Patient, PatientStatus } from "@finni/shared";

export const PATIENT_STATUS_LABELS: Record<PatientStatus, string> = {
  inquiry: "Inquiry",
  onboarding: "Onboarding",
  active: "Active",
  churned: "Churned",
};

export function formatPatientName(patient: Patient): string {
  if (patient.middleName) {
    return `${patient.firstName} ${patient.middleName} ${patient.lastName}`;
  }
  return `${patient.firstName} ${patient.lastName}`;
}

// Birth dates are calendar dates, not moments in time. Formatting them in UTC keeps
// "1988-03-14" as March 14 for every viewer instead of shifting it by their timezone.
const dateOfBirthFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function formatDateOfBirth(isoDate: string): string {
  return dateOfBirthFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

// Shows the creation time in the viewer's timezone, e.g. "Oct 19, 2026, 9:42 PM".
// timeZone defaults to the browser's own; tests pass one explicitly.
export function formatAddedAt(isoTimestamp: string, timeZone?: string): string {
  const addedAtFormat = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  });
  return addedAtFormat.format(new Date(isoTimestamp));
}
