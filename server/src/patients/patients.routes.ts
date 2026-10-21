import { createPatientSchema } from "@finni/shared";
import { Router } from "express";
import type { Knex } from "knex";
import { z } from "zod";
import { createPatient, findPatientById, listPatients } from "./patients.data.js";

// Any 8-4-4-4-12 hex ID. That's a subset of what PostgreSQL accepts for a uuid column, so
// an ID that passes can't trigger a database error.
const patientIdSchema = z.guid();

export function createPatientsRouter(db: Knex): Router {
  const router = Router();

  router.get("/", async (_request, response) => {
    const patients = await listPatients(db);
    response.json(patients);
  });

  router.get("/:patientId", async (request, response) => {
    // Checked before querying: PostgreSQL rejects a malformed UUID with a database error.
    const patientIdResult = patientIdSchema.safeParse(request.params.patientId);
    if (!patientIdResult.success) {
      response.status(400).json({
        error: {
          code: "INVALID_PATIENT_ID",
          message: "This isn't a valid patient ID.",
        },
      });
      return;
    }

    const patient = await findPatientById(db, patientIdResult.data);
    if (!patient) {
      response.status(404).json({
        error: {
          code: "PATIENT_NOT_FOUND",
          message: "This patient doesn't exist.",
        },
      });
      return;
    }

    response.json(patient);
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
