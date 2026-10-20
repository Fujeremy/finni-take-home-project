import { Router } from "express";
import type { Knex } from "knex";
import { listPatients } from "./patients.data.js";

export function createPatientsRouter(db: Knex): Router {
  const router = Router();

  router.get("/", async (_request, response) => {
    const patients = await listPatients(db);
    response.json(patients);
  });

  return router;
}
