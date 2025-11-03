import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#437C7D",
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 80, 
  },

  backButtonContainer: {
    backgroundColor: "#F5EDE4", 
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 15,
    color: "#FFFFFF",
    marginBottom: 36, 
  },

  field: {
    marginBottom: 20,
  },

  fieldLabel: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 6,
  },

  input: {
    width: "100%",
    height: 50, 
    backgroundColor: "#EAE4DA",
    borderRadius: 6,
    paddingHorizontal: 12,
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
    fontSize: 16,
    fontWeight: "600",
  },
});
