// components/SessionCard.tsx
import React from "react";
import { View, Text, Image, StyleSheet, ImageSourcePropType } from "react-native";

type Props = { title: string; subtitle: string; image: ImageSourcePropType };

export default function SessionCard({ title, subtitle, image }: Props) {
  return (
    <View style={styles.card}>
      <Image source={image} style={styles.image} resizeMode="cover" />
      <Text style={styles.meta}>
        <Text style={styles.metaStrong}>{title}</Text>
        <Text> | {subtitle}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 8,
  },
  image: { width: "100%", aspectRatio: 16 / 9 },
  meta: { paddingHorizontal: 12, paddingVertical: 12, color: "#374151", fontSize: 18 },
  metaStrong: { fontWeight: "800", color: "#1F2937" },
});
