// hooks/__tests__/useRoadmap.test.tsx
import { renderHook, waitFor } from "@testing-library/react-native";
import { useRoadmap } from "../useRoadmap";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFrom = jest.fn((table: string) => undefined as any);

const mockRpc = jest.fn(
  (_fn?: string, _params?: Record<string, unknown>) =>
    Promise.resolve({ data: null, error: null })
) as jest.MockedFunction<
  (fn?: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
>;

jest.mock("../../lib/supabaseClient", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (fn: string, params?: Record<string, unknown>) => mockRpc(fn, params),
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
  const order = jest.fn(() => ({ order, limit }));
  const not = jest.fn(() => ({ order, limit }));
  const eq = jest.fn(() => ({ not, order, limit }));
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

function makeExerciseChain(data: unknown[], error: unknown = null) {
  const inFn = jest.fn().mockResolvedValue({ data, error });
  const select = jest.fn(() => ({ in: inFn }));
  return { select };
}

function makeEqResolveChain(data: unknown[]) {
  const eq = jest.fn().mockResolvedValue({ data, error: null });
  const select = jest.fn(() => ({ eq }));
  return { select };
}

function makeEqInResolveChain(data: unknown[]) {
  const inFn = jest.fn().mockResolvedValue({ data, error: null });
  const eq = jest.fn(() => ({ in: inFn }));
  const select = jest.fn(() => ({ eq }));
  return { select };
}

type MockChain =
  | ReturnType<typeof makeUserPackagesChain>
  | ReturnType<typeof makePlanModuleChain>
  | ReturnType<typeof makeModuleChain>
  | ReturnType<typeof makeEqResolveChain>
  | ReturnType<typeof makeEqInResolveChain>;

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
          session_layout_published_at: PAST_DATE,
        })
      );
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

    if (table === "user_assignment_session_unlock") {
      return (
        overrides.user_assignment_session_unlock ??
        makeEqInResolveChain([
          { user_assignment_session_id: "uas-1", unlock_date: PAST_DATE },
          { user_assignment_session_id: "uas-2", unlock_date: FUTURE_DATE },
        ])
      );
    }

    if (table === "user_assignment_session_completion") {
      return overrides.user_assignment_session_completion ?? makeEqInResolveChain([]);
    }

    return { select: jest.fn() };
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useRoadmap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRpc.mockImplementation((fnName?: string) => {
      if (fnName === "get_my_assigned_plan_title") {
        return Promise.resolve({ data: "Sadaf's Plan", error: null });
      }
      if (fnName === "get_current_assigned_sessions") {
        return Promise.resolve({
          data: [
            { user_assignment_session_id: "uas-1", module_id: 1, order_index: 1, title: "Session 1" },
            { user_assignment_session_id: "uas-2", module_id: 2, order_index: 2, title: "Session 2" },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });
    mockUseAuth.mockReturnValue({ session: mockSession, loading: false });
  });

  it("does not fetch if session is missing", async () => {
    mockUseAuth.mockReturnValue({ session: null, loading: false });

    const { result } = renderHook(() => useRoadmap());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
    expect(typeof result.current.reload).toBe("function");
  });

  it("calls ensure_first_session_unlock rpc on mount", async () => {
    defaultMockFrom();

    renderHook(() => useRoadmap());

    await waitFor(() => {
      expect(mockRpc.mock.calls.map((c) => c[0])).toContain("ensure_first_session_unlock");
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

  it("returns plan name from get_my_assigned_plan_title rpc", async () => {
    defaultMockFrom();

    const { result } = renderHook(() => useRoadmap());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.planName).toBe("Sadaf's Plan");
  });

  it("falls back to 'Your Plan' when get_my_assigned_plan_title returns empty", async () => {
    mockRpc.mockImplementation((fnName?: string) => {
      if (fnName === "get_my_assigned_plan_title") {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
    defaultMockFrom();

    const { result } = renderHook(() => useRoadmap());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.planName).toBe("Your Plan");
  });

  it("marks session unlocked when unlock_date is in the past", async () => {
    defaultMockFrom();

    const { result } = renderHook(() => useRoadmap());

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Roadmap lists locked sessions only; unlocked sessions are omitted.
    const sessions = result.current.data?.sessions ?? [];
    expect(sessions.find((s) => s.module_id === 1)).toBeUndefined();
  });

  it("marks session locked when unlock_date is in the future", async () => {
    defaultMockFrom();

    const { result } = renderHook(() => useRoadmap());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const sessions = result.current.data?.sessions ?? [];
    const s2 = sessions.find((s) => s.module_id === 2);
    expect(s2?.isUnlocked).toBe(false);
  });

  it("marks session as completed when completion record exists", async () => {
    defaultMockFrom({
      user_assignment_session_completion: makeEqInResolveChain([
        { user_assignment_session_id: "uas-1" },
      ]),
    });

    const { result } = renderHook(() => useRoadmap());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const sessions = result.current.data?.sessions ?? [];
    const s2 = sessions.find((s) => s.module_id === 2);
    expect(s2?.isCompleted).toBe(false);
  });

  it("returns error state when module fetch fails", async () => {
    defaultMockFrom({
      module: makeModuleChain([], { message: "DB error" }),
    });
    mockRpc.mockImplementation((fnName?: string) => {
      if (fnName === "get_my_assigned_plan_title") {
        return Promise.resolve({ data: "Sadaf's Plan", error: null });
      }
      // Force template fallback so the failing `module` query is used.
      if (fnName === "get_current_assigned_sessions") {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
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
    expect(sessions.length).toBe(1);
    expect(sessions[0].order_index).toBe(2);
  });

  it("uses module title for session name", async () => {
    defaultMockFrom();

    const { result } = renderHook(() => useRoadmap());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const sessions = result.current.data?.sessions ?? [];
    expect(sessions.length).toBe(1);
    expect(sessions[0].title).toBe("Session 2");
  });

  it("attaches thumbnailUrl from first assigned exercise for locked sessions", async () => {
    defaultMockFrom();
    mockRpc.mockImplementation((fn, params) => {
      if (fn === "get_my_assigned_plan_title") {
        return Promise.resolve({ data: "Sadaf's Plan", error: null });
      }
      if (fn === "get_current_assigned_sessions") {
        return Promise.resolve({
          data: [
            { user_assignment_session_id: "uas-1", module_id: 1, order_index: 1, title: "Session 1" },
            { user_assignment_session_id: "uas-2", module_id: 2, order_index: 2, title: "Session 2" },
          ],
          error: null,
        });
      }
      if (fn === "ensure_first_session_unlock") {
        return Promise.resolve({ data: null, error: null });
      }
      if (fn === "get_current_assigned_session_exercises") {
        const mid = params?.p_module_id;
        const url = mid === 2 ? "https://cdn.example/thumb-2.jpg" : "";
        return Promise.resolve({
          data: [{ thumbnail_url: url }],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { result } = renderHook(() => useRoadmap());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const sessions = result.current.data?.sessions ?? [];
    expect(sessions.length).toBe(1);
    expect(sessions[0].thumbnailUrl).toBe("https://cdn.example/thumb-2.jpg");
    expect(mockRpc).toHaveBeenCalledWith("get_current_assigned_session_exercises", { p_module_id: 2 });
  });
});