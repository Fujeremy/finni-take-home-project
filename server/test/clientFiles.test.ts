import path from "node:path";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { testDb } from "./testDb.js";

// Stands in for client/dist, so the test doesn't depend on running the client build first.
const builtClientPath = path.join(import.meta.dirname, "fixtures/client-dist");

afterAll(async () => {
  await testDb.destroy();
});

describe("serving the built client", () => {
  it("serves the client's page at the root URL", async () => {
    const app = createApp(testDb, { builtClientPath });

    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/text\/html/);
    expect(response.text).toContain("Built client fixture");
  });

  it("still answers unknown API paths with a JSON 404", async () => {
    const app = createApp(testDb, { builtClientPath });

    const response = await request(app).get("/api/appointments");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
