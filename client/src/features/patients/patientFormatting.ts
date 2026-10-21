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

// One line, e.g. "42 Maple Lane, Unit 3, Springfield, ON K1A 0B1, CA". An empty second line is left out.
export function formatPatientAddress(patient: Patient): string {
  const addressParts = [patient.addressLine1];
  if (patient.addressLine2) {
    addressParts.push(patient.addressLine2);
  }
  addressParts.push(`${patient.city}, ${patient.region} ${patient.postalCode}`);
  addressParts.push(patient.country);
  return addressParts.join(", ");
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

// Whole years from a "YYYY-MM-DD" birth date to today's date where the viewer is. A birthday
// hasn't happened until its month and day arrive, so someone born on 29 February turns a
// year older on 1 March in other years.
export function calculateAgeInYears(isoDateOfBirth: string, today: Date): number {
  const [birthYear, birthMonth, birthDay] = isoDateOfBirth.split("-").map(Number) as [number, number, number];
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const hasHadBirthdayThisYear = todayMonth > birthMonth || (todayMonth === birthMonth && todayDay >= birthDay);
  const age = today.getFullYear() - birthYear;
  if (hasHadBirthdayThisYear) {
    return age;
  }
  return age - 1;
}

export function formatAge(ageInYears: number): string {
  if (ageInYears === 1) {
    return "1 year";
  }
  return `${ageInYears} years`;
}

// The date and time a patient was added in the viewer's timezone, e.g. "Oct 1, 2026, 11:30 AM".
// timeZone defaults to the browser's own; tests pass one explicitly.
export function formatAddedAtWithTime(isoTimestamp: string, timeZone?: string): string {
  const addedAtFormat = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  });
  return addedAtFormat.format(new Date(isoTimestamp));
}

// Shows the date a patient was added in the viewer's timezone, e.g. "Oct 19, 2026". The time
// is left out; the stored timestamp still has it. timeZone defaults to the browser's own;
// tests pass one explicitly.
export function formatAddedAt(isoTimestamp: string, timeZone?: string): string {
  const addedAtFormat = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone,
  });
  return addedAtFormat.format(new Date(isoTimestamp));
}
