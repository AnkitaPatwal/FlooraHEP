import { StyleSheet } from "react-native";
import { theme } from "../../constants/theme";
import { fonts } from "../../constants/fonts";

export default StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.color.authBackground,
    paddingHorizontal: theme.space.authScreenHorizontal,
    paddingTop: 60,
    paddingBottom: 80,
  },
  backButtonContainer: {
    marginBottom: 28,
  },
  backButtonCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 32,
    color: theme.color.surface,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: theme.color.surface,
    marginBottom: 36,
  },
  field: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: theme.color.surface,
    fontFamily: fonts.medium,
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    minHeight: 50,
    backgroundColor: theme.color.authInputFill,
    borderRadius: theme.radius.input,
    paddingHorizontal: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: theme.color.authInputText,
  },
  createButton: {
    width: "70%",
    alignSelf: "center",
    ...theme.button.inverse,
    marginTop: 30,
    marginBottom: 40,
  },
  createButtonText: {
    ...theme.button.inverseText,
  },
});
