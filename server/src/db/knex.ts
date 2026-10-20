import path from "node:path";
import knex, { type Knex } from "knex";

export function createDb(connectionString: string): Knex {
  return knex({ client: "pg", connection: connectionString });
}

// Migrations always run from TypeScript source (via tsx or Vitest), never from build output.
// `extension` makes `knex migrate:make` create TypeScript files.
export const migrationConfig: Knex.MigratorConfig = {
  directory: path.join(import.meta.dirname, "migrations"),
  loadExtensions: [".ts"],
  extension: "ts",
};
