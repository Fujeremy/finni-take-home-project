import { defineConfig } from "vitest/config";
import { loadRootEnvFile, readRequiredEnv } from "./src/env.js";

loadRootEnvFile();
const testDatabaseUrl = readRequiredEnv("TEST_DATABASE_URL");

// Tests truncate tables, so refuse to run against the development database.
if (testDatabaseUrl === process.env.DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL must point to a different database than DATABASE_URL.");
}

export default defineConfig({
  test: {
    globalSetup: ["./test/globalSetup.ts"],
    env: { TEST_DATABASE_URL: testDatabaseUrl },
    // All test files share one database, so run them one at a time.
    fileParallelism: false,
  },
});
