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
import { useAuth } from "@/src/AuthContext";
import { COLORS, LOGO_URL, RADIUS, SPACING, shadow } from "@/src/theme";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [tab, setTab] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("customer@kmtbazaar.com");
  const [password, setPassword] = useState("Customer@123");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogin = async () => {
    setError(null); setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const user = await login(email.trim(), password);
      if (user.role === "customer") router.replace("/(tabs)/home");
      else router.replace(`/${user.role}` as any);
    } catch (e: any) {
      setError(e.message || "Login failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setLoading(false); }
  };

  const onOtpRequest = async () => {
    if (phone.length < 10) { setError("Enter valid 10-digit phone"); return; }
    setError(null);
    setOtpSent(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const { loginOtp } = useAuth();
  const onOtpVerify = async () => {
    setError(null); setLoading(true);
    try {
      const user = await loginOtp(phone, otp);
      router.replace(user.role === "customer" ? "/(tabs)/home" : `/${user.role}` as any);
    } catch (e: any) {
      setError(e.message || "Invalid OTP");
    } finally { setLoading(false); }
  };

  return (
    <View style={s.root} testID="login-screen">
      <LinearGradient colors={["#000", "#0A0F1F", COLORS.brandDark]} style={s.headerBg} />
      <SafeAreaView edges={["top"]} style={{ alignItems: "center" }}>
        <Image source={{ uri: LOGO_URL }} style={s.logo} contentFit="contain" />
        <Text style={s.appName}>KMT BAZAAR</Text>
        <Text style={s.welcome}>Welcome back</Text>
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
              <Field icon="email-outline" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" testID="login-email-input" />
              <Field icon="lock-outline" placeholder="Password" value={password} onChangeText={setPassword} secure testID="login-password-input" />
              {error && <Text style={s.err} testID="login-error">{error}</Text>}
              <Pressable testID="login-submit-button" onPress={onLogin} style={({ pressed }) => [s.cta, pressed && { opacity: 0.85 }]}>
                <LinearGradient colors={[COLORS.accent, COLORS.accentDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.ctaGrad}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>Login</Text>}
                </LinearGradient>
              </Pressable>
              <Pressable onPress={() => router.push("/auth/register")} testID="goto-register">
                <Text style={s.alt}>New to KMT Bazaar? <Text style={s.altLink}>Create account</Text></Text>
              </Pressable>
              <View style={s.demoBox}>
                <Text style={s.demoTitle}>Demo Accounts</Text>
                <Text style={s.demoText}>Customer · customer@kmtbazaar.com / Customer@123</Text>
                <Text style={s.demoText}>Admin · admin@kmtbazaar.com / Admin@123</Text>
                <Text style={s.demoText}>Vendor · vendor@kmtbazaar.com / Vendor@123</Text>
                <Text style={s.demoText}>Delivery · delivery@kmtbazaar.com / Delivery@123</Text>
              </View>
            </>
          ) : (
            <>
              <Field icon="cellphone" placeholder="Phone number (10 digits)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" testID="otp-phone-input" />
              {otpSent && (
                <Field icon="numeric" placeholder="Enter 6-digit OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" testID="otp-code-input" />
              )}
              {error && <Text style={s.err}>{error}</Text>}
              {!otpSent ? (
                <Pressable testID="otp-send-button" onPress={onOtpRequest} style={s.cta}>
                  <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={s.ctaGrad}><Text style={s.ctaText}>Send OTP</Text></LinearGradient>
                </Pressable>
              ) : (
                <Pressable testID="otp-verify-button" onPress={onOtpVerify} style={s.cta}>
                  <LinearGradient colors={[COLORS.accent, COLORS.accentDark]} style={s.ctaGrad}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>Verify & Continue</Text>}
                  </LinearGradient>
                </Pressable>
              )}
              {otpSent && <Text style={s.demoTextCenter}>Use any 6-digit code (mock OTP)</Text>}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ icon, secure, testID, ...rest }: any) {
  return (
    <View style={s.fieldWrap}>
      <MaterialCommunityIcons name={icon} size={20} color={COLORS.textMuted} />
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
  root: { flex: 1, backgroundColor: COLORS.surface },
  headerBg: { position: "absolute", top: 0, left: 0, right: 0, height: 360 },
  logo: { width: 110, height: 110, marginTop: SPACING.lg },
  appName: { color: "#fff", fontWeight: "800", letterSpacing: 3, marginTop: 8 },
  welcome: { color: "rgba(255,255,255,0.85)", marginTop: 6, marginBottom: SPACING.xl, fontSize: 14 },
  card: {
    backgroundColor: COLORS.surface, marginTop: 16, marginHorizontal: SPACING.lg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: SPACING.xl, paddingBottom: 40,
    ...shadow.card,
  },
  tabsRow: { flexDirection: "row", backgroundColor: COLORS.surfaceTertiary, borderRadius: RADIUS.pill, padding: 4, marginBottom: SPACING.xl },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: RADIUS.pill },
  tabActive: { backgroundColor: COLORS.surface, ...shadow.soft },
  tabText: { color: COLORS.textSecondary, fontWeight: "600", fontSize: 13 },
  tabTextActive: { color: COLORS.brand },
  fieldWrap: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, paddingHorizontal: 14, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: COLORS.text },
  cta: { marginTop: SPACING.md, borderRadius: RADIUS.pill, overflow: "hidden" },
  ctaGrad: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#fff", fontWeight: "700", letterSpacing: 0.5 },
  alt: { textAlign: "center", marginTop: SPACING.lg, color: COLORS.textSecondary },
  altLink: { color: COLORS.brand, fontWeight: "700" },
  err: { color: COLORS.error, marginTop: 4 },
  demoBox: { marginTop: SPACING.xl, padding: SPACING.md, backgroundColor: COLORS.brandLight, borderRadius: RADIUS.md },
  demoTitle: { fontWeight: "700", color: COLORS.brandDark, marginBottom: 6 },
  demoText: { color: COLORS.brandDark, fontSize: 12, marginVertical: 1 },
  demoTextCenter: { textAlign: "center", color: COLORS.textMuted, marginTop: 10, fontSize: 12 },
});
