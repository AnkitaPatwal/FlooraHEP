import { StyleSheet } from "react-native";
import { FlooraFonts } from "../../constants/fonts";

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#4B7B7D",
    paddingHorizontal: 24,
    paddingTop: 60,
  },

  backRow: {
    alignSelf: "flex-start",
    marginBottom: 73,
  },

  headerContainer: {
    marginBottom: 50,
  },

  title: {
    color: "#FFFFFF",
    fontFamily: FlooraFonts.bold,
    fontSize: 30,
    marginBottom: 6,
  },

  subtitle: {
    color: "#FFFFFF",
    fontFamily: FlooraFonts.regular,
    opacity: 0.9,
    fontSize: 14,
  },

  field: {
    marginBottom: 16,
  },
  

  fieldLabel: {
    color: "#FFFFFF",
    fontFamily: FlooraFonts.semiBold,
    fontSize: 15,
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#F5EDE4",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: FlooraFonts.regular,
    fontSize: 16,
    color: "#000000",
  },

successBanner: {
  backgroundColor: "#CFE6C6",
  borderColor: "#6FAE63",
  borderWidth: 2,
  borderRadius: 6,
  paddingVertical: 12,
  paddingHorizontal: 14,
  marginBottom: 16,
  width: "100%",
},

  successBannerText: {
    color: "#2F5B2A",
    fontFamily: FlooraFonts.medium,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 16,
  },

  resetButton: {
    backgroundColor: "#0F2D2E",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    alignSelf: "center",
    width: "75%",
    marginTop: 0,
  },

  resetButtonText: {
    color: "#FFFFFF",
    fontFamily: FlooraFonts.regular,
    fontSize: 16,
  },

  resendContainer: {
    alignItems: "center",
    marginTop: 18,
    gap: 8,
  },

  resendPrompt: {
    color: "#FFFFFF",
    fontFamily: FlooraFonts.regular,
    fontSize: 15,
  },

  resendLink: {
    color: "#FFFFFF",
    fontFamily: FlooraFonts.semiBold,
    fontSize: 16,
    textDecorationLine: "underline",
  },
});

export default styles;
