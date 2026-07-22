import { router } from "expo-router";
import VoiceButton from "../components/VoiceButton";
import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  Text,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import BotHeader from "../components/BotHeader";
import ChatBubble from "../components/ChatBubble";
import ChatInput from "../components/ChatInput";
import TypingIndicator from "../components/TypingIndicator";
import { askAI } from "../services/ai";

type Message = {
  id: number;
  text: string;
  isUser: boolean;
};

export default function AssistantScreen() {
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "🙏 Namaste! Welcome to KMT Bazaar AI Assistant.\nHow can I help you today?",
      isUser: false,
    },
  ]);

  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  // Normal send (typing ke liye)
  const onSend = async () => {
    if (!input.trim()) return;
    const currentInput = input;
    setInput(""); // Input turant clear kar do
    await processMessage(currentInput);
  };

  // Core logic message send karne ke liye
  const processMessage = async (textToSend: string) => {
    const userMessage = {
      id: Date.now(),
      text: textToSend,
      isUser: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setTyping(true);

    try {
      const response = await askAI(textToSend);
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: response.message,
          isUser: false,
        },
      ]);
    } catch (error) {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "⚠ AI Service Error (Please wait or check connection)",
          isUser: false,
        },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BotHeader />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.chat}
          contentContainerStyle={{ paddingBottom: 16 }}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {/* Banner */}
          <Image
            source={require("../assets/ai/assistant-banner.png")}
            style={styles.banner}
            resizeMode="cover"
          />

          {/* Messages */}
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            {messages.map((item) => (
              <ChatBubble
                key={item.id}
                message={item.text}
                isUser={item.isUser}
              />
            ))}
            {typing && <TypingIndicator />}
          </View>
        </ScrollView>

        {/* Naya Roojgar Button Area - Yahan Navigation Add Kiya Hai */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.roojgarButton}
            onPress={() => router.push("/RoojgarForm")}
          >
            <Text style={styles.roojgarButtonText}>💼 Roojgar / Jobs</Text>
          </TouchableOpacity>
        </View>

        {/* Input Area */}
        <View style={styles.bottomContainer}>
          <View style={{ flex: 1 }}>
            <ChatInput
              value={input}
              onChangeText={setInput}
              onSend={onSend}
            />
          </View>

          <VoiceButton
            onPress={() => {
              console.log("Voice Assistant");
            }}
          />
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
  banner: {
    width: "100%",
    height: 220,
  },
  chat: {
    flex: 1,
  },
  quickActionsContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  roojgarButton: {
    backgroundColor: "#1E2A47", 
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#3A4A73",
  },
  roojgarButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: "#0A1224",
  },
});