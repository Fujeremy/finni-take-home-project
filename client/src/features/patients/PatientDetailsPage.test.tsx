import type { Patient } from "@finni/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routes } from "@/routes";

const averyThompson: Patient = {
  id: "00000000-0000-4000-8000-000000000001",
  firstName: "Avery",
  middleName: "Jordan",
  lastName: "Thompson",
  dateOfBirth: "1988-03-14",
  status: "inquiry",
  addressLine1: "100 Maple Street",
  addressLine2: "Unit 2",
  city: "Toronto",
  region: "ON",
  postalCode: "M5V 2T6",
  country: "CA",
  createdAt: "2026-10-01T15:30:00.000Z",
};

const averyAddress = `/patients/${averyThompson.id}`;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Opens the app at the given address, with its own query cache so no test sees another's data.
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

// The value shown under a label in the Details section, such as "Status".
function detailUnder(label: string): HTMLElement {
  const term = screen.getByText(label, { selector: "dt" });
  return term.nextElementSibling as HTMLElement;
}

beforeEach(() => {
  // Only the clock is fake, so ages are calculated on a known day; timers still run normally.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 21));
  process.env.TZ = "America/Toronto";
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete process.env.TZ;
});

describe("PatientDetailsPage", () => {
  it("shows a loading message while the patient loads", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    renderAppAt(averyAddress);

    expect(screen.getByRole("status")).toHaveTextContent("Loading patient…");
  });

  it("shows the patient's name, status, birth date with age, address lines, and when they were added", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(averyThompson));

    renderAppAt(averyAddress);

    expect(await screen.findByRole("heading", { name: "Avery Jordan Thompson", level: 1 })).toBeInTheDocument();
    expect(detailUnder("Status")).toHaveTextContent("Inquiry");
    expect(detailUnder("Date of birth")).toHaveTextContent("Mar 14, 1988 (38 years)");
    expect(detailUnder("Address")).toHaveTextContent("100 Maple StreetUnit 2Toronto, ON M5V 2T6CA");
    expect(detailUnder("Added")).toHaveTextContent("Oct 1, 2026, 11:30 AM");
    expect(fetchSpy).toHaveBeenCalledWith(`/api/patients/${averyThompson.id}`, expect.anything());
  });

  it("leaves out an empty second address line", async () => {
    const singleLinePatient: Patient = { ...averyThompson, addressLine2: null };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(singleLinePatient));

    renderAppAt(averyAddress);

    await screen.findByRole("heading", { name: "Avery Jordan Thompson", level: 1 });
    expect(detailUnder("Address").children).toHaveLength(3);
    expect(detailUnder("Address")).toHaveTextContent("100 Maple StreetToronto, ON M5V 2T6CA");
  });

  it("names the browser tab after the patient and moves focus to their name", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(averyThompson));

    renderAppAt(averyAddress);

    const heading = await screen.findByRole("heading", { name: "Avery Jordan Thompson", level: 1 });
    expect(heading).toHaveFocus();
    expect(document.title).toBe("Avery Jordan Thompson — Finni Health");
  });

  it("shows Patient not found, without Retry, for an ID no patient has", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ error: { code: "PATIENT_NOT_FOUND", message: "This patient doesn't exist." } }, 404),
    );

    renderAppAt(averyAddress);

    expect(await screen.findByRole("heading", { name: "Patient not found", level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(document.title).toBe("Patient not found — Finni Health");
  });

  it("shows Patient not found for an address whose ID isn't a patient ID", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ error: { code: "INVALID_PATIENT_ID", message: "This isn't a valid patient ID." } }, 400),
    );

    renderAppAt("/patients/abc");

    expect(await screen.findByRole("heading", { name: "Patient not found", level: 1 })).toBeInTheDocument();
  });

  it("shows the API's error and loads the patient after Retry", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } }, 500),
      )
      .mockResolvedValueOnce(jsonResponse(averyThompson));
    renderAppAt(averyAddress);
    const errorAlert = await screen.findByRole("alert");
    expect(errorAlert).toHaveTextContent("The patient couldn't be loaded.");
    expect(errorAlert).toHaveTextContent("Something went wrong. Please try again.");

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("heading", { name: "Avery Jordan Thompson", level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("opens the patient directory with All patients", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (url === "/api/patients") {
        return jsonResponse([averyThompson]);
      }
      return jsonResponse(averyThompson);
    });
    const router = renderAppAt(averyAddress);
    await screen.findByRole("heading", { name: "Avery Jordan Thompson", level: 1 });

    await user.click(screen.getByRole("link", { name: "All patients" }));

    expect(await screen.findByRole("heading", { name: "Patients", level: 1 })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/patients");
  });
});
