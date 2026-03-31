// hooks/__tests__/useRoadmap.test.tsx
import { renderHook, waitFor } from "@testing-library/react-native";
import { useRoadmap } from "../useRoadmap";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFrom = jest.fn((table: string) => undefined as any);

const mockRpc = jest.fn((fn: string) =>
  Promise.resolve({ data: null, error: null })
);

jest.mock("../../lib/supabaseClient", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (fn: string) => mockRpc(fn),
  },
}));

const mockUseAuth = jest.fn();
jest.mock("../../providers/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Chain helpers ─────────────────────────────────────────────────────────────

function makeUserPackagesChain(data: unknown) {
  const maybeSingle = jest.fn().mockResolvedValue({ data, error: null });
  const limit = jest.fn(() => ({ maybeSingle }));
  const order = jest.fn(() => ({ limit }));
  const eq = jest.fn(() => ({ order }));
  const select = jest.fn(() => ({ eq }));
  return { select };
}

function makeMaybeSingleChain(data: unknown) {
  const maybeSingle = jest.fn().mockResolvedValue({ data, error: null });
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  return { select };
}

function makePlanModuleChain(data: unknown[]) {
  const order = jest.fn().mockResolvedValue({ data, error: null });
  const eq = jest.fn(() => ({ order }));
  const select = jest.fn(() => ({ eq }));
  return { select };
}

function makeModuleChain(data: unknown[], error: unknown = null) {
  const inFn = jest.fn().mockResolvedValue({ data, error });
  const select = jest.fn(() => ({ in: inFn }));
  return { select };
}

function makeEqResolveChain(data: unknown[]) {
  const eq = jest.fn().mockResolvedValue({ data, error: null });
  const select = jest.fn(() => ({ eq }));
  return { select };
}

type MockChain =
  | ReturnType<typeof makeUserPackagesChain>
  | ReturnType<typeof makeMaybeSingleChain>
  | ReturnType<typeof makePlanModuleChain>
  | ReturnType<typeof makeModuleChain>
  | ReturnType<typeof makeEqResolveChain>;

// ── Constants ─────────────────────────────────────────────────────────────────

const PAST_DATE = new Date(Date.now() - 1000 * 60 * 60).toISOString();
const FUTURE_DATE = new Date(
  Date.now() + 1000 * 60 * 60 * 24 * 7
).toISOString();

const mockSession = { user: { id: "test-user-uuid-123" } };

// ── Default mock setup ────────────────────────────────────────────────────────

function defaultMockFrom(overrides: Partial<Record<string, MockChain>> = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "user_packages") {
      return (
        overrides.user_packages ??
        makeUserPackagesChain({
          package_id: 8,
          start_date: PAST_DATE,
        })
      );
    }

    if (table === "plan") {
      return overrides.plan ?? makeMaybeSingleChain({ title: "Sadaf's Plan" });
    }

    if (table === "plan_module") {
      return (
        overrides.plan_module ??
        makePlanModuleChain([
          { module_id: 1, order_index: 1 },
          { module_id: 2, order_index: 2 },
        ])
      );
    }

    if (table === "module") {
      return (
        overrides.module ??
        makeModuleChain([
          { module_id: 1, title: "Session 1" },
          { module_id: 2, title: "Session 2" },
        ])
      );
    }

    if (table === "user_session_unlock") {
      return (
        overrides.user_session_unlock ??
        makeEqResolveChain([
          { module_id: 1, unlock_date: PAST_DATE },
          { module_id: 2, unlock_date: FUTURE_DATE },
        ])
      );
    }

    if (table === "user_session_completion") {
      return overrides.user_session_completion ?? makeEqResolveChain([]);
    }

    return { select: jest.fn() };
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useRoadmap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockUseAuth.mockReturnValue({ session: mockSession, loading: false });
  });

  it("does not fetch if session is missing", async () => {
    mockUseAuth.mockReturnValue({ session: null, loading: false });

    const { result } = renderHook(() => useRoadmap());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it("calls ensure_first_session_unlock rpc on mount", async () => {
    defaultMockFrom();

    renderHook(() => useRoadmap());

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("ensure_first_session_unlock");
    });
  });

  it("returns empty sessions if user has no package assigned", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_packages") return makeUserPackagesChain(null);
      return { select: jest.fn() };
    });

    const { result } = renderHook(() => useRoadmap());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual({
      planName: "Your Plan",
      startDate: null,
      sessions: [],
    });
  });

  it("returns plan name from plan table", async () => {
    defaultMockFrom();

    const { result } = renderHook(() => useRoadmap());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.planName).toBe("Sadaf's Plan");
  });

  it("falls back to 'Your Plan' when plan title fetch fails", async () => {
    defaultMockFrom({
      plan: makeMaybeSingleChain(null),
    });

    const { result } = renderHook(() => useRoadmap());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.planName).toBe("Your Plan");
  });

  it("marks session unlocked when unlock_date is in the past", async () => {
    defaultMockFrom();

    const { result } = renderHook(() => useRoadmap());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.sessions[0].isUnlocked).toBe(true);
  });

  it("marks session locked when unlock_date is in the future", async () => {
    defaultMockFrom();

    const { result } = renderHook(() => useRoadmap());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.sessions[1].isUnlocked).toBe(false);
  });

  it("marks session as completed when completion record exists", async () => {
    defaultMockFrom({
      user_session_completion: makeEqResolveChain([{ module_id: 1 }]),
    });

    const { result } = renderHook(() => useRoadmap());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.sessions[0].isCompleted).toBe(true);
    expect(result.current.data?.sessions[1].isCompleted).toBe(false);
  });

  it("returns error state when module fetch fails", async () => {
    defaultMockFrom({
      module: makeModuleChain([], { message: "DB error" }),
    });

    const { result } = renderHook(() => useRoadmap());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Failed to load sessions.");
  });

  it("returns sessions in order_index order", async () => {
    defaultMockFrom();

    const { result } = renderHook(() => useRoadmap());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const sessions = result.current.data?.sessions ?? [];
    expect(sessions[0].order_index).toBe(1);
    expect(sessions[1].order_index).toBe(2);
  });

  it("uses module title for session name", async () => {
    defaultMockFrom();

    const { result } = renderHook(() => useRoadmap());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.sessions[0].title).toBe("Session 1");
    expect(result.current.data?.sessions[1].title).toBe("Session 2");
  });
});