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

function tooLongMessage(fieldLabel: string, maxLength: number): string {
  return `${fieldLabel} must be ${maxLength} characters or fewer.`;
}

// Trimmed text that must not be blank. A missing or non-text value gets the same message.
function requiredText(requiredMessage: string, fieldLabel: string, maxLength: number) {
  return z
    .string({ error: requiredMessage })
    .trim()
    .min(1, { error: requiredMessage, abort: true })
    .max(maxLength, tooLongMessage(fieldLabel, maxLength));
}

// Trimmed text where a missing, null, or blank value is stored as null.
function optionalText(fieldLabel: string, maxLength: number) {
  return z
    .string({ error: `${fieldLabel} must be text.` })
    .trim()
    .max(maxLength, tooLongMessage(fieldLabel, maxLength))
    .nullish()
    .transform((value) => {
      if (!value) {
        return null;
      }
      return value;
    });
}

const countryCode = z
  .string({ error: "Enter a country code." })
  .trim()
  .toUpperCase()
  .min(1, { error: "Enter a country code.", abort: true })
  .regex(/^[A-Z]{2}$/, "Enter a two-letter country code, e.g. CA.");

export const createPatientSchema = z.object({
  firstName: requiredText("Enter a first name.", "First name", PATIENT_FIELD_MAX_LENGTHS.firstName),
  middleName: optionalText("Middle name", PATIENT_FIELD_MAX_LENGTHS.middleName),
  lastName: requiredText("Enter a last name.", "Last name", PATIENT_FIELD_MAX_LENGTHS.lastName),
  status: z.enum(PATIENT_STATUSES, { error: "Choose a status." }),
  addressLine1: requiredText(
    "Enter an address.",
    "Address line 1",
    PATIENT_FIELD_MAX_LENGTHS.addressLine1,
  ),
  addressLine2: optionalText("Address line 2", PATIENT_FIELD_MAX_LENGTHS.addressLine2),
  city: requiredText("Enter a city.", "City", PATIENT_FIELD_MAX_LENGTHS.city),
  region: requiredText("Enter a region.", "Region", PATIENT_FIELD_MAX_LENGTHS.region),
  postalCode: requiredText(
    "Enter a postal code.",
    "Postal code",
    PATIENT_FIELD_MAX_LENGTHS.postalCode,
  ),
  country: countryCode,
});

// What a caller sends, before trimming and normalizing.
export type CreatePatientInput = z.input<typeof createPatientSchema>;

// What the schema returns once input is valid: trimmed, with blank optional fields as null.
export type CreatePatientData = z.output<typeof createPatientSchema>;
