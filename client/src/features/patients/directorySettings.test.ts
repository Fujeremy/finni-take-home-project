import { describe, expect, it } from "vitest";
import { type DirectorySettings, readDirectorySettings, toSearchString } from "./directorySettings";

const defaultSettings: DirectorySettings = {
  searchText: "",
  selectedStatuses: [],
  sortOrder: "recently-added",
  pageNumber: 1,
  pageSize: 25,
};

describe("readDirectorySettings", () => {
  it("reads every setting from the address", () => {
    const searchParams = new URLSearchParams("q=riv&status=inquiry,active&sort=last-name-asc&page=3&size=100");

    const settings = readDirectorySettings(searchParams);

    expect(settings).toEqual({
      searchText: "riv",
      selectedStatuses: ["inquiry", "active"],
      sortOrder: "last-name-asc",
      pageNumber: 3,
      pageSize: 100,
    });
  });

  it("uses the defaults for an address with no settings", () => {
    const settings = readDirectorySettings(new URLSearchParams(""));

    expect(settings).toEqual(defaultSettings);
  });

  it("keeps known statuses in the usual order, without duplicates, and drops unknown ones", () => {
    const searchParams = new URLSearchParams("status=churned,archived,inquiry,churned");

    const settings = readDirectorySettings(searchParams);

    expect(settings.selectedStatuses).toEqual(["inquiry", "churned"]);
  });

  it.each(["abc", "0", "-2", "1.5", ""])("goes back to page 1 for the page value %j", (pageValue) => {
    const searchParams = new URLSearchParams({ page: pageValue });

    const settings = readDirectorySettings(searchParams);

    expect(settings.pageNumber).toBe(1);
  });

  it("uses the default sort and page size for values it doesn't recognize", () => {
    const searchParams = new URLSearchParams("sort=newest&size=30");

    const settings = readDirectorySettings(searchParams);

    expect(settings.sortOrder).toBe("recently-added");
    expect(settings.pageSize).toBe(25);
  });
});

describe("toSearchString", () => {
  it("writes nothing for the default settings", () => {
    expect(toSearchString(defaultSettings)).toBe("");
  });

  it("writes only the settings that differ from the defaults, with plain commas between statuses", () => {
    const settings: DirectorySettings = {
      ...defaultSettings,
      searchText: "riv",
      selectedStatuses: ["inquiry", "onboarding"],
      pageNumber: 2,
    };

    expect(toSearchString(settings)).toBe("q=riv&status=inquiry,onboarding&page=2");
  });

  it("encodes characters in the search that would break the address", () => {
    const settings: DirectorySettings = { ...defaultSettings, searchText: "Ana & José" };

    const searchString = toSearchString(settings);

    expect(new URLSearchParams(searchString).get("q")).toBe("Ana & José");
  });
});
