import path from "node:path";
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

type AppOptions = {
  // The client's production build (client/dist). In development Vite serves the client instead.
  builtClientPath?: string;
};

// The database is passed in so tests can run the same app against the test database.
export function createApp(db: Knex, { builtClientPath }: AppOptions = {}): Express {
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

  // The page and the API share one origin, as they do through the Vite proxy in development.
  if (builtClientPath) {
    app.use(express.static(builtClientPath));

    // A refresh or direct link to a client route such as /patients asks the server for that
    // path, so any other page address gets index.html and React Router picks the screen.
    // Addresses with a file extension are left to 404, so a missing script or stylesheet
    // isn't answered with HTML. API paths never get here; the /api handler above ends them.
    app.get("/{*clientRoute}", (request, response, next) => {
      if (path.extname(request.path) !== "") {
        next();
        return;
      }
      response.sendFile(path.join(builtClientPath, "index.html"));
    });
  }

  app.use(handleRequestBodyError);
  app.use(handleUnexpectedError);

  return app;
}
