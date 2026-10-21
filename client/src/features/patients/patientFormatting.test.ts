import { describe, expect, it } from "vitest";
import {
  calculateAgeInYears,
  formatAddedAt,
  formatAddedAtWithTime,
  formatAge,
  formatDateOfBirth,
} from "./patientFormatting";

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

describe("formatAddedAtWithTime", () => {
  it("shows the date and time a patient was added in the viewer's timezone", () => {
    const createdAt = "2026-10-20T03:14:00.000Z";

    const torontoTime = formatAddedAtWithTime(createdAt, "America/Toronto");
    const tokyoTime = formatAddedAtWithTime(createdAt, "Asia/Tokyo");

    expect(torontoTime).toBe("Oct 19, 2026, 11:14 PM");
    expect(tokyoTime).toBe("Oct 20, 2026, 12:14 PM");
  });
});

describe("calculateAgeInYears", () => {
  it("doesn't count this year on the day before the birthday", () => {
    const dayBeforeBirthday = new Date(2026, 2, 13);

    const age = calculateAgeInYears("1988-03-14", dayBeforeBirthday);

    expect(age).toBe(37);
  });

  it("counts this year on the birthday itself", () => {
    const birthday = new Date(2026, 2, 14);

    const age = calculateAgeInYears("1988-03-14", birthday);

    expect(age).toBe(38);
  });

  it("counts a 29 February birthday on 1 March in a year without 29 February", () => {
    const lastDayOfFebruary = new Date(2027, 1, 28);
    const firstOfMarch = new Date(2027, 2, 1);

    expect(calculateAgeInYears("2000-02-29", lastDayOfFebruary)).toBe(26);
    expect(calculateAgeInYears("2000-02-29", firstOfMarch)).toBe(27);
  });

  it("counts a 29 February birthday on the day in a leap year", () => {
    const leapDay = new Date(2028, 1, 29);

    const age = calculateAgeInYears("2000-02-29", leapDay);

    expect(age).toBe(28);
  });
});

describe("formatAge", () => {
  it("says year for one and years otherwise", () => {
    expect(formatAge(0)).toBe("0 years");
    expect(formatAge(1)).toBe("1 year");
    expect(formatAge(38)).toBe("38 years");
  });
});
