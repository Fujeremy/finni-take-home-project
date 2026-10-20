import { localDateToday } from "@finni/shared";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { buildMockPatientRows } from "../src/db/mockPatients.js";
import { seed } from "../src/db/seeds/mock-patients.js";
import { testDb } from "./testDb.js";

beforeEach(async () => {
  await testDb("patients").truncate();
});

afterAll(async () => {
  await testDb.destroy();
});

describe("mock patients", () => {
  it("provides 50 patients that all pass the shared validation and cover every status", () => {
    const rows = buildMockPatientRows(new Date());

    const statuses = new Set(rows.map((row) => row.status));
    expect(rows).toHaveLength(50);
    expect(statuses).toEqual(new Set(["inquiry", "onboarding", "active", "churned"]));
  });

  it("includes values at every field's limit and both birth-date boundaries", () => {
    const rows = buildMockPatientRows(new Date());

    const longest = (values: (string | null)[]) => Math.max(...values.map((value) => value?.length ?? 0));
    expect(longest(rows.map((row) => row.first_name))).toBe(100);
    expect(longest(rows.map((row) => row.middle_name))).toBe(100);
    expect(longest(rows.map((row) => row.last_name))).toBe(100);
    expect(longest(rows.map((row) => row.address_line_1))).toBe(255);
    expect(longest(rows.map((row) => row.address_line_2))).toBe(255);
    expect(longest(rows.map((row) => row.city))).toBe(100);
    expect(longest(rows.map((row) => row.region))).toBe(100);
    expect(longest(rows.map((row) => row.postal_code))).toBe(20);
    const birthDates = rows.map((row) => row.date_of_birth);
    expect(birthDates).toContain("1900-01-01");
    expect(birthDates).toContain(localDateToday());
    expect(birthDates).toContain("2000-02-29");
  });

  it("keeps every address in Canada or the US", () => {
    const rows = buildMockPatientRows(new Date());

    const countries = new Set(rows.map((row) => row.country));
    expect(countries).toEqual(new Set(["CA", "US"]));
  });

  it("includes patients with and without each optional field", () => {
    const rows = buildMockPatientRows(new Date());

    expect(rows.some((row) => row.middle_name === null)).toBe(true);
    expect(rows.some((row) => row.middle_name !== null)).toBe(true);
    expect(rows.some((row) => row.address_line_2 === null)).toBe(true);
    expect(rows.some((row) => row.address_line_2 !== null)).toBe(true);
  });
});

describe("mock patient seed", () => {
  it("replaces existing patients with the 50 mock patients, listed newest first", async () => {
    await testDb("patients").insert({
      first_name: "Existing",
      last_name: "Patient",
      date_of_birth: "1980-01-01",
      address_line_1: "1 Old Road",
      city: "Ottawa",
      region: "ON",
      postal_code: "K1P 1J1",
      country: "CA",
    });

    await seed(testDb);

    const response = await request(createApp(testDb)).get("/api/patients");
    const createdTimes = response.body.map((patient: { createdAt: string }) => patient.createdAt);
    const newestFirst = [...createdTimes].sort().reverse();
    expect(response.body).toHaveLength(50);
    expect(response.body.some((patient: { firstName: string }) => patient.firstName === "Existing")).toBe(false);
    expect(createdTimes).toEqual(newestFirst);
  });

  it("leaves exactly 50 patients when run twice", async () => {
    await seed(testDb);

    await seed(testDb);

    const countResult = await testDb("patients").count({ count: "*" }).first();
    expect(Number(countResult?.count)).toBe(50);
  });
});
