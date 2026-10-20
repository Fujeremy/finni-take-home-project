import express, { type ErrorRequestHandler, type Express } from "express";
import type { Knex } from "knex";
import { createPatientsRouter } from "./patients/patients.routes.js";

// express.json() marks a body it can't parse with type "entity.parse.failed".
const handleInvalidJson: ErrorRequestHandler = (error, _request, response, next) => {
  const isUnparseableBody = error instanceof SyntaxError && "type" in error && error.type === "entity.parse.failed";
  if (!isUnparseableBody) {
    next(error);
    return;
  }
  response.status(400).json({
    error: {
      code: "INVALID_JSON",
      message: "The request body must be valid JSON.",
    },
  });
};

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
  app.use(express.json());

  app.get("/api/health", async (_request, response) => {
    await db.raw("select 1");
    response.json({ status: "ok" });
  });

  app.use("/api/patients", createPatientsRouter(db));

  app.use(handleInvalidJson);
  app.use(handleUnexpectedError);

  return app;
}
