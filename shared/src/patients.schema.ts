import { z } from "zod";

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

// Kept short so it fits on one line under even the narrowest field in the form.
function tooLongMessage(maxLength: number): string {
  return `${maxLength} characters max.`;
}

// Trimmed text that must not be blank. A missing or non-text value gets the same message.
function requiredText(requiredMessage: string, maxLength: number) {
  return z
    .string({ error: requiredMessage })
    .trim()
    .min(1, { error: requiredMessage, abort: true })
    .max(maxLength, tooLongMessage(maxLength));
}

// Trimmed text where a missing, null, or blank value is stored as null.
function optionalText(fieldLabel: string, maxLength: number) {
  return z
    .string({ error: `${fieldLabel} must be text.` })
    .trim()
    .max(maxLength, tooLongMessage(maxLength))
    .nullish()
    .transform((value) => {
      if (!value) {
        return null;
      }
      return value;
    });
}

export const EARLIEST_DATE_OF_BIRTH = "1900-01-01";
const INVALID_DATE_MESSAGE = "Enter a valid date of birth.";

// Rejects dates like 2025-02-30 that match the format but don't exist.
function isRealCalendarDate(isoDate: string): boolean {
  const [yearText, monthText, dayText] = isoDate.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, monthIndex, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === monthIndex && date.getUTCDate() === day
  );
}

// Today's date where the code runs: the browser on the client, the server's clock on the server.
// See KNOWN_LIMITATIONS.md for the shared-timezone assumption.
export function localDateToday(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// YYYY-MM-DD dates compare correctly as strings, so no Date conversion is needed for the range checks.
const dateOfBirth = z
  .string({ error: "Enter a date of birth." })
  .trim()
  .min(1, { error: "Enter a date of birth.", abort: true })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: INVALID_DATE_MESSAGE, abort: true })
  .refine((isoDate) => isoDate >= EARLIEST_DATE_OF_BIRTH, {
    error: "Enter a date of birth on or after January 1, 1900.",
    abort: true,
  })
  .refine(isRealCalendarDate, { error: INVALID_DATE_MESSAGE, abort: true })
  .refine((isoDate) => isoDate <= localDateToday(), {
    error: "Date of birth can't be in the future.",
  });

const countryCode = z
  .string({ error: "Enter a country code." })
  .trim()
  .toUpperCase()
  .min(1, { error: "Enter a country code.", abort: true })
  .regex(/^[A-Z]{2}$/, "Enter a two-letter country code, e.g. CA.");

export const createPatientSchema = z.object({
  firstName: requiredText("Enter a first name.", PATIENT_FIELD_MAX_LENGTHS.firstName),
  middleName: optionalText("Middle name", PATIENT_FIELD_MAX_LENGTHS.middleName),
  lastName: requiredText("Enter a last name.", PATIENT_FIELD_MAX_LENGTHS.lastName),
  dateOfBirth,
  status: z.enum(PATIENT_STATUSES, { error: "Choose a status." }),
  addressLine1: requiredText("Enter an address.", PATIENT_FIELD_MAX_LENGTHS.addressLine1),
  addressLine2: optionalText("Address line 2", PATIENT_FIELD_MAX_LENGTHS.addressLine2),
  city: requiredText("Enter a city.", PATIENT_FIELD_MAX_LENGTHS.city),
  region: requiredText("Enter a province or state.", PATIENT_FIELD_MAX_LENGTHS.region),
  postalCode: requiredText("Enter a postal code.", PATIENT_FIELD_MAX_LENGTHS.postalCode),
  country: countryCode,
});

// What a caller sends, before trimming and normalizing.
export type CreatePatientInput = z.input<typeof createPatientSchema>;

// What the schema returns once input is valid: trimmed, with blank optional fields as null.
export type CreatePatientData = z.output<typeof createPatientSchema>;

// A saved patient as the API returns it: the validated fields plus what the database adds.
// dateOfBirth stays YYYY-MM-DD and createdAt is a UTC ISO string.
export type Patient = CreatePatientData & {
  id: string;
  createdAt: string;
};
