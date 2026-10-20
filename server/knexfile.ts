// Knex CLI configuration. Run commands through `npm run knex -w server -- <command>`,
// which loads this TypeScript file with tsx.
import type { Knex } from "knex";
import { migrationConfig, seedConfig } from "./src/db/knex.js";
import { loadRootEnvFile, readRequiredEnv } from "./src/env.js";

loadRootEnvFile();

const config: Knex.Config = {
  client: "pg",
  connection: readRequiredEnv("DATABASE_URL"),
  migrations: migrationConfig,
  seeds: seedConfig,
};

export default config;
