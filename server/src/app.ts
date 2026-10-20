import express, { type ErrorRequestHandler, type Express } from "express";
import type { Knex } from "knex";

// Logs the full error for diagnosis but never sends its details (SQL, stack, connection info) to users.
const handleUnexpectedError: ErrorRequestHandler = (error, request, response, _next) => {
  console.error(`Unexpected error on ${request.method} ${request.originalUrl}:`, error);
  response.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again.",
    },
  });
};

// The database is passed in so tests can run the same app against the test database.
export function createApp(db: Knex): Express {
  const app = express();

  app.get("/api/health", async (_request, response) => {
    await db.raw("select 1");
    response.json({ status: "ok" });
  });

  app.use(handleUnexpectedError);

  return app;
}
