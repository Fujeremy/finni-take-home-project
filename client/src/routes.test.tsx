import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("shows a not-found page for an unknown address, keeping the address and naming the tab", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([]));

    const router = renderAppAt("/appointments");

    expect(await screen.findByRole("heading", { name: "Page not found", level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Patients" })).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/appointments");
    expect(document.title).toBe("Page not found — Finni Health");
  });

  it("opens the patient directory from the not-found page with Go to patients", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([]));
    const user = userEvent.setup();
    const router = renderAppAt("/appointments");

    await user.click(await screen.findByRole("link", { name: "Go to patients" }));

    expect(await screen.findByRole("heading", { name: "Patients", level: 1 })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "No patients yet" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/patients");
  });
});
