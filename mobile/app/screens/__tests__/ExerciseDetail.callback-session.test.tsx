/**
 * Integration-style tests for ATH-429: exercise video playToEnd callback,
 * sequential unlock (client progress), complete_user_session on last exercise,
 * and route-param fallback when the exercise API is unavailable.
 */
import React from "react";
import { render, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import ExerciseDetail from "../ExerciseDetail";
import {
  getMaxCompletedExercisePosition,
  recordExerciseWatchedToEnd,
} from "../../../lib/sessionExerciseProgress";

let lastPlayToEnd: (() => void | Promise<void>) | undefined;

jest.mock("expo", () => ({
  useEventListener: (_player: unknown, event: string, handler: unknown) => {
    if (event === "playToEnd") lastPlayToEnd = handler as () => void | Promise<void>;
  },
}));

jest.mock("expo-video", () => {
  const { View } = require("react-native");
  return {
    useVideoPlayer: jest.fn(() => ({})),
    VideoView: () => <View testID="mock-expo-video-view" />,
  };
});

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn(() => true);

const routeParams: Record<string, string | undefined> = {
  id: "999",
  sessionName: "Session A",
  moduleId: "1",
  sessionId: "1",
  exercisePosition: "1",
  sessionExerciseTotal: "2",
  exerciseTitle: "From Route",
  exerciseDescription: "Route description",
  videoUrl: "https://example.com/session-video.mp4",
  sessionCompleted: "0",
};

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: mockCanGoBack,
  }),
  useLocalSearchParams: () => routeParams,
  Stack: { Screen: () => null },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

let mockSession: { user: { id: string } } | null = { user: { id: "user-1" } };

jest.mock("../../../providers/AuthProvider", () => ({
  useAuth: () => ({ session: mockSession }),
}));

const mockRpc = jest.fn(
  (_fnName?: string, _params?: Record<string, unknown>) =>
    Promise.resolve({ data: null, error: null })
);

jest.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    rpc: (fnName: string, params?: Record<string, unknown>) =>
      params === undefined ? mockRpc(fnName) : mockRpc(fnName, params),
  },
}));

jest.mock("../../../lib/sessionExerciseProgress", () => ({
  getMaxCompletedExercisePosition: jest.fn(),
  recordExerciseWatchedToEnd: jest.fn(() => Promise.resolve()),
}));

const mockFetchById = jest.fn();
const mockIsApiConfigured = jest.fn(() => false);

jest.mock("../../../lib/exerciseApi", () => ({
  fetchExerciseById: (exerciseId: string) => mockFetchById(exerciseId),
  isExerciseApiConfigured: () => mockIsApiConfigured(),
}));

describe("ExerciseDetail — callback, sequential unlock, session completion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastPlayToEnd = undefined;
    mockSession = { user: { id: "user-1" } };
    mockIsApiConfigured.mockReturnValue(false);
    mockRpc.mockResolvedValue({ data: null, error: null });
    jest.mocked(getMaxCompletedExercisePosition).mockResolvedValue(0);
    jest.mocked(recordExerciseWatchedToEnd).mockResolvedValue(undefined);

    routeParams.id = "999";
    routeParams.sessionName = "Session A";
    routeParams.moduleId = "1";
    routeParams.sessionId = "1";
    routeParams.exercisePosition = "1";
    routeParams.sessionExerciseTotal = "2";
    routeParams.exerciseTitle = "From Route";
    routeParams.exerciseDescription = "Route description";
    routeParams.videoUrl = "https://example.com/session-video.mp4";
    routeParams.sessionCompleted = "0";
  });

  it("renders title from route params when API is off and id is not in the local catalog", async () => {
    const { getByText } = render(<ExerciseDetail />);
    await waitFor(() => {
      expect(getByText("From Route")).toBeTruthy();
    });
    await waitFor(() => {
      expect(lastPlayToEnd).toBeDefined();
    });
  });

  it("blocks exercise 2 when exercise 1 has not been completed yet", async () => {
    jest.mocked(getMaxCompletedExercisePosition).mockResolvedValue(0);
    routeParams.exercisePosition = "2";

    const { getByText } = render(<ExerciseDetail />);
    await waitFor(() => {
      expect(getByText("This exercise is locked.")).toBeTruthy();
    });
    expect(lastPlayToEnd).toBeUndefined();
  });

  it("on playToEnd, records progress for the current exercise (not last in session)", async () => {
    const { getByText } = render(<ExerciseDetail />);
    await waitFor(() => {
      expect(getByText("From Route")).toBeTruthy();
    });
    await waitFor(() => expect(lastPlayToEnd).toBeDefined());

    await act(async () => {
      await lastPlayToEnd!();
    });

    await waitFor(() => {
      expect(recordExerciseWatchedToEnd).toHaveBeenCalledWith("user-1", 1, 1);
    });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("on playToEnd for the last exercise, records progress and calls complete_user_session", async () => {
    jest.mocked(getMaxCompletedExercisePosition).mockResolvedValue(1);
    routeParams.exercisePosition = "2";

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByText } = render(<ExerciseDetail />);
    await waitFor(() => {
      expect(getByText("From Route")).toBeTruthy();
    });
    await waitFor(() => expect(lastPlayToEnd).toBeDefined());

    await act(async () => {
      await lastPlayToEnd!();
    });

    await waitFor(() => {
      expect(recordExerciseWatchedToEnd).toHaveBeenCalledWith("user-1", 1, 2);
      expect(mockRpc).toHaveBeenCalledWith("complete_user_session", { p_module_id: 1 });
    });
    expect(alertSpy).toHaveBeenCalledWith(
      "Session complete",
      "The next session will unlock in 7 days."
    );
    alertSpy.mockRestore();
  });

  it("when session is already completed (review), playToEnd does not record or complete again", async () => {
    routeParams.sessionCompleted = "1";
    jest.mocked(getMaxCompletedExercisePosition).mockResolvedValue(1);
    routeParams.exercisePosition = "2";

    const { getByText } = render(<ExerciseDetail />);
    await waitFor(() => {
      expect(getByText("From Route")).toBeTruthy();
    });
    await waitFor(() => expect(lastPlayToEnd).toBeDefined());

    await act(async () => {
      await lastPlayToEnd!();
    });

    expect(recordExerciseWatchedToEnd).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("shows locked alert and offers back when accessing out-of-order (max completed check)", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    jest.mocked(getMaxCompletedExercisePosition).mockResolvedValue(0);
    routeParams.exercisePosition = "2";

    render(<ExerciseDetail />);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Locked",
        "Complete the previous exercise in this session first.",
        expect.any(Array)
      );
    });
    alertSpy.mockRestore();
  });

  it("without module id, does not call complete_user_session even on last exercise", async () => {
    routeParams.moduleId = undefined;
    routeParams.sessionId = undefined;
    routeParams.sessionExerciseTotal = "1";
    routeParams.exercisePosition = "1";

    const { getByText } = render(<ExerciseDetail />);
    await waitFor(() => expect(lastPlayToEnd).toBeDefined());
    await waitFor(() => {
      expect(getByText("From Route")).toBeTruthy();
    });

    await act(async () => {
      await lastPlayToEnd!();
    });

    expect(mockRpc).not.toHaveBeenCalled();
  });
});
