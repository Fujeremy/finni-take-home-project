import type { Patient } from "@finni/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, within } from "@testing-library/react";
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

// jsdom doesn't lay out the page, so text never overflows on its own. This makes every
// element report text wider than its box, as long text in a narrow cell would in a browser.
function simulateTextWiderThanItsCell() {
  vi.spyOn(Element.prototype, "scrollWidth", "get").mockReturnValue(500);
  vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(100);
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
      "42 Maple Lane, Unit 3, Springfield, ON K1A 0B1, CA",
      "Oct 19, 2026, 11:14 PM",
    ]);
  });

  it("leaves out the middle name and second address line when they are empty", async () => {
    const patientWithoutOptionalFields = { ...savedPatient, middleName: null, addressLine2: null };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([patientWithoutOptionalFields]));

    renderDirectory();

    expect(await screen.findByRole("cell", { name: "Jordan Rivera" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "42 Maple Lane, Springfield, ON K1A 0B1, CA" })).toBeInTheDocument();
  });

  it("shows the full name in a tooltip when the provider hovers over a shortened name", async () => {
    const user = userEvent.setup();
    simulateTextWiderThanItsCell();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([savedPatient]));
    renderDirectory();
    const shortenedName = await screen.findByText("Jordan Lee Rivera");

    await user.hover(shortenedName);

    expect(await screen.findByRole("tooltip")).toHaveTextContent("Jordan Lee Rivera");
  });

  it("shows the full address in a tooltip when the provider tabs to a shortened address", async () => {
    const user = userEvent.setup();
    simulateTextWiderThanItsCell();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([savedPatient]));
    renderDirectory();
    const shortenedAddress = await screen.findByText("42 Maple Lane, Unit 3, Springfield, ON K1A 0B1, CA");

    // The shortened name comes first in the tab order, then the shortened address.
    await user.tab();
    await user.tab();

    expect(shortenedAddress).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("42 Maple Lane, Unit 3, Springfield, ON K1A 0B1, CA");
  });

  it("shows no tooltip and skips text that fits its cell", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([savedPatient]));
    renderDirectory();
    const fullName = await screen.findByText("Jordan Lee Rivera");

    await user.hover(fullName);
    await user.tab();

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(document.body).toHaveFocus();
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

  it("keeps showing the loaded patients with a Retry banner when a refresh fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([savedPatient]))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    renderDirectory();
    await screen.findByRole("cell", { name: "Jordan Lee Rivera" });

    // Returning to the browser tab makes TanStack Query refresh the list.
    act(() => {
      window.dispatchEvent(new Event("visibilitychange"));
    });

    const refreshAlert = await screen.findByRole("alert");
    expect(refreshAlert).toHaveTextContent("Patients couldn't be refreshed. Showing the last loaded list.");
    expect(refreshAlert).toHaveTextContent("The server can't be reached. Check that it's running, then try again.");
    expect(within(refreshAlert).getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Jordan Lee Rivera" })).toBeInTheDocument();
  });

  it("removes the refresh banner and shows the latest patients after Retry", async () => {
    const user = userEvent.setup();
    const newerPatient: Patient = {
      ...savedPatient,
      id: "00000000-0000-4000-8000-000000000002",
      firstName: "Avery",
      middleName: null,
      lastName: "Chen",
    };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([savedPatient]))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(jsonResponse([newerPatient, savedPatient]));
    renderDirectory();
    await screen.findByRole("cell", { name: "Jordan Lee Rivera" });
    act(() => {
      window.dispatchEvent(new Event("visibilitychange"));
    });
    const refreshAlert = await screen.findByRole("alert");

    await user.click(within(refreshAlert).getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("cell", { name: "Avery Chen" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
