
import AIAssistant from "../../components/AIAssistant";
import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { 
  FadeInDown, 
  ZoomIn, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence, 
  Easing 
} from "react-native-reanimated";
import { useAuth } from "@/src/AuthContext";
import { COLORS, LOGO_URL, RADIUS, SPACING } from "@/src/theme";

const { width } = Dimensions.get("window");

// Animated Background Tile Component
function AnimatedTile({ delay = 0, color = "#00B4D8" }: { delay?: number; color?: string }) {
  const opacity = useSharedValue(0.15);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(0.15, { duration: delay }),
      withRepeat(
        withSequence(
          withTiming(0.7, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.15, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    scale.value = withSequence(
      withTiming(0.95, { duration: delay }),
      withRepeat(
        withSequence(
          withTiming(1.1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.95, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[s.tile, { backgroundColor: color }, animatedStyle]} />
  );
}

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
  const [showPassword, setShowPassword] = useState(false);

  // Production-grade Password Validation Checker
  const validatePassword = (pass: string) => {
    const isLengthValid = pass.length >= 8;
    const hasUpperCase = /[A-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSymbol = /[^A-Za-z0-9]/.test(pass);
    return isLengthValid && hasUpperCase && hasNumber && hasSymbol;
  };

  const onLogin = async () => {
    if (!email || !password) {
      setError("Please fill in both email and password");
      return;
    }
    if (!validatePassword(password)) {
      setError("Password must be 8+ chars with uppercase, number & symbol.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setError(null); setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const user = await login(email.trim(), password);
      if (!user || !user.role) throw new Error("Login failed, no user role returned");
      
      if (user.role === "customer") router.replace("/(tabs)/home" as any);
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
      {/* Dark Ambient Background Gradient */}
      <LinearGradient colors={["#050B14", "#0A1224", "#000000"]} style={s.headerBg} />

      {/* Animated Environment Tiles & Glowing Flashes */}
      <View style={s.tilesWrapper} pointerEvents="none">
        <AnimatedTile delay={0} color="#00B4D8" />
        <AnimatedTile delay={600} color="#FF6E00" />
        <AnimatedTile delay={1200} color="#00B4D8" />
        <AnimatedTile delay={400} color="#FF6E00" />
        <AnimatedTile delay={1000} color="#00B4D8" />
        <AnimatedTile delay={1500} color="#FF6E00" />
      </View>

      <SafeAreaView edges={["top"]} style={{ alignItems: "center", paddingTop: SPACING.lg, zIndex: 2 }}>
        {/* Sky Blue Accent Header Bar */}
        <View style={s.skyBlueBanner}>
          <LinearGradient
            colors={["transparent", "#00B4D8", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.skyBlueLine}
          />
        </View>

        {/* Animated Text Header (Logo removed from top) */}
        <Animated.Text entering={FadeInDown.delay(200).springify()} style={s.appName}>KMT BAZAAR</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(350).springify()} style={s.welcome}>Welcome back, login to continue</Animated.Text>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, zIndex: 2 }}>
        <ScrollView contentContainerStyle={s.cardWrapper} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          {/* Solid White Card with Top Gradient Border */}
          <View style={s.card}>
            <LinearGradient
              colors={["#00B4D8", "#FF6E00"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.cardTopBorder}
            />

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
                
                <View style={s.fieldWrap}>
                  <MaterialCommunityIcons name="lock-outline" size={22} color="#64748B" />
                  <TextInput
                    testID="login-password-input"
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    placeholderTextColor="#94A3B8"
                    style={s.input}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    <MaterialCommunityIcons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#64748B" />
                  </Pressable>
                </View>

                {/* Password Rule Hint */}
                {password.length > 0 && (
                  <View style={s.ruleBox}>
                    <Text style={[s.ruleText, password.length >= 8 && s.ruleValid]}></Text>
                    <Text style={[s.ruleText, /[A-Z]/.test(password) && s.ruleValid]}></Text>
                    <Text style={[s.ruleText, /[0-9]/.test(password) && s.ruleValid]}></Text>
                    <Text style={[s.ruleText, /[^A-Za-z0-9]/.test(password) && s.ruleValid]}></Text>
                  </View>
                )}
                
                {error && <Text style={s.err} testID="login-error">{error}</Text>}
                
                <Pressable testID="login-submit-button" onPress={onLogin} style={({ pressed }) => [s.cta, pressed && { opacity: 0.85 }]}>
                  <LinearGradient colors={["#FF6E00", "#E05E00"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.ctaGrad}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>Login Securely</Text>}
                  </LinearGradient>
                </Pressable>
                
                <Pressable onPress={() => router.push("/auth/register" as any)} testID="goto-register">
                  <Text style={s.alt}>New to KMT Bazaar? <Text style={s.altLink}>Create account</Text></Text>
                </Pressable>
              </>
            ) : (
              <>
                <Field icon="cellphone" placeholder="Phone number (10 digits)" value={phone} onChangeText={(v: string) => setPhone(v.replace(/[^0-9]/g, ''))} keyboardType="phone-pad" maxLength={10} testID="otp-phone-input" />
                
                {otpSent && (
                  <Animated.View entering={FadeInDown.duration(400)}>
                    <Field icon="shield-key-outline" placeholder="Enter 6-digit OTP" value={otp} onChangeText={(v: string) => setOtp(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={6} testID="otp-code-input" />
                  </Animated.View>
                )}
                
                {error && <Text style={s.err}>{error}</Text>}
                
                {!otpSent ? (
                  <Pressable testID="otp-send-button" onPress={onOtpRequest} style={s.cta}>
                    <LinearGradient colors={["#FF6E00", "#E05E00"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.ctaGrad}>
                      <Text style={s.ctaText}>Send OTP</Text>
                    </LinearGradient>
                  </Pressable>
                ) : (
                  <Pressable testID="otp-verify-button" onPress={onOtpVerify} style={s.cta}>
                    <LinearGradient colors={["#00B4D8", "#0077B6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.ctaGrad}>
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>Verify & Continue</Text>}
                    </LinearGradient>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Shifted Logo to Left Bottom Corner */}
      <Animated.View entering={ZoomIn.duration(700).springify()} style={s.bottomLeftLogoContainer}>
        <View style={s.logoGlowContainer}>
          <Image source={{ uri: LOGO_URL }} style={s.logo} contentFit="contain" />
        </View>
      </Animated.View>

      <AIAssistant />

    </View>
  );
}

function Field({ icon, secure, testID, ...rest }: any) {
  return (
    <View style={s.fieldWrap}>
      {icon ? <MaterialCommunityIcons name={icon} size={22} color="#64748B" /> : null}
      <TextInput
        {...rest}
        testID={testID}
        secureTextEntry={secure}
        autoCapitalize="none"
        placeholderTextColor="#94A3B8"
        style={s.input}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050B14" },
  headerBg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  
  tilesWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 380,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    alignItems: "center",
    padding: 10,
    zIndex: 1,
  },
  tile: {
    width: (width - 60) / 3,
    height: 70,
    borderRadius: 16,
    marginVertical: 8,
  },

  skyBlueBanner: {
    width: "100%",
    height: 2,
    marginBottom: SPACING.md,
    alignItems: "center",
  },
  skyBlueLine: {
    width: "80%",
    height: "100%",
    shadowColor: "#00B4D8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },

  bottomLeftLogoContainer: {
    position: "absolute",
    bottom: 25,
    left: 20,
    zIndex: 10,
  },

  logoGlowContainer: {
    padding: 4,
    borderRadius: 60,
    shadowColor: "#00B4D8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: { width: 80, height: 80 },
  appName: { color: "#FFFFFF", fontSize: 26, fontWeight: "900", letterSpacing: 3, marginTop: 10 },
  welcome: { color: "#00B4D8", marginTop: 4, marginBottom: SPACING.lg, fontSize: 14, fontWeight: "600" },
  
  cardWrapper: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 130,
  },
  
  card: {
    backgroundColor: "#FFFFFF", 
    borderRadius: 24, 
    padding: SPACING.xl, 
    paddingBottom: 35,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    overflow: "hidden",
    position: "relative",
  },
  cardTopBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
  },
  
  tabsRow: { 
    flexDirection: "row", 
    backgroundColor: "#F1F5F9", 
    borderRadius: RADIUS.pill, 
    padding: 4, 
    marginBottom: SPACING.xl, 
    borderWidth: 1, 
    borderColor: "#E2E8F0" 
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: RADIUS.pill },
  tabActive: { backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { color: "#64748B", fontWeight: "700", fontSize: 13 },
  tabTextActive: { color: "#FF6E00", fontWeight: "800" },
  
  fieldWrap: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12, 
    backgroundColor: "#F8FAFC", 
    borderRadius: RADIUS.lg, 
    paddingHorizontal: 16, 
    marginBottom: SPACING.md, 
    borderWidth: 1.5, 
    borderColor: "#E2E8F0" 
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: "#0F172A", fontWeight: "500" },

  ruleBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: SPACING.md,
    paddingHorizontal: 4,
  },
  ruleText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  ruleValid: {
    color: "#10B981", // Green check indicator for matched rules
  },
  
  cta: { 
    marginTop: SPACING.xs, 
    borderRadius: RADIUS.pill, 
    overflow: "hidden", 
    shadowColor: "#FF6E00", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.35, 
    shadowRadius: 8, 
    elevation: 5 
  },
  ctaGrad: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  
  alt: { textAlign: "center", marginTop: SPACING.lg, color: "#64748B", fontSize: 14 },
  altLink: { color: "#FF6E00", fontWeight: "800", fontSize: 14 },
  err: { color: "#EF4444", marginTop: 4, marginBottom: 12, fontSize: 13, fontWeight: "600", marginLeft: 4 },
});



