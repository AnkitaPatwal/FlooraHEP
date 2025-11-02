import React from "react";

import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { Link } from "expo-router";
import { Feather } from "@expo/vector-icons";
import profilePic from "../../assets/images/profile-pic.png";

export default function Profile() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Profile Settings</Text>
      <View style={styles.headerLine} />

      {/* Profile Image */}
      <Image source={profilePic} style={styles.avatar} />

      {/* Name */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Name</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            value="Loretta Barry"
            editable={false}
            style={styles.input}
          />
          <Link href="../screens/UpdateName" asChild>
            <TouchableOpacity style={styles.iconContainer}>
              <Feather name="edit-3" size={18} color="#5A8E93" />
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      {/* Email */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Email</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            value="loretta@floora-pt.com"
            editable={false}
            style={styles.input}
          />
          <Link href="../screens/UpdateEmail" asChild>
            <TouchableOpacity style={styles.iconContainer}>
              <Feather name="edit-3" size={18} color="#5A8E93" />
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      {/* Password */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            value="••••••••••"
            editable={false}
            secureTextEntry
            style={styles.input}
          />
          <Link href="../update-password" asChild>
            <TouchableOpacity style={styles.iconContainer}>
              <Feather name="edit-3" size={18} color="#5A8E93" />
              </TouchableOpacity>
            </Link>
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 0, 
    paddingTop: 60, 
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  headerLine: {
    height: 1,
    backgroundColor: "#F0F0F0",
    width: "100%", 
    marginBottom: 30,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignSelf: "center",
    marginBottom: 30,
  },
  fieldContainer: {
    marginBottom: 18,
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600", 
    color: "#333",
    marginBottom: 6,
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#333",
  },
  iconContainer: {
    position: "absolute",
    right: 14,
    top: "50%",
    transform: [{ translateY: -9 }],
  },
  signOutButton: {
    marginTop: 40,
    alignSelf: "center",
    backgroundColor: "#5A8E93",
    paddingVertical: 12,
    paddingHorizontal: 50,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  signOutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});
