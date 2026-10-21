import type { Patient, PatientStatus } from "@finni/shared";
import { ChevronDownIcon, CornerDownLeftIcon, SearchIcon, XIcon } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
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
import { STATUS_FILTER_OPTIONS } from "./directorySettings";
import { PATIENT_STATUS_LABELS } from "./patientFormatting";
import { PATIENT_SORT_LABELS, PATIENT_SORT_ORDERS, type PatientSortOrder } from "./patientSorting";

type NameSearchProps = {
  appliedSearchText: string;
  onSearchTextChange: (searchText: string) => void;
};

// The table only filters once the provider presses Enter or the ↵ button, so the box holds
// typed text that may not be applied yet. Emptying the box clears the search right away;
// otherwise an empty box would still be filtering by the last search.
export function NameSearch({ appliedSearchText, onSearchTextChange }: NameSearchProps) {
  const [typedText, setTypedText] = useState(appliedSearchText);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // When the applied search changes from outside the box, such as Back to another address,
  // the box shows it. Adjusting state during render avoids a flash of the old text.
  const [lastAppliedSearchText, setLastAppliedSearchText] = useState(appliedSearchText);
  if (appliedSearchText !== lastAppliedSearchText) {
    setLastAppliedSearchText(appliedSearchText);
    setTypedText(appliedSearchText);
  }

  const trimmedTypedText = typedText.trim();
  const hasUnappliedText = trimmedTypedText !== appliedSearchText;

  function changeTypedText(nextTypedText: string) {
    setTypedText(nextTypedText);
    if (nextTypedText.trim() === "" && appliedSearchText !== "") {
      onSearchTextChange("");
    }
  }

  // Clicking ↵ moves focus to it, and it disappears once the search applies, so focus
  // returns to the box either way.
  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    searchInputRef.current?.focus();
    if (hasUnappliedText) {
      onSearchTextChange(trimmedTypedText);
    }
  }

  return (
    <form role="search" aria-label="Patient search" onSubmit={applySearch} className="relative w-80">
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      {/* The right padding leaves room for ↵; the browser's own clear button sits just before it. */}
      <Input
        ref={searchInputRef}
        type="search"
        aria-label="Search patients by name"
        placeholder="Search by name"
        value={typedText}
        onChange={(event) => changeTypedText(event.target.value)}
        className={hasUnappliedText ? "h-10 pr-9 pl-8" : "h-10 pl-8"}
      />
      {hasUnappliedText && (
        <Button
          type="submit"
          variant="ghost"
          size="icon-xs"
          aria-label="Search"
          title="Press Enter to search"
          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
        >
          <CornerDownLeftIcon aria-hidden="true" />
        </Button>
      )}
    </form>
  );
}

function formatPatientCount(count: number): string {
  if (count === 1) {
    return "1 patient";
  }
  return `${count} patients`;
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

export function StatusFilter({ patients, selectedStatuses, onSelectedStatusesChange }: StatusFilterProps) {
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

  const statusButtonRef = useRef<HTMLButtonElement>(null);

  // The X disappears once clicked, so focus moves to the Status button beside it.
  function clearStatuses() {
    onSelectedStatusesChange([]);
    statusButtonRef.current?.focus();
  }

  const selectionLabel = describeStatusSelection(selectedStatuses);
  const hasCheckedStatuses = selectedStatuses.length > 0;

  return (
    // The X is a separate button laid over the field's right edge, not nested inside the
    // Status button, so each keeps its own keyboard and screen reader behavior.
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* The visible label is just the selection; screen readers also hear what it filters. */}
          <Button
            ref={statusButtonRef}
            variant="outline"
            aria-label={`Status: ${selectionLabel}`}
            className={hasCheckedStatuses ? `${MENU_TRIGGER_CLASSES} pr-9` : MENU_TRIGGER_CLASSES}
          >
            <span className="truncate">{selectionLabel}</span>
            {!hasCheckedStatuses && <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />}
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
      {hasCheckedStatuses && (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Clear status filter"
          onClick={clearStatuses}
          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
        >
          <XIcon aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

type SortMenuProps = {
  sortOrder: PatientSortOrder;
  onSortOrderChange: (sortOrder: PatientSortOrder) => void;
};

export function SortMenu({ sortOrder, onSortOrderChange }: SortMenuProps) {
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
