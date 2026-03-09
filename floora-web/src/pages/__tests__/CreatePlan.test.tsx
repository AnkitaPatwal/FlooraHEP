import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import CreatePlan from "../main/CreatePlan";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const renderWithRouter = (ui: React.ReactElement, { route = "/plan-dashboard/create" } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/plan-dashboard/create" element={ui} />
        <Route path="/plan-dashboard/:id" element={ui} />
        <Route path="/plan-dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe("CreatePlan component", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/admin/modules")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { module_id: 1, title: "Lower Back Mobility", description: "Back Pain session focusing on mobility" },
            { module_id: 2, title: "Gentle Stretch", description: "Gentle stretching for back pain relief" },
            { module_id: 3, title: "Relax & Release", description: "Relax and release tension in the back" },
          ]),
        });
      }
      return Promise.reject(new Error("not mocked"));
    });
  });

  it("renders the form and fetches available sessions", async () => {
    renderWithRouter(<CreatePlan />);

    expect(screen.getByText("Create Plan")).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText("Lower Back Mobility")).toBeInTheDocument();
      expect(screen.getByText("Gentle Stretch")).toBeInTheDocument();
    });
  });

  it("adds a session to the plan", async () => {
    renderWithRouter(<CreatePlan />);

    await waitFor(() => {
      expect(screen.getByText("Lower Back Mobility")).toBeInTheDocument();
    });

    const addButtons = screen.getAllByText("Add");
    fireEvent.click(addButtons[0]);

    // Added to the selected list
    expect(screen.getByText("1. Lower Back Mobility")).toBeInTheDocument();
  });

  it("removes a session from the plan", async () => {
    renderWithRouter(<CreatePlan />);

    await waitFor(() => {
      expect(screen.getByText("Lower Back Mobility")).toBeInTheDocument();
    });

    const addButtons = screen.getAllByText("Add");
    fireEvent.click(addButtons[0]);

    expect(screen.getByText("1. Lower Back Mobility")).toBeInTheDocument();

    const removeButton = screen.getByText("Remove");
    fireEvent.click(removeButton);

    expect(screen.queryByText("1. Lower Back Mobility")).not.toBeInTheDocument();
  });

  it("handles saving the plan successfully", async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/admin/modules")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { module_id: 1, title: "Lower Back Mobility", description: "Back Pain session focusing on mobility" },
          ]),
        });
      }
      if (url.includes("/api/admin/plans")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: "Success", planId: 1 }),
        });
      }
      return Promise.reject(new Error("not mocked"));
    });

    renderWithRouter(<CreatePlan />);

    await waitFor(() => {
      expect(screen.getByText("Lower Back Mobility")).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText("e.g. Pelvic Floor Recovery");
    fireEvent.change(titleInput, { target: { value: "New Plan" } });

    const descInput = screen.getByPlaceholderText("Enter plan description...");
    fireEvent.change(descInput, { target: { value: "A description" } });

    const addButtons = screen.getAllByText("Add");
    fireEvent.click(addButtons[0]);

    const saveButton = screen.getByText("Save Plan");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });

  it("handles failure when saving a plan", async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/admin/modules")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { module_id: 1, title: "Lower Back Mobility", description: "Back Pain session focusing on mobility" },
          ]),
        });
      }
      if (url.includes("/api/admin/plans")) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "Failed to create plan in DB" }),
        });
      }
      return Promise.reject(new Error("not mocked"));
    });

    renderWithRouter(<CreatePlan />);

    await waitFor(() => {
      expect(screen.getByText("Lower Back Mobility")).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText("e.g. Pelvic Floor Recovery");
    fireEvent.change(titleInput, { target: { value: "New Plan" } });

    const descInput = screen.getByPlaceholderText("Enter plan description...");
    fireEvent.change(descInput, { target: { value: "A description" } });

    const saveButton = screen.getByText("Save Plan");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to create plan in DB")).toBeInTheDocument();
    });
  });
});