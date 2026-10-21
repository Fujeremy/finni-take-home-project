import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAGE_SIZE_OPTIONS, type PageSize } from "./directorySettings";

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

export function PatientPager({
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
