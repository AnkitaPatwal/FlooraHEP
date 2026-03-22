import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import HomeScreen from "../HomeScreen";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockFrom = jest.fn();

jest.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "test-uuid" } }, error: null }) },
    rpc: () => Promise.resolve({ data: null, error: null }),
  },
}));

const mockSession = {
  user: { id: "auth-uuid-123", email: "keshwa@example.com" },
};
const mockUseAuth = jest.fn(() => ({ session: mockSession, loading: false }));
jest.mock("../../../providers/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../../lib/sessionProgress", () => ({
  getUnlockState: jest.fn().mockResolvedValue([
    { module_id: 1, order_index: 1, title: "week 1 foundations", status: "unlocked" },
  ]),
  getAssignedPlanTitle: jest.fn().mockResolvedValue(""),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

function makeEqMaybeSingleChain<T>(data: T) {
  const maybeSingle = jest.fn().mockResolvedValue({ data, error: null });
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq, maybeSingle }));
  return { select };
}

/** user_packages query uses .eq().not().order().limit(1).maybeSingle() - chain must support that */
function makeUserPackagesChain<T>(data: T) {
  const maybeSingle = jest.fn().mockResolvedValue({ data, error: null });
  const limit = jest.fn(() => ({ maybeSingle }));
  const order = jest.fn(() => ({ limit }));
  const not = jest.fn(() => ({ order }));
  const eq = jest.fn(() => ({ not }));
  const select = jest.fn(() => ({ eq }));
  return { select };
}

function makeUserChain(userData: { user_id: number; fname: string | null }) {
  return makeEqMaybeSingleChain(userData);
}

function makeChain<T>(data: T) {
  const limit = jest.fn().mockResolvedValue({ data, error: null });
  const order = jest.fn(() => ({ limit }));
  const select = jest.fn(() => ({ order }));
  return { select };
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

function mockSupabaseUserWithPackage(opts: { fname?: string } = {}) {
  const fname = opts.fname != null ? opts.fname : "Keshwa";
  mockFrom.mockImplementation((table: string) => {
    if (table === "user") return makeUserChain({ user_id: 56, fname });
    if (table === "user_packages") return makeUserPackagesChain({ package_id: 2 });
    if (table === "plan_module") return makePlanModuleChain([{ module_id: 1, order_index: 1 }]);
    if (table === "module") return makeModuleChain([{ module_id: 1, title: "week 1 foundations" }]);
    if (table === "exercise") return makeChain([]);
    return { select: jest.fn() };
  });
}

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockImplementation(() => ({ session: mockSession, loading: false }));
    (global as any).userEmail = "keshwa@example.com";
    const sessionProgress = require("../../../lib/sessionProgress") as {
      getAssignedPlanTitle: jest.Mock;
      getUnlockState: jest.Mock;
    };
    sessionProgress.getAssignedPlanTitle.mockResolvedValue("");
    sessionProgress.getUnlockState.mockResolvedValue([
      { module_id: 1, order_index: 1, title: "week 1 foundations", status: "unlocked" },
    ]);
  });

  it("queries user_packages with session.user.id (auth UUID)", async () => {
    let capturedUserId: string | null = null;
    const maybeSingle = jest.fn().mockResolvedValue({ data: { package_id: 2 }, error: null });
    const limit = jest.fn(() => ({ maybeSingle }));
    const order = jest.fn(() => ({ limit }));
    const not = jest.fn(() => ({ order }));
    const capturingEq = jest.fn((col: string, val: string) => {
      if (col === "user_id") capturedUserId = val;
      return { not };
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "user") return makeUserChain({ user_id: 56, fname: "Keshwa" });
      if (table === "user_packages") return { select: jest.fn(() => ({ eq: capturingEq })) };
      if (table === "plan_module") return makePlanModuleChain([{ module_id: 1, order_index: 1 }]);
      if (table === "module") return makeModuleChain([{ module_id: 1, title: "week 1 foundations" }]);
      if (table === "exercise") return makeChain([]);
    return { select: jest.fn() };
  });

    render(<HomeScreen />);

    await waitFor(() => {
      expect(capturedUserId).toBe("auth-uuid-123");
    });
  });

  it("renders assigned sessions for user with package", async () => {
    mockSupabaseUserWithPackage();

    const { getByText, queryByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("week 1 foundations")).toBeTruthy();
    });

    expect(getByText("Your Sessions")).toBeTruthy();
    expect(queryByText("No assigned sessions yet.")).toBeNull();
  });

  it("shows first name in greeting when user has fname", async () => {
    mockSupabaseUserWithPackage({ fname: "Sadaf" });

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
      if (table === "plan_module") return makePlanModuleChain([{ module_id: 1 }]);
      if (table === "module") return makeModuleChain([{ module_id: 1, title: "Session 1" }]);
      if (table === "exercise") return makeChain([]);
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
    const not = jest.fn(() => ({ order }));
    mockFrom.mockImplementation((table: string) => {
      if (table === "user") return makeUserChain({ user_id: 57, fname: "Test" });
      if (table === "user_packages") return { select: jest.fn(() => ({ eq: jest.fn(() => ({ not })) })) };
      if (table === "exercise") return makeChain([]);
      return { select: jest.fn() };
    });

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("No assigned sessions yet.")).toBeTruthy();
    });
  });

  it("shows error state when user cannot be loaded", async () => {
    // AuthProvider allows session: null when logged out — mockImplementation needs cast to allow null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseAuth.mockImplementation(() => ({ session: null, loading: false } as any));

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Unable to load user.")).toBeTruthy();
    });
  });

  it("navigates to ExerciseGrid with moduleId when session card is pressed", async () => {
    mockSupabaseUserWithPackage();

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("week 1 foundations")).toBeTruthy();
    });

    fireEvent.press(getByText("week 1 foundations"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/screens/ExerciseGrid",
      params: { moduleId: "1", sessionId: "1", sessionName: "week 1 foundations", planName: "Plan" },
    });
  });

  it("shows progress summary when user has sessions", async () => {
    const { getUnlockState } = require("../../../lib/sessionProgress") as {
      getUnlockState: jest.Mock;
    };
    getUnlockState.mockResolvedValue([
      { module_id: 1, order_index: 1, title: "Session 1", status: "completed" },
      { module_id: 2, order_index: 2, title: "Session 2", status: "unlocked" },
      { module_id: 3, order_index: 3, title: "Session 3", status: "locked" },
    ]);
    mockSupabaseUserWithPackage();

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("1 of 3 sessions complete")).toBeTruthy();
    });
  });

  it("shows plan name above Your Sessions when getAssignedPlanTitle returns a title", async () => {
    const { getAssignedPlanTitle } = require("../../../lib/sessionProgress") as {
      getAssignedPlanTitle: jest.Mock;
    };
    getAssignedPlanTitle.mockResolvedValue("Sadaf's Plan");
    mockSupabaseUserWithPackage();

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Sadaf's Plan")).toBeTruthy();
    });
    expect(getByText("Your Sessions")).toBeTruthy();
  });
});
