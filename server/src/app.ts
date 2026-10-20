import express, { type Express } from "express";
import type { Knex } from "knex";

// The database is passed in so tests can run the same app against the test database.
export function createApp(db: Knex): Express {
  const app = express();

  app.get("/api/health", async (_request, response) => {
    await db.raw("select 1");
    response.json({ status: "ok" });
  });

  return app;
}
