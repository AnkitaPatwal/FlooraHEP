import { StyleSheet } from "react-native";
import { theme } from "../../constants/theme";
import { fonts } from "../../constants/fonts";

export default StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.color.authBackground,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.space.authScreenHorizontal,
    paddingVertical: 40,
    paddingBottom: 160,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  logoImage: {
    width: 300,
    height: 120,
    alignSelf: "center",
    marginBottom: -23,
  },
  subtitle: {
    color: theme.color.authSubtitle,
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 24,
    marginTop: 0,
    marginBottom: 22,
    textAlign: "center",
  },
  field: {
    width: "100%",
    marginBottom: 16,
  },
  fieldLabel: {
    alignSelf: "flex-start",
    color: theme.color.surface,
    fontFamily: fonts.medium,
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: 14,
    borderRadius: theme.radius.input,
    backgroundColor: theme.color.authInputFill,
    color: theme.color.authInputText,
    fontFamily: fonts.regular,
    fontSize: 16,
    minHeight: theme.layout.minTouchTarget,
  },
  forgotPasswordWrapper: {
    width: "100%",
    alignItems: "flex-start",
    paddingLeft: 2,
  },
  forgotPassword: {
    alignSelf: "flex-start",
    color: theme.color.surface,
    fontFamily: fonts.regular,
    textDecorationLine: "underline",
    fontSize: 14,
    marginTop: -4,
    marginBottom: 16,
    textAlign: "left",
  },
  signInButton: {
    width: "100%",
    ...theme.button.inverse,
  },
  signInButtonText: {
    ...theme.button.inverseText,
  },
  footerContainer: {
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    color: theme.color.surface,
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 4,
  },
  footerLink: {
    color: theme.color.surface,
    fontFamily: fonts.medium,
    textDecorationLine: "underline",
    fontSize: 14,
    textAlign: "center",
  },
});
