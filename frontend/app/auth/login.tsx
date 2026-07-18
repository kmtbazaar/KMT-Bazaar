import AIAssistant from "../../components/AIAssistant";
import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useAuth } from "@/src/AuthContext";
import { COLORS, LOGO_URL, RADIUS, SPACING, shadow } from "@/src/theme";

export default function Login() {
  const router = useRouter();
  const { login, loginOtp } = useAuth();
  const [tab, setTab] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogin = async () => {
    if (!email || !password) {
      setError("Please fill in both email and password");
      return;
    }
    setError(null); setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const user = await login(email.trim(), password);
      if (!user || !user.role) throw new Error("Login failed, no user role returned");
      if (user.role === "customer") router.replace("/(tabs)/home");
      else router.replace(`/${user.role}` as any);
    } catch (e: any) {
      setError(e.message || "Login failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setLoading(false); }
  };

  const onOtpRequest = async () => {
    if (phone.length < 10) { setError("Enter a valid 10-digit phone number"); return; }
    setError(null);
    setOtpSent(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const onOtpVerify = async () => {
    if (!otp) { setError("Please enter the OTP"); return; }
    setError(null); setLoading(true);
    try {
      const user = await loginOtp(phone, otp);
      if (!user || !user.role) throw new Error("Login failed, no user role returned");
      router.replace(user.role === "customer" ? "/(tabs)/home" : `/${user.role}` as any);
    } catch (e: any) {
      setError(e.message || "Invalid OTP");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setLoading(false); }
  };

  return (
    <View style={s.root} testID="login-screen">
      <LinearGradient colors={["#050B14", "#0A1224", COLORS.brandDark]} style={s.headerBg} />
      
      <SafeAreaView edges={["top"]} style={{ alignItems: "center", paddingTop: SPACING.xl }}>
        {/* Animated Logo & Text */}
        <Animated.View entering={ZoomIn.duration(700).springify()}>
          <Image source={{ uri: LOGO_URL }} style={s.logo} contentFit="contain" />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(200).springify()} style={s.appName}>KMT BAZAAR</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(350).springify()} style={s.welcome}>Welcome back, login to continue</Animated.Text>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.card} keyboardShouldPersistTaps="handled">
          
          <View style={s.tabsRow}>
            <Pressable testID="tab-password" onPress={() => setTab("password")} style={[s.tab, tab === "password" && s.tabActive]}>
              <Text style={[s.tabText, tab === "password" && s.tabTextActive]}>Email & Password</Text>
            </Pressable>
            <Pressable testID="tab-otp" onPress={() => setTab("otp")} style={[s.tab, tab === "otp" && s.tabActive]}>
              <Text style={[s.tabText, tab === "otp" && s.tabTextActive]}>Mobile OTP</Text>
            </Pressable>
          </View>

          {tab === "password" ? (
            <>
              <Field icon="email-outline" placeholder="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" testID="login-email-input" />
              <Field icon="lock-outline" placeholder="Password" value={password} onChangeText={setPassword} secure testID="login-password-input" />
              
              {error && <Text style={s.err} testID="login-error">{error}</Text>}
              
              <Pressable testID="login-submit-button" onPress={onLogin} style={({ pressed }) => [s.cta, pressed && { opacity: 0.85 }]}>
                <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.ctaGrad}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>Login Securely</Text>}
                </LinearGradient>
              </Pressable>
              
              <Pressable onPress={() => router.push("/auth/register")} testID="goto-register">
                <Text style={s.alt}>New to KMT Bazaar? <Text style={s.altLink}>Create account</Text></Text>
              </Pressable>
            </>
          ) : (
            <>
              <Field icon="cellphone" placeholder="Phone number (10 digits)" value={phone} onChangeText={(v: string) => setPhone(v.replace(/[^0-9]/g, ''))} keyboardType="phone-pad" maxLength={10} testID="otp-phone-input" />
              
              {otpSent && (
                <Animated.View entering={FadeInDown.duration(400)}>
                  <Field icon="numeric-password" placeholder="Enter 6-digit OTP" value={otp} onChangeText={(v: string) => setOtp(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={6} testID="otp-code-input" />
                </Animated.View>
              )}
              
              {error && <Text style={s.err}>{error}</Text>}
              
              {!otpSent ? (
                <Pressable testID="otp-send-button" onPress={onOtpRequest} style={s.cta}>
                  <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.ctaGrad}>
                    <Text style={s.ctaText}>Send OTP</Text>
                  </LinearGradient>
                </Pressable>
              ) : (
                <Pressable testID="otp-verify-button" onPress={onOtpVerify} style={s.cta}>
                  <LinearGradient colors={[COLORS.accent, COLORS.accentDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.ctaGrad}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>Verify & Continue</Text>}
                  </LinearGradient>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <AIAssistant />

    </View>
  );
}

function Field({ icon, secure, testID, ...rest }: any) {
  return (
    <View style={s.fieldWrap}>
      <MaterialCommunityIcons name={icon} size={22} color={COLORS.textMuted} />
      <TextInput
        {...rest}
        testID={testID}
        secureTextEntry={secure}
        autoCapitalize="none"
        placeholderTextColor={COLORS.textMuted}
        style={s.input}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  headerBg: { position: "absolute", top: 0, left: 0, right: 0, height: 400 },
  logo: { width: 120, height: 120, marginTop: SPACING.md, ...shadow.card },
  appName: { color: "#fff", fontSize: 24, fontWeight: "900", letterSpacing: 4, marginTop: 12 },
  welcome: { color: "rgba(255,255,255,0.7)", marginTop: 6, marginBottom: SPACING.xl, fontSize: 15, fontWeight: "500" },
  card: {
    backgroundColor: COLORS.surface, 
    marginTop: 20, 
    marginHorizontal: SPACING.lg,
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: SPACING.xl, 
    paddingBottom: 60,
    ...shadow.card,
    minHeight: 500,
  },
  tabsRow: { flexDirection: "row", backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.pill, padding: 6, marginBottom: SPACING.xl, borderWidth: 1, borderColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: RADIUS.pill },
  tabActive: { backgroundColor: COLORS.surface, ...shadow.soft },
  tabText: { color: COLORS.textSecondary, fontWeight: "700", fontSize: 14 },
  tabTextActive: { color: COLORS.brand, fontWeight: "800" },
  fieldWrap: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.lg, paddingHorizontal: 16, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  input: { flex: 1, paddingVertical: 16, fontSize: 15, color: COLORS.text, fontWeight: "500" },
  cta: { marginTop: SPACING.md, borderRadius: RADIUS.pill, overflow: "hidden", ...shadow.card },
  ctaGrad: { paddingVertical: 18, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  alt: { textAlign: "center", marginTop: SPACING.xl, color: COLORS.textSecondary, fontSize: 14 },
  altLink: { color: COLORS.brand, fontWeight: "800", fontSize: 14 },
  err: { color: COLORS.error, marginTop: -8, marginBottom: 12, fontSize: 13, fontWeight: "600", marginLeft: 4 },
});