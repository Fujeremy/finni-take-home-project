import { describe, expect, it } from "vitest";
import { formatAddedAt, formatDateOfBirth } from "./patientFormatting";

describe("formatAddedAt", () => {
  it("shows the date a patient was added in the viewer's timezone, without the time", () => {
    const createdAt = "2026-10-20T03:14:00.000Z";

    const torontoDate = formatAddedAt(createdAt, "America/Toronto");
    const tokyoDate = formatAddedAt(createdAt, "Asia/Tokyo");

    expect(torontoDate).toBe("Oct 19, 2026");
    expect(tokyoDate).toBe("Oct 20, 2026");
  });
});

describe("formatDateOfBirth", () => {
  it("shows the stored calendar date without converting it", () => {
    const formatted = formatDateOfBirth("1988-03-14");

    expect(formatted).toBe("Mar 14, 1988");
  });
});
