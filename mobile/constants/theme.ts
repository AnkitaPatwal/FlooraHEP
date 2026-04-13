/**
 * Shared UI tokens for Dashboard, Roadmap, Session list, and Exercise player.
 */
import colors from "./colors";
import { fonts } from "./fonts";

const primary = "#0F766E";
const primaryDark = "#0D2C2C";
const inputFill = "#F5F5F5";
const inputRadius = 8;

export const theme = {
  color: {
    ...colors,
    primary,
    primaryDark,
    success: "#047857",
    surface: "#FFFFFF",
    caption: "#374151",
    chevron: "#475569",
    overlayText: "#FFFFFF",
    inputFill,
    error: "#B91C1C",
    placeholder: "#9CA3AF",
    /** Login / auth marketing background (distinct from primary actions). */
    authBackground: "#437C7D",
    authSubtitle: "#F2E2D2",
    authInputFill: "#EAE4DA",
    authInputText: "#2B2B2B",
  },
  space: {
    screenHorizontal: 16,
    screenTop: 24,
    scrollBottom: 100,
    headerRowHeight: 56,
    sectionTitleBottom: 4,
    accentLineMarginTop: 6,
    accentLineMarginBottom: 22,
    cardCaptionTop: 10,
    cardCaptionBottom: 22,
    sessionTileGap: 12,
    /** Form / profile body insets — matches list screens (`screenHorizontal`). */
    formBodyHorizontal: 16,
    formBodyTop: 28,
    formBodyBottom: 40,
    fieldGap: 20,
    profileSectionGap: 18,
    authScreenHorizontal: 32,
  },
  radius: {
    card: 14,
    mediaCard: 16,
    button: 12,
    accentBar: 4,
    dot: 4,
    playOverlay: 28,
    input: inputRadius,
  },
  layout: {
    accentLineWidth: 150,
    accentLineHeight: 6,
    minTouchTarget: 44,
    /** Ionicons `chevron-back` size — use everywhere for back control. */
    backIconSize: 28,
    /** Filled back control on teal / dark auth backgrounds. */
    onDarkBackFill: "#F5EDE4",
    /** Fixed width for leading/trailing top bar slots (chevron + “Back” balance). */
    topBarBalanceWidth: 100,
  },
  shadow: {
    card: {
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    exerciseCard: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 2,
    },
  },
  session: {
    currentBorderWidth: 2,
    currentBorderColor: primary,
    lockedOpacity: 0.52,
  },
  typography: {
    /** Home dashboard: pair with `brandWordmark` (~92% scale) for balanced header row. */
    greeting: {
      fontFamily: fonts.bold,
      fontSize: 26,
      lineHeight: 32,
      color: "#0F172A",
    },
    brandWordmark: {
      fontFamily: fonts.bold,
      fontSize: 24,
      lineHeight: 28,
      color: colors.brand,
    },
    /** Plan line under greeting — readable subtitle, not tiny. */
    planName: {
      fontFamily: fonts.medium,
      fontSize: 18,
      lineHeight: 24,
      color: primary,
      marginTop: 8,
    },
    /** Heaviest screen title — only plan names use Black so they read above section headings. */
    planTitle: {
      fontFamily: fonts.black,
      fontSize: 28,
      lineHeight: 34,
      color: "#0F172A",
    },
    planSubtitle: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: primary },
    /** Section under the plan (e.g. “Restore”, “Your Assigned Sessions”) — Bold, not Black, vs `planTitle`. */
    sectionTitle: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, color: colors.heading },
    sectionSubtitle: { fontFamily: fonts.regular, fontSize: 16, color: primary },
    screenHeaderTitle: { fontFamily: fonts.black, fontSize: 20, color: colors.heading },
    sessionScreenTitle: { fontFamily: fonts.black, fontSize: 26, color: colors.heading },
    exerciseScreenTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.heading },
    cardCaption: { fontFamily: fonts.regular, fontSize: 20, color: "#374151" },
    cardCaptionStrong: { fontFamily: fonts.black, color: colors.text },
    statusCompleted: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
    statusLocked: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
    body: { fontFamily: fonts.regular, fontSize: 16, color: "#374151" },
    bodySmall: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
    exerciseTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading },
    exerciseTitleLarge: { fontFamily: fonts.bold, fontSize: 22, color: colors.heading },
    description: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.muted },
    descriptionCompact: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
    link: { fontFamily: fonts.medium, fontSize: 16, color: primary },
    progressFraction: { fontFamily: fonts.bold, fontSize: 18, color: colors.heading },
    /** Centered title on password / profile edit flows */
    formPageTitle: {
      fontFamily: fonts.bold,
      fontSize: 18,
      color: colors.heading,
      textAlign: "center" as const,
      marginBottom: 28,
    },
    formLabel: {
      fontFamily: fonts.medium,
      fontSize: 15,
      color: colors.text,
      marginBottom: 8,
    },
    formInput: {
      fontFamily: fonts.regular,
      fontSize: 16,
      color: colors.text,
    },
    errorBanner: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: "#B91C1C",
      marginBottom: 12,
    },
    successBanner: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: "#047857",
      marginBottom: 8,
      textAlign: "center" as const,
    },
    successTitle: {
      fontFamily: fonts.bold,
      fontSize: 20,
      color: "#047857",
      marginBottom: 8,
    },
    /** Profile tab main heading — same scale as section titles elsewhere */
    profileScreenTitle: {
      fontFamily: fonts.black,
      fontSize: 22,
      color: colors.heading,
      textAlign: "center" as const,
      marginBottom: 12,
      marginTop: 8,
    },
  },
  form: {
    fieldRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      backgroundColor: inputFill,
      borderRadius: inputRadius,
      marginBottom: 20,
      paddingHorizontal: 14,
    },
  },
  button: {
    primary: {
      backgroundColor: primary,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      minHeight: 48,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    primaryText: { fontFamily: fonts.bold, color: "#FFFFFF", fontSize: 16 },
    inverse: {
      backgroundColor: primaryDark,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      minHeight: 44,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    inverseText: { fontFamily: fonts.medium, color: "#FFFFFF", fontSize: 16 },
    compact: {
      backgroundColor: primary,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    compactText: { fontFamily: fonts.medium, color: "#FFFFFF", fontSize: 14 },
  },
} as const;

export type SessionTileState = "available" | "current" | "completed" | "locked";
