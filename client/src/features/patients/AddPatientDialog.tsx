import {
  createPatientSchema,
  EARLIEST_DATE_OF_BIRTH,
  localDateToday,
  PATIENT_STATUSES,
  type CreatePatientData,
  type CreatePatientInput,
} from "@finni/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import type { RefObject } from "react";
import { Controller, FormProvider, useForm, useFormContext } from "react-hook-form";
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
import { PATIENT_STATUS_LABELS } from "./patientFormatting";

type TextFieldName = Exclude<keyof CreatePatientInput, "status">;

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
      <FieldError id={errorId} errors={[error]} />
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
          <FieldError id="patient-status-error" errors={[fieldState.error]} />
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

export function AddPatientDialog({ open, onOpenChange, returnFocusTo }: AddPatientDialogProps) {
  const form = useForm<CreatePatientInput, unknown, CreatePatientData>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: EMPTY_PATIENT_FORM,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  function closeDialog() {
    form.reset(EMPTY_PATIENT_FORM);
    onOpenChange(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    closeDialog();
  }

  function savePatient(_patient: CreatePatientData) {
    // Sending the patient to the API is added in the next commit.
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
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
            <FieldSet>
              <FieldLegend>Name</FieldLegend>
              <div className="grid grid-cols-3 gap-4">
                <PatientTextField name="firstName" label="First name" />
                <PatientTextField name="middleName" label="Middle name" optional />
                <PatientTextField name="lastName" label="Last name" />
              </div>
            </FieldSet>

            <FieldSet>
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

            <FieldSet>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit">Save patient</Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
