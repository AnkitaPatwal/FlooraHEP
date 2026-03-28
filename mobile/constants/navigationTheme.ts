import { fonts } from "./fonts";
import { theme } from "./theme";

/** Native stack headers: match in-app `screenHeaderTitle` (Roboto + Floora colors). */
export const stackHeaderScreenOptions = {
  headerStyle: {
    backgroundColor: theme.color.surface,
  },
  headerTintColor: theme.color.heading,
  headerTitleStyle: {
    fontFamily: fonts.black,
    fontSize: 20,
    color: theme.color.heading,
  },
  headerShadowVisible: true,
  headerLeftContainerStyle: {
    paddingLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
} as const;
