import { StyleSheet } from "react-native";
import { FlooraFonts } from "../../constants/fonts";

export default StyleSheet.create({
  container: {
  flexGrow: 1,
  backgroundColor: "#437C7D",
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 32,
  paddingVertical: 40,
  paddingBottom: 160, // (prevents bottom crowding)
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
    color: "#F2E2D2",
    fontFamily: FlooraFonts.regular,
    fontSize: 17,
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
    color: "#FFFFFF",
    fontFamily: FlooraFonts.semiBold,
    fontSize: 14,
    marginBottom: 6,
  },

  input: {
    width: "100%",
    padding: 14,
    borderRadius: 6,
    backgroundColor: "#EAE4DA",
    color: "#2B2B2B",
    fontFamily: FlooraFonts.regular,
    fontSize: 15,
    minHeight: 44,
  },

  forgotPasswordWrapper: {
    width: "100%",
    alignItems: "flex-start",
    paddingLeft: 2,
  },

  forgotPassword: {
    alignSelf: "flex-start",
    color: "#FFFFFF",
    fontFamily: FlooraFonts.regular,
    textDecorationLine: "underline",
    fontSize: 14,
    marginTop: -4,
    marginBottom: 16,
    textAlign: "left",
  },

 signInButton: {
  width: "100%",
  backgroundColor: "#0D2C2C",
  borderRadius: 8,
  paddingVertical: 14,
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44, // 
},

  signInButtonText: {
    color: "#FFFFFF",
    fontFamily: FlooraFonts.semiBold,
    fontSize: 16,
  },

  footerContainer: {
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  footerText: {
    color: "#FFFFFF",
    fontFamily: FlooraFonts.regular,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 4,
  },

  footerLink: {
    color: "#FFFFFF",
    fontFamily: FlooraFonts.semiBold,
    textDecorationLine: "underline",
    fontSize: 14,
    textAlign: "center",
  },
});

