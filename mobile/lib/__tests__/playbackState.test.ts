import { getVideoUiState, type PlaybackState } from "../playbackState";

describe("playbackState", () => {
  describe("getVideoUiState", () => {
    it("returns no video when hasVideoUrl is false", () => {
      const states: PlaybackState[] = ["idle", "loading", "ready", "error"];
      states.forEach((s) => {
        const ui = getVideoUiState(s, null, false);
        expect(ui.showVideo).toBe(false);
        expect(ui.showLoadingIndicator).toBe(false);
        expect(ui.showErrorFallback).toBe(false);
        expect(ui.errorMessage).toBeNull();
      });
    });

    it("shows video and loading when idle with url", () => {
      const ui = getVideoUiState("idle", null, true);
      expect(ui.showVideo).toBe(true);
      expect(ui.showLoadingIndicator).toBe(true);
      expect(ui.showErrorFallback).toBe(false);
    });

    it("shows video and loading when loading", () => {
      const ui = getVideoUiState("loading", null, true);
      expect(ui.showVideo).toBe(true);
      expect(ui.showLoadingIndicator).toBe(true);
    });

    it("shows video, no loading when ready", () => {
      const ui = getVideoUiState("ready", null, true);
      expect(ui.showVideo).toBe(true);
      expect(ui.showLoadingIndicator).toBe(false);
      expect(ui.showErrorFallback).toBe(false);
    });

    it("hides video and shows error fallback when error", () => {
      const ui = getVideoUiState("error", null, true);
      expect(ui.showVideo).toBe(false);
      expect(ui.showErrorFallback).toBe(true);
      expect(ui.errorMessage).toBe("Video failed to load");
    });

    it("uses custom error message when provided", () => {
      const ui = getVideoUiState("error", "Network request failed", true);
      expect(ui.showVideo).toBe(false);
      expect(ui.showErrorFallback).toBe(true);
      expect(ui.errorMessage).toBe("Network request failed");
    });
  });
});
