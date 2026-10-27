import { LocalizedText as Text, LocalizedTextInput as TextInput } from "@/src/LocalizedText";
import React, { useEffect } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { View, Image, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function BotHeader() {
  const robotScale = useSharedValue(0.84);
  const robotRotate = useSharedValue(-12);
  const pulse = useSharedValue(0);

  useEffect(() => {
    robotScale.value = withSequence(
      withSpring(1.14, { damping: 8, stiffness: 180 }),
      withSpring(1),
      withRepeat(
        withSequence(
          withTiming(1.04, { duration: 650 }),
          withTiming(0.98, { duration: 650 })
        ),
        -1,
        true
      )
    );
    robotRotate.value = withSequence(
      withTiming(10, { duration: 170 }),
      withTiming(-7, { duration: 150 }),
      withSpring(0)
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0.15, { duration: 700 })
      ),
      -1,
      true
    );
  }, []);

  const robotStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: robotScale.value },
      { rotate: `${robotRotate.value}deg` },
    ],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + pulse.value * 0.6,
    transform: [{ scale: 1 + pulse.value * 0.14 }],
  }));

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>

      <View style={styles.avatarWrap}>
        <Animated.View pointerEvents="none" style={[styles.avatarPulse, pulseStyle]} />
        <Animated.Image
          source={require("../assets/ai/kmt-bot.png")}
          style={[styles.avatar, robotStyle]}
          resizeMode="contain"
        />
      </View>

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

  avatarWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarPulse: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#22D3EE",
    backgroundColor: "rgba(34, 211, 238, 0.08)",
  },
  avatar: {
    width: 34,
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
