import express, { type ErrorRequestHandler, type Express } from "express";
import type { Knex } from "knex";
import { createPatientsRouter } from "./patients/patients.routes.js";

// express.json() marks a body it can't parse with type "entity.parse.failed" and a body over
// its 100 KB default limit with "entity.too.large".
const handleRequestBodyError: ErrorRequestHandler = (error, _request, response, next) => {
  const errorType = error instanceof Error && "type" in error ? error.type : undefined;

  if (errorType === "entity.parse.failed") {
    response.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "The request body must be valid JSON.",
      },
    });
    return;
  }

  if (errorType === "entity.too.large") {
    response.status(413).json({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "The request is too large.",
      },
    });
    return;
  }

  next(error);
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

  // Without this, Express answers unknown API paths with an HTML page.
  app.use("/api", (_request, response) => {
    response.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "This API endpoint doesn't exist.",
      },
    });
  });

  app.use(handleRequestBodyError);
  app.use(handleUnexpectedError);

  return app;
}
