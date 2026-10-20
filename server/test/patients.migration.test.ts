import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { testDb } from "./testDb.js";

const requiredPatientColumns = {
  first_name: "Jordan",
  last_name: "Rivera",
  date_of_birth: "1988-03-14",
  address_line_1: "42 Maple Lane",
  city: "Springfield",
  region: "ON",
  postal_code: "K1A 0B1",
  country: "CA",
};

beforeEach(async () => {
  await testDb("patients").truncate();
});

afterAll(async () => {
  await testDb.destroy();
});

describe("patients table", () => {
  it("generates an id, a creation time, and inquiry status when only required columns are given", async () => {
    const [savedPatient] = await testDb("patients").insert(requiredPatientColumns).returning("*");

    expect(savedPatient.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(savedPatient.created_at).toBeInstanceOf(Date);
    expect(savedPatient.status).toBe("inquiry");
    expect(savedPatient.middle_name).toBeNull();
    expect(savedPatient.address_line_2).toBeNull();
  });

  it("rejects a status outside inquiry, onboarding, active, and churned", async () => {
    const insertArchivedPatient = testDb("patients").insert({
      ...requiredPatientColumns,
      status: "archived",
    });

    await expect(insertArchivedPatient).rejects.toThrow(/patients_status_check/);
  });

  it("rejects a country code that is not two uppercase letters", async () => {
    const insertLowercaseCountry = testDb("patients").insert({
      ...requiredPatientColumns,
      country: "ca",
    });

    await expect(insertLowercaseCountry).rejects.toThrow(/patients_country_check/);
  });
});
