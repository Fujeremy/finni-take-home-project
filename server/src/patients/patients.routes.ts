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
