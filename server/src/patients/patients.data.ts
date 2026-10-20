import type { CreatePatientData, Patient, PatientStatus } from "@finni/shared";
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

// Expects data already checked by createPatientSchema. The database fills in id and created_at.
export async function createPatient(db: Knex, patient: CreatePatientData): Promise<Patient> {
  // Typed as a full row so a column added to PatientRow fails to compile until it is filled here.
  const newRow: Omit<PatientRow, "id" | "created_at"> = {
    first_name: patient.firstName,
    middle_name: patient.middleName,
    last_name: patient.lastName,
    date_of_birth: patient.dateOfBirth,
    status: patient.status,
    address_line_1: patient.addressLine1,
    address_line_2: patient.addressLine2,
    city: patient.city,
    region: patient.region,
    postal_code: patient.postalCode,
    country: patient.country,
  };
  const [savedRow] = await db<PatientRow>("patients").insert(newRow).returning("*");

  if (!savedRow) {
    throw new Error("Inserting a patient returned no row.");
  }
  return toPatient(savedRow);
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
