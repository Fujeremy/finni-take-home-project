import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routes } from "./routes";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
}

// Starts the app at the given address, with its own query cache so no test sees another's data.
function renderAppAt(address: string) {
  const router = createMemoryRouter(routes, { initialEntries: [address] });
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("routes", () => {
  it("sends the root address to the patient directory at /patients", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([]));

    const router = renderAppAt("/");

    expect(await screen.findByRole("heading", { name: "Patients", level: 1 })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "No patients yet" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/patients");
  });

  it("sends an unknown address to the patient directory at /patients", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([]));

    const router = renderAppAt("/appointments");

    expect(await screen.findByRole("heading", { name: "Patients", level: 1 })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "No patients yet" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/patients");
  });
});
