import { createDb, migrationConfig } from "../src/db/knex.js";
import { readRequiredEnv } from "../src/env.js";

export async function setup(): Promise<void> {
  const db = createDb(readRequiredEnv("TEST_DATABASE_URL"));
  try {
    await db.migrate.latest(migrationConfig);
  } finally {
    await db.destroy();
  }
}
