import type { Patient } from "@finni/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
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

// Each test gets its own query cache, so no test sees another's data. The directory renders
// inside a router opened at the last address given; earlier addresses are the pages Back
// returns to.
function renderDirectory(addresses: string[] = ["/patients"]) {
  const router = createMemoryRouter(
    [
      { path: "/patients", element: <PatientDirectory /> },
      { path: "*", element: <p>Another page</p> },
    ],
    { initialEntries: addresses, initialIndex: addresses.length - 1 },
  );
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
  delete process.env.TZ;
});

describe("PatientDirectory", () => {
  it("shows a loading message while patients load", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    renderDirectory();

    expect(screen.getByRole("status")).toHaveTextContent("Loading patients…");
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("shows each saved patient's name, birth date, status, address, and the date they were added", async () => {
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
      "Oct 19, 2026",
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

    // Hover tooltips open after a 700ms delay, so wait longer than the default 1 second.
    expect(await screen.findByRole("tooltip", {}, { timeout: 2000 })).toHaveTextContent("Jordan Lee Rivera");
  });

  it("shows the full address in a tooltip when the provider tabs to a shortened address", async () => {
    const user = userEvent.setup();
    simulateTextWiderThanItsCell();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([savedPatient]));
    renderDirectory();
    const shortenedAddress = await screen.findByText("42 Maple Lane, Unit 3, Springfield, ON K1A 0B1, CA");

    // The search box, Status button, and Sort button come first in the tab order, then the
    // shortened name, then the shortened address.
    await user.tab();
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
    // The search box, Status button, and Sort button come first; the next Tab passes over
    // the table to the pager below it.
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rows per page: 25" })).toHaveFocus();
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

    it("shows only the patients whose names match the search", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([averyChen, savedPatient]));
      renderDirectory();
      const searchBox = await screen.findByRole("searchbox", { name: "Search patients by name" });

      await user.type(searchBox, "riv{Enter}");

      expect(screen.getByRole("cell", { name: "Jordan Lee Rivera" })).toBeInTheDocument();
      expect(screen.queryByRole("cell", { name: "Avery Chen" })).not.toBeInTheDocument();
    });

    it("replaces the table with a no-match message when no names match", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([averyChen, savedPatient]));
      renderDirectory();
      const searchBox = await screen.findByRole("searchbox", { name: "Search patients by name" });

      await user.type(searchBox, "zed{Enter}");

      const noMatches = screen.getByRole("region", { name: "No matching patients" });
      expect(noMatches).toHaveTextContent("No patient names match “zed”.");
      expect(noMatches).toHaveTextContent("Change the search or statuses to see more patients.");
      expect(within(noMatches).queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("shows every patient again when the search box is cleared", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([averyChen, savedPatient]));
      renderDirectory();
      const searchBox = await screen.findByRole("searchbox", { name: "Search patients by name" });
      await user.type(searchBox, "riv{Enter}");

      await user.clear(searchBox);

      expect(screen.getByRole("cell", { name: "Avery Chen" })).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "Jordan Lee Rivera" })).toBeInTheDocument();
    });

    it("waits for Enter before searching, offering a Search button for the typed text", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([averyChen, savedPatient]));
      const router = renderDirectory();
      const searchBox = await screen.findByRole("searchbox", { name: "Search patients by name" });

      await user.type(searchBox, "riv");

      expect(screen.getByRole("cell", { name: "Avery Chen" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
      expect(router.state.location.search).toBe("");
    });

    it("searches on Enter, writing the search to the address and keeping focus in the search box", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([averyChen, savedPatient]));
      const router = renderDirectory();
      const searchBox = await screen.findByRole("searchbox", { name: "Search patients by name" });

      await user.type(searchBox, "  riv {Enter}");

      expect(screen.queryByRole("cell", { name: "Avery Chen" })).not.toBeInTheDocument();
      expect(router.state.location.search).toBe("?q=riv");
      expect(searchBox).toHaveFocus();
      expect(screen.queryByRole("button", { name: "Search" })).not.toBeInTheDocument();
    });

    it("searches with the Search button and returns focus to the search box", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([averyChen, savedPatient]));
      const router = renderDirectory();
      const searchBox = await screen.findByRole("searchbox", { name: "Search patients by name" });
      await user.type(searchBox, "riv");

      await user.click(screen.getByRole("button", { name: "Search" }));

      expect(screen.queryByRole("cell", { name: "Avery Chen" })).not.toBeInTheDocument();
      expect(router.state.location.search).toBe("?q=riv");
      expect(searchBox).toHaveFocus();
    });

    it("clears the search from the table and the address as soon as the box is emptied", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([averyChen, savedPatient]));
      const router = renderDirectory(["/patients?q=riv"]);
      const searchBox = await screen.findByRole("searchbox", { name: "Search patients by name" });

      await user.clear(searchBox);

      expect(screen.getByRole("cell", { name: "Avery Chen" })).toBeInTheDocument();
      expect(router.state.location.search).toBe("");
    });

    it("shows the search from the address in the box, already applied", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([averyChen, savedPatient]));

      renderDirectory(["/patients?q=riv"]);

      expect(await screen.findByRole("searchbox", { name: "Search patients by name" })).toHaveValue("riv");
      expect(screen.getByRole("cell", { name: "Jordan Lee Rivera" })).toBeInTheDocument();
      expect(screen.queryByRole("cell", { name: "Avery Chen" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Search" })).not.toBeInTheDocument();
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
      await user.type(searchBox, "riv{Enter}");

      act(() => {
        window.dispatchEvent(new Event("visibilitychange"));
      });

      expect(await screen.findByRole("cell", { name: "Sam Rivers" })).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "Jordan Lee Rivera" })).toBeInTheDocument();
      expect(screen.queryByRole("cell", { name: "Avery Chen" })).not.toBeInTheDocument();
      expect(searchBox).toHaveValue("riv");
    });

    it("keeps the search applied to the last loaded list when a refresh fails", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonResponse([averyChen, savedPatient]))
        .mockRejectedValueOnce(new TypeError("Failed to fetch"));
      renderDirectory();
      const searchBox = await screen.findByRole("searchbox", { name: "Search patients by name" });
      await user.type(searchBox, "riv{Enter}");

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
      await user.type(await screen.findByRole("searchbox", { name: "Search patients by name" }), "chen{Enter}");

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
    });

    it("shows only patients who match both the name search and the checked statuses", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(threePatients));
      renderDirectory();
      await user.type(await screen.findByRole("searchbox", { name: "Search patients by name" }), "riv{Enter}");

      await user.click(screen.getByRole("button", { name: "Status: All statuses" }));
      await user.click(screen.getByRole("menuitemcheckbox", { name: "Onboarding, 1 patient" }));
      await user.keyboard("{Escape}");

      expect(screen.getByRole("cell", { name: "Sam Rivers" })).toBeInTheDocument();
      expect(screen.queryByRole("cell", { name: "Jordan Lee Rivera" })).not.toBeInTheDocument();
      expect(screen.queryByRole("cell", { name: "Avery Chen" })).not.toBeInTheDocument();
    });

    it("names the search and statuses when nothing matches", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(threePatients));
      renderDirectory();
      const searchBox = await screen.findByRole("searchbox", { name: "Search patients by name" });
      await user.type(searchBox, "chen{Enter}");
      await user.click(screen.getByRole("button", { name: "Status: All statuses" }));
      await user.click(screen.getByRole("menuitemcheckbox", { name: "Active, 1 patient" }));
      await user.click(screen.getByRole("menuitemcheckbox", { name: "Churned, 0 patients" }));
      await user.keyboard("{Escape}");

      const noMatches = screen.getByRole("region", { name: "No matching patients" });
      expect(noMatches).toHaveTextContent("No patient names match “chen” with status Active or Churned.");
      expect(noMatches).toHaveTextContent("Change the search or statuses to see more patients.");
    });

    it("unchecks every status with the X and moves focus to the Status button", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(threePatients));
      renderDirectory();
      await user.click(await screen.findByRole("button", { name: "Status: All statuses" }));
      await user.click(screen.getByRole("menuitemcheckbox", { name: "Onboarding, 1 patient" }));
      await user.click(screen.getByRole("menuitemcheckbox", { name: "Inquiry, 1 patient" }));
      await user.keyboard("{Escape}");

      await user.click(screen.getByRole("button", { name: "Clear status filter" }));

      expect(screen.getByRole("button", { name: "Status: All statuses" })).toHaveFocus();
      expect(screen.getAllByRole("row")).toHaveLength(4);
      expect(screen.queryByRole("button", { name: "Clear status filter" })).not.toBeInTheDocument();
    });

    it("writes the checked statuses to the address in the usual order, and removes them when cleared", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(threePatients));
      const router = renderDirectory();
      await user.click(await screen.findByRole("button", { name: "Status: All statuses" }));

      await user.click(screen.getByRole("menuitemcheckbox", { name: "Onboarding, 1 patient" }));
      await user.click(screen.getByRole("menuitemcheckbox", { name: "Inquiry, 1 patient" }));
      await user.keyboard("{Escape}");

      expect(router.state.location.search).toBe("?status=inquiry%2Conboarding");
      await user.click(screen.getByRole("button", { name: "Clear status filter" }));
      expect(router.state.location.search).toBe("");
    });

    it("checks the statuses named in the address", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(threePatients));

      renderDirectory(["/patients?status=onboarding,inquiry"]);

      expect(await screen.findByRole("button", { name: "Status: Inquiry, Onboarding" })).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "Avery Chen" })).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "Sam Rivers" })).toBeInTheDocument();
      expect(screen.queryByRole("cell", { name: "Jordan Lee Rivera" })).not.toBeInTheDocument();
    });

    it("shows no X while every status is shown", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(threePatients));

      renderDirectory();

      expect(await screen.findByRole("button", { name: "Status: All statuses" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Clear status filter" })).not.toBeInTheDocument();
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
  describe("sorting", () => {
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
    // The API returns newest first: Sam Rivers, then Avery Chen, then Jordan Lee Rivera.
    const apiOrder = [samRivers, averyChen, savedPatient];

    function patientNamesInTableOrder(): string[] {
      const [, ...patientRows] = screen.getAllByRole("row");
      return patientRows.map((row) => within(row).getAllByRole("cell")[0]!.textContent ?? "");
    }

    it("starts sorted by Recently added, in the order the API returned", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(apiOrder));

      renderDirectory();

      expect(await screen.findByRole("button", { name: "Sort: Recently added" })).toBeInTheDocument();
      expect(patientNamesInTableOrder()).toEqual(["Sam Rivers", "Avery Chen", "Jordan Lee Rivera"]);
    });

    it("reorders the table by last name and names the choice on the button", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(apiOrder));
      renderDirectory();

      await user.click(await screen.findByRole("button", { name: "Sort: Recently added" }));
      await user.click(screen.getByRole("menuitemradio", { name: "Last name A–Z" }));

      expect(screen.getByRole("button", { name: "Sort: Last name A–Z" })).toBeInTheDocument();
      expect(patientNamesInTableOrder()).toEqual(["Avery Chen", "Jordan Lee Rivera", "Sam Rivers"]);
    });

    it("writes the sort to the address, and removes it when Recently added is chosen again", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(apiOrder));
      const router = renderDirectory();
      await user.click(await screen.findByRole("button", { name: "Sort: Recently added" }));
      await user.click(screen.getByRole("menuitemradio", { name: "Last name A–Z" }));
      expect(router.state.location.search).toBe("?sort=last-name-asc");

      await user.click(screen.getByRole("button", { name: "Sort: Last name A–Z" }));
      await user.click(screen.getByRole("menuitemradio", { name: "Recently added" }));

      expect(router.state.location.search).toBe("");
    });

    it("puts the oldest patient first when Oldest added is chosen", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(apiOrder));
      renderDirectory();

      await user.click(await screen.findByRole("button", { name: "Sort: Recently added" }));
      await user.click(screen.getByRole("menuitemradio", { name: "Oldest added" }));

      expect(patientNamesInTableOrder()).toEqual(["Jordan Lee Rivera", "Avery Chen", "Sam Rivers"]);
    });

    it("sorts only the patients that match the search", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(apiOrder));
      renderDirectory();
      await user.click(await screen.findByRole("button", { name: "Sort: Recently added" }));
      await user.click(screen.getByRole("menuitemradio", { name: "Last name Z–A" }));

      await user.type(screen.getByRole("searchbox", { name: "Search patients by name" }), "riv{Enter}");

      expect(patientNamesInTableOrder()).toEqual(["Sam Rivers", "Jordan Lee Rivera"]);
    });
  });
  describe("pagination", () => {
    // 30 fictional patients in the API's newest-first order: Patient 01 through Patient 30.
    const thirtyPatients: Patient[] = Array.from({ length: 30 }, (_, index) => {
      const patientNumber = String(index + 1).padStart(2, "0");
      return {
        ...savedPatient,
        id: `00000000-0000-4000-8000-0000000001${patientNumber}`,
        firstName: "Patient",
        middleName: null,
        lastName: patientNumber,
      };
    });

    function patientNamesOnPage(): string[] {
      const [, ...patientRows] = screen.getAllByRole("row");
      return patientRows.map((row) => within(row).getAllByRole("cell")[0]!.textContent ?? "");
    }

    it("shows the first 25 patients with their range, and Previous unavailable", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(thirtyPatients));

      renderDirectory();

      expect(await screen.findByText("1–25 of 30")).toBeInTheDocument();
      const namesOnPage = patientNamesOnPage();
      expect(namesOnPage).toHaveLength(25);
      expect(namesOnPage[0]).toBe("Patient 01");
      expect(namesOnPage[24]).toBe("Patient 25");
      expect(screen.getByRole("button", { name: "Rows per page: 25" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Previous" })).toHaveAttribute("aria-disabled", "true");
      expect(screen.getByRole("button", { name: "Next" })).toHaveAttribute("aria-disabled", "false");
    });

    it("shows the remaining patients after Next, keeping focus on Next now that it is unavailable", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(thirtyPatients));
      renderDirectory();
      const nextButton = await screen.findByRole("button", { name: "Next" });

      await user.click(nextButton);

      expect(screen.getByText("26–30 of 30")).toBeInTheDocument();
      expect(patientNamesOnPage()).toEqual(["Patient 26", "Patient 27", "Patient 28", "Patient 29", "Patient 30"]);
      expect(nextButton).toHaveAttribute("aria-disabled", "true");
      expect(nextButton).toHaveFocus();
      expect(screen.getByRole("button", { name: "Previous" })).toHaveAttribute("aria-disabled", "false");
    });

    it("stays on the last page when Next is pressed there", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(thirtyPatients));
      renderDirectory();
      const nextButton = await screen.findByRole("button", { name: "Next" });
      await user.click(nextButton);

      await user.click(nextButton);

      expect(screen.getByText("26–30 of 30")).toBeInTheDocument();
    });

    it("goes back to the first page with Previous", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(thirtyPatients));
      renderDirectory();
      await user.click(await screen.findByRole("button", { name: "Next" }));

      await user.click(screen.getByRole("button", { name: "Previous" }));

      expect(screen.getByText("1–25 of 30")).toBeInTheDocument();
      expect(patientNamesOnPage()[0]).toBe("Patient 01");
    });

    it("shows every patient on one page after choosing 50 rows, with both buttons unavailable", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(thirtyPatients));
      renderDirectory();

      await user.click(await screen.findByRole("button", { name: "Rows per page: 25" }));
      await user.click(screen.getByRole("menuitemradio", { name: "50" }));

      expect(screen.getByRole("button", { name: "Rows per page: 50" })).toBeInTheDocument();
      expect(screen.getByText("1–30 of 30")).toBeInTheDocument();
      expect(patientNamesOnPage()).toHaveLength(30);
      expect(screen.getByRole("button", { name: "Previous" })).toHaveAttribute("aria-disabled", "true");
      expect(screen.getByRole("button", { name: "Next" })).toHaveAttribute("aria-disabled", "true");
    });

    it("returns to the first page when the search changes", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(thirtyPatients));
      renderDirectory();
      await user.click(await screen.findByRole("button", { name: "Next" }));

      await user.type(screen.getByRole("searchbox", { name: "Search patients by name" }), "patient{Enter}");

      expect(screen.getByText("1–25 of 30")).toBeInTheDocument();
    });

    it("returns to the first page when the sort changes", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(thirtyPatients));
      renderDirectory();
      await user.click(await screen.findByRole("button", { name: "Next" }));

      await user.click(screen.getByRole("button", { name: "Sort: Recently added" }));
      await user.click(screen.getByRole("menuitemradio", { name: "Last name Z–A" }));

      expect(screen.getByText("1–25 of 30")).toBeInTheDocument();
      expect(patientNamesOnPage()[0]).toBe("Patient 30");
    });

    it("returns to the first page when the status filter is cleared with its X", async () => {
      const user = userEvent.setup();
      // Every patient in the list is Active, so checking Active still leaves two pages.
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(thirtyPatients));
      renderDirectory();
      await user.click(await screen.findByRole("button", { name: "Status: All statuses" }));
      await user.click(screen.getByRole("menuitemcheckbox", { name: "Active, 30 patients" }));
      await user.keyboard("{Escape}");
      await user.click(screen.getByRole("button", { name: "Next" }));

      await user.click(screen.getByRole("button", { name: "Clear status filter" }));

      expect(screen.getByText("1–25 of 30")).toBeInTheDocument();
    });

    it("shows the last page that still exists when a refresh removes patients", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonResponse(thirtyPatients))
        .mockResolvedValueOnce(jsonResponse(thirtyPatients.slice(0, 20)));
      renderDirectory();
      await user.click(await screen.findByRole("button", { name: "Next" }));

      // Returning to the browser tab makes TanStack Query refresh the list.
      act(() => {
        window.dispatchEvent(new Event("visibilitychange"));
      });

      expect(await screen.findByText("1–20 of 20")).toBeInTheDocument();
      expect(patientNamesOnPage()).toHaveLength(20);
    });

    it("writes the page to the address with Next, and removes it with Previous", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(thirtyPatients));
      const router = renderDirectory();
      await user.click(await screen.findByRole("button", { name: "Next" }));
      expect(router.state.location.search).toBe("?page=2");

      await user.click(screen.getByRole("button", { name: "Previous" }));

      expect(router.state.location.search).toBe("");
    });

    it("writes the rows per page to the address and drops the page", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(thirtyPatients));
      const router = renderDirectory(["/patients?page=2"]);

      await user.click(await screen.findByRole("button", { name: "Rows per page: 25" }));
      await user.click(screen.getByRole("menuitemradio", { name: "50" }));

      expect(router.state.location.search).toBe("?size=50");
    });

    it("restores the search, statuses, sort, and page from the address", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(thirtyPatients));

      renderDirectory(["/patients?q=patient&status=active&sort=last-name-desc&page=2"]);

      expect(await screen.findByText("26–30 of 30")).toBeInTheDocument();
      expect(screen.getByRole("searchbox", { name: "Search patients by name" })).toHaveValue("patient");
      expect(screen.getByRole("button", { name: "Status: Active" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sort: Last name Z–A" })).toBeInTheDocument();
      expect(patientNamesOnPage()).toEqual(["Patient 05", "Patient 04", "Patient 03", "Patient 02", "Patient 01"]);
    });

    it("restores the rows per page from the address", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(thirtyPatients));

      renderDirectory(["/patients?size=50"]);

      expect(await screen.findByRole("button", { name: "Rows per page: 50" })).toBeInTheDocument();
      expect(screen.getByText("1–30 of 30")).toBeInTheDocument();
    });

    it("shows the defaults when the address has values it doesn't recognize", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(thirtyPatients));

      renderDirectory(["/patients?status=archived&sort=newest&page=abc&size=30"]);

      expect(await screen.findByText("1–25 of 30")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Status: All statuses" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sort: Recently added" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Rows per page: 25" })).toBeInTheDocument();
    });

    it("shows the last page when the address asks for a page past the end", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(thirtyPatients));

      renderDirectory(["/patients?page=9"]);

      expect(await screen.findByText("26–30 of 30")).toBeInTheDocument();
    });

    it("changes settings without adding history entries, so Back leaves the directory", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(thirtyPatients));
      const router = renderDirectory(["/somewhere-else", "/patients"]);
      await user.type(await screen.findByRole("searchbox", { name: "Search patients by name" }), "patient{Enter}");
      await user.click(screen.getByRole("button", { name: "Next" }));

      await act(() => router.navigate(-1));

      expect(router.state.location.pathname).toBe("/somewhere-else");
      expect(screen.getByText("Another page")).toBeInTheDocument();
    });

    it("hides the pager when no patients match", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(thirtyPatients));
      renderDirectory();

      await user.type(await screen.findByRole("searchbox", { name: "Search patients by name" }), "zed{Enter}");

      expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Rows per page/ })).not.toBeInTheDocument();
    });
  });
});
