import type { Patient } from "@finni/shared";
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

describe("moving between the directory and a patient's details", () => {
  const jordanRivera: Patient = {
    id: "00000000-0000-4000-8000-000000000001",
    firstName: "Jordan",
    middleName: "Lee",
    lastName: "Rivera",
    dateOfBirth: "1988-03-14",
    status: "active",
    addressLine1: "42 Maple Lane",
    addressLine2: null,
    city: "Springfield",
    region: "ON",
    postalCode: "K1A 0B1",
    country: "CA",
    createdAt: "2026-10-20T03:14:00.000Z",
  };
  const averyChen: Patient = {
    ...jordanRivera,
    id: "00000000-0000-4000-8000-000000000002",
    firstName: "Avery",
    middleName: null,
    lastName: "Chen",
  };

  // The directory asks for every patient; the details page asks for Jordan Lee Rivera.
  function answerPatientRequests() {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (url === "/api/patients") {
        return jsonResponse([averyChen, jordanRivera]);
      }
      return jsonResponse(jordanRivera);
    });
  }

  it("opens a patient's details page when their name is clicked", async () => {
    const user = userEvent.setup();
    answerPatientRequests();
    const router = renderAppAt("/patients");

    await user.click(await screen.findByRole("link", { name: "Jordan Lee Rivera" }));

    expect(await screen.findByRole("heading", { name: "Jordan Lee Rivera", level: 1 })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/patients/${jordanRivera.id}`);
  });
});
