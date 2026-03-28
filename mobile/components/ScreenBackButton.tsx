import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  View,
  Platform,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../constants/theme";

type Props = {
  onPress: () => void;
  /** Chevron plus “Back” label (e.g. exercise player top bar). */
  showLabel?: boolean;
  /** Bare chevron on light headers vs cream circle on teal auth screens. */
  variant?: "default" | "onDark";
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export default function ScreenBackButton({
  onPress,
  showLabel = false,
  variant = "default",
  style,
  testID,
}: Props) {
  const size = theme.layout.backIconSize;
  const iconColor = theme.color.heading;

  const chevron = (
    <Ionicons
      name="chevron-back"
      size={size}
      color={iconColor}
      style={styles.chevronOptical}
    />
  );

  const icon = (
    <View style={styles.iconFrame} pointerEvents="none">
      {chevron}
    </View>
  );

  const labeled = (
    <>
      <View style={styles.iconFrameCompact} pointerEvents="none">
        {chevron}
      </View>
      <Text style={styles.label}>Back</Text>
    </>
  );

  if (variant === "onDark") {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.onDarkOuter, style, pressed && styles.pressed]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        testID={testID}
      >
        <View style={styles.onDarkCircle}>{showLabel ? labeled : chevron}</View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [
        styles.defaultHit,
        showLabel && styles.defaultHitLabeled,
        style,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      testID={testID}
    >
      {showLabel ? labeled : icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  defaultHit: {
    minWidth: theme.layout.minTouchTarget,
    minHeight: theme.layout.minTouchTarget,
    justifyContent: "center",
    alignItems: "center",
  },
  iconFrame: {
    width: theme.layout.minTouchTarget,
    height: theme.layout.minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  iconFrameCompact: {
    width: theme.layout.backIconSize + 10,
    height: theme.layout.minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -2,
  },
  chevronOptical: Platform.select({
    ios: { transform: [{ translateX: 2 }, { translateY: 0.5 }] },
    android: { transform: [{ translateX: 2.5 }, { translateY: 1 }] },
    default: { transform: [{ translateX: 2 }] },
  }),
  defaultHitLabeled: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 4,
    minWidth: undefined,
  },
  label: {
    ...theme.typography.body,
    marginLeft: -2,
    color: theme.color.heading,
  },
  onDarkOuter: {
    alignSelf: "flex-start",
  },
  onDarkCircle: {
    width: theme.layout.minTouchTarget,
    height: theme.layout.minTouchTarget,
    borderRadius: theme.layout.minTouchTarget / 2,
    backgroundColor: theme.layout.onDarkBackFill,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.72 },
});
