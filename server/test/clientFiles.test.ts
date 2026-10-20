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

  it("serves the client's page for a client route, so a refresh or direct link opens the app", async () => {
    const app = createApp(testDb, { builtClientPath });

    const response = await request(app).get("/patients/00000000-0000-4000-8000-000000000001");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/text\/html/);
    expect(response.text).toContain("Built client fixture");
  });

  it("answers a missing file with a 404 instead of the client's page", async () => {
    const app = createApp(testDb, { builtClientPath });

    const response = await request(app).get("/assets/missing.js");

    expect(response.status).toBe(404);
    expect(response.text).not.toContain("Built client fixture");
  });

  it("still answers unknown API paths with a JSON 404", async () => {
    const app = createApp(testDb, { builtClientPath });

    const response = await request(app).get("/api/appointments");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
