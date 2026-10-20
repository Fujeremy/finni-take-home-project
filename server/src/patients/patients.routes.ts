import { createPatientSchema } from "@finni/shared";
import { Router } from "express";
import type { Knex } from "knex";
import { z } from "zod";
import { createPatient, listPatients } from "./patients.data.js";

export function createPatientsRouter(db: Knex): Router {
  const router = Router();

  router.get("/", async (_request, response) => {
    const patients = await listPatients(db);
    response.json(patients);
  });

  router.post("/", async (request, response) => {
    // A request that names another format, such as text/plain or a form. A request with no
    // Content-Type has no body to parse and is still reported field by field below.
    const hasContentType = request.headers["content-type"] !== undefined;
    if (hasContentType && !request.is("application/json")) {
      response.status(415).json({
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Send the patient as JSON.",
        },
      });
      return;
    }

    // express.json() already rejects bare strings and numbers. An array is valid JSON but has no
    // fields to report errors on, so it is rejected as a whole.
    if (Array.isArray(request.body)) {
      response.status(400).json({
        error: {
          code: "INVALID_JSON",
          message: "The request body must be a JSON object.",
        },
      });
      return;
    }

    // A request without a JSON body has no body at all; treat it as empty so each field reports what's missing.
    const result = createPatientSchema.safeParse(request.body ?? {});
    if (!result.success) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Check the highlighted fields.",
          fieldErrors: z.flattenError(result.error).fieldErrors,
        },
      });
      return;
    }

    const patient = await createPatient(db, result.data);
    response.status(201).json(patient);
  });

  return router;
}
