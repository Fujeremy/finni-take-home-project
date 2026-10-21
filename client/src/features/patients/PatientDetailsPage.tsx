import type { Patient } from "@finni/shared";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import { type MouseEvent, type ReactNode, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { ApiError, getPatient } from "@/lib/api";
import {
  calculateAgeInYears,
  formatAddedAtWithTime,
  formatAge,
  formatDateOfBirth,
  formatPatientName,
} from "./patientFormatting";
import { PatientStatusBadge } from "./PatientStatusBadge";

// Sent with the directory's name links. When it's present, All patients goes back in history
// instead of opening the directory again, so the directory returns with its settings and
// scroll position, and Back doesn't then lead to this page a second time.
export const OPENED_FROM_DIRECTORY = { openedFromDirectory: true };

function wasOpenedFromDirectory(locationState: unknown): boolean {
  return (
    typeof locationState === "object" &&
    locationState !== null &&
    "openedFromDirectory" in locationState &&
    locationState.openedFromDirectory === true
  );
}

// Names the browser tab while this page is open, and restores the previous title when it closes.
function usePageTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} — Finni Health`;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}

// The API answers 404 for an ID no patient has and 400 for one that isn't a patient ID at
// all. Either way the address doesn't lead to a patient, and retrying won't change that.
function isPatientNotFound(error: Error): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 400);
}

// One address part per line: street, optional second line, city line, then the country code.
function addressLines(patient: Patient): string[] {
  const lines = [patient.addressLine1];
  if (patient.addressLine2) {
    lines.push(patient.addressLine2);
  }
  lines.push(`${patient.city}, ${patient.region} ${patient.postalCode}`);
  lines.push(patient.country);
  return lines;
}

function PatientDetails({ patient }: { patient: Patient }) {
  const patientName = formatPatientName(patient);
  const ageInYears = calculateAgeInYears(patient.dateOfBirth, new Date());
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Screen readers start at the patient's name, the same as reading the page from the top.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <>
      {/* Long names wrap, even words with no spaces, so the full name is always visible. */}
      <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold tracking-tight wrap-anywhere outline-none">
        {patientName}
      </h1>
      <section aria-labelledby="patient-details-heading" className="space-y-6 rounded-xl border p-8">
        <h2 id="patient-details-heading" className="text-lg font-semibold">
          Details
        </h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-1.5">
            <dt className="text-sm text-muted-foreground">Status</dt>
            <dd>
              <PatientStatusBadge status={patient.status} />
            </dd>
          </div>
          <div className="space-y-1.5">
            <dt className="text-sm text-muted-foreground">Date of birth</dt>
            <dd className="tabular-nums">
              {formatDateOfBirth(patient.dateOfBirth)}{" "}
              <span className="text-muted-foreground">({formatAge(ageInYears)})</span>
            </dd>
          </div>
          <div className="space-y-1.5">
            <dt className="text-sm text-muted-foreground">Address</dt>
            <dd className="wrap-anywhere">
              {addressLines(patient).map((line, lineIndex) => (
                <span key={lineIndex} className="block">
                  {line}
                </span>
              ))}
            </dd>
          </div>
          {/* When the record was added, set apart from the patient's own information. */}
          <div className="col-span-2 flex gap-2 border-t pt-6 text-sm text-muted-foreground">
            <dt>Added</dt>
            <dd className="tabular-nums">{formatAddedAtWithTime(patient.createdAt)}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}

function PatientNotFound() {
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-semibold tracking-tight">Patient not found</h1>
      <p className="text-muted-foreground">No patient matches this address. Find the patient in the directory instead.</p>
    </div>
  );
}

// A read-only view of one patient, reached by its own address so it works from a direct link
// or a refresh.
export function PatientDetailsPage() {
  // The route only matches with an ID, so this is always set.
  const { patientId = "" } = useParams();
  const patientQuery = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatient(patientId),
    retry: false,
  });
  const retryLabel = patientQuery.isFetching ? "Retrying…" : "Retry";
  const location = useLocation();
  const navigate = useNavigate();

  // A direct link or a new tab has no directory to go back to, so the link opens /patients.
  // Clicks with a modifier key, such as opening the link in a new tab, keep the link's own behavior.
  function goToAllPatients(event: MouseEvent<HTMLAnchorElement>) {
    const isPlainClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    if (isPlainClick && wasOpenedFromDirectory(location.state)) {
      event.preventDefault();
      navigate(-1);
    }
  }

  let pageTitle: string;
  let pageContent: ReactNode;
  if (patientQuery.isPending) {
    pageTitle = "Loading patient";
    pageContent = <p role="status">Loading patient…</p>;
  } else if (patientQuery.isError && isPatientNotFound(patientQuery.error)) {
    pageTitle = "Patient not found";
    pageContent = <PatientNotFound />;
  } else if (patientQuery.isError) {
    pageTitle = "Patient couldn't be loaded";
    pageContent = (
      <div role="alert" className="space-y-3">
        <p className="font-medium">The patient couldn't be loaded.</p>
        <p className="text-muted-foreground">{patientQuery.error.message}</p>
        <Button onClick={() => patientQuery.refetch()} disabled={patientQuery.isFetching}>
          {retryLabel}
        </Button>
      </div>
    );
  } else {
    pageTitle = formatPatientName(patientQuery.data);
    pageContent = <PatientDetails patient={patientQuery.data} />;
  }
  usePageTitle(pageTitle);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-8 py-10">
      <Link
        to="/patients"
        onClick={goToAllPatients}
        className="inline-flex items-center gap-2 rounded-sm font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        All patients
      </Link>
      {pageContent}
    </main>
  );
}
