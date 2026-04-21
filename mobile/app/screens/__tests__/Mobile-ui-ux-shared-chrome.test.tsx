/**
 * Mobile app UI/UX — shared design tokens, session card chrome, navigation control, and plan title RPC.
 * (Branch context: ATH-441 / feat/ATH-441-app-ui-and-ux-fixes.)
 *
 * Covers:
 * - Poppins-linked FlooraFonts and sessionCardChrome (Home, session list, exercise detail)
 * - CircularBackButton
 * - fetchAssignedPlanTitleForCurrentUser → get_my_assigned_plan_title
 *
 * Home duplicate `module_id` list keys: see `HomeScreen.test.tsx`
 * ("renders two completed cards for duplicate module_id rows…").
 *
 * Run with related suites:
 *
 *   npx jest app/screens/__tests__/mobile-ui-ux-shared-chrome.test.tsx \\
 *     app/screens/__tests__/HomeScreen.test.tsx \\
 *     app/screens/__tests__/SessionExerciseList.test.tsx \\
 *     app/screens/__tests__/ExerciseDetail.callback-session.test.tsx \\
 *     app/screens/__tests__/UpdateName.test.tsx \\
 *     app/screens/__tests__/UpdateEmail.test.tsx \\
 *     "app/(tabs)/__tests__/profile.test.tsx"
 */
import React from "react";
import { render } from "@testing-library/react-native";
import { FlooraFonts } from "../../../constants/fonts";
import { sessionCardStyles, SESSION_MEDIA_RADIUS } from "../../../constants/sessionCardChrome";
import { CIRCULAR_BACK_BUTTON_SIZE, CircularBackButton } from "../../../components/CircularBackButton";
import { fetchAssignedPlanTitleForCurrentUser } from "../../../lib/assignedPlanTitle";

const mockRpc = jest.fn();

jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  return { Ionicons: () => <Text testID="mock-ionicons">chev</Text> };
});

jest.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    rpc: (fn: string, params?: unknown) =>
      params === undefined ? mockRpc(fn) : mockRpc(fn, params),
  },
}));

describe("Mobile app UI/UX — FlooraFonts & session card chrome", () => {
  it("exports Poppins-linked FlooraFonts weights", () => {
    expect(FlooraFonts.regular).toBe("Poppins_400Regular");
    expect(FlooraFonts.medium).toBe("Poppins_500Medium");
    expect(FlooraFonts.semiBold).toBe("Poppins_600SemiBold");
    expect(FlooraFonts.bold).toBe("Poppins_700Bold");
    expect(FlooraFonts.extraBold).toBe("Poppins_800ExtraBold");
  });

  it("sessionCardChrome defines elevated current media and detail hero", () => {
    expect(SESSION_MEDIA_RADIUS).toBeGreaterThan(0);
    expect(sessionCardStyles.mediaElevatedCurrent.shadowOpacity).toBeGreaterThan(0.3);
    expect(sessionCardStyles.detailHero.borderRadius).toBe(SESSION_MEDIA_RADIUS);
    expect(sessionCardStyles.detailHeroMedia.aspectRatio).toBe(16 / 9);
  });
});

describe("Mobile app UI/UX — CircularBackButton", () => {
  it("renders a touchable circular control with documented size", () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<CircularBackButton onPress={onPress} testID="circ-back" />);
    expect(getByTestId("circ-back")).toBeTruthy();
    expect(CIRCULAR_BACK_BUTTON_SIZE).toBe(40);
  });
});

describe("Mobile app UI/UX — fetchAssignedPlanTitleForCurrentUser", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("calls get_my_assigned_plan_title and returns trimmed text", async () => {
    mockRpc.mockResolvedValue({ data: "  Morning Mobility  ", error: null });
    await expect(fetchAssignedPlanTitleForCurrentUser()).resolves.toBe("Morning Mobility");
    expect(mockRpc).toHaveBeenCalledWith("get_my_assigned_plan_title");
  });

  it("returns empty string on RPC error", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockRpc.mockResolvedValue({ data: null, error: { message: "rls" } });
    await expect(fetchAssignedPlanTitleForCurrentUser()).resolves.toBe("");
    warn.mockRestore();
  });
});
