import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createPatientSchema,
  PATIENT_STATUSES,
  type CreatePatientInput,
} from "../src/patients.schema.js";

const validPatientInput: CreatePatientInput = {
  firstName: "Jordan",
  middleName: "Lee",
  lastName: "Rivera",
  status: "inquiry",
  addressLine1: "42 Maple Lane",
  addressLine2: "Unit 3",
  city: "Springfield",
  region: "ON",
  postalCode: "K1A 0B1",
  country: "CA",
};

function fieldErrorsFor(input: unknown) {
  const result = createPatientSchema.safeParse(input);
  if (result.success) {
    return {};
  }
  return z.flattenError(result.error).fieldErrors;
}

describe("createPatientSchema", () => {
  it("accepts a valid patient and trims spaces around text without changing inner spaces", () => {
    const input = { ...validPatientInput, firstName: "  Jordan  ", postalCode: " K1A  0B1 " };

    const result = createPatientSchema.parse(input);

    expect(result.firstName).toBe("Jordan");
    expect(result.postalCode).toBe("K1A  0B1");
  });

  it.each([
    ["firstName", "Enter a first name."],
    ["lastName", "Enter a last name."],
    ["addressLine1", "Enter an address."],
    ["city", "Enter a city."],
    ["region", "Enter a region."],
    ["postalCode", "Enter a postal code."],
  ])("rejects a %s that is blank after trimming", (field, expectedMessage) => {
    const input = { ...validPatientInput, [field]: "   " };

    const fieldErrors = fieldErrorsFor(input);

    expect(fieldErrors).toEqual({ [field]: [expectedMessage] });
  });

  it("rejects a missing required field with the same message as a blank one", () => {
    const input = { ...validPatientInput, lastName: undefined };

    const fieldErrors = fieldErrorsFor(input);

    expect(fieldErrors).toEqual({ lastName: ["Enter a last name."] });
  });

  it("rejects a name that is not text", () => {
    const input = { ...validPatientInput, firstName: 42 };

    const fieldErrors = fieldErrorsFor(input);

    expect(fieldErrors).toEqual({ firstName: ["Enter a first name."] });
  });

  it.each([
    ["blank", "   "],
    ["null", null],
    ["missing", undefined],
  ])("stores a %s optional field as null", (_description, optionalValue) => {
    const input = { ...validPatientInput, middleName: optionalValue, addressLine2: optionalValue };

    const result = createPatientSchema.parse(input);

    expect(result.middleName).toBeNull();
    expect(result.addressLine2).toBeNull();
  });

  it("accepts text at every field's length limit", () => {
    const input = {
      ...validPatientInput,
      firstName: "a".repeat(100),
      middleName: "b".repeat(100),
      lastName: "c".repeat(100),
      addressLine1: "d".repeat(255),
      addressLine2: "e".repeat(255),
      city: "f".repeat(100),
      region: "g".repeat(100),
      postalCode: "h".repeat(20),
    };

    const result = createPatientSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it.each([
    ["firstName", 100, "First name must be 100 characters or fewer."],
    ["middleName", 100, "Middle name must be 100 characters or fewer."],
    ["lastName", 100, "Last name must be 100 characters or fewer."],
    ["addressLine1", 255, "Address line 1 must be 255 characters or fewer."],
    ["addressLine2", 255, "Address line 2 must be 255 characters or fewer."],
    ["city", 100, "City must be 100 characters or fewer."],
    ["region", 100, "Region must be 100 characters or fewer."],
    ["postalCode", 20, "Postal code must be 20 characters or fewer."],
  ])("rejects a %s one character over its %i-character limit", (field, maxLength, expectedMessage) => {
    const input = { ...validPatientInput, [field]: "x".repeat(maxLength + 1) };

    const fieldErrors = fieldErrorsFor(input);

    expect(fieldErrors).toEqual({ [field]: [expectedMessage] });
  });

  it("trims and uppercases the country code", () => {
    const input = { ...validPatientInput, country: " ca " };

    const result = createPatientSchema.parse(input);

    expect(result.country).toBe("CA");
  });

  it.each(["CAN", "C1", "ÉT", "C A"])("rejects the country code %j", (country) => {
    const input = { ...validPatientInput, country };

    const fieldErrors = fieldErrorsFor(input);

    expect(fieldErrors).toEqual({ country: ["Enter a two-letter country code, e.g. CA."] });
  });

  it("asks for a country code when it is blank", () => {
    const input = { ...validPatientInput, country: "  " };

    const fieldErrors = fieldErrorsFor(input);

    expect(fieldErrors).toEqual({ country: ["Enter a country code."] });
  });

  it.each(PATIENT_STATUSES)("accepts the %s status", (status) => {
    const input = { ...validPatientInput, status };

    const result = createPatientSchema.parse(input);

    expect(result.status).toBe(status);
  });

  it.each([
    ["missing", undefined],
    ["null", null],
    ["unknown", "archived"],
  ])("rejects a %s status", (_description, status) => {
    const input = { ...validPatientInput, status };

    const fieldErrors = fieldErrorsFor(input);

    expect(fieldErrors).toEqual({ status: ["Choose a status."] });
  });

  it("ignores fields that are not part of a patient", () => {
    const input = { ...validPatientInput, id: "not-allowed", notes: "extra" };

    const result = createPatientSchema.parse(input);

    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("notes");
  });
});
