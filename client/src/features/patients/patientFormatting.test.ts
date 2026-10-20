import { describe, expect, it } from "vitest";
import { formatAddedAt, formatDateOfBirth } from "./patientFormatting";

describe("formatAddedAt", () => {
  it("shows the creation time in the viewer's timezone", () => {
    const createdAt = "2026-10-20T03:14:00.000Z";

    const torontoTime = formatAddedAt(createdAt, "America/Toronto");
    const tokyoTime = formatAddedAt(createdAt, "Asia/Tokyo");

    expect(torontoTime).toBe("Oct 19, 2026, 11:14 PM");
    expect(tokyoTime).toBe("Oct 20, 2026, 12:14 PM");
  });
});

describe("formatDateOfBirth", () => {
  it("shows the stored calendar date without converting it", () => {
    const formatted = formatDateOfBirth("1988-03-14");

    expect(formatted).toBe("Mar 14, 1988");
  });
});
