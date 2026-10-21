import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createDb } from "../src/db/knex.js";
import { testDb } from "./testDb.js";

// A saved patient in database column names, with only the required columns filled.
const savedPatientRow = {
  first_name: "Jordan",
  last_name: "Rivera",
  date_of_birth: "1988-03-14",
  status: "active",
  address_line_1: "42 Maple Lane",
  city: "Springfield",
  region: "ON",
  postal_code: "K1A 0B1",
  country: "CA",
};

// Nothing listens on port 1, so any query would fail with a connection error.
const unreachableDb = createDb("postgres://finni:finni@127.0.0.1:1/finni_test");

beforeEach(async () => {
  await testDb("patients").truncate();
});

afterAll(async () => {
  await testDb.destroy();
  await unreachableDb.destroy();
});

describe("GET /api/patients/:patientId", () => {
  it("returns only the requested patient, with every field in camelCase", async () => {
    await testDb("patients").insert([
      {
        ...savedPatientRow,
        id: "00000000-0000-4000-8000-000000000001",
        middle_name: "Lee",
        address_line_2: "Unit 3",
        created_at: "2026-10-19T14:30:00Z",
      },
      { ...savedPatientRow, id: "00000000-0000-4000-8000-000000000002", first_name: "Avery" },
    ]);
    const app = createApp(testDb);

    const response = await request(app).get("/api/patients/00000000-0000-4000-8000-000000000001");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      firstName: "Jordan",
      middleName: "Lee",
      lastName: "Rivera",
      dateOfBirth: "1988-03-14",
      status: "active",
      addressLine1: "42 Maple Lane",
      addressLine2: "Unit 3",
      city: "Springfield",
      region: "ON",
      postalCode: "K1A 0B1",
      country: "CA",
      createdAt: "2026-10-19T14:30:00.000Z",
    });
  });

  it("returns 404 PATIENT_NOT_FOUND for a valid ID that no patient has", async () => {
    await testDb("patients").insert({ ...savedPatientRow, id: "00000000-0000-4000-8000-000000000001" });
    const app = createApp(testDb);

    const response = await request(app).get("/api/patients/00000000-0000-4000-8000-000000000009");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: "PATIENT_NOT_FOUND", message: "This patient doesn't exist." },
    });
  });

  it("rejects an ID that isn't a UUID with 400 INVALID_PATIENT_ID, without querying the database", async () => {
    // If the route queried the database, the unreachable connection would turn this into a 500.
    const app = createApp(unreachableDb);

    const response = await request(app).get("/api/patients/abc");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: "INVALID_PATIENT_ID", message: "This isn't a valid patient ID." },
    });
  });
});
