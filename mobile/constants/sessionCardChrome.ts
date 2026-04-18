import { StyleSheet } from "react-native";
import { FlooraFonts } from "./fonts";

/** Rounded media + soft shadow used on Home session tiles — reuse on Roadmap, exercise list, detail hero. */
export const SESSION_MEDIA_RADIUS = 14;

export const sessionCardStyles = StyleSheet.create({
  tile: {
    borderRadius: SESSION_MEDIA_RADIUS,
    overflow: "hidden",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 12,
  },
  tileCurrent: {
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    transform: [{ scale: 1.01 }],
  },
  /** Clips thumbnail / video to rounded top (sits inside `tile`). */
  mediaShell: {
    borderRadius: SESSION_MEDIA_RADIUS,
    overflow: "hidden",
    backgroundColor: "#FFF",
  },
  mediaImage: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  caption: {
    fontFamily: FlooraFonts.regular,
    fontSize: 20,
    color: "#374151",
    marginTop: 10,
    marginBottom: 22,
  },
  captionStrong: {
    fontFamily: FlooraFonts.extraBold,
    color: "#1F2937",
  },
  captionMeta: {
    color: "#374151",
  },
  /**
   * “Current” thumbnail only — Home dashboard current session + Session exercise list current item.
   * Darker than default tile shadow (button-like emphasis).
   */
  mediaElevatedCurrent: {
    position: "relative",
    borderRadius: SESSION_MEDIA_RADIUS,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.58,
    shadowRadius: 10,
    elevation: 12,
    transform: [{ scale: 1.01 }],
  },
  /** Single exercise video / poster on Exercise detail — same chrome as dashboard media. */
  detailHero: {
    borderRadius: SESSION_MEDIA_RADIUS,
    overflow: "hidden",
    marginBottom: 24,
    position: "relative",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  detailHeroMedia: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
});
