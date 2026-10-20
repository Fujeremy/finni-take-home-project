import { afterEach, describe, expect, it, vi } from "vitest";
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
  dateOfBirth: "1988-03-14",
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
    ["region", "Enter a province or state."],
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
    ["firstName", 100, "100 characters max."],
    ["middleName", 100, "100 characters max."],
    ["lastName", 100, "100 characters max."],
    ["addressLine1", 255, "255 characters max."],
    ["addressLine2", 255, "255 characters max."],
    ["city", 100, "100 characters max."],
    ["region", 100, "100 characters max."],
    ["postalCode", 20, "20 characters max."],
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

describe("createPatientSchema date of birth", () => {
  afterEach(() => {
    vi.useRealTimers();
    delete process.env.TZ;
  });

  // Freezes the clock at a local date and time, leaving timers untouched.
  function setLocalNow(year: number, monthIndex: number, day: number, hour: number, minute: number) {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(year, monthIndex, day, hour, minute));
  }

  it("accepts January 1, 1900", () => {
    const input = { ...validPatientInput, dateOfBirth: "1900-01-01" };

    const result = createPatientSchema.parse(input);

    expect(result.dateOfBirth).toBe("1900-01-01");
  });

  it("rejects a date before January 1, 1900", () => {
    const input = { ...validPatientInput, dateOfBirth: "1899-12-31" };

    const fieldErrors = fieldErrorsFor(input);

    expect(fieldErrors).toEqual({
      dateOfBirth: ["Enter a date of birth on or after January 1, 1900."],
    });
  });

  it.each(["2025-02-30", "2025-13-01", "14/03/1988", "1988-3-14"])(
    "rejects %j as not a valid date",
    (dateOfBirth) => {
      const input = { ...validPatientInput, dateOfBirth };

      const fieldErrors = fieldErrorsFor(input);

      expect(fieldErrors).toEqual({ dateOfBirth: ["Enter a valid date of birth."] });
    },
  );

  it.each([
    ["blank", "  "],
    ["missing", undefined],
  ])("asks for a date of birth when it is %s", (_description, dateOfBirth) => {
    const input = { ...validPatientInput, dateOfBirth };

    const fieldErrors = fieldErrorsFor(input);

    expect(fieldErrors).toEqual({ dateOfBirth: ["Enter a date of birth."] });
  });

  it("accepts today and rejects tomorrow", () => {
    setLocalNow(2026, 9, 20, 12, 0);

    const todayResult = createPatientSchema.safeParse({ ...validPatientInput, dateOfBirth: "2026-10-20" });
    const tomorrowErrors = fieldErrorsFor({ ...validPatientInput, dateOfBirth: "2026-10-21" });

    expect(todayResult.success).toBe(true);
    expect(tomorrowErrors).toEqual({ dateOfBirth: ["Date of birth can't be in the future."] });
  });

  it("uses the local date rather than the UTC date", () => {
    // In UTC+14, 8:00 on October 21 is still October 20 in UTC.
    process.env.TZ = "Pacific/Kiritimati";
    setLocalNow(2026, 9, 21, 8, 0);

    const result = createPatientSchema.safeParse({ ...validPatientInput, dateOfBirth: "2026-10-21" });

    expect(result.success).toBe(true);
  });
});
