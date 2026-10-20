import { loadRootEnvFile, readRequiredEnv } from "../env.js";
import { createDb } from "./knex.js";

// Empties the development database's patients table (npm run db:reset). The table itself
// stays, so the database is back to the state right after setup.
loadRootEnvFile();
const db = createDb(readRequiredEnv("DATABASE_URL"));

try {
  await db("patients").truncate();
  console.log("Removed all patients. The database is empty and ready for npm run db:seed or new entries.");
} finally {
  await db.destroy();
}
