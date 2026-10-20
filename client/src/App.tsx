import { lazy, Suspense, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { PatientDirectory } from "@/features/patients/PatientDirectory";

// The dialog and the form libraries only it uses are about 40% of the app's code. Splitting
// them out keeps the page's first download small; rendering the closed dialog from the start
// loads that code in the background, so opening it later doesn't wait on a download.
const AddPatientDialog = lazy(async () => {
  const dialogModule = await import("@/features/patients/AddPatientDialog");
  return { default: dialogModule.AddPatientDialog };
});

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
      <Suspense fallback={null}>
        <AddPatientDialog
          open={isAddPatientOpen}
          onOpenChange={setIsAddPatientOpen}
          returnFocusTo={addPatientButtonRef}
        />
      </Suspense>
      <Toaster position="bottom-right" />
    </main>
  );
}
