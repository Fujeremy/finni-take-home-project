import type { Patient, PatientStatus } from "@finni/shared";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPatients } from "@/lib/api";
import {
  formatAddedAt,
  formatDateOfBirth,
  formatPatientName,
  PATIENT_STATUS_LABELS,
} from "./patientFormatting";

// Color supports the text label; it is never the only way to tell statuses apart.
const STATUS_BADGE_CLASSES: Record<PatientStatus, string> = {
  inquiry: "bg-blue-100 text-blue-800",
  onboarding: "bg-amber-100 text-amber-900",
  active: "bg-green-100 text-green-800",
  churned: "bg-zinc-200 text-zinc-700",
};

// Long names and addresses wrap inside their cell instead of widening the page.
const WRAPPING_CELL = "whitespace-normal align-top wrap-anywhere";

function PatientAddress({ patient }: { patient: Patient }) {
  return (
    <div>
      <span className="block">{patient.addressLine1}</span>
      {patient.addressLine2 && <span className="block">{patient.addressLine2}</span>}
      <span className="block">
        {patient.city}, {patient.region} {patient.postalCode}
      </span>
      <span className="block">{patient.country}</span>
    </div>
  );
}

function PatientTable({ patients }: { patients: Patient[] }) {
  return (
    <Table aria-label="Patients">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Date of birth</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Address</TableHead>
          <TableHead>Added</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {patients.map((patient) => (
          <TableRow key={patient.id}>
            <TableCell className={`${WRAPPING_CELL} font-medium`}>{formatPatientName(patient)}</TableCell>
            <TableCell className="align-top">{formatDateOfBirth(patient.dateOfBirth)}</TableCell>
            <TableCell className="align-top">
              <Badge className={STATUS_BADGE_CLASSES[patient.status]}>
                {PATIENT_STATUS_LABELS[patient.status]}
              </Badge>
            </TableCell>
            <TableCell className={WRAPPING_CELL}>
              <PatientAddress patient={patient} />
            </TableCell>
            <TableCell className="align-top">{formatAddedAt(patient.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function PatientDirectory() {
  const patientsQuery = useQuery({
    queryKey: ["patients"],
    queryFn: getPatients,
    retry: false,
  });

  if (patientsQuery.isPending) {
    return <p role="status">Loading patients…</p>;
  }

  if (patientsQuery.isError) {
    const retryLabel = patientsQuery.isFetching ? "Retrying…" : "Retry";
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

  if (patientsQuery.data.length === 0) {
    return (
      <section aria-labelledby="empty-directory-heading" className="space-y-3 rounded-lg border p-8 text-center">
        <h2 id="empty-directory-heading" className="text-lg font-medium">
          No patients yet
        </h2>
        <p className="text-muted-foreground">Patients you add will appear here.</p>
        {/* Opens the add patient dialog once it exists (Milestone B4). */}
        <Button disabled>Add patient</Button>
      </section>
    );
  }

  return <PatientTable patients={patientsQuery.data} />;
}
