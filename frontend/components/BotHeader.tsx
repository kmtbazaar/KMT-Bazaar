import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function BotHeader() {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>

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
    paddingHorizontal: 14,
    paddingVertical: 6, // 🔥 Height ko patla kar diya (pehle 15 tha)
    backgroundColor: "#101828",
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },

  backButton: {
    marginRight: 10,
    padding: 2,
  },

  avatar: {
    width: 34,  // 🔥 Avatar size chota kar diya (pehle 55 tha)
    height: 34,
    borderRadius: 17,
  },

  info: {
    marginLeft: 10,
  },

  title: {
    color: "#fff",
    fontSize: 14, // 🔥 Font size compact kiya (pehle 18 tha)
    fontWeight: "600",
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1, // 🔥 Gap kam kiya
  },

  dot: {
    width: 6,   // 🔥 Dot chota kiya (pehle 10 tha)
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
    marginRight: 4,
  },

  status: {
    color: "#9ca3af",
    fontSize: 10, // 🔥 Status text chota kiya (pehle 13 tha)
  },
});
