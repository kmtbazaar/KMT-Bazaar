import { LocalizedText as Text } from "@/src/LocalizedText";
import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import RobotCompanion3D from "../src/components/RobotCompanion3D";

type BotHeaderProps = {
  talking?: boolean;
  onRobotPress?: () => void;
};

export default function BotHeader({ talking = false, onRobotPress }: BotHeaderProps) {
  return (
    <View style={styles.container}>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#101828",
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  backButton: {
    marginRight: 10,
    padding: 4,
  },
  avatarWrap: {
    width: 58,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    marginRight: 6,
  },
  status: {
    color: "#9ca3af",
    fontSize: 10,
    fontWeight: "600",
  },
});
