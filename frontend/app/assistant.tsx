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
  TouchableOpacity,
  } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

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
      text: "🙏 Namaste! Main KMT Bazaar ka live guide hoon. Products, stores, orders aur Roojgar / Jobs se judi help ke liye poochhiye.",
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

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]} edges={[]}>
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(1,8,20,0.78)", "rgba(3,29,46,0.62)", "rgba(1,7,18,0.80)"]}
        style={StyleSheet.absoluteFillObject}
      />
      <Animated.View entering={ZoomIn.duration(320).springify()} style={styles.panel}>
      <BlurView intensity={52} tint="dark" style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(255,255,255,0.14)", "rgba(186,230,253,0.055)", "rgba(255,255,255,0.025)"]}
        locations={[0, 0.48, 1]}
        style={styles.panelGlassTint}
      />
      <View pointerEvents="none" style={styles.panelTopGlow} />
      {/* Holographic live assistant header */}
      <BotHeader
        talking={typing || listening || speaking}
        onRobotPress={handleActionPress}
      />

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
          {/* MESSAGES */}
          <View style={styles.messagesContainer}>
            {messages.map((item) => (
              <ChatBubble key={item.id} message={item.text} isUser={item.isUser} />
            ))}
            {typing && <TypingIndicator />}
          </View>
        </ScrollView>

        {/* Single retained shortcut, styled as a glass hologram control */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.shiftKeyButton}
            onPress={() => router.push("/RoojgarForm")}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Open Roojgar and jobs, Shift key"
            testID="assistant-roojgar-link"
          >
            <MaterialCommunityIcons name="arrow-up-bold" size={17} color="#F0F9FF" />
            <View style={styles.shiftKeyLabelWrap}>
              <Text style={styles.shiftKeyLabel}>SHIFT</Text>
              <Text style={styles.shiftKeyCaption}>ROOJGAAR / JOBS</Text>
            </View>
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
              placeholder="Ask KMT Bazaar AI..."
              placeholderTextColor="#64748B"
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={onSend}
            />

            {/* Laptop-style Enter key sends the typed message; voice remains on the robot control. */}
            <TouchableOpacity
              style={[
                styles.enterBtn,
                (!input.trim() || typing) && styles.enterBtnDisabled,
              ]}
              onPress={() => void onSend()}
              disabled={!input.trim() || typing}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel="Press Enter to send message"
              testID="assistant-enter-button"
            >
              <MaterialCommunityIcons
                name="keyboard-return"
                size={18}
                color={input.trim() && !typing ? "#ECFEFF" : "#78909C"}
              />
              <Text style={styles.enterBtnText}>ENTER</Text>
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
    backgroundColor: "rgba(2, 8, 22, 0.28)",
  },
  panel: {
    width: "100%",
    maxWidth: 620,
    height: Platform.OS === "web" ? "90%" : "92%",
    maxHeight: 820,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.58)",
    overflow: "hidden",
    backgroundColor: "rgba(5,15,29,0.66)",
    shadowColor: "#22D3EE",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 18,
  },
  panelGlassTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.24)",
  },
  panelTopGlow: {
    position: "absolute",
    top: -55,
    left: "16%",
    right: "16%",
    height: 110,
    borderRadius: 60,
    backgroundColor: "rgba(34,211,238,0.16)",
    shadowColor: "#22D3EE",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.36,
    shadowRadius: 34,
    elevation: 8,
  },
  chat: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingBottom: 12,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "flex-start",
    backgroundColor: "rgba(3,14,26,0.48)",
    borderTopWidth: 1,
    borderTopColor: "rgba(34,211,238,0.28)",
  },
  shiftKeyButton: {
    alignSelf: "flex-start",
    minWidth: 138,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(210,235,250,0.82)",
    borderBottomWidth: 4,
    borderBottomColor: "#253E52",
    backgroundColor: "#526D80",
    shadowColor: "#020B15",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.42,
    shadowRadius: 5,
    elevation: 5,
  },
  shiftKeyLabelWrap: {
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 1,
  },
  shiftKeyLabel: {
    color: "#F8FCFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
    lineHeight: 13,
  },
  shiftKeyCaption: {
    color: "#FDD38A",
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.45,
    lineHeight: 9,
  },
  voiceStatus: {
    color: "#A5F3FC",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 7,
    marginHorizontal: 4,
  },
  bottomContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 10 : 14,
    backgroundColor: "rgba(2,12,24,0.58)",
    borderTopWidth: 1,
    borderTopColor: "rgba(34,211,238,0.28)",
  },
  motaInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(3,18,32,0.68)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.66)",
    shadowColor: "#22D3EE",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 2,
  },
  motaInput: {
    flex: 1,
    color: "#F8FCFF",
    fontSize: 15,
    height: 44,
    paddingHorizontal: 4,
  },
  enterBtn: {
    minWidth: 68,
    height: 42,
    paddingHorizontal: 9,
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.94)",
    borderBottomWidth: 4,
    borderBottomColor: "rgba(8,145,178,0.9)",
    backgroundColor: "rgba(8,145,178,0.58)",
    shadowColor: "#22D3EE",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  enterBtnDisabled: {
    borderColor: "rgba(148,163,184,0.34)",
    borderBottomColor: "rgba(71,85,105,0.58)",
    backgroundColor: "rgba(30,45,58,0.48)",
    shadowOpacity: 0,
    elevation: 0,
  },
  enterBtnText: {
    color: "#E8FBFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
