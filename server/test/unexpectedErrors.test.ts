import request from "supertest";
import { afterAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { createDb } from "../src/db/knex.js";

// Nothing listens on port 1, so every query fails with a connection error.
const unreachableDb = createDb("postgres://finni:finni@127.0.0.1:1/finni_test");

afterAll(async () => {
  await unreachableDb.destroy();
});

describe("unexpected API failures", () => {
  it("returns a generic JSON error without database details and logs the cause on the server", async () => {
    const serverLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = createApp(unreachableDb);

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Please try again.",
      },
    });
    expect(response.text).not.toMatch(/ECONNREFUSED|127\.0\.0\.1|postgres/i);
    expect(serverLog).toHaveBeenCalledWith(
      "Unexpected error on GET /api/health:",
      expect.objectContaining({ message: expect.stringMatching(/ECONNREFUSED/) }),
    );
  });
});
