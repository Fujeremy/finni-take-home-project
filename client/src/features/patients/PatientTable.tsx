import type { Patient } from "@finni/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  formatAddedAt,
  formatDateOfBirth,
  formatPatientAddress,
  formatPatientName,
} from "./patientFormatting";
import { PatientStatusBadge } from "./PatientStatusBadge";
import { TruncatedText } from "./TruncatedText";

// Small muted labels set the header apart from the patient rows below it. The header sticks to
// the top of the window while scrolling; its bottom line is a shadow because a row border
// doesn't stick along with it.
const COLUMN_HEADER_CLASSES =
  "sticky top-0 z-10 h-9 bg-background text-xs font-medium tracking-wide text-muted-foreground uppercase shadow-[inset_0_-1px_0_var(--color-border)]";

// Fixed column widths keep every row on one line: long names and addresses are shortened
// with "…" instead of widening their column or wrapping.
export function PatientTable({ patients }: { patients: Patient[] }) {
  return (
    // A hover delay keeps tooltips from flashing as the pointer passes over rows.
    // Keyboard focus still opens them right away.
    <TooltipProvider delayDuration={700}>
      {/* Cells keep their 8px padding; pulling the table 8px wider on each side lines the
          text up with the toolbar, and the row highlight reaches just past it. */}
      <div className="-mx-2">
        <Table aria-label="Patients" className="table-fixed">
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="hover:bg-transparent">
              <TableHead className={`${COLUMN_HEADER_CLASSES} w-[30%]`}>Name</TableHead>
              <TableHead className={`${COLUMN_HEADER_CLASSES} w-[12%]`}>Date of birth</TableHead>
              <TableHead className={`${COLUMN_HEADER_CLASSES} w-[11%]`}>Status</TableHead>
              <TableHead className={`${COLUMN_HEADER_CLASSES} w-[34%]`}>Address</TableHead>
              <TableHead className={`${COLUMN_HEADER_CLASSES} w-[13%]`}>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell className="font-medium">
                  <TruncatedText text={formatPatientName(patient)} to={`/patients/${patient.id}`} />
                </TableCell>
                {/* Tabular figures keep digits the same width, so dates line up down the column. */}
                <TableCell className="tabular-nums">{formatDateOfBirth(patient.dateOfBirth)}</TableCell>
                <TableCell>
                  <PatientStatusBadge status={patient.status} />
                </TableCell>
                <TableCell>
                  <TruncatedText text={formatPatientAddress(patient)} />
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {formatAddedAt(patient.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
