import { createDb } from "../src/db/knex.js";
import { readRequiredEnv } from "../src/env.js";

export const testDb = createDb(readRequiredEnv("TEST_DATABASE_URL"));
