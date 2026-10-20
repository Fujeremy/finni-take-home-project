import { Button } from "@/components/ui/button";
import { PatientDirectory } from "@/features/patients/PatientDirectory";

export function App() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-8 py-10">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Patients</h1>
        {/* Opens the add patient dialog once it exists (Milestone B4). */}
        <Button disabled>Add patient</Button>
      </header>
      <PatientDirectory />
    </main>
  );
}
