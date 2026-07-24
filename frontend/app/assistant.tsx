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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Apne components import check kar lijiye
import BotHeader from "../components/BotHeader";
import ChatBubble from "../components/ChatBubble";
import ChatInput from "../components/ChatInput";
import TypingIndicator from "../components/TypingIndicator";
import VoiceButton from "../components/VoiceButton";
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
          text: "⚠ Oops! Network issue. Please try again.",
          isUser: false,
        },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
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
          {/* BANNER SECTION */}
          <View style={styles.bannerContainer}>
            <Image
              source={require("../assets/ai/assistant-banner.png")}
              style={styles.banner}
              resizeMode="cover"
            />
            <View style={styles.bannerOverlay} />
            <Text style={styles.bannerTitle}>KMT AI ✨</Text>
          </View>

          {/* MESSAGES AREA */}
          <View style={styles.messagesContainer}>
            {messages.map((item) => (
              <ChatBubble key={item.id} message={item.text} isUser={item.isUser} />
            ))}
            {typing && <TypingIndicator />}
          </View>
        </ScrollView>

        {/* SIRF ROOJGAR BUTTON (Quick Action) */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.roojgarButton}
            onPress={() => router.push("/RoojgarForm")}
            activeOpacity={0.8}
          >
            <Text style={styles.roojgarButtonText}>💼 Roojgar / Jobs</Text>
          </TouchableOpacity>
        </View>

        {/* INPUT AREA */}
        <View style={styles.bottomContainer}>
          <View style={styles.inputWrapper}>
            <ChatInput value={input} onChangeText={setInput} onSend={onSend} />
          </View>
          <View style={styles.voiceBtnWrapper}>
            <VoiceButton onPress={() => console.log("Voice Assistant triggered")} />
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
    paddingBottom: 16,
  },
  bannerContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    overflow: "hidden",
    height: 120,
    position: "relative",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  banner: {
    width: "100%",
    height: "100%",
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.3)",
  },
  bannerTitle: {
    position: "absolute",
    bottom: 12,
    left: 16,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "flex-start", // Left aligned premium chip
  },
  roojgarButton: {
    backgroundColor: "#1E293B",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#334155",
  },
  roojgarButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  bottomContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 8 : 16,
    backgroundColor: "#0F172A",
    borderTopWidth: 1,
    borderColor: "#1E293B",
  },
  inputWrapper: {
    flex: 1,
    marginRight: 10,
  },
  voiceBtnWrapper: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
});
