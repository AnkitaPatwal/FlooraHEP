/**
 * Playback state handling for exercise video. Used for loading/error UI.
 */

export type PlaybackState = "idle" | "loading" | "ready" | "error";

export type VideoUiState = {
  showVideo: boolean;
  showLoadingIndicator: boolean;
  showErrorFallback: boolean;
  errorMessage: string | null;
};

/**
 * Derives UI state from playback state and optional error message.
 */
export function getVideoUiState(
  playbackState: PlaybackState,
  videoError: string | null,
  hasVideoUrl: boolean
): VideoUiState {
  if (!hasVideoUrl) {
    return {
      showVideo: false,
      showLoadingIndicator: false,
      showErrorFallback: false,
      errorMessage: null,
    };
  }
  const showVideo = playbackState !== "error";
  const showLoadingIndicator = playbackState === "loading" || playbackState === "idle";
  const showErrorFallback = playbackState === "error" || Boolean(videoError);
  const errorMessage = videoError || (playbackState === "error" ? "Video failed to load" : null);
  return {
    showVideo,
    showLoadingIndicator,
    showErrorFallback,
    errorMessage,
  };
}
