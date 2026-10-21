import type { PatientStatus } from "@finni/shared";
import { Badge } from "@/components/ui/badge";
import { PATIENT_STATUS_LABELS } from "./patientFormatting";

// Color supports the text label; it is never the only way to tell statuses apart.
const STATUS_BADGE_CLASSES: Record<PatientStatus, string> = {
  inquiry: "bg-blue-100 text-blue-800",
  onboarding: "bg-amber-100 text-amber-900",
  active: "bg-green-100 text-green-800",
  churned: "bg-zinc-200 text-zinc-700",
};

// The same badge in the directory table and on a patient's details page.
export function PatientStatusBadge({ status }: { status: PatientStatus }) {
  return <Badge className={STATUS_BADGE_CLASSES[status]}>{PATIENT_STATUS_LABELS[status]}</Badge>;
}
