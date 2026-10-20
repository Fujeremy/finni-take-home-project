import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
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

beforeEach(async () => {
  await testDb("patients").truncate();
});

afterAll(async () => {
  await testDb.destroy();
});

describe("GET /api/patients", () => {
  it("returns an empty list when no patients are saved", async () => {
    const app = createApp(testDb);

    const response = await request(app).get("/api/patients");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("returns every field in camelCase, with the birth date exactly as saved", async () => {
    await testDb("patients").insert({
      ...savedPatientRow,
      id: "00000000-0000-4000-8000-000000000001",
      created_at: "2026-10-19T14:30:00Z",
    });
    const app = createApp(testDb);

    const response = await request(app).get("/api/patients");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: "00000000-0000-4000-8000-000000000001",
        firstName: "Jordan",
        middleName: null,
        lastName: "Rivera",
        dateOfBirth: "1988-03-14",
        status: "active",
        addressLine1: "42 Maple Lane",
        addressLine2: null,
        city: "Springfield",
        region: "ON",
        postalCode: "K1A 0B1",
        country: "CA",
        createdAt: "2026-10-19T14:30:00.000Z",
      },
    ]);
  });

  it("lists the newest patients first and breaks ties by id", async () => {
    await testDb("patients").insert([
      { ...savedPatientRow, id: "00000000-0000-4000-8000-000000000003", created_at: "2026-10-19T10:00:00Z" },
      { ...savedPatientRow, id: "00000000-0000-4000-8000-000000000002", created_at: "2026-10-19T11:00:00Z" },
      { ...savedPatientRow, id: "00000000-0000-4000-8000-000000000001", created_at: "2026-10-19T11:00:00Z" },
    ]);
    const app = createApp(testDb);

    const response = await request(app).get("/api/patients");

    const listedIds = response.body.map((patient: { id: string }) => patient.id);
    expect(listedIds).toEqual([
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
      "00000000-0000-4000-8000-000000000003",
    ]);
  });
});
