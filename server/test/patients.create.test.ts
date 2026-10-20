import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { testDb } from "./testDb.js";

const validPatientInput = {
  firstName: "Jordan",
  middleName: "Lee",
  lastName: "Rivera",
  dateOfBirth: "1988-03-14",
  status: "onboarding",
  addressLine1: "42 Maple Lane",
  addressLine2: "Unit 3",
  city: "Springfield",
  region: "ON",
  postalCode: "K1A 0B1",
  country: "CA",
};

async function countSavedPatients(): Promise<number> {
  const countResult = await testDb("patients").count({ count: "*" }).first();
  return Number(countResult?.count);
}

beforeEach(async () => {
  await testDb("patients").truncate();
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await testDb.destroy();
});

describe("POST /api/patients", () => {
  it("saves a patient with every field and returns the saved record", async () => {
    const app = createApp(testDb);

    const response = await request(app).post("/api/patients").send(validPatientInput);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      ...validPatientInput,
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
    });
    const savedRow = await testDb("patients").where({ id: response.body.id }).first();
    expect(savedRow).toMatchObject({
      first_name: "Jordan",
      middle_name: "Lee",
      last_name: "Rivera",
      date_of_birth: "1988-03-14",
      status: "onboarding",
      address_line_1: "42 Maple Lane",
      address_line_2: "Unit 3",
      city: "Springfield",
      region: "ON",
      postal_code: "K1A 0B1",
      country: "CA",
    });
  });

  it("stores omitted optional fields as null", async () => {
    const app = createApp(testDb);
    // JSON leaves out undefined values, so these fields are not sent at all.
    const requiredFieldsOnly = { ...validPatientInput, middleName: undefined, addressLine2: undefined };

    const response = await request(app).post("/api/patients").send(requiredFieldsOnly);

    expect(response.status).toBe(201);
    expect(response.body.middleName).toBeNull();
    expect(response.body.addressLine2).toBeNull();
  });

  it("returns field errors and saves nothing when required fields are missing or blank", async () => {
    const app = createApp(testDb);

    const response = await request(app)
      .post("/api/patients")
      .send({ ...validPatientInput, lastName: undefined, city: "   " });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Check the highlighted fields.",
        fieldErrors: {
          lastName: ["Enter a last name."],
          city: ["Enter a city."],
        },
      },
    });
    expect(await countSavedPatients()).toBe(0);
  });

  it("saves text at the length limits", async () => {
    const app = createApp(testDb);
    const input = {
      ...validPatientInput,
      firstName: "a".repeat(100),
      addressLine1: "b".repeat(255),
      postalCode: "c".repeat(20),
    };

    const response = await request(app).post("/api/patients").send(input);

    expect(response.status).toBe(201);
    const savedRow = await testDb("patients").where({ id: response.body.id }).first();
    expect(savedRow.first_name).toHaveLength(100);
    expect(savedRow.address_line_1).toHaveLength(255);
    expect(savedRow.postal_code).toHaveLength(20);
  });

  it("rejects text over a length limit and saves nothing", async () => {
    const app = createApp(testDb);

    const response = await request(app)
      .post("/api/patients")
      .send({ ...validPatientInput, firstName: "a".repeat(101) });

    expect(response.status).toBe(400);
    expect(response.body.error.fieldErrors).toEqual({
      firstName: ["100 characters max."],
    });
    expect(await countSavedPatients()).toBe(0);
  });

  it("saves the country code uppercased", async () => {
    const app = createApp(testDb);

    const response = await request(app).post("/api/patients").send({ ...validPatientInput, country: " ca " });

    expect(response.status).toBe(201);
    const savedRow = await testDb("patients").where({ id: response.body.id }).first();
    expect(savedRow.country).toBe("CA");
  });

  it.each([
    ["missing", undefined],
    ["unknown", "archived"],
  ])("rejects a %s status and saves nothing", async (_description, status) => {
    const app = createApp(testDb);

    const response = await request(app).post("/api/patients").send({ ...validPatientInput, status });

    expect(response.status).toBe(400);
    expect(response.body.error.fieldErrors).toEqual({ status: ["Choose a status."] });
    expect(await countSavedPatients()).toBe(0);
  });

  it("rejects a birth date before 1900", async () => {
    const app = createApp(testDb);

    const response = await request(app)
      .post("/api/patients")
      .send({ ...validPatientInput, dateOfBirth: "1899-12-31" });

    expect(response.status).toBe(400);
    expect(response.body.error.fieldErrors).toEqual({
      dateOfBirth: ["Enter a date of birth on or after January 1, 1900."],
    });
  });

  it("rejects a birth date after today on the server's clock", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 20, 12, 0));
    const app = createApp(testDb);

    const response = await request(app)
      .post("/api/patients")
      .send({ ...validPatientInput, dateOfBirth: "2026-10-21" });

    expect(response.status).toBe(400);
    expect(response.body.error.fieldErrors).toEqual({
      dateOfBirth: ["Date of birth can't be in the future."],
    });
    expect(await countSavedPatients()).toBe(0);
  });

  it("ignores fields that are not part of a patient", async () => {
    const app = createApp(testDb);
    const input = { ...validPatientInput, id: "00000000-0000-4000-8000-000000000099", notes: "extra" };

    const response = await request(app).post("/api/patients").send(input);

    expect(response.status).toBe(201);
    expect(response.body.id).not.toBe("00000000-0000-4000-8000-000000000099");
    expect(response.body).not.toHaveProperty("notes");
  });

  it("rejects a body that is not valid JSON and saves nothing", async () => {
    const app = createApp(testDb);

    const response = await request(app)
      .post("/api/patients")
      .set("Content-Type", "application/json")
      .send('{"firstName": "Jordan"');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_JSON",
        message: "The request body must be valid JSON.",
      },
    });
    expect(await countSavedPatients()).toBe(0);
  });
});
