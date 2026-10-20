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
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
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

    // The search box and Status button come first in the tab order, then the shortened name,
    // then the shortened address.
    await user.tab();
    await user.tab();
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
    // The search box and Status button are the only Tab stops; the next Tab passes over the
    // table to the page.
    await user.tab();
    await user.tab();
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
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
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
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();

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
  describe("name search", () => {
    const averyChen: Patient = {
      ...savedPatient,
      id: "00000000-0000-4000-8000-000000000002",
      firstName: "Avery",
      middleName: null,
      lastName: "Chen",
    };

    it("shows only the patients whose names match the search, with a count", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([averyChen, savedPatient]));
      renderDirectory();
      const searchBox = await screen.findByRole("searchbox", { name: "Search patients by name" });

      await user.type(searchBox, "riv");

      expect(screen.getByRole("cell", { name: "Jordan Lee Rivera" })).toBeInTheDocument();
      expect(screen.queryByRole("cell", { name: "Avery Chen" })).not.toBeInTheDocument();
      expect(screen.getByText("Showing 1 of 2 patients")).toBeInTheDocument();
    });

    it("shows no count or Clear filters button until a search is typed", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([averyChen, savedPatient]));

      renderDirectory();

      await screen.findByRole("searchbox", { name: "Search patients by name" });
      expect(screen.queryByText(/^Showing/)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
    });

    it("replaces the table with a no-match message when no names match", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([averyChen, savedPatient]));
      renderDirectory();
      const searchBox = await screen.findByRole("searchbox", { name: "Search patients by name" });

      await user.type(searchBox, "zed");

      const noMatches = screen.getByRole("region", { name: "No matching patients" });
      expect(noMatches).toHaveTextContent("No patient names match “zed”.");
      expect(within(noMatches).getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(screen.getByText("Showing 0 of 2 patients")).toBeInTheDocument();
    });

    it("shows every patient again and returns focus to the search box after Clear filters", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([averyChen, savedPatient]));
      renderDirectory();
      const searchBox = await screen.findByRole("searchbox", { name: "Search patients by name" });
      await user.type(searchBox, "riv");

      await user.click(screen.getByRole("button", { name: "Clear filters" }));

      expect(searchBox).toHaveValue("");
      expect(searchBox).toHaveFocus();
      expect(screen.getByRole("cell", { name: "Avery Chen" })).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "Jordan Lee Rivera" })).toBeInTheDocument();
    });

    it("keeps the search applied when the refreshed list includes a new patient", async () => {
      const user = userEvent.setup();
      const newRivera: Patient = {
        ...savedPatient,
        id: "00000000-0000-4000-8000-000000000003",
        firstName: "Sam",
        middleName: null,
        lastName: "Rivers",
      };
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonResponse([averyChen, savedPatient]))
        .mockResolvedValueOnce(jsonResponse([newRivera, averyChen, savedPatient]));
      renderDirectory();
      const searchBox = await screen.findByRole("searchbox", { name: "Search patients by name" });
      await user.type(searchBox, "riv");

      act(() => {
        window.dispatchEvent(new Event("visibilitychange"));
      });

      expect(await screen.findByRole("cell", { name: "Sam Rivers" })).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "Jordan Lee Rivera" })).toBeInTheDocument();
      expect(screen.queryByRole("cell", { name: "Avery Chen" })).not.toBeInTheDocument();
      expect(searchBox).toHaveValue("riv");
      expect(screen.getByText("Showing 2 of 3 patients")).toBeInTheDocument();
    });

    it("keeps the search applied to the last loaded list when a refresh fails", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonResponse([averyChen, savedPatient]))
        .mockRejectedValueOnce(new TypeError("Failed to fetch"));
      renderDirectory();
      const searchBox = await screen.findByRole("searchbox", { name: "Search patients by name" });
      await user.type(searchBox, "riv");

      act(() => {
        window.dispatchEvent(new Event("visibilitychange"));
      });

      await screen.findByRole("alert");
      expect(searchBox).toHaveValue("riv");
      expect(screen.getByRole("cell", { name: "Jordan Lee Rivera" })).toBeInTheDocument();
      expect(screen.queryByRole("cell", { name: "Avery Chen" })).not.toBeInTheDocument();
    });
  });
  describe("status filter", () => {
    const averyChen: Patient = {
      ...savedPatient,
      id: "00000000-0000-4000-8000-000000000002",
      firstName: "Avery",
      middleName: null,
      lastName: "Chen",
      status: "inquiry",
    };
    const samRivers: Patient = {
      ...savedPatient,
      id: "00000000-0000-4000-8000-000000000003",
      firstName: "Sam",
      middleName: null,
      lastName: "Rivers",
      status: "onboarding",
    };
    // Jordan Lee Rivera (savedPatient) is Active.
    const threePatients = [samRivers, averyChen, savedPatient];

    it("shows how many patients have each status, counting every patient even while searching", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(threePatients));
      renderDirectory();
      await user.type(await screen.findByRole("searchbox", { name: "Search patients by name" }), "chen");

      await user.click(screen.getByRole("button", { name: "Status: All statuses" }));

      expect(screen.getByRole("menuitemcheckbox", { name: "Inquiry, 1 patient" })).not.toBeChecked();
      expect(screen.getByRole("menuitemcheckbox", { name: "Onboarding, 1 patient" })).toBeInTheDocument();
      expect(screen.getByRole("menuitemcheckbox", { name: "Active, 1 patient" })).toBeInTheDocument();
      expect(screen.getByRole("menuitemcheckbox", { name: "Churned, 0 patients" })).toBeInTheDocument();
    });

    it("shows only patients with the checked statuses and names them on the button", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(threePatients));
      renderDirectory();
      await user.click(await screen.findByRole("button", { name: "Status: All statuses" }));

      await user.click(screen.getByRole("menuitemcheckbox", { name: "Onboarding, 1 patient" }));
      await user.click(screen.getByRole("menuitemcheckbox", { name: "Inquiry, 1 patient" }));
      await user.keyboard("{Escape}");

      expect(screen.getByRole("button", { name: "Status: Inquiry, Onboarding" })).toHaveTextContent(
        /^Inquiry, Onboarding$/,
      );
      expect(screen.getByRole("cell", { name: "Avery Chen" })).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "Sam Rivers" })).toBeInTheDocument();
      expect(screen.queryByRole("cell", { name: "Jordan Lee Rivera" })).not.toBeInTheDocument();
      expect(screen.getByText("Showing 2 of 3 patients")).toBeInTheDocument();
    });

    it("names one or two checked statuses, counts three or more, and shows every status when none are checked", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(threePatients));
      renderDirectory();
      await user.click(await screen.findByRole("button", { name: "Status: All statuses" }));

      await user.click(screen.getByRole("menuitemcheckbox", { name: "Active, 1 patient" }));
      const oneStatusLabel = screen.getByRole("button", { name: "Status: Active", hidden: true });
      expect(oneStatusLabel).toBeInTheDocument();
      await user.click(screen.getByRole("menuitemcheckbox", { name: "Inquiry, 1 patient" }));
      await user.click(screen.getByRole("menuitemcheckbox", { name: "Churned, 0 patients" }));
      expect(screen.getByRole("button", { name: "Status: 3 statuses", hidden: true })).toBeInTheDocument();
      await user.click(screen.getByRole("menuitemcheckbox", { name: "Active, 1 patient" }));
      await user.click(screen.getByRole("menuitemcheckbox", { name: "Inquiry, 1 patient" }));
      await user.click(screen.getByRole("menuitemcheckbox", { name: "Churned, 0 patients" }));
      await user.keyboard("{Escape}");

      expect(screen.getByRole("button", { name: "Status: All statuses" })).toHaveTextContent(/^All statuses$/);
      expect(screen.getAllByRole("row")).toHaveLength(4);
      expect(screen.queryByText(/^Showing/)).not.toBeInTheDocument();
    });

    it("shows only patients who match both the name search and the checked statuses", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(threePatients));
      renderDirectory();
      await user.type(await screen.findByRole("searchbox", { name: "Search patients by name" }), "riv");

      await user.click(screen.getByRole("button", { name: "Status: All statuses" }));
      await user.click(screen.getByRole("menuitemcheckbox", { name: "Onboarding, 1 patient" }));
      await user.keyboard("{Escape}");

      expect(screen.getByRole("cell", { name: "Sam Rivers" })).toBeInTheDocument();
      expect(screen.queryByRole("cell", { name: "Jordan Lee Rivera" })).not.toBeInTheDocument();
      expect(screen.queryByRole("cell", { name: "Avery Chen" })).not.toBeInTheDocument();
      expect(screen.getByText("Showing 1 of 3 patients")).toBeInTheDocument();
    });

    it("names the search and statuses when nothing matches, and Clear filters resets both", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(threePatients));
      renderDirectory();
      const searchBox = await screen.findByRole("searchbox", { name: "Search patients by name" });
      await user.type(searchBox, "chen");
      await user.click(screen.getByRole("button", { name: "Status: All statuses" }));
      await user.click(screen.getByRole("menuitemcheckbox", { name: "Active, 1 patient" }));
      await user.click(screen.getByRole("menuitemcheckbox", { name: "Churned, 0 patients" }));
      await user.keyboard("{Escape}");
      const noMatches = screen.getByRole("region", { name: "No matching patients" });
      expect(noMatches).toHaveTextContent("No patient names match “chen” with status Active or Churned.");

      await user.click(within(noMatches).getByRole("button", { name: "Clear filters" }));

      expect(searchBox).toHaveValue("");
      expect(searchBox).toHaveFocus();
      expect(screen.getByRole("button", { name: "Status: All statuses" })).toBeInTheDocument();
      expect(screen.getAllByRole("row")).toHaveLength(4);
    });

    it("explains an empty result when only statuses are checked", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(threePatients));
      renderDirectory();
      await user.click(await screen.findByRole("button", { name: "Status: All statuses" }));

      await user.click(screen.getByRole("menuitemcheckbox", { name: "Churned, 0 patients" }));
      await user.keyboard("{Escape}");

      expect(screen.getByRole("region", { name: "No matching patients" })).toHaveTextContent(
        "No patients have status Churned.",
      );
    });
  });
});
