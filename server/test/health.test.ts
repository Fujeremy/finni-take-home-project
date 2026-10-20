import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { testDb } from "./testDb.js";

afterAll(async () => {
  await testDb.destroy();
});

describe("GET /api/health", () => {
  it("reports ok when the database is reachable", async () => {
    const app = createApp(testDb);

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
