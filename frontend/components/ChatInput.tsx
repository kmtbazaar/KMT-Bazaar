import React from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
};

export default function ChatInput({
  value,
  onChangeText,
  onSend,
}: Props) {
  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Ask anything about KMT Bazaar..."
        placeholderTextColor="#9ca3af"
        value={value}
        onChangeText={onChangeText}
        multiline
        style={styles.input}
      />

      <Pressable style={styles.sendButton} onPress={onSend}>
        <Text style={styles.sendText}>➤</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 15,
    backgroundColor: "#0A1224",
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
  },

  input: {
    flex: 1,
    minHeight: 50,
    maxHeight: 120,
    backgroundColor: "#1f2937",
    color: "#fff",
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
  },

  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ff6b00",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },

  sendText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
});