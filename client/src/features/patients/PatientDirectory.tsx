import type { Patient, PatientStatus } from "@finni/shared";
import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getPatients } from "@/lib/api";
import {
  formatAddedAt,
  formatDateOfBirth,
  formatPatientAddress,
  formatPatientName,
  PATIENT_STATUS_LABELS,
} from "./patientFormatting";
import { matchesNameSearch } from "./patientSearch";
import { PATIENT_SORT_LABELS, PATIENT_SORT_ORDERS, sortPatients, type PatientSortOrder } from "./patientSorting";
import { TruncatedText } from "./TruncatedText";

// The statuses in their usual order, taken from the labels rather than importing
// PATIENT_STATUSES from @finni/shared: any value imported from there brings the whole
// shared schema and zod into the page's first download instead of the dialog's file.
// The labels record lists every status, so this stays complete; Object.keys only loses the key type.
const STATUS_FILTER_OPTIONS = Object.keys(PATIENT_STATUS_LABELS) as PatientStatus[];

// Color supports the text label; it is never the only way to tell statuses apart.
const STATUS_BADGE_CLASSES: Record<PatientStatus, string> = {
  inquiry: "bg-blue-100 text-blue-800",
  onboarding: "bg-amber-100 text-amber-900",
  active: "bg-green-100 text-green-800",
  churned: "bg-zinc-200 text-zinc-700",
};

// Fixed column widths keep every row on one line: long names and addresses are shortened
// with "…" instead of widening their column or wrapping.
function PatientTable({ patients }: { patients: Patient[] }) {
  return (
    // A hover delay keeps tooltips from flashing as the pointer passes over rows.
    // Keyboard focus still opens them right away.
    <TooltipProvider delayDuration={700}>
      <Table aria-label="Patients" className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[24%]">Name</TableHead>
            <TableHead className="w-[12%]">Date of birth</TableHead>
            <TableHead className="w-[11%]">Status</TableHead>
            <TableHead className="w-[35%]">Address</TableHead>
            <TableHead className="w-[18%]">Added</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id}>
              <TableCell className="font-medium">
                <TruncatedText text={formatPatientName(patient)} />
              </TableCell>
              <TableCell>{formatDateOfBirth(patient.dateOfBirth)}</TableCell>
              <TableCell>
                <Badge className={STATUS_BADGE_CLASSES[patient.status]}>
                  {PATIENT_STATUS_LABELS[patient.status]}
                </Badge>
              </TableCell>
              <TableCell>
                <TruncatedText text={formatPatientAddress(patient)} />
              </TableCell>
              <TableCell>{formatAddedAt(patient.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}

function EmptyDirectory() {
  return (
    <section aria-labelledby="empty-directory-heading" className="space-y-3 rounded-lg border p-8 text-center">
      <h2 id="empty-directory-heading" className="text-lg font-medium">
        No patients yet
      </h2>
      <p className="text-muted-foreground">
        Patients you add will appear here. Use <strong className="font-medium text-foreground">Add patient</strong>{" "}
        to add the first one.
      </p>
    </section>
  );
}

function formatPatientCount(count: number): string {
  if (count === 1) {
    return "1 patient";
  }
  return `${count} patients`;
}

// Joins status names as "Active or Churned" or "Inquiry, Onboarding, or Active".
const statusNameList = new Intl.ListFormat("en-US", { type: "disjunction" });

function describeNoMatches(searchText: string, selectedStatuses: PatientStatus[]): string {
  const trimmedSearch = searchText.trim();
  const statusNames = statusNameList.format(selectedStatuses.map((status) => PATIENT_STATUS_LABELS[status]));

  if (selectedStatuses.length === 0) {
    return `No patient names match “${trimmedSearch}”.`;
  }
  if (trimmedSearch === "") {
    return `No patients have status ${statusNames}.`;
  }
  return `No patient names match “${trimmedSearch}” with status ${statusNames}.`;
}

function NoMatchingPatients({ message }: { message: string }) {
  return (
    <section aria-labelledby="no-matching-patients-heading" className="space-y-3 rounded-lg border p-8 text-center">
      <h2 id="no-matching-patients-heading" className="text-lg font-medium">
        No matching patients
      </h2>
      <p className="text-muted-foreground wrap-anywhere">{message}</p>
      <p className="text-muted-foreground">Change the search or statuses to see more patients.</p>
    </section>
  );
}

// The status and sort buttons look like select boxes: a fixed width, matching the search
// box's height, with the label on the left and the chevron on the right. Their menus
// take the button's width.
const MENU_TRIGGER_CLASSES = "h-10 w-56 justify-between font-normal";

function describeStatusSelection(selectedStatuses: PatientStatus[]): string {
  if (selectedStatuses.length === 0) {
    return "All statuses";
  }
  if (selectedStatuses.length >= 3) {
    return `${selectedStatuses.length} statuses`;
  }
  const statusNames = selectedStatuses.map((status) => PATIENT_STATUS_LABELS[status]);
  return statusNames.join(", ");
}

type StatusFilterProps = {
  patients: Patient[];
  selectedStatuses: PatientStatus[];
  onSelectedStatusesChange: (statuses: PatientStatus[]) => void;
};

function StatusFilter({ patients, selectedStatuses, onSelectedStatusesChange }: StatusFilterProps) {
  function setStatusChecked(changedStatus: PatientStatus, isChecked: boolean) {
    // Rebuilding from STATUS_FILTER_OPTIONS keeps the button label in the usual status order,
    // whatever order the statuses were checked in.
    const nextStatuses = STATUS_FILTER_OPTIONS.filter((status) => {
      if (status === changedStatus) {
        return isChecked;
      }
      return selectedStatuses.includes(status);
    });
    onSelectedStatusesChange(nextStatuses);
  }

  const selectionLabel = describeStatusSelection(selectedStatuses);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* The visible label is just the selection; screen readers also hear what it filters. */}
        <Button variant="outline" aria-label={`Status: ${selectionLabel}`} className={MENU_TRIGGER_CLASSES}>
          <span className="truncate">{selectionLabel}</span>
          <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {STATUS_FILTER_OPTIONS.map((status) => {
          const statusLabel = PATIENT_STATUS_LABELS[status];
          // Counts cover every patient, so they don't change while the provider types a search.
          const patientCount = patients.filter((patient) => patient.status === status).length;
          return (
            <DropdownMenuCheckboxItem
              key={status}
              checked={selectedStatuses.includes(status)}
              onCheckedChange={(isChecked) => setStatusChecked(status, isChecked)}
              // Keeps the menu open so several statuses can be checked in a row.
              onSelect={(event) => event.preventDefault()}
              aria-label={`${statusLabel}, ${formatPatientCount(patientCount)}`}
            >
              {statusLabel}
              <span className="ml-auto text-muted-foreground tabular-nums">{patientCount}</span>
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type SortMenuProps = {
  sortOrder: PatientSortOrder;
  onSortOrderChange: (sortOrder: PatientSortOrder) => void;
};

function SortMenu({ sortOrder, onSortOrderChange }: SortMenuProps) {
  // Radix reports the chosen value as a plain string, so map it back to a known sort order.
  function chooseSortOrder(chosenValue: string) {
    const chosenSortOrder = PATIENT_SORT_ORDERS.find((knownSortOrder) => knownSortOrder === chosenValue);
    if (chosenSortOrder) {
      onSortOrderChange(chosenSortOrder);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={MENU_TRIGGER_CLASSES}>
          <span className="truncate">Sort: {PATIENT_SORT_LABELS[sortOrder]}</span>
          <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={sortOrder} onValueChange={chooseSortOrder}>
          {PATIENT_SORT_ORDERS.map((sortOption) => (
            <DropdownMenuRadioItem key={sortOption} value={sortOption}>
              {PATIENT_SORT_LABELS[sortOption]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

// The ends use aria-disabled instead of disabled: a disabled button drops keyboard focus,
// so pressing Next onto the last page would lose the provider's place.
const UNAVAILABLE_PAGE_BUTTON_CLASSES = "aria-disabled:pointer-events-none aria-disabled:opacity-50";

type PatientPagerProps = {
  firstShownNumber: number;
  lastShownNumber: number;
  matchingCount: number;
  pageSize: PageSize;
  onPageSizeChange: (pageSize: PageSize) => void;
  canGoToPreviousPage: boolean;
  canGoToNextPage: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

function PatientPager({
  firstShownNumber,
  lastShownNumber,
  matchingCount,
  pageSize,
  onPageSizeChange,
  canGoToPreviousPage,
  canGoToNextPage,
  onPreviousPage,
  onNextPage,
}: PatientPagerProps) {
  // Radix reports the chosen value as a plain string, so map it back to a page size.
  function choosePageSize(chosenValue: string) {
    const chosenPageSize = PAGE_SIZE_OPTIONS.find((sizeOption) => String(sizeOption) === chosenValue);
    if (chosenPageSize) {
      onPageSizeChange(chosenPageSize);
    }
  }

  function goToPreviousPage() {
    if (canGoToPreviousPage) {
      onPreviousPage();
    }
  }

  function goToNextPage() {
    if (canGoToNextPage) {
      onNextPage();
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>Rows per page</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" aria-label={`Rows per page: ${pageSize}`} className="tabular-nums">
              {pageSize}
              <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-24">
            <DropdownMenuRadioGroup value={String(pageSize)} onValueChange={choosePageSize}>
              {PAGE_SIZE_OPTIONS.map((sizeOption) => (
                <DropdownMenuRadioItem key={sizeOption} value={String(sizeOption)} className="tabular-nums">
                  {sizeOption}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-3">
        {/* Announces the new range when the page, page size, or filters change. */}
        <p aria-live="polite" className="text-muted-foreground tabular-nums">
          {firstShownNumber}–{lastShownNumber} of {matchingCount}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            aria-disabled={!canGoToPreviousPage}
            onClick={goToPreviousPage}
            className={UNAVAILABLE_PAGE_BUTTON_CLASSES}
          >
            <ChevronLeftIcon data-icon="inline-start" aria-hidden="true" />
            Previous
          </Button>
          <Button
            variant="outline"
            aria-disabled={!canGoToNextPage}
            onClick={goToNextPage}
            className={UNAVAILABLE_PAGE_BUTTON_CLASSES}
          >
            Next
            <ChevronRightIcon data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// The filters live here rather than in PatientDirectory so they only exist once there are
// patients to filter. This component stays mounted while the list refreshes, so a refresh,
// a failed refresh, or a newly added patient keeps the provider's filters, sort, and page.
function FilterablePatientList({ patients }: { patients: Patient[] }) {
  const [searchText, setSearchText] = useState("");
  // Empty means every status is shown.
  const [selectedStatuses, setSelectedStatuses] = useState<PatientStatus[]>([]);
  const [sortOrder, setSortOrder] = useState<PatientSortOrder>("recently-added");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const tableRef = useRef<HTMLDivElement>(null);

  const isFilteringByStatus = selectedStatuses.length > 0;
  const matchingPatients = patients.filter((patient) => {
    const matchesStatus = !isFilteringByStatus || selectedStatuses.includes(patient.status);
    return matchesStatus && matchesNameSearch(patient, searchText);
  });
  const hasMatches = matchingPatients.length > 0;
  const sortedMatchingPatients = sortPatients(matchingPatients, sortOrder);

  const pageCount = Math.max(1, Math.ceil(sortedMatchingPatients.length / pageSize));
  // A refresh can leave fewer patients than the current page needs; show the last page that
  // still exists instead of an empty one.
  const shownPageNumber = Math.min(pageNumber, pageCount);
  const firstShownIndex = (shownPageNumber - 1) * pageSize;
  const patientsOnPage = sortedMatchingPatients.slice(firstShownIndex, firstShownIndex + pageSize);

  // Changing what's listed or how it's ordered starts again from the first page, so the
  // provider never lands on a page that no longer exists.
  function changeSearchText(nextSearchText: string) {
    setSearchText(nextSearchText);
    setPageNumber(1);
  }

  function changeSelectedStatuses(nextStatuses: PatientStatus[]) {
    setSelectedStatuses(nextStatuses);
    setPageNumber(1);
  }

  function changeSortOrder(nextSortOrder: PatientSortOrder) {
    setSortOrder(nextSortOrder);
    setPageNumber(1);
  }

  function changePageSize(nextPageSize: PageSize) {
    setPageSize(nextPageSize);
    setPageNumber(1);
  }

  // Focus stays on the Previous or Next button; only the table scrolls back into view. It
  // scrolls only when its top is above the window, so a table already in view doesn't jump.
  function goToPage(nextPageNumber: number) {
    setPageNumber(nextPageNumber);
    const tableElement = tableRef.current;
    if (tableElement && tableElement.getBoundingClientRect().top < 0) {
      tableElement.scrollIntoView({ block: "start" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative w-80">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Search patients by name"
            placeholder="Search by name"
            value={searchText}
            onChange={(event) => changeSearchText(event.target.value)}
            className="h-10 pl-8"
          />
        </div>
        <StatusFilter
          patients={patients}
          selectedStatuses={selectedStatuses}
          onSelectedStatusesChange={changeSelectedStatuses}
        />
        <SortMenu sortOrder={sortOrder} onSortOrderChange={changeSortOrder} />
      </div>
      {hasMatches ? (
        <div ref={tableRef} className="scroll-mt-4 space-y-4">
          <PatientTable patients={patientsOnPage} />
          <PatientPager
            firstShownNumber={firstShownIndex + 1}
            lastShownNumber={firstShownIndex + patientsOnPage.length}
            matchingCount={sortedMatchingPatients.length}
            pageSize={pageSize}
            onPageSizeChange={changePageSize}
            canGoToPreviousPage={shownPageNumber > 1}
            canGoToNextPage={shownPageNumber < pageCount}
            onPreviousPage={() => goToPage(shownPageNumber - 1)}
            onNextPage={() => goToPage(shownPageNumber + 1)}
          />
        </div>
      ) : (
        <NoMatchingPatients message={describeNoMatches(searchText, selectedStatuses)} />
      )}
    </div>
  );
}

export function PatientDirectory() {
  const patientsQuery = useQuery({
    queryKey: ["patients"],
    queryFn: getPatients,
    retry: false,
  });
  const retryLabel = patientsQuery.isFetching ? "Retrying…" : "Retry";

  if (patientsQuery.isPending) {
    return <p role="status">Loading patients…</p>;
  }

  // Nothing has loaded yet, so the error is all there is to show.
  if (patientsQuery.isError && patientsQuery.data === undefined) {
    return (
      <div role="alert" className="space-y-3">
        <p className="font-medium">Patients couldn't be loaded.</p>
        <p className="text-muted-foreground">{patientsQuery.error.message}</p>
        <Button onClick={() => patientsQuery.refetch()} disabled={patientsQuery.isFetching}>
          {retryLabel}
        </Button>
      </div>
    );
  }

  // A later refresh failed, such as when the provider returns to the tab while the API is down.
  // The last loaded list stays visible below the error.
  const isShowingStaleList = patientsQuery.isError;
  const patients = patientsQuery.data;

  return (
    <div className="space-y-4">
      {isShowingStaleList && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 p-3 text-sm"
        >
          <div>
            <p className="font-medium text-destructive">
              Patients couldn't be refreshed. Showing the last loaded list.
            </p>
            <p className="text-muted-foreground">{patientsQuery.error.message}</p>
          </div>
          <Button variant="outline" onClick={() => patientsQuery.refetch()} disabled={patientsQuery.isFetching}>
            {retryLabel}
          </Button>
        </div>
      )}
      {patients.length === 0 ? <EmptyDirectory /> : <FilterablePatientList patients={patients} />}
    </div>
  );
}
