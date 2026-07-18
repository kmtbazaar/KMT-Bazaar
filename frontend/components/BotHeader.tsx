import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

export default function BotHeader() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/ai/kmt-bot.png")}
        style={styles.avatar}
      />

      <View style={styles.info}>
        <Text style={styles.title}>KMT AI Assistant</Text>

        <View style={styles.statusRow}>
          <View style={styles.dot} />
          <Text style={styles.status}>Online</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 15,
    backgroundColor: "#101828",
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },

  avatar: {
    width: 55,
    height: 55,
    borderRadius: 30,
  },

  info: {
    marginLeft: 14,
  },

  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
    marginRight: 6,
  },

  status: {
    color: "#9ca3af",
    fontSize: 13,
  },
});