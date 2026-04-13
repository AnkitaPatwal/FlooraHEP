import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#4B7B7D",
    paddingHorizontal: 24,
    paddingTop: 60,
  },

  backButtonContainer: {
    backgroundColor: "#F5EDE4",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 73,
  },

  backArrow: {
    fontSize: 22,
    color: "#1A3D3C",
    fontWeight: "600",
  },

  headerContainer: {
    marginBottom: 50,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 6,
  },

  subtitle: {
    color: "#FFFFFF",
    opacity: 0.9,
    fontSize: 14,
  },

  field: {
    marginBottom: 16,
  },
  

  fieldLabel: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#F5EDE4",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
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
    fontWeight: "500",
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
    fontSize: 16,
    fontWeight: "400",
  },

  resendContainer: {
    alignItems: "center",
    marginTop: 18,
    gap: 8,
  },

  resendPrompt: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "400",
  },

  resendLink: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});

export default styles;
