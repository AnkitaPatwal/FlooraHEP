import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ImageSourcePropType,
  Platform,
} from "react-native";
import { theme, type SessionTileState } from "../constants/theme";

export type { SessionTileState };

type Props = {
  title: string;
  exerciseCount: number;
  image: ImageSourcePropType;
  state?: SessionTileState;
  onPress?: () => void;
  testID?: string;
};

export default function SessionCard({
  title,
  exerciseCount,
  image,
  state = "available",
  onPress,
  testID,
}: Props) {
  const locked = state === "locked";
  const isCurrent = state === "current";
  const completed = state === "completed";
  const exerciseWord = exerciseCount === 1 ? "Exercise" : "Exercises";

  const content = (
    <View
      style={[
        styles.tile,
        isCurrent && styles.tileCurrent,
        locked && styles.tileLocked,
      ]}
    >
      <View style={[styles.card, theme.shadow.card]}>
        <View style={styles.imageWrap}>
          <Image source={image} style={styles.image} resizeMode="cover" />
          {completed ? (
            <View accessible accessibilityLabel="Completed" style={styles.completedBadge}>
              <Text
                style={styles.completedBadgeText}
                {...(Platform.OS === "android" ? { includeFontPadding: false } : {})}
              >
                Completed
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.captionBlock}>
        <Text
          style={styles.caption}
          numberOfLines={3}
          {...(Platform.OS === "android" ? { includeFontPadding: false } : {})}
        >
          <Text style={styles.captionStrong}>{title}</Text>
          <Text style={styles.captionMeta}>{` | ${exerciseCount} ${exerciseWord}`}</Text>
          {isCurrent ? <Text style={styles.captionMeta}> — Current</Text> : null}
        </Text>
        {locked ? <Text style={styles.statusLocked}>Locked</Text> : null}
      </View>
    </View>
  );

  if (locked || !onPress) {
    return (
      <View
        style={styles.minTouch}
        accessibilityState={{ disabled: true }}
        testID={testID}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.minTouch, pressed && styles.pressed]}
      onPress={onPress}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  minTouch: { minHeight: theme.layout.minTouchTarget },
  pressed: { opacity: 0.92 },
  tile: {
    marginBottom: theme.space.sessionTileGap,
    borderRadius: theme.radius.card,
    borderWidth: 2,
    borderColor: "transparent",
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 4,
  },
  tileCurrent: {
    borderColor: theme.session.currentBorderColor,
  },
  tileLocked: {
    opacity: theme.session.lockedOpacity,
  },
  card: {
    borderRadius: theme.radius.card,
    overflow: "hidden",
    backgroundColor: theme.color.surface,
  },
  imageWrap: {
    position: "relative",
    width: "100%",
  },
  image: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  completedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: theme.color.success,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: "46%",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  completedBadgeText: {
    fontFamily: theme.typography.statusCompleted.fontFamily,
    fontSize: 12,
    color: theme.color.overlayText,
    letterSpacing: 0.2,
  },
  captionBlock: {
    marginTop: theme.space.cardCaptionTop,
    marginBottom: theme.space.cardCaptionBottom,
  },
  caption: {
    ...theme.typography.cardCaption,
  },
  captionStrong: theme.typography.cardCaptionStrong,
  captionMeta: {
    ...theme.typography.cardCaption,
    color: theme.color.caption,
  },
  statusLocked: {
    ...theme.typography.statusLocked,
    marginTop: 4,
  },
});