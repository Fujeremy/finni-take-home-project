import type { PatientStatus } from "@finni/shared";
import { PATIENT_STATUS_LABELS } from "./patientFormatting";
import { PATIENT_SORT_ORDERS, type PatientSortOrder } from "./patientSorting";

// The statuses in their usual order, taken from the labels rather than importing
// PATIENT_STATUSES from @finni/shared: any value imported from there brings the whole
// shared schema and zod into the page's first download instead of the dialog's file.
// The labels record lists every status, so this stays complete; Object.keys only loses the key type.
export const STATUS_FILTER_OPTIONS = Object.keys(PATIENT_STATUS_LABELS) as PatientStatus[];

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export type DirectorySettings = {
  searchText: string;
  // Empty means every status is shown.
  selectedStatuses: PatientStatus[];
  sortOrder: PatientSortOrder;
  pageNumber: number;
  pageSize: PageSize;
};

const DEFAULT_SETTINGS: DirectorySettings = {
  searchText: "",
  selectedStatuses: [],
  sortOrder: "recently-added",
  pageNumber: 1,
  pageSize: 25,
};

// Keeps the known statuses in their usual order, so "active,inquiry,active,foo" reads as
// Inquiry and Active.
function readStatuses(statusParam: string | null): PatientStatus[] {
  if (statusParam === null) {
    return [];
  }
  const requestedStatuses = statusParam.split(",");
  return STATUS_FILTER_OPTIONS.filter((status) => requestedStatuses.includes(status));
}

function readSortOrder(sortParam: string | null): PatientSortOrder {
  const knownSortOrder = PATIENT_SORT_ORDERS.find((sortOrder) => sortOrder === sortParam);
  return knownSortOrder ?? DEFAULT_SETTINGS.sortOrder;
}

// Only whole numbers from 1 up; a page past the end is shown as the last page by the directory.
function readPageNumber(pageParam: string | null): number {
  if (pageParam === null || !/^\d+$/.test(pageParam)) {
    return DEFAULT_SETTINGS.pageNumber;
  }
  const pageNumber = Number(pageParam);
  if (pageNumber < 1) {
    return DEFAULT_SETTINGS.pageNumber;
  }
  return pageNumber;
}

function readPageSize(sizeParam: string | null): PageSize {
  const knownPageSize = PAGE_SIZE_OPTIONS.find((pageSize) => String(pageSize) === sizeParam);
  return knownPageSize ?? DEFAULT_SETTINGS.pageSize;
}

// Reads the directory settings from the page address. A value it doesn't recognize, such as
// a mistyped link, falls back to that setting's default instead of failing.
export function readDirectorySettings(searchParams: URLSearchParams): DirectorySettings {
  return {
    searchText: searchParams.get("q") ?? DEFAULT_SETTINGS.searchText,
    selectedStatuses: readStatuses(searchParams.get("status")),
    sortOrder: readSortOrder(searchParams.get("sort")),
    pageNumber: readPageNumber(searchParams.get("page")),
    pageSize: readPageSize(searchParams.get("size")),
  };
}

// Writes the settings as a query string, leaving out defaults so an unfiltered directory is
// just /patients.
export function toSearchString(settings: DirectorySettings): string {
  const searchParams = new URLSearchParams();
  if (settings.searchText !== DEFAULT_SETTINGS.searchText) {
    searchParams.set("q", settings.searchText);
  }
  if (settings.selectedStatuses.length > 0) {
    searchParams.set("status", settings.selectedStatuses.join(","));
  }
  if (settings.sortOrder !== DEFAULT_SETTINGS.sortOrder) {
    searchParams.set("sort", settings.sortOrder);
  }
  if (settings.pageNumber !== DEFAULT_SETTINGS.pageNumber) {
    searchParams.set("page", String(settings.pageNumber));
  }
  if (settings.pageSize !== DEFAULT_SETTINGS.pageSize) {
    searchParams.set("size", String(settings.pageSize));
  }
  // URLSearchParams writes commas as %2C. Commas are allowed in a query string, so they're
  // restored to keep the status list readable in the address bar.
  return searchParams.toString().replaceAll("%2C", ",");
}
