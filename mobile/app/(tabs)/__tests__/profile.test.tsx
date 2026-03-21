/**
 * Profile tab — sign-out (ATH-386/ATH-392) and avatar upload (ATH-411)
 */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import Profile from "../profile";

type ProfileRow = {
  email: string;
  display_name: string | null;
  avatar_url: string | null;
};

let mockCurrentProfile: ProfileRow = {
  email: "jane@example.com",
  display_name: "Jane Doe",
  avatar_url: null,
};

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  Link: ({ children }: any) => children,
}));

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useFocusEffect: (cb: () => void) => {
      React.useEffect(() => {
        cb();
      }, []);
    },
  };
});

jest.mock("../../../providers/AuthProvider", () => ({
  useAuth: () => ({
    session: {
      access_token: "test-token",
      user: { id: "test-auth-uuid", email: "user@example.com" },
    },
  }),
}));

jest.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(async () => ({ data: mockCurrentProfile, error: null })),
      maybeSingle: jest.fn(async () => ({ data: mockCurrentProfile, error: null })),
    })),
    auth: {
      signOut: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
}));

let alertButtons: Array<{ text: string; onPress?: () => void }> = [];
jest.spyOn(require("react-native").Alert, "alert").mockImplementation(
  (...args: unknown[]) => {
    alertButtons = (args[2] as Array<{ text: string; onPress?: () => void }>) ?? [];
  }
);

const goodProfile = {
  success: true,
  profile: {
    email: "jane@example.com",
    display_name: "Jane Doe",
    avatar_url: null,
  },
};

const goodProfileWithAvatar = {
  ...goodProfile,
  profile: { ...goodProfile.profile, avatar_url: "https://example.com/avatar.jpg" },
};

const uploadSuccess = {
  success: true,
  message: "Avatar updated",
  avatar_url: "https://example.com/avatars/1/123.jpg",
};

function createFetchMock(overrides: {
  profile?: ProfileRow;
  uploadResponse?: { ok: boolean; json: () => Promise<object> };
} = {}) {
  if (overrides.profile) {
    mockCurrentProfile = overrides.profile;
  }

  const uploadRes = overrides.uploadResponse ?? {
    ok: true,
    json: async () => uploadSuccess,
  };

  return jest.fn().mockImplementation((url: string) => {
    if (url.includes("upload-avatar")) {
      return Promise.resolve(uploadRes);
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

describe("Profile sign-out (ATH-386/ATH-392)", () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = (...args: unknown[]) => {
      const msg = typeof args[0] === "string" ? args[0] : "";
      if (msg.includes("not wrapped in act(...)")) return;
      originalError.apply(console, args);
    };
  });
  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentProfile = goodProfile.profile as any;
    const picker = require("expo-image-picker");
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true });
    (global as any).fetch = createFetchMock();
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  });

  it("renders Profile Settings and Sign out button", async () => {
    const { getByText, getByTestId } = render(<Profile />);
    expect(getByText("Profile Settings")).toBeTruthy();
    await waitFor(() => {
      expect(getByTestId("profile-sign-out")).toBeTruthy();
    });
    expect(getByText("Sign out")).toBeTruthy();
  });

  it("calls supabase.auth.signOut and redirects to login when Sign out is pressed", async () => {
    alertButtons = [];
    const { supabase } = require("../../../lib/supabaseClient");
    const { getByTestId } = render(<Profile />);

    await waitFor(() => {
      expect(getByTestId("profile-sign-out")).toBeTruthy();
    });

    fireEvent.press(getByTestId("profile-sign-out"));
    const signOutBtn = alertButtons.find((b) => b.text === "Sign out");
    expect(signOutBtn?.onPress).toBeTruthy();
    await signOutBtn!.onPress!();

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/screens/LoginScreen");
    });
  });
});

describe("Profile avatar (ATH-411)", () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = (...args: unknown[]) => {
      const msg = typeof args[0] === "string" ? args[0] : "";
      if (msg.includes("not wrapped in act(...)")) return;
      originalError.apply(console, args);
    };
    jest.useFakeTimers();
  });
  afterAll(() => {
    console.error = originalError;
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentProfile = goodProfile.profile as any;
    const picker = require("expo-image-picker");
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true });
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  });

  it("picker canceled → no upload fetch called", async () => {
    (global as any).fetch = createFetchMock();
    const { getByTestId } = render(<Profile />);

    await waitFor(() => {
      expect(getByTestId("profile-avatar")).toBeTruthy();
    });

    fireEvent.press(getByTestId("profile-avatar"));
    const changeBtn = alertButtons.find((b) => b.text === "Change photo");
    changeBtn?.onPress?.();

    await waitFor(() => {
      expect(require("expo-image-picker").launchImageLibraryAsync).toHaveBeenCalled();
    });

    const fetchCalls = (global as any).fetch.mock.calls;
    const uploadCalls = fetchCalls.filter((c: any[]) => c[0]?.includes("upload-avatar"));
    expect(uploadCalls.length).toBe(0);
  });

  it("successful upload → avatarUrl updates → success message shown", async () => {
    require("expo-image-picker").launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///photo.jpg" }],
    });
    (global as any).fetch = createFetchMock();

    const { getByTestId, getByText } = render(<Profile />);
    await waitFor(() => {
      expect(getByTestId("profile-avatar")).toBeTruthy();
    });

    fireEvent.press(getByTestId("profile-avatar"));
    const changeBtn = alertButtons.find((b) => b.text === "Change photo");
    await changeBtn?.onPress?.();

    await waitFor(
      () => {
        expect(getByText("Profile picture updated")).toBeTruthy();
      },
      { timeout: 2000 }
    );

    const fetchCalls = (global as any).fetch.mock.calls;
    const uploadCalls = fetchCalls.filter((c: any[]) => c[0]?.includes("upload-avatar"));
    expect(uploadCalls.length).toBeGreaterThan(0);
  });

  it("Delete photo option appears when avatarUrl exists", async () => {
    (global as any).fetch = createFetchMock({ profile: goodProfileWithAvatar.profile as any });

    const { getByTestId } = render(<Profile />);
    await waitFor(() => {
      expect(getByTestId("profile-avatar")).toBeTruthy();
    });

    fireEvent.press(getByTestId("profile-avatar"));

    const deleteBtn = alertButtons.find((b) => b.text === "Delete photo");
    expect(deleteBtn).toBeTruthy();
  });

  it("delete sets avatarUrl to null → placeholder shown", async () => {
    (global as any).fetch = createFetchMock({ profile: goodProfileWithAvatar.profile as any });

    const { getByTestId, getByText } = render(<Profile />);
    await waitFor(() => {
      expect(getByTestId("profile-avatar")).toBeTruthy();
    });

    fireEvent.press(getByTestId("profile-avatar"));
    const deletePhotoBtn = alertButtons.find((b) => b.text === "Delete photo");
    expect(deletePhotoBtn).toBeTruthy();
    await deletePhotoBtn!.onPress!(); // triggers confirmation dialog

    const confirmDeleteBtn = alertButtons.find((b) => b.text === "Delete");
    expect(confirmDeleteBtn).toBeTruthy();
    await confirmDeleteBtn!.onPress!(); // confirms and calls deleteAvatar

    await waitFor(
      () => {
        expect(getByText("Profile picture removed")).toBeTruthy();
      },
      { timeout: 2000 }
    );
  });

  it("upload failure → error message shown, avatarUrl not changed", async () => {
    require("expo-image-picker").launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///photo.jpg" }],
    });
    (global as any).fetch = createFetchMock({
      uploadResponse: {
        ok: false,
        json: async () => ({ message: "Upload failed" }),
      },
    });

    const { getByTestId, getByText } = render(<Profile />);
    await waitFor(() => {
      expect(getByTestId("profile-avatar")).toBeTruthy();
    });

    fireEvent.press(getByTestId("profile-avatar"));
    const changeBtn = alertButtons.find((b) => b.text === "Change photo");
    await changeBtn?.onPress?.();

    await waitFor(
      () => {
        expect(getByText("Upload failed")).toBeTruthy();
      },
      { timeout: 2000 }
    );
  });

  it("upload 500 → error shown, avatarUrl not changed", async () => {
    require("expo-image-picker").launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///photo.jpg" }],
    });
    (global as any).fetch = createFetchMock({
      uploadResponse: {
        ok: false,
        json: async () => ({ message: "Failed to save avatar" }),
      },
    });

    const { getByTestId, getByText } = render(<Profile />);
    await waitFor(() => {
      expect(getByTestId("profile-avatar")).toBeTruthy();
    });

    fireEvent.press(getByTestId("profile-avatar"));
    const changeBtn = alertButtons.find((b) => b.text === "Change photo");
    await changeBtn?.onPress?.();

    await waitFor(
      () => {
        expect(getByText("Failed to save avatar")).toBeTruthy();
      },
      { timeout: 2000 }
    );
  });

  it("unsupported file type → error message shown", async () => {
    require("expo-image-picker").launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///photo.bmp" }],
    });
    (global as any).fetch = createFetchMock({
      uploadResponse: {
        ok: false,
        json: async () => ({
          message: "Invalid file type. Use JPEG, PNG, WebP, or GIF",
        }),
      },
    });

    const { getByTestId, getByText } = render(<Profile />);
    await waitFor(() => {
      expect(getByTestId("profile-avatar")).toBeTruthy();
    });

    fireEvent.press(getByTestId("profile-avatar"));
    const changeBtn = alertButtons.find((b) => b.text === "Change photo");
    await changeBtn?.onPress?.();

    await waitFor(
      () => {
        expect(getByText("Invalid file type. Use JPEG, PNG, WebP, or GIF")).toBeTruthy();
      },
      { timeout: 2000 }
    );
  });
});
