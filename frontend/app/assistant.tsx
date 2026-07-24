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

  // Dual button logic (Send vs Voice)
  const handleActionPress = () => {
    if (input.trim().length > 0) {
      onSend();
    } else {
      console.log("Voice Recording Triggered");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* 1. PATLA HEADER */}
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
          {/* 2. CHOTA BANNER */}
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

        {/* ROOJGAR BUTTON */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.roojgarButton}
            onPress={() => router.push("/RoojgarForm")}
            activeOpacity={0.8}
          >
            <Text style={styles.roojgarButtonText}>💼 Roojgar / Jobs</Text>
          </TouchableOpacity>
        </View>

        {/* 3. MOTA/SPACIOUS BOTTOM INPUT AREA */}
        <View style={styles.bottomContainer}>
          <View style={styles.motaInputWrapper}>
            <TextInput
              style={styles.motaInput}
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
                size={20}
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
  // Chota Banner Style
  bannerContainer: {
    marginHorizontal: 12,
    marginTop: 6,
    height: 80, // 🔥 Banner ko chota kar diya
    borderRadius: 10,
    overflow: "hidden",
  },
  banner: {
    width: "100%",
    height: "100%",
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: "flex-start",
  },
  roojgarButton: {
    backgroundColor: "#1E293B",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  roojgarButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  // Mota/Spacious Bottom Input Area Style
  bottomContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 10 : 14,
    backgroundColor: "#0F172A",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
  },
  motaInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 28, // 🔥 Thoda aur rounded aur mota feel dene ke liye
    paddingHorizontal: 14,
    paddingVertical: 6,   // 🔥 Thoda mota height padding
    borderWidth: 1.5,
    borderColor: "#334155",
  },
  motaInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    height: 44, // 🔥 Input box ki height thoda moti/badi ki hai
    paddingHorizontal: 4,
  },
  actionBtn: {
    width: 38,  // 🔥 Button bhi thoda bada/mota kiya hai
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  voiceBtnBg: {
    backgroundColor: "#3B82F6", // Blue for Mic
  },
  sendBtnBg: {
    backgroundColor: "#10B981", // Green for Send
  },
});
