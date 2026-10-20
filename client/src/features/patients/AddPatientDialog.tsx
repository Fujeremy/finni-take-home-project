import {
  createPatientSchema,
  EARLIEST_DATE_OF_BIRTH,
  localDateToday,
  PATIENT_STATUSES,
  type CreatePatientData,
  type CreatePatientInput,
} from "@finni/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type RefObject } from "react";
import { Controller, FormProvider, useForm, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError, createPatient } from "@/lib/api";
import { formatPatientName, PATIENT_STATUS_LABELS } from "./patientFormatting";

type TextFieldName = Exclude<keyof CreatePatientInput, "status">;
type PatientFieldName = keyof CreatePatientInput;

const EMPTY_PATIENT_FORM: CreatePatientInput = {
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  status: "inquiry",
  addressLine1: "",
  addressLine2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
};

// Always takes one line of space, so an error appearing doesn't push the fields below it down.
function ReservedFieldError({ id, error }: { id: string; error: { message?: string } | undefined }) {
  return (
    <div className="min-h-5">
      <FieldError id={id} errors={[error]} />
    </div>
  );
}

type PatientTextFieldProps = {
  name: TextFieldName;
  label: string;
  optional?: boolean;
  hint?: string;
  type?: "text" | "date";
  min?: string;
  max?: string;
};

// One labelled input with its optional hint and its error, linked for screen readers.
function PatientTextField({ name, label, optional = false, hint, type = "text", min, max }: PatientTextFieldProps) {
  const { register, formState } = useFormContext<CreatePatientInput>();
  const error = formState.errors[name];
  const inputId = `patient-${name}`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const describedBy: string[] = [];
  if (hint) {
    describedBy.push(hintId);
  }
  if (error) {
    describedBy.push(errorId);
  }

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={inputId}>
        {label}
        {optional && <span className="font-normal text-muted-foreground"> (optional)</span>}
      </FieldLabel>
      <Input
        id={inputId}
        type={type}
        min={min}
        max={max}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy.length > 0 ? describedBy.join(" ") : undefined}
        {...register(name)}
      />
      {hint && <FieldDescription id={hintId}>{hint}</FieldDescription>}
      <ReservedFieldError id={errorId} error={error} />
    </Field>
  );
}

function PatientStatusField() {
  const { control } = useFormContext<CreatePatientInput>();

  return (
    <Controller
      control={control}
      name="status"
      render={({ field, fieldState }) => (
        <Field data-invalid={Boolean(fieldState.error)}>
          <FieldLabel htmlFor="patient-status">Status</FieldLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger
              id="patient-status"
              ref={field.ref}
              onBlur={field.onBlur}
              className="w-full"
              aria-invalid={Boolean(fieldState.error)}
              aria-describedby={fieldState.error ? "patient-status-error" : undefined}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PATIENT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {PATIENT_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ReservedFieldError id="patient-status-error" error={fieldState.error} />
        </Field>
      )}
    />
  );
}

type AddPatientDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Where focus goes when the dialog closes: the button that opened it.
  returnFocusTo: RefObject<HTMLElement | null>;
};

function isPatientFieldName(fieldName: string): fieldName is PatientFieldName {
  return fieldName in EMPTY_PATIENT_FORM;
}

export function AddPatientDialog({ open, onOpenChange, returnFocusTo }: AddPatientDialogProps) {
  const queryClient = useQueryClient();
  const form = useForm<CreatePatientInput, unknown, CreatePatientData>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: EMPTY_PATIENT_FORM,
    // Check a field when the provider leaves it, then again on every change so the error
    // updates while they correct it. Save still checks every field at once.
    mode: "onTouched",
    reValidateMode: "onChange",
  });
  // A failure that isn't about one field, such as a server error or no connection.
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  // Read during render so React Hook Form keeps these values current.
  const { isDirty, isSubmitting: isSaving } = form.formState;

  function closeDialog() {
    form.reset(EMPTY_PATIENT_FORM);
    setSaveErrorMessage(null);
    setIsDiscardConfirmOpen(false);
    onOpenChange(false);
  }

  // Cancel, Escape, the close button, and clicking outside all come here.
  function requestClose() {
    if (isSaving) {
      return;
    }
    // "Entered" means anything changed from the starting form; Inquiry alone doesn't count.
    if (isDirty) {
      setIsDiscardConfirmOpen(true);
      return;
    }
    closeDialog();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    requestClose();
  }

  // Puts each server message beside its field. Returns false if none matched a field.
  function showServerFieldErrors(error: ApiError): boolean {
    let shownCount = 0;
    for (const [fieldName, messages] of Object.entries(error.fieldErrors)) {
      const firstMessage = messages?.[0];
      if (isPatientFieldName(fieldName) && firstMessage) {
        form.setError(fieldName, { type: "server", message: firstMessage });
        shownCount += 1;
      }
    }
    return shownCount > 0;
  }

  async function savePatient(patient: CreatePatientData) {
    setSaveErrorMessage(null);

    let savedPatient;
    try {
      savedPatient = await createPatient(patient);
    } catch (error) {
      if (error instanceof ApiError && showServerFieldErrors(error)) {
        return;
      }
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      setSaveErrorMessage(message);
      return;
    }

    // Reload the directory from the API so it shows exactly what was saved.
    await queryClient.invalidateQueries({ queryKey: ["patients"] });
    toast.success(`${formatPatientName(savedPatient)} was added.`);
    closeDialog();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        showCloseButton={!isSaving}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusTo.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Add patient</DialogTitle>
          <DialogDescription>Fields are required unless marked optional.</DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          {/* Autofill would offer the provider's own name and address, not the patient's. */}
          <form
            noValidate
            autoComplete="off"
            onSubmit={form.handleSubmit(savePatient)}
            className="space-y-6"
          >
            <FieldSet disabled={isSaving}>
              <FieldLegend>Name</FieldLegend>
              <div className="grid grid-cols-3 gap-4">
                <PatientTextField name="firstName" label="First name" />
                <PatientTextField name="middleName" label="Middle name" optional />
                <PatientTextField name="lastName" label="Last name" />
              </div>
            </FieldSet>

            <FieldSet disabled={isSaving}>
              <FieldLegend>Patient details</FieldLegend>
              <div className="grid grid-cols-2 gap-4">
                <PatientTextField
                  name="dateOfBirth"
                  label="Date of birth"
                  type="date"
                  min={EARLIEST_DATE_OF_BIRTH}
                  max={localDateToday()}
                />
                <PatientStatusField />
              </div>
            </FieldSet>

            <FieldSet disabled={isSaving}>
              <FieldLegend>Address</FieldLegend>
              <PatientTextField name="addressLine1" label="Address line 1" />
              <PatientTextField name="addressLine2" label="Address line 2" optional />
              <div className="grid grid-cols-2 gap-4">
                <PatientTextField name="city" label="City" />
                <PatientTextField name="region" label="Province or state" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <PatientTextField name="postalCode" label="Postal code" />
                <PatientTextField name="country" label="Country code" hint="Two letters, e.g. CA" />
              </div>
            </FieldSet>

            {saveErrorMessage && (
              <div role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">
                <p className="font-medium">The patient wasn't saved.</p>
                <p>{saveErrorMessage}</p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={requestClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving…" : "Save patient"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>

        <AlertDialog open={isDiscardConfirmOpen} onOpenChange={setIsDiscardConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard this patient?</AlertDialogTitle>
              <AlertDialogDescription>Your entries will be lost.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep editing</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={closeDialog}>
                Discard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
