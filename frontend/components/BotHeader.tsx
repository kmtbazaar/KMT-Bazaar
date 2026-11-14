import { LocalizedText as Text } from "@/src/LocalizedText";
import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import RobotCompanion3D from "../src/components/RobotCompanion3D";

type BotHeaderProps = {
  talking?: boolean;
  onRobotPress?: () => void;
};

export default function BotHeader({ talking = false, onRobotPress }: BotHeaderProps) {
  return (
    <View style={styles.container}>
      <BlurView intensity={42} tint="dark" style={StyleSheet.absoluteFillObject} />
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>

      <View style={styles.avatarWrap} testID="assistant-live-robot">
        <RobotCompanion3D
          size={54}
          talking={talking}
          onActivate={onRobotPress}
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.title}>KMT Bazaar Live Guide</Text>
        <View style={styles.statusRow}>
          <View style={styles.dot} />
          <Text style={styles.status}>{talking ? "Listening / Speaking" : "Online · Tap robot to talk"}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "rgba(224,242,254,0.075)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(224,242,254,0.24)",
  },
  backButton: {
    width: 34,
    height: 34,
    marginRight: 8,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.11)",
    borderWidth: 1,
    borderColor: "rgba(240,252,255,0.36)",
  },
  avatarWrap: {
    width: 62,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(207,250,254,0.25)",
  },
  info: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },
  title: {
    color: "#F4FBFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#A7F3D0",
    marginRight: 6,
    shadowColor: "#A7F3D0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  status: {
    color: "#C8E4F2",
    fontSize: 10,
    fontWeight: "600",
  },
});
