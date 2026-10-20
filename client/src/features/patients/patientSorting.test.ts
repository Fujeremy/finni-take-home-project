import type { Patient } from "@finni/shared";
import { describe, expect, it } from "vitest";
import { formatPatientName } from "./patientFormatting";
import { sortPatients } from "./patientSorting";

const patient: Patient = {
  id: "00000000-0000-4000-8000-000000000001",
  firstName: "Jordan",
  middleName: null,
  lastName: "Rivera",
  dateOfBirth: "1988-03-14",
  status: "active",
  addressLine1: "42 Maple Lane",
  addressLine2: null,
  city: "Springfield",
  region: "ON",
  postalCode: "K1A 0B1",
  country: "CA",
  createdAt: "2026-10-20T03:14:00.000Z",
};

function namesOf(patients: Patient[]): string[] {
  return patients.map(formatPatientName);
}

describe("sortPatients", () => {
  it("keeps the API order for Recently added and reverses it for Oldest added", () => {
    const apiOrder = [
      { ...patient, id: "1", firstName: "Newest" },
      { ...patient, id: "2", firstName: "Middle" },
      { ...patient, id: "3", firstName: "Oldest" },
    ];

    const recentlyAdded = sortPatients(apiOrder, "recently-added");
    const oldestAdded = sortPatients(apiOrder, "oldest-added");

    expect(namesOf(recentlyAdded)).toEqual(["Newest Rivera", "Middle Rivera", "Oldest Rivera"]);
    expect(namesOf(oldestAdded)).toEqual(["Oldest Rivera", "Middle Rivera", "Newest Rivera"]);
  });

  it("orders Last name A–Z by last, then first, then middle name, ignoring case and accents", () => {
    const apiOrder = [
      { ...patient, id: "1", firstName: "Cam", middleName: "Ray", lastName: "Brown" },
      { ...patient, id: "2", firstName: "Ben", lastName: "Alvarez" },
      { ...patient, id: "3", firstName: "Cam", middleName: "Lee", lastName: "brown" },
      { ...patient, id: "4", firstName: "Ana", lastName: "Álvarez" },
    ];

    const sorted = sortPatients(apiOrder, "last-name-asc");

    expect(namesOf(sorted)).toEqual(["Ana Álvarez", "Ben Alvarez", "Cam Lee brown", "Cam Ray Brown"]);
  });

  it("orders Last name Z–A as the reverse of A–Z", () => {
    const apiOrder = [
      { ...patient, id: "1", firstName: "Ana", lastName: "Chen" },
      { ...patient, id: "2", firstName: "Ben", lastName: "Rivers" },
      { ...patient, id: "3", firstName: "Cam", lastName: "Rivera" },
    ];

    const sorted = sortPatients(apiOrder, "last-name-desc");

    expect(namesOf(sorted)).toEqual(["Ben Rivers", "Cam Rivera", "Ana Chen"]);
  });

  it("keeps patients with the same name in API order in both name directions", () => {
    const apiOrder = [
      { ...patient, id: "newer", dateOfBirth: "2001-01-01" },
      { ...patient, id: "older", dateOfBirth: "1950-01-01" },
    ];

    const ascending = sortPatients(apiOrder, "last-name-asc");
    const descending = sortPatients(apiOrder, "last-name-desc");

    expect(ascending.map((sortedPatient) => sortedPatient.id)).toEqual(["newer", "older"]);
    expect(descending.map((sortedPatient) => sortedPatient.id)).toEqual(["newer", "older"]);
  });
});
