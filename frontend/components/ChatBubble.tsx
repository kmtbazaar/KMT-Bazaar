import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = {
  message: string;
  isUser?: boolean;
};

export default function ChatBubble({
  message,
  isUser = false,
}: Props) {
  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.botContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.botBubble,
        ]}
      >
        <Text
          style={[
            styles.text,
            isUser && { color: "#ffffff" },
          ]}
        >
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: "100%",
  },

  botContainer: {
    alignItems: "flex-start",
  },

  userContainer: {
    alignItems: "flex-end",
  },

  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },

  botBubble: {
    backgroundColor: "#1f2937",
    borderTopLeftRadius: 6,
  },

  userBubble: {
    backgroundColor: "#ff6b00",
    borderTopRightRadius: 6,
  },

  text: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 22,
  },
});