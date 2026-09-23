import AIAssistant from "../../components/AIAssistant";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Keyboard,
  Platform,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useAuth } from "@/src/AuthContext";
import { api } from "@/src/api";
import { LOGO_URL, RADIUS, SPACING } from "@/src/theme";

const { width } = Dimensions.get("window");
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
WebBrowser.maybeCompleteAuthSession();

function AnimatedTile({
  delay = 0,
  color = "#00B4D8",
}: {
  delay?: number;
  color?: string;
}) {
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

  return <Animated.View style={[s.tile, { backgroundColor: color }, animatedStyle]} />;
}

export default function Login() {
  const router = useRouter();
  const { login, googleLogin } = useAuth();
  const insets = useSafeAreaInsets();

  const [loginType, setLoginType] = useState<"email" | "mobile">("email");
  const [identifier, setIdentifier] = useState("");
  const [accountChecked, setAccountChecked] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const keyboardShift = useSharedValue(0);

  const googleDiscovery = AuthSession.useAutoDiscovery("https://accounts.google.com");
  const [googleRequest, googleResponse, promptGoogleAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID || "google-client-id-not-configured",
      responseType: AuthSession.ResponseType.IdToken,
      scopes: ["openid", "profile", "email"],
      redirectUri: Platform.OS === "web" ? "https://kmtbazaar.tech/auth/login" : AuthSession.makeRedirectUri({ scheme: "kmt-bazaar", path: "auth/login" }),
      usePKCE: false,
    },
    googleDiscovery
  );

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const height = event.endCoordinates?.height || 280;
      const shift = Math.min(Math.max(height * 0.42, 95), 150);
      keyboardShift.value = withTiming(-shift, { duration: 220 });
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardShift.value = withTiming(0, { duration: 180 });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const keyboardContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: keyboardShift.value }],
  }));

  const switchLoginType = (type: "email" | "mobile") => {
    setLoginType(type);
    setIdentifier("");
    setAccountChecked(false);
    setRegistered(false);
    setPassword("");
    setError(null);
  };

  const onContinue = async () => {
    const value =
      loginType === "email"
        ? identifier.trim().toLowerCase()
        : identifier.replace(/[^0-9]/g, "");

    if (loginType === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        setError("Enter a valid email address");
        return;
      }
    } else if (!/^[0-9]{10}$/.test(value)) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await api.checkIdentifier(value);
      setAccountChecked(true);
      setRegistered(result.exists);

      if (!result.exists) {
        const param =
          loginType === "email"
            ? `email=${encodeURIComponent(value)}`
            : `phone=${encodeURIComponent(value)}`;

        router.push(`/auth/register?${param}` as any);
      }
    } catch (e: any) {
      setError(e?.message || "Could not check account");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const finishGoogleLogin = async () => {
      if (googleResponse?.type !== "success") return;
      const idToken = googleResponse.params?.id_token;
      if (!idToken) {
        setError("Google sign-in did not return an ID token");
        return;
      }
      setGoogleLoading(true);
      setError(null);
      try {
        const user = await googleLogin(idToken);
        if (!user?.role) throw new Error("Google login failed");
        if (user.role === "customer") router.replace("/(tabs)/home" as any);
        else router.replace(`/${user.role}` as any);
      } catch (e: any) {
        setError(e?.message || "Google sign-in failed");
      } finally {
        setGoogleLoading(false);
      }
    };
    finishGoogleLogin();
  }, [googleResponse]);

  const onGoogleLogin = async () => {
    if (Platform.OS !== "web") {
      setError("Google login is enabled for the KMT Bazaar website. Native app Google login needs a separate Android/iOS client ID.");
      return;
    }
    if (!GOOGLE_CLIENT_ID) {
      setError("Google login is not configured yet.");
      return;
    }
    if (!googleRequest) return;
    setGoogleLoading(true);
    try {
      await promptGoogleAsync();
    } catch (e: any) {
      setGoogleLoading(false);
      setError(e?.message || "Could not open Google sign-in");
    }
  };

  const onLogin = async () => {
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const value =
        loginType === "email"
          ? identifier.trim().toLowerCase()
          : identifier.replace(/[^0-9]/g, "");

      const user = await login(value, password);

      if (!user || !user.role) {
        throw new Error("Login failed, no user role returned");
      }

      if (user.role === "customer") {
        router.replace("/(tabs)/home" as any);
      } else {
        router.replace(`/${user.role}` as any);
      }
    } catch (e: any) {
      setError(e?.message || "Login failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      edges={[]}
      testID="login-screen"
    >
      <LinearGradient
        colors={["#050B14", "#0A1224", "#000000"]}
        style={s.headerBg}
      />

      <View style={s.tilesWrapper} pointerEvents="none">
        <AnimatedTile delay={0} color="#00B4D8" />
        <AnimatedTile delay={600} color="#FF6E00" />
        <AnimatedTile delay={1200} color="#00B4D8" />
        <AnimatedTile delay={400} color="#FF6E00" />
        <AnimatedTile delay={1000} color="#00B4D8" />
        <AnimatedTile delay={1500} color="#FF6E00" />
      </View>

      <Animated.View style={[s.loginContent, keyboardContentStyle]}>
        <View style={s.topContent}>
          <Animated.Text
            entering={FadeInDown.delay(200).springify()}
            style={s.appName}
          >
            KMT BAZAAR
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(350).springify()}
            style={s.welcome}
          >
            Login or Sign up
          </Animated.Text>
        </View>

        <View style={s.cardWrapper}>
          <View style={s.card}>
            <LinearGradient
              colors={["#00B4D8", "#FF6E00"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.cardTopBorder}
            />

            <View style={s.tabsRow}>
              <Pressable
                testID="login-type-email"
                onPress={() => switchLoginType("email")}
                style={[s.tab, loginType === "email" && s.tabActive]}
              >
                <MaterialCommunityIcons
                  name="email-outline"
                  size={18}
                  color={loginType === "email" ? "#FF6E00" : "#64748B"}
                />
                <Text style={[s.tabText, loginType === "email" && s.tabTextActive]}>
                  Email
                </Text>
              </Pressable>

              <Pressable
                testID="login-type-mobile"
                onPress={() => switchLoginType("mobile")}
                style={[s.tab, loginType === "mobile" && s.tabActive]}
              >
                <MaterialCommunityIcons
                  name="cellphone"
                  size={18}
                  color={loginType === "mobile" ? "#FF6E00" : "#64748B"}
                />
                <Text style={[s.tabText, loginType === "mobile" && s.tabTextActive]}>
                  Mobile
                </Text>
              </Pressable>
            </View>

            <Field
              icon={loginType === "email" ? "email-outline" : "cellphone"}
              placeholder={
                loginType === "email" ? "Email address" : "10-digit mobile number"
              }
              value={identifier}
              onChangeText={(value: string) => {
                setIdentifier(
                  loginType === "mobile"
                    ? value.replace(/[^0-9]/g, "").slice(0, 10)
                    : value
                );
                setAccountChecked(false);
                setRegistered(false);
                setPassword("");
                setError(null);
              }}
              keyboardType={loginType === "email" ? "email-address" : "phone-pad"}
              maxLength={loginType === "mobile" ? 10 : undefined}
              testID="login-identifier-input"
            />

            {!accountChecked ? (
              <Pressable
                testID="login-continue-button"
                onPress={onContinue}
                disabled={loading}
                style={[s.cta, loading && { opacity: 0.7 }]}
              >
                <LinearGradient
                  colors={["#FF6E00", "#E05E00"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.ctaGrad}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>Continue</Text>}
                </LinearGradient>
              </Pressable>
            ) : registered ? (
              <>
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
                  <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                    <MaterialCommunityIcons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color="#64748B"
                    />
                  </Pressable>
                </View>

                {error && <Text style={s.err} testID="login-error">{error}</Text>}

                <Pressable
                  testID="login-submit-button"
                  onPress={onLogin}
                  disabled={loading}
                  style={({ pressed }) => [
                    s.cta,
                    pressed && { opacity: 0.85 },
                    loading && { opacity: 0.7 },
                  ]}
                >
                  <LinearGradient
                    colors={["#FF6E00", "#E05E00"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.ctaGrad}
                  >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>Login Securely</Text>}
                  </LinearGradient>
                </Pressable>

                <Pressable
                  onPress={() => router.push("/auth/forgot-password" as any)}
                  testID="forgot-password"
                >
                  <Text style={s.forgotPassword}>Forgot Password?</Text>
                </Pressable>

              </>
            ) : null}

            {accountChecked && !registered && (
              <Text style={s.alt}>
                Account not found. Opening sign up...
              </Text>
            )}

            {!accountChecked && (
              <Text style={s.alt}>
                Login with your registered email or mobile number.
              </Text>

              <View style={s.googleDivider}>
                <View style={s.googleLine} />
                <Text style={s.googleOr}>OR</Text>
                <View style={s.googleLine} />
              </View>

              <Pressable
                testID="google-login-button"
                onPress={onGoogleLogin}
                disabled={googleLoading || (Platform.OS === "web" && !googleRequest)}
                style={[s.googleButton, googleLoading && { opacity: 0.7 }]}
              >
                <MaterialCommunityIcons name="google" size={20} color="#4285F4" />
                <Text style={s.googleText}>{googleLoading ? "Connecting..." : "Continue with Google"}</Text>
              </Pressable>
            )}
          </View>

          <View style={s.skyBlueBanner}>
            <LinearGradient
              colors={["transparent", "#00B4D8", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.skyBlueLine}
            />
          </View>
        </View>
      </Animated.View>

      <Animated.View
        entering={ZoomIn.duration(700).springify()}
        style={s.bottomLeftLogoContainer}
      >
        <View style={s.logoGlowContainer}>
          <Image source={{ uri: LOGO_URL }} style={s.logo} contentFit="contain" />
        </View>
      </Animated.View>

      <AIAssistant />
    </SafeAreaView>
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
    top: Platform.OS === "web" ? 0 : 52,
    left: 0,
    right: 0,
    height: 330,
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

  loginContent: {
    flex: 1,
    zIndex: 2,
    paddingTop: 18,
  },

  topContent: {
    alignItems: "center",
    paddingTop: 150,
    zIndex: 2,
  },

  cardWrapper: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 25,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: SPACING.xl,
    paddingBottom: 28,
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
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
  },

  tabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  tabText: {
    color: "#64748B",
    fontWeight: "700",
    fontSize: 13,
  },

  tabTextActive: {
    color: "#FF6E00",
    fontWeight: "800",
  },

  fieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },

  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "500",
  },

  cta: {
    marginTop: SPACING.xs,
    borderRadius: RADIUS.pill,
    overflow: "hidden",
    shadowColor: "#FF6E00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },

  ctaGrad: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  ctaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  googleDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: SPACING.lg,
  },

  googleLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },

  googleOr: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
  },

  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: SPACING.md,
    paddingVertical: 13,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },

  googleText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "800",
  },

  alt: {
    textAlign: "center",
    marginTop: SPACING.lg,
    color: "#64748B",
    fontSize: 13,
    lineHeight: 18,
  },

  forgotPassword: {
    textAlign: "center",
    marginTop: 10,
    color: "#0284C7",
    fontSize: 13,
    fontWeight: "800",
  },

  err: {
    color: "#EF4444",
    marginTop: 4,
    marginBottom: 12,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
  },

  skyBlueBanner: {
    width: "100%",
    height: 2,
    marginTop: SPACING.lg,
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

  logo: {
    width: 80,
    height: 80,
  },

  appName: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 3,
    marginTop: 10,
  },

  welcome: {
    color: "#00B4D8",
    marginTop: 4,
    marginBottom: SPACING.lg,
    fontSize: 14,
    fontWeight: "600",
  },
});