import type { Knex } from "knex";
import { buildMockPatientRows } from "../mockPatients.js";

// Replaces every patient with the 50 mock patients, so each run starts from the same state.
export async function seed(knex: Knex): Promise<void> {
  const mockPatientRows = buildMockPatientRows(new Date());
  await knex("patients").truncate();
  await knex("patients").insert(mockPatientRows);
}
