import type { Patient } from "@finni/shared";

// In the order the sort menu lists them.
export const PATIENT_SORT_ORDERS = ["recently-added", "oldest-added", "last-name-asc", "last-name-desc"] as const;

export type PatientSortOrder = (typeof PATIENT_SORT_ORDERS)[number];

export const PATIENT_SORT_LABELS: Record<PatientSortOrder, string> = {
  "recently-added": "Recently added",
  "oldest-added": "Oldest added",
  "last-name-asc": "Last name A–Z",
  "last-name-desc": "Last name Z–A",
};

// "base" sensitivity treats "Álvarez", "alvarez", and "Alvarez" as the same name.
const nameCollator = new Intl.Collator("en", { sensitivity: "base" });

function compareNames(first: Patient, second: Patient): number {
  const lastNameOrder = nameCollator.compare(first.lastName, second.lastName);
  if (lastNameOrder !== 0) {
    return lastNameOrder;
  }
  const firstNameOrder = nameCollator.compare(first.firstName, second.firstName);
  if (firstNameOrder !== 0) {
    return firstNameOrder;
  }
  return nameCollator.compare(first.middleName ?? "", second.middleName ?? "");
}

// Expects patients in the API's order, newest first. Array sort is stable, so patients
// with the same name keep that order in both name directions.
export function sortPatients(patients: Patient[], sortOrder: PatientSortOrder): Patient[] {
  switch (sortOrder) {
    case "recently-added":
      return patients;
    case "oldest-added":
      return [...patients].reverse();
    case "last-name-asc":
      return [...patients].sort(compareNames);
    case "last-name-desc":
      return [...patients].sort((first, second) => compareNames(second, first));
  }
}
