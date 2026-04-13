import { StyleSheet } from "react-native";
import { theme } from "../../constants/theme";
import { fonts } from "../../constants/fonts";

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.color.authBackground,
    paddingHorizontal: theme.space.formBodyHorizontal,
    paddingTop: 60,
  },
  backButtonContainer: {
    marginBottom: 73,
  },
  headerContainer: {
    marginBottom: 50,
  },
  title: {
    color: theme.color.surface,
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 6,
  },
  subtitle: {
    color: theme.color.surface,
    opacity: 0.92,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: theme.color.surface,
    fontFamily: fonts.medium,
    fontSize: 15,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.layout.onDarkBackFill,
    borderRadius: theme.radius.input,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: theme.color.heading,
  },
  successBanner: {
    backgroundColor: "#CFE6C6",
    borderColor: "#6FAE63",
    borderWidth: 2,
    borderRadius: theme.radius.input,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    width: "100%",
  },
  successBannerText: {
    color: "#2F5B2A",
    fontFamily: fonts.medium,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  resetButton: {
    ...theme.button.inverse,
    alignSelf: "center",
    width: "75%",
    marginTop: 0,
  },
  resetButtonText: {
    ...theme.button.inverseText,
  },
  resendContainer: {
    alignItems: "center",
    marginTop: 18,
    gap: 8,
  },
  resendPrompt: {
    color: theme.color.surface,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  resendLink: {
    color: theme.color.surface,
    fontFamily: fonts.medium,
    fontSize: 16,
    textDecorationLine: "underline",
  },
});

export default styles;
