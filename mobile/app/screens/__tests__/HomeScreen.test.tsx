import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import HomeScreen from "../HomeScreen";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockMaybeSingle = jest.fn();
const mockEq = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();
const mockOrder = jest.fn();
const mockIn = jest.fn();

jest.mock("../../../lib/supabase", () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).userEmail = "keshwa@example.com";
  });

  it("renders assigned current session for user with package", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "user") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { user_id: 56 },
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === "user_packages") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { package_id: 2 },
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === "plan_module") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({
                data: [{ module_id: 1, order_index: 1 }],
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === "module") {
        return {
          select: jest.fn(() => ({
            in: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({
                data: [{ module_id: 1, title: "week 1 foundations" }],
                error: null,
              }),
            })),
          })),
        };
      }

      return {
        select: jest.fn(),
      };
    });

    const { getByText, queryByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("week 1 foundations")).toBeTruthy();
    });

    expect(getByText("Your Current Session")).toBeTruthy();
    expect(getByText("No previous sessions.")).toBeTruthy();
    expect(queryByText("No assigned sessions yet.")).toBeNull();
  });

  it("shows empty state when no package is assigned", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "user") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { user_id: 57 },
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === "user_packages") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            })),
          })),
        };
      }

      return {
        select: jest.fn(),
      };
    });

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("No assigned sessions yet.")).toBeTruthy();
    });
  });

  it("shows error state when user cannot be loaded", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "user") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "User lookup failed" },
              }),
            })),
          })),
        };
      }

      return {
        select: jest.fn(),
      };
    });

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Unable to load user.")).toBeTruthy();
    });
  });
});