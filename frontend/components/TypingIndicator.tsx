import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

export default function TypingIndicator() {
  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={styles.container}
    >
      <View style={styles.dot} />
      <View style={styles.dot} />
      <View style={styles.dot} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: "rgba(226,245,255,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(226,245,255,0.28)",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DDF7FF",
    marginHorizontal: 3,
    shadowColor: "#A5F3FC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 4,
  },
});
