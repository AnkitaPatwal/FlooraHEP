import { StyleSheet } from "react-native";
import { FlooraFonts } from "../../constants/fonts";

export default StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#437C7D",
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 80, 
  },

  backRow: {
    alignSelf: "flex-start",
    marginBottom: 28,
  },

  header: {
    marginBottom: 8,
  },

  title: {
    fontFamily: FlooraFonts.bold,
    fontSize: 26,
    color: "#FFFFFF",
    marginBottom: 10,
  },

  subtitle: {
    fontFamily: FlooraFonts.regular,
    fontSize: 15,
    color: "#FFFFFF",
    marginBottom: 36,
  },

  field: {
    marginBottom: 20,
  },

  fieldLabel: {
    color: "#FFFFFF",
    fontFamily: FlooraFonts.semiBold,
    fontSize: 14,
    marginBottom: 6,
  },

  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#EAE4DA",
    borderRadius: 6,
    paddingHorizontal: 12,
    fontFamily: FlooraFonts.regular,
    fontSize: 15,
    color: "#2B2B2B",
  },

  createButton: {
    width: "70%",
    alignSelf: "center",
    backgroundColor: "#0D2C2C",
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 30,
    alignItems: "center",
    marginBottom: 40, 
  },

  createButtonText: {
    color: "#FFFFFF",
    fontFamily: FlooraFonts.semiBold,
    fontSize: 16,
  },
});
