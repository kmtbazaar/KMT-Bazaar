import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AssistantScreen() {
  const [message, setMessage] = useState("");

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🤖 KMT AI Assistant</Text>
        <Text style={styles.subtitle}>
          Welcome! How can I help you today?
        </Text>
      </View>

      <View style={styles.chatArea}>
        <View style={styles.botBubble}>
          <Text style={styles.botText}>
            👋 Hello! Ask me anything about KMT Bazaar.
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.inputRow}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Type your message..."
            placeholderTextColor="#888"
            style={styles.input}
          />

          <Pressable style={styles.sendBtn}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1224",
  },

  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },

  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },

  subtitle: {
    color: "#aaa",
    marginTop: 6,
  },

  chatArea: {
    flex: 1,
    padding: 20,
  },

  botBubble: {
    backgroundColor: "#1B2945",
    padding: 15,
    borderRadius: 15,
    alignSelf: "flex-start",
  },

  botText: {
    color: "#fff",
    fontSize: 16,
  },

  inputRow: {
    flexDirection: "row",
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#222",
  },

  input: {
    flex: 1,
    backgroundColor: "#1B2945",
    color: "#fff",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
  },

  sendBtn: {
    marginLeft: 10,
    backgroundColor: "#FF6B00",
    paddingHorizontal: 20,
    justifyContent: "center",
    borderRadius: 12,
  },

  sendText: {
    color: "#fff",
    fontWeight: "700",
  },
});