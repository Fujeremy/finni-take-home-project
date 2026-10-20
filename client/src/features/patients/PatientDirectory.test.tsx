import type { Patient } from "@finni/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PatientDirectory } from "./PatientDirectory";

const savedPatient: Patient = {
  id: "00000000-0000-4000-8000-000000000001",
  firstName: "Jordan",
  middleName: "Lee",
  lastName: "Rivera",
  dateOfBirth: "1988-03-14",
  status: "active",
  addressLine1: "42 Maple Lane",
  addressLine2: "Unit 3",
  city: "Springfield",
  region: "ON",
  postalCode: "K1A 0B1",
  country: "CA",
  createdAt: "2026-10-20T03:14:00.000Z",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Each test gets its own query cache, so no test sees another's data.
function renderDirectory() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <PatientDirectory />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.TZ;
});

describe("PatientDirectory", () => {
  it("shows a loading message while patients load", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    renderDirectory();

    expect(screen.getByRole("status")).toHaveTextContent("Loading patients…");
  });

  it("shows each saved patient's name, birth date, status, address, and added time", async () => {
    process.env.TZ = "America/Toronto";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([savedPatient]));

    renderDirectory();

    const table = await screen.findByRole("table", { name: "Patients" });
    const [, patientRow] = within(table).getAllByRole("row");
    const cells = within(patientRow!).getAllByRole("cell");
    expect(cells.map((cell) => cell.textContent)).toEqual([
      "Jordan Lee Rivera",
      "Mar 14, 1988",
      "Active",
      "42 Maple LaneUnit 3Springfield, ON K1A 0B1CA",
      "Oct 19, 2026, 11:14 PM",
    ]);
  });

  it("leaves out the middle name and second address line when they are empty", async () => {
    const patientWithoutOptionalFields = { ...savedPatient, middleName: null, addressLine2: null };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([patientWithoutOptionalFields]));

    renderDirectory();

    expect(await screen.findByRole("cell", { name: "Jordan Rivera" })).toBeInTheDocument();
    expect(screen.queryByText("Unit 3")).not.toBeInTheDocument();
  });

  it("shows the birth date as the same day for a viewer behind UTC", async () => {
    process.env.TZ = "America/Los_Angeles";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([savedPatient]));

    renderDirectory();

    expect(await screen.findByRole("cell", { name: "Mar 14, 1988" })).toBeInTheDocument();
  });

  it("shows an empty state when no patients are saved", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([]));

    renderDirectory();

    const emptyState = await screen.findByRole("region", { name: "No patients yet" });
    expect(emptyState).toHaveTextContent("Patients you add will appear here. Use Add patient to add the first one.");
    expect(within(emptyState).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the API's error and loads the patients after Retry", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
          500,
        ),
      )
      .mockResolvedValueOnce(jsonResponse([savedPatient]));

    renderDirectory();
    const errorAlert = await screen.findByRole("alert");
    expect(errorAlert).toHaveTextContent("Patients couldn't be loaded.");
    expect(errorAlert).toHaveTextContent("Something went wrong. Please try again.");

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("cell", { name: "Jordan Lee Rivera" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
