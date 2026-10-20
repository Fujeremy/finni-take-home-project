import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  it("opens from the header with focus on First name and Inquiry selected", async () => {
    const user = userEvent.setup();
    renderApp();
    const header = screen.getByRole("banner");

    await user.click(within(header).getByRole("button", { name: "Add patient" }));

    const dialog = screen.getByRole("dialog", { name: "Add patient" });
    expect(within(dialog).getByLabelText("First name")).toHaveFocus();
    expect(within(dialog).getByRole("combobox", { name: "Status" })).toHaveTextContent("Inquiry");
    expect(within(dialog).getByLabelText("Middle name (optional)")).toBeInTheDocument();
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
    expect(firstNameInput).toHaveAccessibleDescription("First name must be 100 characters or fewer.");
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
