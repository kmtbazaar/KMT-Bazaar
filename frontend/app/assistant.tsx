
import VoiceButton from "../components/VoiceButton";
import React, { useRef, useState, useEffect } from "react";
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

  const [aiConnected, setAiConnected] = useState(false);
const [conversationCount, setConversationCount] = useState(1);

 const onSend = async () => {
  if (!input.trim()) return;

  const userMessage = {
    id: Date.now(),
    text: input,
    isUser: true,
  };

  setMessages((prev) => [...prev, userMessage]);

  setInput("");
  setConversationCount((prev) => prev + 1);
  setTyping(true);

  try {
    const response = await askAI(input);

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
        text: "⚠ AI Service Error",
        isUser: false,
      },
    ]);
  }
};
 return (
  <SafeAreaView style={styles.container}>
    <BotHeader />

    <Image
      source={require("../assets/ai/assistant-banner.png")}
      style={styles.banner}
      resizeMode="cover"
    />

{/* Future Status */}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.chat}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((item) => (
            <ChatBubble
              key={item.id}
              message={item.text}
              isUser={item.isUser}
            />
          ))}

          {typing && <TypingIndicator />}
        </ScrollView>

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
  bottomContainer: {
  flexDirection: "row",
  alignItems: "flex-end",
  paddingHorizontal: 12,
  paddingBottom: 10,
  backgroundColor: "#0A1224",
},
});