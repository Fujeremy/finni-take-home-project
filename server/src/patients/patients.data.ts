import type { Patient, PatientStatus } from "@finni/shared";
import type { Knex } from "knex";

type PatientRow = {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  date_of_birth: string;
  status: PatientStatus;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  created_at: Date;
};

function toPatient(row: PatientRow): Patient {
  return {
    id: row.id,
    firstName: row.first_name,
    middleName: row.middle_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    status: row.status,
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2,
    city: row.city,
    region: row.region,
    postalCode: row.postal_code,
    country: row.country,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listPatients(db: Knex): Promise<Patient[]> {
  const rows = await db<PatientRow>("patients")
    .select("*")
    .orderBy([
      { column: "created_at", order: "desc" },
      { column: "id", order: "asc" },
    ]);
  return rows.map(toPatient);
}
