import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getHealth } from "@/lib/api";

// Temporary Foundation check that the browser can reach the API through the dev proxy.
// Milestone B replaces it with the patient directory.
function ApiConnectionStatus() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    retry: false,
  });

  if (healthQuery.isPending) {
    return <p role="status">Checking the API connection…</p>;
  }

  if (healthQuery.isError) {
    const retryLabel = healthQuery.isFetching ? "Retrying…" : "Retry";
    return (
      <div role="alert" className="space-y-3">
        <p className="font-medium">The API is unavailable.</p>
        <p className="text-muted-foreground">{healthQuery.error.message}</p>
        <Button onClick={() => healthQuery.refetch()} disabled={healthQuery.isFetching}>
          {retryLabel}
        </Button>
      </div>
    );
  }

  return <p role="status">API connected.</p>;
}

export function App() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-8 py-10">
      <h1 className="text-2xl font-semibold">Patients</h1>
      <ApiConnectionStatus />
    </main>
  );
}
