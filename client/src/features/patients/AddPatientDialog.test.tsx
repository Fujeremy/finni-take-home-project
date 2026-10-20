import type { Patient } from "@finni/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/App";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function postRequestCount(): number {
  const fetchCalls = vi.mocked(globalThis.fetch).mock.calls;
  return fetchCalls.filter(([, init]) => init?.method === "POST").length;
}

// Renders the whole page, starting with an empty directory.
function renderApp() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([]));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Add patient dialog", () => {
  it("opens from the header with focus on the dialog itself and Inquiry selected", async () => {
    const user = userEvent.setup();
    renderApp();
    const header = screen.getByRole("banner");

    await user.click(within(header).getByRole("button", { name: "Add patient" }));

    const dialog = screen.getByRole("dialog", { name: "Add patient" });
    expect(dialog).toHaveFocus();
    expect(within(dialog).getByRole("combobox", { name: "Status" })).toHaveTextContent("Inquiry");
    expect(within(dialog).getByLabelText("Middle name (optional)")).toBeInTheDocument();
  });

  it("moves to First name on the first Tab", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(within(screen.getByRole("banner")).getByRole("button", { name: "Add patient" }));
    const dialog = screen.getByRole("dialog", { name: "Add patient" });

    await user.tab();

    expect(within(dialog).getByLabelText("First name")).toHaveFocus();
  });

  it("doesn't flag First name when the provider starts in another field", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(within(screen.getByRole("banner")).getByRole("button", { name: "Add patient" }));
    const dialog = screen.getByRole("dialog", { name: "Add patient" });

    await user.click(within(dialog).getByLabelText("City"));
    await user.type(within(dialog).getByLabelText("City"), "Springfield");
    await user.tab();

    expect(within(dialog).getByLabelText("First name")).not.toHaveAccessibleDescription();
    expect(within(dialog).getByLabelText("First name")).toHaveAttribute("aria-invalid", "false");
  });

  it("marks every missing required field and sends nothing when submitted empty", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(within(screen.getByRole("banner")).getByRole("button", { name: "Add patient" }));
    const dialog = screen.getByRole("dialog", { name: "Add patient" });

    await user.click(within(dialog).getByRole("button", { name: "Save patient" }));

    expect(within(dialog).getByLabelText("First name")).toHaveAccessibleDescription("Enter a first name.");
    expect(within(dialog).getByLabelText("Last name")).toHaveAccessibleDescription("Enter a last name.");
    expect(within(dialog).getByLabelText("Date of birth")).toHaveAccessibleDescription(
      "Enter a date of birth.",
    );
    expect(within(dialog).getByLabelText("Address line 1")).toHaveAccessibleDescription("Enter an address.");
    expect(within(dialog).getByLabelText("City")).toHaveAccessibleDescription("Enter a city.");
    expect(within(dialog).getByLabelText("Province or state")).toHaveAccessibleDescription(
      "Enter a province or state.",
    );
    expect(within(dialog).getByLabelText("Postal code")).toHaveAccessibleDescription("Enter a postal code.");
    expect(within(dialog).getByLabelText("Country code")).toHaveAccessibleDescription(
      "Two letters, e.g. CA Enter a country code.",
    );
    expect(within(dialog).getByLabelText("First name")).toHaveFocus();
    expect(postRequestCount()).toBe(0);
  });

  it("clears a field's error as soon as it is fixed", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(within(screen.getByRole("banner")).getByRole("button", { name: "Add patient" }));
    const dialog = screen.getByRole("dialog", { name: "Add patient" });
    await user.click(within(dialog).getByRole("button", { name: "Save patient" }));
    const firstNameInput = within(dialog).getByLabelText("First name");

    await user.type(firstNameInput, "Jordan");

    expect(firstNameInput).not.toHaveAccessibleDescription();
    expect(firstNameInput).toHaveAttribute("aria-invalid", "false");
  });

  it("flags an invalid country code as soon as the provider leaves the field, before any save", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(within(screen.getByRole("banner")).getByRole("button", { name: "Add patient" }));
    const dialog = screen.getByRole("dialog", { name: "Add patient" });
    const countryInput = within(dialog).getByLabelText("Country code");

    await user.type(countryInput, "CAN");
    await user.tab();

    expect(countryInput).toHaveAccessibleDescription("Two letters, e.g. CA Enter a two-letter country code, e.g. CA.");
    expect(postRequestCount()).toBe(0);
  });

  it("updates a field's error while the provider corrects it after leaving", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(within(screen.getByRole("banner")).getByRole("button", { name: "Add patient" }));
    const dialog = screen.getByRole("dialog", { name: "Add patient" });
    const countryInput = within(dialog).getByLabelText("Country code");
    await user.type(countryInput, "C");
    await user.tab();
    expect(countryInput).toHaveAttribute("aria-invalid", "true");

    await user.type(countryInput, "A");

    expect(countryInput).toHaveAccessibleDescription("Two letters, e.g. CA");
    expect(countryInput).toHaveAttribute("aria-invalid", "false");
  });

  it("leaves fields the provider hasn't visited unflagged", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(within(screen.getByRole("banner")).getByRole("button", { name: "Add patient" }));
    const dialog = screen.getByRole("dialog", { name: "Add patient" });

    await user.type(within(dialog).getByLabelText("City"), "Springfield");
    await user.tab();

    expect(within(dialog).getByLabelText("Last name")).not.toHaveAccessibleDescription();
    expect(within(dialog).getByLabelText("Postal code")).not.toHaveAccessibleDescription();
  });

  it("keeps pasted text over the limit and shows a length error instead of cutting it off", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(within(screen.getByRole("banner")).getByRole("button", { name: "Add patient" }));
    const dialog = screen.getByRole("dialog", { name: "Add patient" });
    const firstNameInput = within(dialog).getByLabelText("First name");

    await user.click(firstNameInput);
    await user.paste("a".repeat(101));
    await user.click(within(dialog).getByRole("button", { name: "Save patient" }));

    expect(firstNameInput).toHaveValue("a".repeat(101));
    expect(firstNameInput).toHaveAccessibleDescription("100 characters max.");
  });

  it("lets the provider choose a different status", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(within(screen.getByRole("banner")).getByRole("button", { name: "Add patient" }));
    const statusSelect = screen.getByRole("combobox", { name: "Status" });

    await user.click(statusSelect);
    await user.click(screen.getByRole("option", { name: "Active" }));

    expect(statusSelect).toHaveTextContent("Active");
  });

  it("closes with Cancel without sending anything and returns focus to Add patient", async () => {
    const user = userEvent.setup();
    renderApp();
    const headerAddButton = within(screen.getByRole("banner")).getByRole("button", { name: "Add patient" });
    await user.click(headerAddButton);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(headerAddButton).toHaveFocus();
    expect(postRequestCount()).toBe(0);
  });
});

const savedJordan: Patient = {
  id: "00000000-0000-4000-8000-000000000001",
  firstName: "Jordan",
  middleName: null,
  lastName: "Rivera",
  dateOfBirth: "1988-03-14",
  status: "inquiry",
  addressLine1: "42 Maple Lane",
  addressLine2: null,
  city: "Springfield",
  region: "ON",
  postalCode: "K1A 0B1",
  country: "CA",
  createdAt: "2026-10-20T03:14:00.000Z",
};

// Answers GET /api/patients with the current list and every POST with the given response.
function routeFetch(savedPatients: Patient[], respondToPost: () => Promise<Response>) {
  vi.mocked(globalThis.fetch).mockImplementation(async (_input, init) => {
    if (init?.method === "POST") {
      return respondToPost();
    }
    return jsonResponse(savedPatients);
  });
}

function postedBody(): unknown {
  const postCall = vi.mocked(globalThis.fetch).mock.calls.find(([, init]) => init?.method === "POST");
  return JSON.parse(String(postCall?.[1]?.body));
}

// Fills every required field with valid values; optional fields stay empty.
async function fillInValidPatient(user: UserEvent, dialog: HTMLElement) {
  await user.type(within(dialog).getByLabelText("First name"), "Jordan");
  await user.type(within(dialog).getByLabelText("Last name"), "Rivera");
  await user.type(within(dialog).getByLabelText("Date of birth"), "1988-03-14");
  await user.type(within(dialog).getByLabelText("Address line 1"), "42 Maple Lane");
  await user.type(within(dialog).getByLabelText("City"), "Springfield");
  await user.type(within(dialog).getByLabelText("Province or state"), "ON");
  await user.type(within(dialog).getByLabelText("Postal code"), "K1A 0B1");
  await user.type(within(dialog).getByLabelText("Country code"), "ca");
}

async function openAddPatientDialog(user: UserEvent): Promise<HTMLElement> {
  await user.click(within(screen.getByRole("banner")).getByRole("button", { name: "Add patient" }));
  return screen.getByRole("dialog", { name: "Add patient" });
}

describe("Saving a new patient", () => {
  it("saves the patient, closes the dialog, confirms it, and shows the patient in the directory", async () => {
    const user = userEvent.setup();
    const savedPatients: Patient[] = [];
    routeFetch(savedPatients, async () => {
      savedPatients.push(savedJordan);
      return jsonResponse(savedJordan, 201);
    });
    renderApp();
    const dialog = await openAddPatientDialog(user);
    await fillInValidPatient(user, dialog);

    await user.click(within(dialog).getByRole("button", { name: "Save patient" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(postedBody()).toEqual({
      firstName: "Jordan",
      middleName: null,
      lastName: "Rivera",
      dateOfBirth: "1988-03-14",
      status: "inquiry",
      addressLine1: "42 Maple Lane",
      addressLine2: null,
      city: "Springfield",
      region: "ON",
      postalCode: "K1A 0B1",
      country: "CA",
    });
    expect(await screen.findByText("Jordan Rivera was added.")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Jordan Rivera" })).toBeInTheDocument();
    expect(within(screen.getByRole("banner")).getByRole("button", { name: "Add patient" })).toHaveFocus();
  });

  it("shows the server's field errors beside the fields and keeps everything entered", async () => {
    const user = userEvent.setup();
    routeFetch([], async () =>
      jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Check the highlighted fields.",
            fieldErrors: { postalCode: ["20 characters max."] },
          },
        },
        400,
      ),
    );
    renderApp();
    const dialog = await openAddPatientDialog(user);
    await fillInValidPatient(user, dialog);

    await user.click(within(dialog).getByRole("button", { name: "Save patient" }));

    expect(await within(dialog).findByText("20 characters max.")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Postal code")).toHaveAttribute("aria-invalid", "true");
    expect(within(dialog).getByLabelText("First name")).toHaveValue("Jordan");
    expect(within(dialog).getByLabelText("Address line 1")).toHaveValue("42 Maple Lane");
  });

  it("shows the server's error and keeps everything entered when saving fails", async () => {
    const user = userEvent.setup();
    routeFetch([], async () =>
      jsonResponse({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } }, 500),
    );
    renderApp();
    const dialog = await openAddPatientDialog(user);
    await fillInValidPatient(user, dialog);

    await user.click(within(dialog).getByRole("button", { name: "Save patient" }));

    const saveError = await within(dialog).findByRole("alert");
    expect(saveError).toHaveTextContent("The patient wasn't saved.");
    expect(saveError).toHaveTextContent("Something went wrong. Please try again.");
    expect(within(dialog).getByLabelText("First name")).toHaveValue("Jordan");
    expect(within(dialog).getByRole("button", { name: "Save patient" })).toBeEnabled();
  });

  it("explains when the server can't be reached and keeps everything entered", async () => {
    const user = userEvent.setup();
    routeFetch([], async () => {
      throw new TypeError("Failed to fetch");
    });
    renderApp();
    const dialog = await openAddPatientDialog(user);
    await fillInValidPatient(user, dialog);

    await user.click(within(dialog).getByRole("button", { name: "Save patient" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "The server can't be reached. Check that it's running, then try again.",
    );
    expect(within(dialog).getByLabelText("City")).toHaveValue("Springfield");
  });

  it("blocks a second save and closing the dialog while saving", async () => {
    const user = userEvent.setup();
    let finishSaving: (response: Response) => void = () => {};
    routeFetch([], () => new Promise((resolve) => (finishSaving = resolve)));
    renderApp();
    const dialog = await openAddPatientDialog(user);
    await fillInValidPatient(user, dialog);

    await user.click(within(dialog).getByRole("button", { name: "Save patient" }));
    const savingButton = within(dialog).getByRole("button", { name: "Saving…" });
    await user.click(savingButton);
    await user.keyboard("{Escape}");

    expect(savingButton).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("dialog", { name: "Add patient" })).toBeInTheDocument();
    expect(postRequestCount()).toBe(1);

    finishSaving(jsonResponse(savedJordan, 201));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("Discarding entered values", () => {
  it("asks before closing with entries, and Keep editing keeps every value", async () => {
    const user = userEvent.setup();
    renderApp();
    const dialog = await openAddPatientDialog(user);
    await user.type(within(dialog).getByLabelText("First name"), "Jordan");

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    const confirmation = screen.getByRole("alertdialog", { name: "Discard this patient?" });
    await user.click(within(confirmation).getByRole("button", { name: "Keep editing" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Add patient" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("First name")).toHaveValue("Jordan");
  });

  it("returns to the form when Escape is pressed in the confirmation", async () => {
    const user = userEvent.setup();
    renderApp();
    const dialog = await openAddPatientDialog(user);
    await user.type(within(dialog).getByLabelText("City"), "Springfield");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("City")).toHaveValue("Springfield");
  });

  it("closes without saving after Discard, and the next open starts empty", async () => {
    const user = userEvent.setup();
    renderApp();
    const dialog = await openAddPatientDialog(user);
    await user.type(within(dialog).getByLabelText("First name"), "Jordan");
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Discard" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(postRequestCount()).toBe(0);
    const reopenedDialog = await openAddPatientDialog(user);
    expect(within(reopenedDialog).getByLabelText("First name")).toHaveValue("");
  });

  it("closes right away when nothing was entered", async () => {
    const user = userEvent.setup();
    renderApp();
    await openAddPatientDialog(user);

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
