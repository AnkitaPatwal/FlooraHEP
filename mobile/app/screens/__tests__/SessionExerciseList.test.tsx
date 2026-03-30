import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import { getMaxCompletedExercisePosition } from "../../../lib/sessionExerciseProgress";
import SessionExerciseList from "../SessionExerciseList";

const mockPush = jest.fn();
const mockBack = jest.fn();

/** Mutable route params for each test */
const routeParams: Record<string, string | undefined> = {
  sessionId: "1",
  sessionName: "Test Module",
  planName: "Leakage",
  subtitle: "Restore",
};

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
  useLocalSearchParams: () => routeParams,
  Stack: { Screen: () => null },
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
const mockRpc = jest.fn(() => Promise.resolve({ data: null, error: null }));
const mockGetPublicUrl = jest.fn(() => ({ data: { publicUrl: "https://storage.test/public.mp4" } }));

jest.mock("../../../providers/AuthProvider", () => ({
  useAuth: () => ({ session: { user: { id: "auth-uuid-test" } } }),
}));

jest.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    storage: {
      from: () => ({ getPublicUrl: mockGetPublicUrl }),
    },
  },
}));

const mockFetchByModule = jest.fn();
const mockIsApiConfigured = jest.fn(() => false);

jest.mock("../../../lib/exerciseApi", () => ({
  fetchExerciseListByModule: (...args: unknown[]) => mockFetchByModule(...args),
  isExerciseApiConfigured: () => mockIsApiConfigured(),
}));

jest.mock("../../../lib/sessionExerciseProgress", () => ({
  getMaxCompletedExercisePosition: jest.fn(),
  isExercisePositionUnlocked: (max: number, pos: number) => pos <= max + 1,
  recordExerciseWatchedToEnd: jest.fn(() => Promise.resolve()),
}));

function makeModuleExerciseChain(rows: Array<{ exercise_id: number; order_index: number }>) {
  const order = jest.fn().mockResolvedValue({ data: rows, error: null });
  const eq = jest.fn(() => ({ order }));
  const select = jest.fn(() => ({ eq }));
  return { select };
}

function makeCompletionLookupChain(row: { module_id: number } | null) {
  const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
  const eqModule = jest.fn(() => ({ maybeSingle }));
  const eqUser = jest.fn(() => ({ eq: eqModule }));
  const select = jest.fn(() => ({ eq: eqUser }));
  return { select };
}

function makeExerciseInChain(
  rows: Array<{
    exercise_id: number;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    video_url: string | null;
    video: { bucket: string; object_key: string } | null;
  }>
) {
  const order = jest.fn().mockResolvedValue({ data: rows, error: null });
  const inFn = jest.fn(() => ({ order }));
  const select = jest.fn(() => ({ in: inFn }));
  return { select };
}

describe("SessionExerciseList (ATH-428)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getMaxCompletedExercisePosition).mockResolvedValue(0);
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockIsApiConfigured.mockReturnValue(false);
    mockFetchByModule.mockResolvedValue([]);
    routeParams.sessionId = "1";
    routeParams.sessionName = "Test Module";
    routeParams.planName = "Leakage";
    routeParams.subtitle = "Restore";
    mockFrom.mockImplementation((table: string) => {
      if (table === "module_exercise") {
        return makeModuleExerciseChain([{ exercise_id: 10, order_index: 1 }]);
      }
      if (table === "exercise") {
        return makeExerciseInChain([
          {
            exercise_id: 10,
            title: "Squats",
            description: "Leg work",
            thumbnail_url: null,
            video_url: "https://example.com/squats.mp4",
            video: null,
          },
        ]);
      }
      if (table === "user_session_completion") {
        return makeCompletionLookupChain(null);
      }
      return { select: jest.fn() };
    });
  });

  it("shows Session not found when sessionId is missing", async () => {
    routeParams.sessionId = undefined;
    const { getByText, queryByText } = render(<SessionExerciseList />);
    await waitFor(() => {
      expect(getByText("Session not found")).toBeTruthy();
    });
    expect(queryByText("Loading exercises…")).toBeNull();
  });

  it("shows Session not found when sessionId is invalid", async () => {
    routeParams.sessionId = "0";
    const { getByText } = render(<SessionExerciseList />);
    await waitFor(() => {
      expect(getByText("Session not found")).toBeTruthy();
    });
  });

  it("renders session name and default subtitle in header", async () => {
    routeParams.sessionName = "Week 1";
    delete routeParams.subtitle;
    const { getByText } = render(<SessionExerciseList />);
    await waitFor(() => {
      expect(getByText("Week 1")).toBeTruthy();
    });
    expect(getByText("Restore")).toBeTruthy();
  });

  it("shows loading then exercises from Supabase (module_exercise + exercise)", async () => {
    const { getByText, queryByText } = render(<SessionExerciseList />);
    expect(getByText("Loading exercises…")).toBeTruthy();
    await waitFor(() => {
      expect(getByText("Squats")).toBeTruthy();
    });
    expect(queryByText("Loading exercises…")).toBeNull();
    expect(getByText("Leg work")).toBeTruthy();
  });

  it("loads exercises from API when configured and API returns rows", async () => {
    mockIsApiConfigured.mockReturnValue(true);
    mockFetchByModule.mockResolvedValue([
      {
        exercise_id: 20,
        title: "Lunge",
        description: "Balance",
        video_url: "https://api.example/lunge.mp4",
      },
    ]);
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_session_completion") {
        return makeCompletionLookupChain(null);
      }
      return { select: jest.fn() };
    });

    const { getByText } = render(<SessionExerciseList />);
    await waitFor(() => {
      expect(getByText("Lunge")).toBeTruthy();
    });
    expect(mockFetchByModule).toHaveBeenCalledWith(1);
    expect(getByText("Balance")).toBeTruthy();
  });

  it("shows empty state when module has no exercises", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "module_exercise") return makeModuleExerciseChain([]);
      if (table === "user_session_completion") {
        return makeCompletionLookupChain(null);
      }
      return { select: jest.fn() };
    });

    const { getByText } = render(<SessionExerciseList />);
    await waitFor(() => {
      expect(getByText("No exercises in this session")).toBeTruthy();
    });
    expect(getByText(/Ask your admin/)).toBeTruthy();
  });

  it("navigates to ExerciseDetail with id, sessionName, and progress params", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "module_exercise") {
        return makeModuleExerciseChain([
          { exercise_id: 10, order_index: 1 },
          { exercise_id: 11, order_index: 2 },
        ]);
      }
      if (table === "exercise") {
        return makeExerciseInChain([
          {
            exercise_id: 10,
            title: "First",
            description: null,
            thumbnail_url: null,
            video_url: "https://v.example/a.mp4",
            video: null,
          },
          {
            exercise_id: 11,
            title: "Second",
            description: null,
            thumbnail_url: null,
            video_url: null,
            video: null,
          },
        ]);
      }
      if (table === "user_session_completion") {
        return makeCompletionLookupChain(null);
      }
      return { select: jest.fn() };
    });

    const { getByText } = render(<SessionExerciseList />);
    await waitFor(() => {
      expect(getByText("First")).toBeTruthy();
    });

    fireEvent.press(getByText("First"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/screens/ExerciseDetail",
      params: {
        id: "10",
        moduleId: "1",
        sessionId: "1",
        sessionName: "Test Module",
        planName: "Leakage",
        exercisePosition: "1",
        sessionExerciseTotal: "2",
        exerciseTitle: "First",
        exerciseDescription: "",
        sessionCompleted: "0",
        videoUrl: "https://v.example/a.mp4",
      },
    });
  });

  it("second exercise gets position 2 of total", async () => {
    jest.mocked(getMaxCompletedExercisePosition).mockResolvedValue(1);
    mockIsApiConfigured.mockReturnValue(true);
    mockFetchByModule.mockResolvedValue([
      { exercise_id: 1, title: "A", description: "", video_url: null },
      { exercise_id: 2, title: "B", description: "", video_url: null },
    ]);
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_session_completion") {
        return makeCompletionLookupChain(null);
      }
      return { select: jest.fn() };
    });

    const { getByText } = render(<SessionExerciseList />);
    await waitFor(() => {
      expect(getByText("B")).toBeTruthy();
    });

    fireEvent.press(getByText("B"));

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          id: "2",
          exercisePosition: "2",
          sessionExerciseTotal: "2",
        }),
      })
    );
  });

});
