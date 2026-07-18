import React, { useEffect } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Image,
} from "react-native";

import { useRouter } from "expo-router";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
} from "react-native-reanimated";

export default function AIAssistant() {
  const router = useRouter();

  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.92);
        }}
        onPressOut={() => {
          scale.value = withSpring(1.08);
        }}
        onPress={() => router.push("/assistant")}
      >
        <Animated.View style={[styles.button, animatedStyle]}>
          <Image
            source={require("../assets/ai/kmt-bot.png")}
            style={styles.image}
            resizeMode="contain"
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 20,
    bottom: 30,
    zIndex: 9999,
  },

  button: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: "hidden",
    backgroundColor: "transparent",
  },

  image: {
    width: "100%",
    height: "100%",
  },
});