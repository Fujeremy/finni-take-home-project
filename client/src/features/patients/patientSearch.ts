import type { Patient } from "@finni/shared";
import { formatPatientName } from "./patientFormatting";

// Lowercases and strips accents so "José" and "jose" compare equal. Only the combining
// accent marks used by Latin, Greek, and Cyrillic letters are removed; other scripts'
// vowel signs and marks carry meaning, so they are kept and must be typed to match.
function normalizeForSearch(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Each typed word must appear somewhere in the patient's full name, in any order,
// so "riv jor" finds Jordan Lee Rivera. A blank search matches every patient.
export function matchesNameSearch(patient: Patient, searchText: string): boolean {
  const searchWords = normalizeForSearch(searchText).split(/\s+/).filter((word) => word !== "");
  const fullName = normalizeForSearch(formatPatientName(patient));

  return searchWords.every((word) => fullName.includes(word));
}
