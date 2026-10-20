import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { AddPatientDialog } from "@/features/patients/AddPatientDialog";
import { PatientDirectory } from "@/features/patients/PatientDirectory";

export function App() {
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const addPatientButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-8 py-10">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Patients</h1>
        <Button ref={addPatientButtonRef} onClick={() => setIsAddPatientOpen(true)}>
          Add patient
        </Button>
      </header>
      <PatientDirectory />
      <AddPatientDialog
        open={isAddPatientOpen}
        onOpenChange={setIsAddPatientOpen}
        returnFocusTo={addPatientButtonRef}
      />
      <Toaster position="bottom-right" />
    </main>
  );
}
