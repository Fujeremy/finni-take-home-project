import type { Knex } from "knex";

// Column limits intentionally repeat PATIENT_FIELD_MAX_LENGTHS from @finni/shared:
// migrations must stay fixed even if application code changes later.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("patients", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("first_name", 100).notNullable();
    table.string("middle_name", 100);
    table.string("last_name", 100).notNullable();
    table.date("date_of_birth").notNullable();
    table.string("status", 20).notNullable().defaultTo("inquiry");
    table.string("address_line_1", 255).notNullable();
    table.string("address_line_2", 255);
    table.string("city", 100).notNullable();
    table.string("region", 100).notNullable();
    table.string("postal_code", 20).notNullable();
    table.string("country", 2).notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.check(
      "status IN ('inquiry', 'onboarding', 'active', 'churned')",
      [],
      "patients_status_check",
    );
    table.check("country ~ '^[A-Z]{2}$'", [], "patients_country_check");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("patients");
}
