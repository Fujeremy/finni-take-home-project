import path from "node:path";
import knex, { type Knex } from "knex";
import pg from "pg";

// Return DATE columns (birth dates) as the stored YYYY-MM-DD text. The driver's default
// turns them into a JavaScript Date at local midnight, which can shift the day in JSON.
pg.types.setTypeParser(pg.types.builtins.DATE, (storedDate: string) => storedDate);

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
