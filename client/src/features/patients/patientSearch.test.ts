import type { Patient } from "@finni/shared";
import { describe, expect, it } from "vitest";
import { matchesNameSearch } from "./patientSearch";

const patient: Patient = {
  id: "00000000-0000-4000-8000-000000000001",
  firstName: "Jordan",
  middleName: "Lee",
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

describe("matchesNameSearch", () => {
  it("matches part of the first, middle, or last name", () => {
    expect(matchesNameSearch(patient, "jor")).toBe(true);
    expect(matchesNameSearch(patient, "lee")).toBe(true);
    expect(matchesNameSearch(patient, "vera")).toBe(true);
    expect(matchesNameSearch(patient, "chen")).toBe(false);
  });

  it("ignores letter case and accents in both the name and the search", () => {
    const accentedPatient = { ...patient, firstName: "José", middleName: null, lastName: "Hương" };

    expect(matchesNameSearch(accentedPatient, "JOSE")).toBe(true);
    expect(matchesNameSearch(accentedPatient, "huong")).toBe(true);
    expect(matchesNameSearch(patient, "Jórdan")).toBe(true);
  });

  it("requires every typed word to appear in the name, in any order", () => {
    expect(matchesNameSearch(patient, "riv jor")).toBe(true);
    expect(matchesNameSearch(patient, "jor chen")).toBe(false);
  });

  it("ignores surrounding and repeated spaces", () => {
    expect(matchesNameSearch(patient, "  jor   riv  ")).toBe(true);
  });

  it("matches every patient when the search is blank", () => {
    expect(matchesNameSearch(patient, "")).toBe(true);
    expect(matchesNameSearch(patient, "   ")).toBe(true);
  });
});
