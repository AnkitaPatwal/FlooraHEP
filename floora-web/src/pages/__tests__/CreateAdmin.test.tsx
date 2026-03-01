import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CreateAdmin from "../CreateAdmin";

// keep tests isolated from layout/sidebar
vi.mock("../../components/layouts/AppLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

const renderPage = () => {
  return render(
    <MemoryRouter initialEntries={["/create-admin"]}>
      <CreateAdmin />
    </MemoryRouter>
  );
};

describe("CreateAdmin", () => {
  beforeEach(() => {
    // make sure we are NOT using fake timers
    vi.useRealTimers();
  });

  it("renders the form and keeps submit disabled until email is valid", async () => {
    const user = userEvent.setup();
    renderPage();

    const emailInput = screen.getByPlaceholderText("admin@example.com");
    const submitBtn = screen.getByRole("button", { name: /submit/i });

    // empty -> disabled
    expect(submitBtn).toBeDisabled();

    // invalid -> still disabled
    await user.type(emailInput, "kk");
    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    // valid -> enabled
    await user.clear(emailInput);
    await user.type(emailInput, "admin@example.com");
    expect(submitBtn).toBeEnabled();
  });

  it("shows success message on valid submit (UI only)", async () => {
    const user = userEvent.setup();
    renderPage();

    const emailInput = screen.getByPlaceholderText("admin@example.com");
    const submitBtn = screen.getByRole("button", { name: /submit/i });

    await user.type(emailInput, "admin@example.com");
    await user.click(submitBtn);

    // loading state
    expect(screen.getByRole("button", { name: /creating/i })).toBeInTheDocument();

    // real 700ms delay in component -> just wait for success text
    expect(
      await screen.findByText(/admin created successfully\./i, {}, { timeout: 2000 })
    ).toBeInTheDocument();
  });
});