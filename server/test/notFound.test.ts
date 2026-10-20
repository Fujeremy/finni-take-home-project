import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { testDb } from "./testDb.js";

afterAll(async () => {
  await testDb.destroy();
});

describe("unknown API routes", () => {
  it("returns a JSON 404 for an API route that doesn't exist", async () => {
    const app = createApp(testDb);

    const response = await request(app).get("/api/appointments");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "This API endpoint doesn't exist.",
      },
    });
  });
});
