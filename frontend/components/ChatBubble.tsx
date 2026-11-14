import { LocalizedText as Text, LocalizedTextInput as TextInput } from "@/src/LocalizedText";
import React from "react";
import { View, StyleSheet } from "react-native";

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
    borderWidth: 1,
    borderColor: "rgba(226,245,255,0.24)",
    shadowColor: "#A5F3FC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 1,
  },
  botBubble: {
    backgroundColor: "rgba(226,245,255,0.095)",
    borderTopLeftRadius: 6,
  },
  userBubble: {
    backgroundColor: "rgba(186,230,253,0.19)",
    borderColor: "rgba(207,250,254,0.40)",
    borderTopRightRadius: 6,
  },
  text: {
    color: "#F4FBFF",
    fontSize: 15,
    lineHeight: 22,
  },
});
