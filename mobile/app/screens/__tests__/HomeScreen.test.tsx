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

jest.mock("../../../lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const mockFetchExercises = jest.fn();
jest.mock("../../../lib/api", () => ({
  fetchExercises: (...args: unknown[]) => mockFetchExercises(...args),
}));

jest.mock("expo-av", () => ({
  Video: "Video",
  ResizeMode: { COVER: "cover" },
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
    if (table === "user_packages") return makeEqMaybeSingleChain({ package_id: 2 });
    if (table === "plan_module") return makePlanModuleChain([{ module_id: 1, order_index: 1 }]);
    if (table === "module") return makeModuleChain([{ module_id: 1, title: "week 1 foundations" }]);
    if (table === "exercise") return makeChain([]);
    return { select: jest.fn() };
  });
}

function mockSupabaseExerciseFallback(exercises: Array<{
  exercise_id: number;
  title: string;
  body_part?: string | null;
  default_sets?: number | null;
  default_reps?: number | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
}>) {
  mockSupabaseUserWithPackage();
  mockFrom.mockImplementation((table: string) => {
    if (table === "exercise") return makeChain(exercises);
    if (table === "user") return makeUserChain({ user_id: 56, fname: "Keshwa" });
    if (table === "user_packages") return makeEqMaybeSingleChain({ package_id: 2 });
    if (table === "plan_module") return makePlanModuleChain([{ module_id: 1, order_index: 1 }]);
    if (table === "module") return makeModuleChain([{ module_id: 1, title: "week 1 foundations" }]);
    return { select: jest.fn() };
  });
}

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).userEmail = "keshwa@example.com";
    mockFetchExercises.mockResolvedValue([]);
  });

  it("renders assigned current session for user with package", async () => {
    mockSupabaseUserWithPackage();
    mockSupabaseExerciseFallback([]);

    const { getByText, queryByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("week 1 foundations")).toBeTruthy();
    });

    expect(getByText("Your Current Session")).toBeTruthy();
    expect(queryByText("No assigned sessions yet.")).toBeNull();
    expect(queryByText("No previous sessions.")).toBeNull();
  });

  it("shows first name in greeting when user has fname", async () => {
    mockSupabaseUserWithPackage({ fname: "Sadaf" });
    mockFetchExercises.mockResolvedValue([]);

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Hi Sadaf!")).toBeTruthy();
    });
    expect(getByText("Floora")).toBeTruthy();
  });

  it("shows Hi there! when user has no fname", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "user") return makeUserChain({ user_id: 56, fname: null });
      if (table === "user_packages") return makeEqMaybeSingleChain({ package_id: 2 });
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
    mockFrom.mockImplementation((table: string) => {
      if (table === "user") return makeUserChain({ user_id: 57, fname: "Test" });
      if (table === "user_packages") return { select: jest.fn(() => ({ eq: jest.fn(() => ({ maybeSingle: maybeSingleNull })) })) };
      if (table === "exercise") return makeChain([]);
      return { select: jest.fn() };
    });

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("No assigned sessions yet.")).toBeTruthy();
    });
  });

  it("shows error state when user cannot be loaded", async () => {
    const maybeSingleError = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "User lookup failed" },
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "user") return { select: jest.fn(() => ({ eq: jest.fn(() => ({ maybeSingle: maybeSingleError })) })) };
      if (table === "exercise") return makeChain([]);
      return { select: jest.fn() };
    });

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Unable to load user.")).toBeTruthy();
    });
  });

  it("displays exercises from API when fetchExercises returns data", async () => {
    mockSupabaseUserWithPackage();
    mockFetchExercises.mockResolvedValue([
      {
        exercise_id: 19,
        title: "Pelvic tilt",
        body_part: "Core",
        default_sets: 3,
        default_reps: 10,
        thumbnail_url: null,
        video_url: "https://example.com/video.mp4",
      },
    ]);

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Pelvic tilt")).toBeTruthy();
    });
    expect(getByText(/Core · 3 sets · 10 reps/)).toBeTruthy();
  });

  it("falls back to Supabase exercise table when API returns empty", async () => {
    mockSupabaseUserWithPackage();
    mockFetchExercises.mockResolvedValue([]);
    mockSupabaseExerciseFallback([
      {
        exercise_id: 25,
        title: "Squat",
        body_part: "Lower Body",
        default_sets: 3,
        default_reps: 3,
        video_url: "https://storage.example.com/squat.mp4",
        thumbnail_url: null,
      },
    ]);

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Squat")).toBeTruthy();
    });
    expect(getByText(/Lower Body · 3 sets · 3 reps/)).toBeTruthy();
  });

  it("shows No exercises yet when API and Supabase return empty", async () => {
    mockSupabaseUserWithPackage();
    mockFetchExercises.mockResolvedValue([]);
    mockSupabaseExerciseFallback([]);

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Exercises")).toBeTruthy();
    });
    expect(getByText("No exercises yet. Add some from the admin site.")).toBeTruthy();
  });

  it("navigates to ExerciseDetail with fromApi when exercise card is pressed", async () => {
    mockSupabaseUserWithPackage();
    mockFetchExercises.mockResolvedValue([
      {
        exercise_id: 19,
        title: "Pelvic tilt",
        body_part: "Core",
        default_sets: 3,
        default_reps: 10,
        thumbnail_url: null,
        video_url: null,
      },
    ]);

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Pelvic tilt")).toBeTruthy();
    });

    fireEvent.press(getByText("Pelvic tilt"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/screens/ExerciseDetail",
      params: {
        id: "19",
        sessionName: "Core",
        fromApi: "1",
      },
    });
  });

  it("uses Exercise as sessionName when body_part is missing", async () => {
    mockSupabaseUserWithPackage();
    mockFetchExercises.mockResolvedValue([
      {
        exercise_id: 99,
        title: "Unknown",
        body_part: null,
        default_sets: null,
        default_reps: null,
        thumbnail_url: null,
        video_url: null,
      },
    ]);

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Unknown")).toBeTruthy();
    });

    fireEvent.press(getByText("Unknown"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/screens/ExerciseDetail",
      params: {
        id: "99",
        sessionName: "Exercise",
        fromApi: "1",
      },
    });
  });
});
