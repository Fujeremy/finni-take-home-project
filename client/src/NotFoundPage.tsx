import { useEffect } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

// Shown for any address that matches no page, such as a mistyped or outdated link. It says
// so instead of redirecting, so the provider knows the page they asked for doesn't exist.
export function NotFoundPage() {
  // The tab title names this page, so the tab isn't mistaken for the patient directory.
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Page not found — Finni Health";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-8 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">This address doesn't match any page.</p>
      <Button asChild size="lg" className="h-10 px-4">
        <Link to="/patients">Go to patients</Link>
      </Button>
    </main>
  );
}
