import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import HomeScreen from "../HomeScreen";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useFocusEffect: (cb: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanup = cb();
        return typeof cleanup === "function" ? cleanup : undefined;
      }, []);
    },
  };
});

const mockFrom = jest.fn();
const mockRpc = jest.fn(
  (_fnName?: string, _params?: Record<string, unknown>) =>
    Promise.resolve({ data: null, error: null })
);

jest.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (fnName: string, params?: Record<string, unknown>) =>
      params === undefined ? mockRpc(fnName) : mockRpc(fnName, params),
  },
}));

const mockSession = {
  user: { id: "auth-uuid-123", email: "keshwa@example.com" },
};

type MockAuthReturn = {
  session: typeof mockSession | null;
  loading: boolean;
};

const mockUseAuth = jest.fn((): MockAuthReturn => ({ session: mockSession, loading: false }));
jest.mock("../../../providers/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../../lib/exerciseApi", () => ({
  fetchExerciseListByModule: jest.fn(),
  isExerciseApiConfigured: () => false,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

function makeEqMaybeSingleChain<T>(data: T) {
  const maybeSingle = jest.fn().mockResolvedValue({ data, error: null });
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  return { select };
}

function makeUserPackagesChain<T>(data: T) {
  const maybeSingle = jest.fn().mockResolvedValue({ data, error: null });
  const limit = jest.fn(() => ({ maybeSingle }));
  const order = jest.fn(() => ({ limit }));
  const eq = jest.fn(() => ({ order }));
  const select = jest.fn(() => ({ eq }));
  return { select };
}

function makeUserChain(userData: { user_id: number; fname: string | null }) {
  return makeEqMaybeSingleChain(userData);
}

function makePlanModuleChain(data: unknown[]) {
  const order = jest.fn().mockResolvedValue({ data, error: null });
  const eq = jest.fn(() => ({ order }));
  const select = jest.fn(() => ({ eq }));
  return { select };
}

function makeModuleChain(data: unknown[]) {
  const order = jest.fn().mockResolvedValue({ data, error: null });
  const inFn = jest.fn(() => ({ order }));
  const select = jest.fn(() => ({ in: inFn }));
  return { select };
}

function makeModuleExerciseChain(
  rows: Array<{ module_id: number; exercise_id: number }>
) {
  const inFn = jest.fn().mockResolvedValue({ data: rows, error: null });
  const select = jest.fn(() => ({ in: inFn }));
  return { select };
}

/** select → eq → in (Promise), for user_session_unlock / user_session_completion */
function makeEqInSelectChain(rows: unknown[]) {
  const inFn = jest.fn().mockResolvedValue({ data: rows, error: null });
  const eq = jest.fn(() => ({ in: inFn }));
  const select = jest.fn(() => ({ eq }));
  return { select };
}

function defaultMockFrom(opts: { fname?: string; moduleExerciseRows?: Array<{ module_id: number; exercise_id: number }> } = {}) {
  const fname = opts.fname != null ? opts.fname : "Keshwa";
  const meRows = opts.moduleExerciseRows ?? [
    { module_id: 1, exercise_id: 10 },
    { module_id: 1, exercise_id: 11 },
  ];
  mockFrom.mockImplementation((table: string) => {
    if (table === "user") return makeUserChain({ user_id: 56, fname });
    if (table === "user_packages") return makeUserPackagesChain({ package_id: 2 });
    if (table === "plan_module") return makePlanModuleChain([{ module_id: 1, order_index: 1 }]);
    if (table === "module") return makeModuleChain([{ module_id: 1, title: "week 1 foundations" }]);
    if (table === "module_exercise") return makeModuleExerciseChain(meRows);
    if (table === "user_session_unlock") {
      return makeEqInSelectChain([{ module_id: 1, unlock_date: "2000-01-01T00:00:00.000Z" }]);
    }
    if (table === "user_session_completion") {
      return makeEqInSelectChain([]);
    }
    return { select: jest.fn() };
  });
}

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockUseAuth.mockImplementation(() => ({ session: mockSession, loading: false }));
    (global as any).userEmail = "keshwa@example.com";
    defaultMockFrom();
  });

  it("fetches user_packages when user is signed in", async () => {
    defaultMockFrom();
    const { findByText } = render(<HomeScreen />);
    // Wait for loaded UI so the full Supabase chain (user → user_packages → …) has finished.
    await findByText("week 1 foundations");
    expect(mockFrom.mock.calls.map((c) => c[0])).toContain("user_packages");
    expect(mockRpc).toHaveBeenCalledWith("ensure_first_session_unlock");
    expect(mockRpc).toHaveBeenCalledWith("get_current_assigned_sessions");
  });

  it("renders assigned sessions section and exercise count from module_exercise", async () => {
    defaultMockFrom({ moduleExerciseRows: [{ module_id: 1, exercise_id: 1 }, { module_id: 1, exercise_id: 2 }, { module_id: 1, exercise_id: 3 }] });

    const { getByText, queryByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("week 1 foundations")).toBeTruthy();
    });

    expect(getByText("Your Assigned Sessions")).toBeTruthy();
    expect(getByText(/3 Exercises/)).toBeTruthy();
    expect(queryByText("No assigned sessions yet.")).toBeNull();
    expect(mockRpc).toHaveBeenCalledWith("get_current_assigned_sessions");
  });

  it("prefers merged exercise count from get_current_assigned_session_exercises rpc", async () => {
    mockRpc.mockImplementation((fnName: string, params?: Record<string, unknown>) => {
      if (fnName === "get_current_assigned_sessions") {
        return Promise.resolve({ data: [{ module_id: 1, order_index: 1, title: "week 1 foundations" }], error: null });
      }
      if (fnName === "get_current_assigned_session_exercises") {
        expect(params).toEqual({ p_module_id: 1 });
        return Promise.resolve({ data: [{ exercise_id: 1 }, { exercise_id: 2 }], error: null });
      }
      if (fnName === "ensure_first_session_unlock") return Promise.resolve({ data: null, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    // Ensure module_exercise fallback would have been different if used.
    defaultMockFrom({ moduleExerciseRows: [{ module_id: 1, exercise_id: 1 }, { module_id: 1, exercise_id: 2 }, { module_id: 1, exercise_id: 3 }] });

    const { getByText } = render(<HomeScreen />);
    await waitFor(() => {
      expect(getByText("week 1 foundations")).toBeTruthy();
    });
    expect(getByText(/2 Exercises/)).toBeTruthy();
  });

  it("shows first name in greeting when user has fname", async () => {
    defaultMockFrom({ fname: "Sadaf" });

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Hi Sadaf!")).toBeTruthy();
    });
    expect(getByText("Floora")).toBeTruthy();
  });

  it("shows Hi there! when user has no fname", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "user") return makeUserChain({ user_id: 56, fname: null });
      if (table === "user_packages") return makeUserPackagesChain({ package_id: 2 });
      if (table === "plan_module") return makePlanModuleChain([{ module_id: 1, order_index: 1 }]);
      if (table === "module") return makeModuleChain([{ module_id: 1, title: "Session 1" }]);
      if (table === "module_exercise") return makeModuleExerciseChain([]);
      if (table === "user_session_unlock") {
        return makeEqInSelectChain([{ module_id: 1, unlock_date: "2000-01-01T00:00:00.000Z" }]);
      }
      if (table === "user_session_completion") {
        return makeEqInSelectChain([]);
      }
      return { select: jest.fn() };
    });

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Hi there!")).toBeTruthy();
    });
  });

  it("shows empty state when no package is assigned", async () => {
    const maybeSingleNull = jest.fn().mockResolvedValue({ data: null, error: null });
    const limit = jest.fn(() => ({ maybeSingle: maybeSingleNull }));
    const order = jest.fn(() => ({ limit }));
    mockFrom.mockImplementation((table: string) => {
      if (table === "user") return makeUserChain({ user_id: 57, fname: "Test" });
      if (table === "user_packages") return { select: jest.fn(() => ({ eq: jest.fn(() => ({ order })) })) };
      return { select: jest.fn() };
    });

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("No assigned sessions yet.")).toBeTruthy();
    });
  });

  it("shows error state when user cannot be loaded", async () => {
    mockUseAuth.mockImplementation(() => ({ session: null, loading: false }));

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Unable to load user.")).toBeTruthy();
    });
  });

  it("navigates to SessionExerciseList when a session card is pressed", async () => {
    defaultMockFrom();

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("week 1 foundations")).toBeTruthy();
    });

    fireEvent.press(getByText("week 1 foundations"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/screens/SessionExerciseList",
      params: { sessionId: "1", sessionName: "week 1 foundations" },
    });
  });
});