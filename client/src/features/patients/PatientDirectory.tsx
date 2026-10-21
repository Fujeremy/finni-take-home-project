import type { Patient, PatientStatus } from "@finni/shared";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { getPatients } from "@/lib/api";
import { type DirectorySettings, type PageSize, readDirectorySettings, toSearchString } from "./directorySettings";
import { NameSearch, SortMenu, StatusFilter } from "./PatientDirectoryToolbar";
import { PATIENT_STATUS_LABELS } from "./patientFormatting";
import { PatientPager } from "./PatientPager";
import { matchesNameSearch } from "./patientSearch";
import { sortPatients, type PatientSortOrder } from "./patientSorting";
import { PatientTable } from "./PatientTable";

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

// The filters live here rather than in PatientDirectory so they only exist once there are
// patients to filter. Their settings live in the page address, so reloading or coming back
// to the directory restores them; a refresh or a newly added patient keeps them too.
function FilterablePatientList({ patients }: { patients: Patient[] }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { searchText, selectedStatuses, sortOrder, pageNumber, pageSize } = readDirectorySettings(searchParams);
  const tableRef = useRef<HTMLDivElement>(null);

  // Replacing the history entry means Back leaves the directory instead of stepping through
  // every filter and page the provider tried. navigate keeps the query string as written;
  // setSearchParams would encode the commas between statuses again.
  function changeSettings(changedSettings: Partial<DirectorySettings>) {
    const nextSettings: DirectorySettings = {
      searchText,
      selectedStatuses,
      sortOrder,
      pageNumber,
      pageSize,
      ...changedSettings,
    };
    navigate({ search: toSearchString(nextSettings) }, { replace: true });
  }

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
    changeSettings({ searchText: nextSearchText, pageNumber: 1 });
  }

  function changeSelectedStatuses(nextStatuses: PatientStatus[]) {
    changeSettings({ selectedStatuses: nextStatuses, pageNumber: 1 });
  }

  function changeSortOrder(nextSortOrder: PatientSortOrder) {
    changeSettings({ sortOrder: nextSortOrder, pageNumber: 1 });
  }

  function changePageSize(nextPageSize: PageSize) {
    changeSettings({ pageSize: nextPageSize, pageNumber: 1 });
  }

  // Focus stays on the Previous or Next button; only the table scrolls back into view. It
  // scrolls only when its top is above the window, so a table already in view doesn't jump.
  function goToPage(nextPageNumber: number) {
    changeSettings({ pageNumber: nextPageNumber });
    const tableElement = tableRef.current;
    if (tableElement && tableElement.getBoundingClientRect().top < 0) {
      tableElement.scrollIntoView({ block: "start" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <NameSearch appliedSearchText={searchText} onSearchTextChange={changeSearchText} />
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
