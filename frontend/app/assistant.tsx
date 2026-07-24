import { router } from "expo-router";
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
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import BotHeader from "../components/BotHeader";
import ChatBubble from "../components/ChatBubble";
import TypingIndicator from "../components/TypingIndicator";
import { askAI } from "../services/ai";

type Message = {
  id: number;
  text: string;
  isUser: boolean;
};

export default function AssistantScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "🙏 Namaste! Welcome to KMT Bazaar AI Assistant.\nHow can I help you today?",
      isUser: false,
    },
  ]);

  const onSend = async () => {
    if (!input.trim()) return;
    const currentInput = input;
    setInput("");
    await processMessage(currentInput);
  };

  const processMessage = async (textToSend: string) => {
    const userMessage = { id: Date.now(), text: textToSend, isUser: true };
    setMessages((prev) => [...prev, userMessage]);
    setTyping(true);

    try {
      const response = await askAI(textToSend);
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, text: response.message, isUser: false },
      ]);
    } catch (error) {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "⚠ Network issue. Please try again.",
          isUser: false,
        },
      ]);
    }
  };

  // Button switch logic (Voice vs Send)
  const handleActionPress = () => {
    if (input.trim().length > 0) {
      onSend();
    } else {
      console.log("Voice Recording Triggered");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* 🟢 SLIM HEADER (BotHeader file se slim hoga) */}
      <BotHeader />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.chat}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {/* BANNER (Wapas Pehle Jaisa Normal/Full) */}
          <View style={styles.bannerContainer}>
            <Image
              source={require("../assets/ai/assistant-banner.png")}
              style={styles.banner}
              resizeMode="cover"
            />
          </View>

          {/* MESSAGES */}
          <View style={styles.messagesContainer}>
            {messages.map((item) => (
              <ChatBubble key={item.id} message={item.text} isUser={item.isUser} />
            ))}
            {typing && <TypingIndicator />}
          </View>
        </ScrollView>

        {/* SIRF ROOJGAR BUTTON */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.roojgarButton}
            onPress={() => router.push("/RoojgarForm")}
            activeOpacity={0.8}
          >
            <Text style={styles.roojgarButtonText}>💼 Roojgar / Jobs</Text>
          </TouchableOpacity>
        </View>

        {/* COMPACT & PATLA BOTTOM INPUT AREA */}
        <View style={styles.bottomContainer}>
          <View style={styles.compactInputWrapper}>
            <TextInput
              style={styles.slimInput}
              value={input}
              onChangeText={setInput}
              placeholder="Ask anything..."
              placeholderTextColor="#64748B"
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={onSend}
            />

            {/* DUAL BUTTON (SEND / MIC) */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                input.trim().length > 0 ? styles.sendBtnBg : styles.voiceBtnBg,
              ]}
              onPress={handleActionPress}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={input.trim().length > 0 ? "send" : "microphone"}
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  chat: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  bannerContainer: {
    width: "100%",
    height: 180, // Normal Banner Height
  },
  banner: {
    width: "100%",
    height: "100%",
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: "flex-start",
  },
  roojgarButton: {
    backgroundColor: "#1E293B",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  roojgarButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  bottomContainer: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: Platform.OS === "ios" ? 10 : 12,
    backgroundColor: "#0F172A",
  },
  compactInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 24,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  slimInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    height: 38,
    paddingHorizontal: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  voiceBtnBg: {
    backgroundColor: "#3B82F6",
  },
  sendBtnBg: {
    backgroundColor: "#10B981",
  },
});
