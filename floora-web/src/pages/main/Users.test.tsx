import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Users from "./Users";
import type { ActiveClient, PendingClient } from "../../lib/admin-api";

const mockFetchPending = vi.fn();
const mockFetchActive = vi.fn();
const mockFetchDenied = vi.fn();
const mockFetchClientProfileAvatars = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../../lib/admin-api", () => ({
  fetchPendingClients: () => mockFetchPending(),
  fetchActiveClients: () => mockFetchActive(),
  fetchDeniedClients: () => mockFetchDenied(),
  fetchClientProfileAvatars: (ids: number[]) =>
    mockFetchClientProfileAvatars(ids),
}));

vi.mock("../../components/layouts/AppLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

afterEach(() => {
  cleanup();
});

function renderUsers(initialPath = "/users") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/users" element={<Users />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Users page (client management)", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockFetchPending.mockResolvedValue([]);
    mockFetchActive.mockResolvedValue([]);
    mockFetchDenied.mockResolvedValue([]);
    mockFetchClientProfileAvatars.mockReset();
    mockFetchClientProfileAvatars.mockResolvedValue(new Map());
  });

  it("does not render Add / New User button", async () => {
    renderUsers();
    await waitFor(() => {
      expect(screen.queryByText(/loading active users/i)).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: /new user/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/\+ new user/i)).not.toBeInTheDocument();
  });

  it("renders header search for users", async () => {
    renderUsers();
    await waitFor(() => {
      expect(
        screen.getByRole("textbox", { name: /search users/i })
      ).toBeInTheDocument();
    });
    expect(
      screen.getByPlaceholderText(/search users/i)
    ).toBeInTheDocument();
  });

  it("shows concise plan subtitle: first plan only when one plan", async () => {
    const active: ActiveClient[] = [
      {
        user_id: 1,
        email: "a@example.com",
        fname: "Ann",
        lname: "Active",
        status: true,
        plans: [{ plan_id: 10, title: "Solo Plan" }],
      },
    ];
    mockFetchActive.mockResolvedValueOnce(active);

    renderUsers();
    await waitFor(() => {
      expect(screen.getByText("Solo Plan")).toBeInTheDocument();
    });
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
  });

  it("shows first plan title and +count of additional plans", async () => {
    const active: ActiveClient[] = [
      {
        user_id: 2,
        email: "b@example.com",
        fname: "Bob",
        lname: "Beta",
        status: true,
        plans: [
          { plan_id: 1, title: "Alpha" },
          { plan_id: 2, title: "Bravo" },
          { plan_id: 3, title: "Charlie" },
        ],
      },
    ];
    mockFetchActive.mockResolvedValueOnce(active);

    renderUsers();
    await waitFor(() => {
      expect(screen.getByText("Alpha + 2")).toBeInTheDocument();
    });
  });

  it("shows first title + 1 when exactly two plans are assigned", async () => {
    const active: ActiveClient[] = [
      {
        user_id: 9,
        email: "ankita@example.com",
        fname: "Ankita",
        lname: "Patwal",
        status: true,
        plans: [
          { plan_id: 1, title: "example" },
          { plan_id: 2, title: "sadaf" },
        ],
      },
    ];
    mockFetchActive.mockResolvedValueOnce(active);

    renderUsers();
    await waitFor(() => {
      expect(screen.getByText("example + 1")).toBeInTheDocument();
    });
  });

  it("shows No plan assigned when plans empty", async () => {
    const active: ActiveClient[] = [
      {
        user_id: 3,
        email: "c@example.com",
        fname: "Cara",
        lname: "Cain",
        status: true,
        plans: [],
      },
    ];
    mockFetchActive.mockResolvedValueOnce(active);

    renderUsers();
    await waitFor(() => {
      expect(screen.getByText("No plan assigned")).toBeInTheDocument();
    });
  });

  it("renders Denied Users section with Access denied for denied clients", async () => {
    const denied: PendingClient[] = [
      {
        user_id: 99,
        email: "denied@example.com",
        fname: "Dan",
        lname: "Ied",
        status: false,
      },
    ];
    mockFetchDenied.mockResolvedValueOnce(denied);

    renderUsers();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /denied users/i })).toBeInTheDocument();
    });
    expect(screen.getByText("denied@example.com")).toBeInTheDocument();
    expect(screen.getByText("Access denied")).toBeInTheDocument();
  });

  it("renders profile image when active user has avatar_url", async () => {
    const active: ActiveClient[] = [
      {
        user_id: 4,
        email: "pic@example.com",
        fname: "Pat",
        lname: "Pic",
        status: true,
        avatar_url: "https://example.com/avatar.png",
        plans: [],
      },
    ];
    mockFetchActive.mockResolvedValueOnce(active);

    const { container } = renderUsers();
    await waitFor(() => {
      expect(container.querySelector("img.user-avatar-img")).toBeTruthy();
    });
    expect(container.querySelector("img.user-avatar-img")).toHaveAttribute(
      "src",
      "https://example.com/avatar.png"
    );
  });

  it("falls back to initials when avatar image fails to load", async () => {
    const active: ActiveClient[] = [
      {
        user_id: 5,
        email: "bad@example.com",
        fname: "Bad",
        lname: "Img",
        status: true,
        avatar_url: "https://example.com/missing.png",
        plans: [],
      },
    ];
    mockFetchActive.mockResolvedValueOnce(active);

    const { container } = renderUsers();
    await waitFor(() => {
      expect(container.querySelector("img.user-avatar-img")).toBeTruthy();
    });
    const img = container.querySelector("img.user-avatar-img")!;
    fireEvent.error(img);

    await waitFor(() => {
      expect(container.querySelector("img.user-avatar-img")).not.toBeInTheDocument();
    });
    expect(screen.getByText("BI")).toBeInTheDocument();
  });

  it("navigates to user profile when an active user card is clicked", async () => {
    const active: ActiveClient[] = [
      {
        user_id: 7,
        email: "go@example.com",
        fname: "Go",
        lname: "Profile",
        status: true,
        plans: [{ plan_id: 1, title: "P" }],
      },
    ];
    mockFetchActive.mockResolvedValueOnce(active);

    renderUsers();
    await waitFor(() => {
      expect(screen.getByText("Go Profile")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /go profile/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/user-profile", {
      state: { user: active[0] },
    });
  });

  it("filters lists when searching", async () => {
    mockFetchPending.mockResolvedValue([
      {
        user_id: 1,
        email: "keep@example.com",
        fname: "Keep",
        lname: "Me",
        status: false,
      },
      {
        user_id: 2,
        email: "hide@example.com",
        fname: "Hide",
        lname: "Me",
        status: false,
      },
    ]);
    mockFetchDenied.mockResolvedValue([
      {
        user_id: 3,
        email: "den@example.com",
        fname: "Den",
        lname: "Only",
        status: false,
      },
    ]);

    renderUsers();
    const search = await screen.findByRole("textbox", { name: /search users/i });

    await waitFor(() => {
      expect(screen.getByText("keep@example.com")).toBeInTheDocument();
    });

    fireEvent.change(search, { target: { value: "keep" } });

    await waitFor(() => {
      expect(screen.getByText("keep@example.com")).toBeInTheDocument();
    });
    expect(screen.queryByText("hide@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("den@example.com")).not.toBeInTheDocument();
  });
});
