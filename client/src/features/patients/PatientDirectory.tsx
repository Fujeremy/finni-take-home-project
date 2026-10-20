import type { Patient, PatientStatus } from "@finni/shared";
import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, SearchIcon } from "lucide-react";
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
    // A short hover delay keeps tooltips from flashing as the pointer passes over rows.
    // Keyboard focus still opens them right away.
    <TooltipProvider delayDuration={300}>
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

function NoMatchingPatients({ message, onClearFilters }: { message: string; onClearFilters: () => void }) {
  return (
    <section aria-labelledby="no-matching-patients-heading" className="space-y-3 rounded-lg border p-8 text-center">
      <h2 id="no-matching-patients-heading" className="text-lg font-medium">
        No matching patients
      </h2>
      <p className="text-muted-foreground wrap-anywhere">{message}</p>
      <Button variant="outline" onClick={onClearFilters}>
        Clear filters
      </Button>
    </section>
  );
}

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
        <Button variant="outline" aria-label={`Status: ${selectionLabel}`}>
          {selectionLabel}
          <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
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
        <Button variant="outline">
          Sort: {PATIENT_SORT_LABELS[sortOrder]}
          <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
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

// The filters live here rather than in PatientDirectory so they only exist once there are
// patients to filter. This component stays mounted while the list refreshes, so a refresh,
// a failed refresh, or a newly added patient keeps the provider's filters and sort.
function FilterablePatientList({ patients }: { patients: Patient[] }) {
  const [searchText, setSearchText] = useState("");
  // Empty means every status is shown.
  const [selectedStatuses, setSelectedStatuses] = useState<PatientStatus[]>([]);
  // Sorting isn't a filter: it doesn't show the result count and Clear filters keeps it.
  const [sortOrder, setSortOrder] = useState<PatientSortOrder>("recently-added");
  const searchBoxRef = useRef<HTMLInputElement>(null);

  const isSearching = searchText.trim() !== "";
  const isFilteringByStatus = selectedStatuses.length > 0;
  const isFiltering = isSearching || isFilteringByStatus;
  const matchingPatients = patients.filter((patient) => {
    const matchesStatus = !isFilteringByStatus || selectedStatuses.includes(patient.status);
    return matchesStatus && matchesNameSearch(patient, searchText);
  });
  const hasMatches = matchingPatients.length > 0;
  const sortedMatchingPatients = sortPatients(matchingPatients, sortOrder);

  function clearFilters() {
    setSearchText("");
    setSelectedStatuses([]);
    searchBoxRef.current?.focus();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* A fixed width keeps the search box and the menu in place as the status label changes. */}
          <div className="relative w-80 shrink-0">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              ref={searchBoxRef}
              type="search"
              aria-label="Search patients by name"
              placeholder="Search by name"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="pl-8"
            />
          </div>
          <StatusFilter
            patients={patients}
            selectedStatuses={selectedStatuses}
            onSelectedStatusesChange={setSelectedStatuses}
          />
          <SortMenu sortOrder={sortOrder} onSortOrderChange={setSortOrder} />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {/* Always rendered so screen readers announce the count as it changes. */}
          <p role="status" className="tabular-nums">
            {isFiltering && `Showing ${matchingPatients.length} of ${formatPatientCount(patients.length)}`}
          </p>
          {/* With no matches, the message below holds the only Clear filters button. */}
          {isFiltering && hasMatches && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>
      {hasMatches ? (
        <PatientTable patients={sortedMatchingPatients} />
      ) : (
        <NoMatchingPatients message={describeNoMatches(searchText, selectedStatuses)} onClearFilters={clearFilters} />
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
