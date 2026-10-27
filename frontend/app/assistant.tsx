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
import { askAI, transcribeVoice } from "../services/ai";

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
  const [voiceStatus, setVoiceStatus] = useState("");
  const voiceModeRef = useRef(false);
  const mediaRecorderRef = useRef<any>(null);
  const mediaStreamRef = useRef<any>(null);
  const audioContextRef = useRef<any>(null);
  const analyserRef = useRef<any>(null);
  const sourceNodeRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const discardRecordingRef = useRef(false);
  const speechDetectedRef = useRef(false);
  const noSpeechTimeoutRef = useRef(false);
  const captureStartedAtRef = useRef(0);
  const lastSpeechAtRef = useRef(0);
  const replyLocaleRef = useRef<"hi-IN" | "en-IN">("en-IN");

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
      if (voiceModeRef.current) speakText(response.message, replyLocaleRef.current);
    } catch (error) {
      setTyping(false);
      const message =
        error instanceof Error
          ? error.message
          : "AI request failed. Please try again.";
      if (voiceModeRef.current) {
        voiceModeRef.current = false;
        setVoiceMode(false);
        setVoiceStatus(message);
      } else {
        setVoiceStatus("");
      }
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

  const inferVoiceLocale = (text: string, fallback: "hi-IN" | "en-IN") => {
    const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
    return devanagariCount >= 3 ? "hi-IN" : fallback;
  };

  const releaseVoiceResources = () => {
    if (silenceTimerRef.current && typeof window !== "undefined") {
      window.clearInterval(silenceTimerRef.current);
    }
    silenceTimerRef.current = null;
    try { sourceNodeRef.current?.disconnect(); } catch {}
    sourceNodeRef.current = null;
    analyserRef.current = null;
    try { void audioContextRef.current?.close(); } catch {}
    audioContextRef.current = null;
    try {
      mediaStreamRef.current?.getTracks?.().forEach((track: any) => track.stop());
    } catch {}
    mediaStreamRef.current = null;
  };

  const speakText = (text: string, fallbackLocale: "hi-IN" | "en-IN") => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      setVoiceStatus("Spoken replies are available in the website browser.");
      return;
    }
    const browserWindow = window as any;
    const synthesis = browserWindow.speechSynthesis;
    const Utterance = browserWindow.SpeechSynthesisUtterance ||
      (globalThis as any).SpeechSynthesisUtterance;
    if (!synthesis || !Utterance) {
      setVoiceStatus("Your browser does not support spoken replies.");
      if (voiceModeRef.current) void startVoiceCapture();
      return;
    }

    synthesis.cancel();
    const utterance = new Utterance(text);
    utterance.lang = inferVoiceLocale(text, fallbackLocale);
    utterance.rate = 0.96;
    utterance.pitch = 1.04;
    utterance.onstart = () => {
      setSpeaking(true);
      setVoiceStatus("KMT AI is replying aloud…");
    };
    utterance.onend = () => {
      setSpeaking(false);
      if (voiceModeRef.current) {
        setVoiceStatus("Mic active · Hindi/English auto-detect");
        void startVoiceCapture();
      }
    };
    utterance.onerror = () => {
      setSpeaking(false);
      if (voiceModeRef.current) {
        setVoiceStatus("Spoken reply unavailable; listening again.");
        void startVoiceCapture();
      }
    };
    synthesis.speak(utterance);
  };

  const startVoiceCapture = async () => {
    if (!voiceModeRef.current || Platform.OS !== "web" || typeof window === "undefined") return;

    const browserWindow = window as any;
    const MediaRecorderCtor = browserWindow.MediaRecorder;
    const mediaDevices = browserWindow.navigator?.mediaDevices;
    if (!MediaRecorderCtor || !mediaDevices?.getUserMedia) {
      setVoiceStatus("This browser does not support microphone recording. Please use a current browser over HTTPS.");
      voiceModeRef.current = false;
      setVoiceMode(false);
      return;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") return;

    try {
      setVoiceStatus("Requesting microphone access…");
      const stream = await mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (!voiceModeRef.current) {
        stream.getTracks().forEach((track: any) => track.stop());
        return;
      }
      mediaStreamRef.current = stream;

      const AudioContextCtor = browserWindow.AudioContext || browserWindow.webkitAudioContext;
      if (AudioContextCtor) {
        try {
          const audioContext = new AudioContextCtor();
          await audioContext.resume();
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 1024;
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);
          audioContextRef.current = audioContext;
          analyserRef.current = analyser;
          sourceNodeRef.current = source;
        } catch {
          // A fixed maximum recording duration still protects browsers without an analyser.
        }
      }

      const mimeCandidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/ogg",
      ];
      const mimeType = mimeCandidates.find((type) =>
        typeof MediaRecorderCtor.isTypeSupported === "function" &&
        MediaRecorderCtor.isTypeSupported(type)
      );
      const recorder = mimeType
        ? new MediaRecorderCtor(stream, { mimeType })
        : new MediaRecorderCtor(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      discardRecordingRef.current = false;
      speechDetectedRef.current = false;
      noSpeechTimeoutRef.current = false;
      captureStartedAtRef.current = Date.now();
      lastSpeechAtRef.current = Date.now();

      recorder.ondataavailable = (event: any) => {
        if (event?.data?.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        if (silenceTimerRef.current) window.clearInterval(silenceTimerRef.current);
        silenceTimerRef.current = null;
        const shouldDiscard = discardRecordingRef.current || !voiceModeRef.current;
        const recordedParts = audioChunksRef.current;
        audioChunksRef.current = [];
        const blob = new Blob(recordedParts, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });
        if (mediaRecorderRef.current === recorder) mediaRecorderRef.current = null;
        releaseVoiceResources();
        setListening(false);
        discardRecordingRef.current = false;
        if (shouldDiscard) return;

        if (noSpeechTimeoutRef.current || blob.size < 1000) {
          setVoiceStatus("No speech detected · listening again");
          window.setTimeout(() => {
            if (voiceModeRef.current) void startVoiceCapture();
          }, 700);
          return;
        }

        try {
          setVoiceStatus("Detecting language and understanding speech…");
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("Could not read microphone recording."));
            reader.readAsDataURL(blob);
          });
          const comma = dataUrl.indexOf(",");
          const audioBase64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
          const safeMimeType = String(blob.type || mimeType || "audio/webm").split(";")[0];
          const result = await transcribeVoice(audioBase64, safeMimeType);
          const spoken = result.transcript.trim();
          if (!voiceModeRef.current) return;
          if (!spoken) throw new Error("No speech detected. Please try again.");

          replyLocaleRef.current = inferVoiceLocale(spoken, "en-IN");
          setVoiceStatus("Speech detected · KMT AI is thinking…");
          await processMessage(spoken);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Voice input failed. Please try again.";
          setVoiceStatus(message);
          voiceModeRef.current = false;
          setVoiceMode(false);
        }
      };

      recorder.onerror = () => {
        setVoiceStatus("Microphone recording failed. Check the site microphone permission.");
        voiceModeRef.current = false;
        setVoiceMode(false);
        releaseVoiceResources();
        setListening(false);
      };

      recorder.start(250);
      setListening(true);
      setVoiceStatus("Mic active · Hindi/English auto-detect");

      silenceTimerRef.current = window.setInterval(() => {
        if (recorder.state !== "recording") return;
        const now = Date.now();
        const analyser = analyserRef.current;
        let rms = 0;
        if (analyser) {
          const samples = new Uint8Array(analyser.fftSize);
          analyser.getByteTimeDomainData(samples);
          let total = 0;
          for (let i = 0; i < samples.length; i += 1) {
            const value = (samples[i] - 128) / 128;
            total += value * value;
          }
          rms = Math.sqrt(total / samples.length);
        }
        if (rms > 0.025) {
          speechDetectedRef.current = true;
          lastSpeechAtRef.current = now;
        }
        const elapsed = now - captureStartedAtRef.current;
        if (!speechDetectedRef.current && elapsed >= 9000) {
          noSpeechTimeoutRef.current = true;
          recorder.stop();
        } else if (
          (speechDetectedRef.current && now - lastSpeechAtRef.current >= 1350) ||
          elapsed >= 20000
        ) {
          recorder.stop();
        }
      }, 150);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setListening(false);
      releaseVoiceResources();
      voiceModeRef.current = false;
      setVoiceMode(false);
      setVoiceStatus(
        message.toLowerCase().includes("permission") || message.toLowerCase().includes("denied")
          ? "Microphone permission blocked. Allow microphone access for kmtbazaar.com."
          : "Could not start microphone. Check browser permission and try again."
      );
    }
  };

  const toggleVoiceMode = () => {
    if (voiceModeRef.current) {
      voiceModeRef.current = false;
      setVoiceMode(false);
      setListening(false);
      setSpeaking(false);
      discardRecordingRef.current = true;
      try {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state === "recording") recorder.stop();
      } catch {}
      releaseVoiceResources();
      if (Platform.OS === "web" && typeof window !== "undefined") {
        (window as any).speechSynthesis?.cancel();
      }
      setVoiceStatus("Voice conversation stopped.");
      return;
    }

    if (Platform.OS !== "web") {
      setVoiceStatus("Voice conversation is currently available on the website.");
      return;
    }
    voiceModeRef.current = true;
    setVoiceMode(true);
    setVoiceStatus("Starting microphone…");
    void startVoiceCapture();
  };

  useEffect(() => {
    return () => {
      voiceModeRef.current = false;
      discardRecordingRef.current = true;
      try {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state === "recording") recorder.stop();
      } catch {}
      releaseVoiceResources();
      if (Platform.OS === "web" && typeof window !== "undefined") {
        (window as any).speechSynthesis?.cancel();
      }
    };
  }, []);

  const handleActionPress = () => {
    if (input.trim().length > 0) {
      void onSend();
    } else {
      toggleVoiceMode();
    }
  };

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
          <TouchableOpacity
            style={styles.roojgarButton}
            onPress={() => router.push("/RoojgarForm")}
            activeOpacity={0.8}
          >
            <Text style={styles.roojgarButtonText}>💼 Roojgar / Jobs</Text>
          </TouchableOpacity>
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
                  : voiceMode ? styles.voiceModeActiveBtn : styles.voiceBtnBg,
              ]}
              onPress={handleActionPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={input.trim().length > 0 ? "Send message" : voiceMode ? "Stop voice conversation" : "Start voice conversation"}
            >
              <MaterialCommunityIcons
                name={input.trim().length > 0 ? "send" : voiceMode ? "stop-circle" : "microphone"}
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
  roojgarButton: {
    backgroundColor: "#1E293B",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
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
  voiceModeActiveBtn: {
    backgroundColor: "#0891B2",
  },
  sendBtnBg: {
    backgroundColor: "#10B981", // Green for Send
  },
});
