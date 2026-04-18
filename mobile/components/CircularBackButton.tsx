import React, { type PropsWithChildren } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  Platform,
  type StyleProp,
  type TouchableOpacityProps,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

/** Outer touch target width; use to balance headers (e.g. spacer on the right). */
export const CIRCULAR_BACK_BUTTON_SIZE = 40;

const CHEVRON_SIZE = 22;
const CHEVRON_COLOR = "#111827";

const circularShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  android: {
    elevation: 4,
  },
  default: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});

const styles = StyleSheet.create({
  circularSurface: {
    width: CIRCULAR_BACK_BUTTON_SIZE,
    height: CIRCULAR_BACK_BUTTON_SIZE,
    borderRadius: CIRCULAR_BACK_BUTTON_SIZE / 2,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    ...circularShadow,
  },
  /** Optical center for chevron-back glyph. */
  chevronNudge: { marginLeft: -2 },
});

type BackProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** Override chevron color (e.g. on tinted backgrounds). */
  iconColor?: string;
};

/**
 * White circular back control with soft shadow — matches session list / stack headers.
 */
export function CircularBackButton({ onPress, style, testID, iconColor = CHEVRON_COLOR }: BackProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={[styles.circularSurface, style]}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      testID={testID ?? "circular-back-button"}
    >
      <Ionicons name="chevron-back" size={CHEVRON_SIZE} color={iconColor} style={styles.chevronNudge} />
    </TouchableOpacity>
  );
}

type IconButtonProps = PropsWithChildren<
  Omit<TouchableOpacityProps, "style" | "children"> & {
    style?: StyleProp<ViewStyle>;
    testID?: string;
  }
>;

/**
 * Same white circle + shadow as the back button, for inline actions (e.g. profile edit pencil).
 * Spreads TouchableOpacity props so `Link` / `asChild` can inject `onPress`.
 */
export function CircularIconButton({
  children,
  style,
  accessibilityLabel,
  testID,
  activeOpacity = 0.85,
  ...rest
}: IconButtonProps) {
  return (
    <TouchableOpacity
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={[styles.circularSurface, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      activeOpacity={activeOpacity}
      {...rest}
    >
      {children}
    </TouchableOpacity>
  );
}
