import { LocalizedText as Text, LocalizedTextInput as TextInput } from "@/src/LocalizedText";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import Animated, { ZoomIn } from "react-native-reanimated";
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<"en-IN" | "hi-IN">("en-IN");
  const [voiceStatus, setVoiceStatus] = useState("");
  const recognitionRef = useRef<any>(null);
  const voiceModeRef = useRef(false);

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
      if (voiceModeRef.current) speakText(response.message);
    } catch (error) {
      setTyping(false);
      const message =
        error instanceof Error
          ? error.message
          : "AI request failed. Please try again.";
      setVoiceStatus(voiceModeRef.current ? "AI response failed." : "");
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: `⚠ ${message}`,
          isUser: false,
        },
      ]);
    }
  };

  const speakText = (text: string) => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      setVoiceStatus("Voice playback is currently available in the website browser.");
      return;
    }
    const browserWindow = window as any;
    const synthesis = browserWindow.speechSynthesis;
    const Utterance = browserWindow.SpeechSynthesisUtterance ||
      (globalThis as any).SpeechSynthesisUtterance;
    if (!synthesis || !Utterance) {
      setVoiceStatus("Voice playback is not supported by this browser.");
      return;
    }

    synthesis.cancel();
    const utterance = new Utterance(text);
    utterance.lang = voiceLanguage;
    utterance.rate = 0.96;
    utterance.pitch = 1.04;
    utterance.onstart = () => {
      setSpeaking(true);
      setVoiceStatus("KMT AI is speaking…");
    };
    utterance.onend = () => {
      setSpeaking(false);
      if (voiceModeRef.current) {
        setVoiceStatus("Voice mode on — speak when ready.");
        startListening();
      }
    };
    utterance.onerror = () => {
      setSpeaking(false);
      if (voiceModeRef.current) setVoiceStatus("Voice playback failed. Check browser sound settings.");
    };
    synthesis.speak(utterance);
  };

  const startListening = () => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      setVoiceStatus("Voice input currently works in supported website browsers.");
      if (voiceModeRef.current) {
        voiceModeRef.current = false;
        setVoiceMode(false);
      }
      return;
    }

    const browserWindow = window as any;
    const SpeechRecognition = browserWindow.SpeechRecognition ||
      browserWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus("Voice input needs a browser with speech recognition, such as Chrome or Edge. You can still type to chat.");
      if (voiceModeRef.current) {
        voiceModeRef.current = false;
        setVoiceMode(false);
      }
      return;
    }

    try {
      recognitionRef.current?.stop();
    } catch {}

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = voiceLanguage;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        setListening(true);
        setVoiceStatus(voiceModeRef.current ? "Voice mode on — speak now." : "Listening… speak now.");
      };
      recognition.onresult = (event: any) => {
        const spoken = String(event?.results?.[0]?.[0]?.transcript || "").trim();
        if (!spoken) {
          setVoiceStatus("No speech detected. Tap the mic and try again.");
          return;
        }
        if (voiceModeRef.current) {
          setInput("");
          setVoiceStatus("You spoke — KMT AI is thinking…");
          void processMessage(spoken);
        } else {
          setInput(spoken);
          setVoiceStatus("Voice captured. Press send to ask.");
        }
      };
      recognition.onerror = (event: any) => {
        setListening(false);
        const code = String(event?.error || "");
        if (code === "not-allowed" || code === "service-not-allowed") {
          setVoiceStatus("Microphone permission is blocked. Allow microphone access for kmtbazaar.com in browser site settings.");
        } else if (code === "no-speech") {
          setVoiceStatus("No speech detected. Tap the mic and try again.");
        } else {
          setVoiceStatus("Voice input failed. Check microphone permission and try again.");
        }
        if (voiceModeRef.current && code !== "no-speech") {
          voiceModeRef.current = false;
          setVoiceMode(false);
        }
      };
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
      setVoiceStatus("Requesting microphone permission…");
      recognition.start();
    } catch {
      setListening(false);
      setVoiceStatus("Could not start microphone. Check site permissions and try again.");
    }
  };

  const toggleVoiceMode = () => {
    if (voiceModeRef.current) {
      voiceModeRef.current = false;
      setVoiceMode(false);
      setListening(false);
      setSpeaking(false);
      try { recognitionRef.current?.stop(); } catch {}
      if (Platform.OS === "web" && typeof window !== "undefined") {
        (window as any).speechSynthesis?.cancel();
      }
      setVoiceStatus("Voice mode is off.");
      return;
    }

    voiceModeRef.current = true;
    setVoiceMode(true);
    setVoiceStatus("Starting voice mode…");
    startListening();
  };

  useEffect(() => {
    return () => {
      voiceModeRef.current = false;
      try { recognitionRef.current?.stop(); } catch {}
      if (Platform.OS === "web" && typeof window !== "undefined") {
        (window as any).speechSynthesis?.cancel();
      }
    };
  }, []);

  // Send typed text, or start speech recognition when the input is empty.
  const handleActionPress = () => {
    if (input.trim().length > 0) {
      onSend();
    } else if (listening) {
      try { recognitionRef.current?.stop(); } catch {}
      setVoiceStatus("Voice input paused.");
    } else {
      startListening();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]} edges={[]}>
      <Animated.View entering={ZoomIn.duration(320).springify()} style={styles.panel}>
      {/* 1. PATLA HEADER */}
      <BotHeader />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.roojgarButton}
              onPress={() => router.push("/RoojgarForm")}
              activeOpacity={0.8}
            >
              <Text style={styles.roojgarButtonText}>💼 Roojgar / Jobs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.voiceModeButton, voiceMode && styles.voiceModeButtonActive]}
              onPress={toggleVoiceMode}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={voiceMode ? "Turn voice mode off" : "Turn voice mode on"}
            >
              <MaterialCommunityIcons
                name={voiceMode ? "waveform" : "microphone"}
                size={16}
                color={voiceMode ? "#67E8F9" : "#CBD5E1"}
              />
              <Text style={[styles.voiceModeButtonText, voiceMode && styles.voiceModeButtonTextActive]}>
                {voiceMode ? "Voice ON" : "Voice Mode"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.voiceLanguageButton}
              onPress={() => {
                setVoiceLanguage((current) => current === "en-IN" ? "hi-IN" : "en-IN");
                setVoiceStatus("Voice language: " + (voiceLanguage === "en-IN" ? "Hindi" : "English") + ". Tap the mic to use it.");
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Switch voice language"
            >
              <Text style={styles.voiceLanguageButtonText}>{voiceLanguage === "en-IN" ? "EN" : "हिं"}</Text>
            </TouchableOpacity>
          </View>
          {!!voiceStatus && (
            <Text style={styles.voiceStatus} numberOfLines={2}>
              {listening ? "Listening… " + voiceStatus : speaking ? "Speaking… " + voiceStatus : voiceStatus}
            </Text>
          )}
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
                input.trim().length > 0
                  ? styles.sendBtnBg
                  : listening ? styles.listeningBtnBg : styles.voiceBtnBg,
              ]}
              onPress={handleActionPress}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={input.trim().length > 0 ? "send" : listening ? "stop-circle" : "microphone"}
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    backgroundColor: "rgba(2, 6, 23, 0.72)",
  },
  panel: {
    width: "100%",
    maxWidth: 620,
    height: Platform.OS === "web" ? "82%" : "88%",
    maxHeight: 740,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
    backgroundColor: "#0F172A",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.36,
    shadowRadius: 28,
    elevation: 18,
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
    height: 112, // Compact banner fits the centered AI panel better
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
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#0F172A",
  },
  quickActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  roojgarButton: {
    backgroundColor: "#1E293B",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  voiceModeButton: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#475569",
    backgroundColor: "#172033",
  },
  voiceModeButtonActive: {
    borderColor: "#0891B2",
    backgroundColor: "#083344",
  },
  voiceModeButtonText: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "700",
  },
  voiceModeButtonTextActive: {
    color: "#A5F3FC",
  },
  voiceLanguageButton: {
    minWidth: 34,
    minHeight: 30,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#475569",
    backgroundColor: "#172033",
  },
  voiceLanguageButtonText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "800",
  },
  voiceStatus: {
    color: "#CBD5E1",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 4,
    marginHorizontal: 4,
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
    backgroundColor: "#3B82F6",
  },
  listeningBtnBg: {
    backgroundColor: "#DC2626",
  },
  sendBtnBg: {
    backgroundColor: "#10B981", // Green for Send
  },
});
