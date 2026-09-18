import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/src/api";

type Step = "email" | "otp" | "password" | "success";

export default function ForgotPassword() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugOtp, setDebugOtp] = useState("");

  const sendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your email address");
      return;
    }

    if (!cleanEmail.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await api.forgotPassword(cleanEmail);

      setEmail(cleanEmail);

      if (result.debug_otp) {
        setDebugOtp(result.debug_otp);
      }

      setStep("otp");
    } catch (e: any) {
      setError(e?.message || "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    const cleanOtp = otp.trim();

    if (!cleanOtp) {
      setError("Please enter OTP");
      return;
    }

    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setError("OTP must be 6 digits");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await api.verifyResetOtp(email, cleanOtp);
      setStep("password");
    } catch (e: any) {
      setError(e?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (!newPassword) {
      setError("Please enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your password");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await api.resetPassword(email, otp, newPassword);
      setStep("success");
    } catch (e: any) {
      setError(e?.message || "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (loading) return;

    if (step === "otp") {
      setOtp("");
      setDebugOtp("");
      setError("");
      setStep("email");
      return;
    }

    if (step === "password") {
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setStep("otp");
      return;
    }

    router.back();
  };

  const renderEmailStep = () => (
    <>
      <View style={s.iconCircle}>
        <MaterialCommunityIcons
          name="lock-reset"
          size={34}
          color="#0284C7"
        />
      </View>

      <Text style={s.title}>Forgot Password?</Text>

      <Text style={s.subtitle}>
        Enter your registered email address and we will generate an OTP to
        reset your password.
      </Text>

      <View style={s.inputBox}>
        <MaterialCommunityIcons
          name="email-outline"
          size={21}
          color="#64748B"
        />

        <TextInput
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setError("");
          }}
          placeholder="Enter your email"
          placeholderTextColor="#94A3B8"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={s.input}
          editable={!loading}
          testID="forgot-email-input"
        />
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}

      <Pressable
        onPress={sendOtp}
        disabled={loading}
        style={({ pressed }) => [
          s.primaryButton,
          pressed && !loading && s.buttonPressed,
          loading && s.buttonDisabled,
        ]}
        testID="send-reset-otp"
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={s.primaryButtonText}>Send OTP</Text>

            <MaterialCommunityIcons
              name="arrow-right"
              size={21}
              color="#FFFFFF"
            />
          </>
        )}
      </Pressable>
    </>
  );

  const renderOtpStep = () => (
    <>
      <View style={s.iconCircle}>
        <MaterialCommunityIcons
          name="shield-key-outline"
          size={34}
          color="#0284C7"
        />
      </View>

      <Text style={s.title}>Verify OTP</Text>

      <Text style={s.subtitle}>
        Enter the 6-digit OTP generated for{" "}
        <Text style={s.emailText}>{email}</Text>
      </Text>

      {debugOtp ? (
        <View style={s.debugBox}>
          <MaterialCommunityIcons
            name="information-outline"
            size={20}
            color="#0284C7"
          />

          <View style={s.debugTextWrap}>
            <Text style={s.debugTitle}>Development OTP</Text>

            <Text style={s.debugOtp}>{debugOtp}</Text>

            <Text style={s.debugHint}>
              Email/SMS service is not connected yet, so the OTP is shown here
              for testing.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={s.inputBox}>
        <MaterialCommunityIcons
          name="numeric"
          size={21}
          color="#64748B"
        />

        <TextInput
          value={otp}
          onChangeText={(value) => {
            const onlyNumbers = value.replace(/[^0-9]/g, "").slice(0, 6);
            setOtp(onlyNumbers);
            setError("");
          }}
          placeholder="Enter 6-digit OTP"
          placeholderTextColor="#94A3B8"
          keyboardType="number-pad"
          maxLength={6}
          style={s.input}
          editable={!loading}
          testID="reset-otp-input"
        />
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}

      <Pressable
        onPress={verifyOtp}
        disabled={loading}
        style={({ pressed }) => [
          s.primaryButton,
          pressed && !loading && s.buttonPressed,
          loading && s.buttonDisabled,
        ]}
        testID="verify-reset-otp"
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={s.primaryButtonText}>Verify OTP</Text>

            <MaterialCommunityIcons
              name="check-circle-outline"
              size={21}
              color="#FFFFFF"
            />
          </>
        )}
      </Pressable>

      <Pressable
        onPress={() => {
          if (!loading) {
            setOtp("");
            setError("");
            sendOtp();
          }
        }}
        disabled={loading}
        style={s.secondaryButton}
        testID="resend-reset-otp"
      >
        <Text style={s.secondaryButtonText}>Resend OTP</Text>
      </Pressable>
    </>
  );

  const renderPasswordStep = () => (
    <>
      <View style={s.iconCircle}>
        <MaterialCommunityIcons
          name="form-textbox-password"
          size={34}
          color="#0284C7"
        />
      </View>

      <Text style={s.title}>Create New Password</Text>

      <Text style={s.subtitle}>
        Set a new password for your KMT Bazaar account.
      </Text>

      <View style={s.inputBox}>
        <MaterialCommunityIcons
          name="lock-outline"
          size={21}
          color="#64748B"
        />

        <TextInput
          value={newPassword}
          onChangeText={(value) => {
            setNewPassword(value);
            setError("");
          }}
          placeholder="New password"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={s.input}
          editable={!loading}
          testID="new-password-input"
        />
      </View>

      <View style={s.inputBox}>
        <MaterialCommunityIcons
          name="lock-check-outline"
          size={21}
          color="#64748B"
        />

        <TextInput
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            setError("");
          }}
          placeholder="Confirm new password"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={s.input}
          editable={!loading}
          testID="confirm-password-input"
        />
      </View>

      <Text style={s.passwordHint}>
        Password must be at least 6 characters.
      </Text>

      {error ? <Text style={s.error}>{error}</Text> : null}

      <Pressable
        onPress={changePassword}
        disabled={loading}
        style={({ pressed }) => [
          s.primaryButton,
          pressed && !loading && s.buttonPressed,
          loading && s.buttonDisabled,
        ]}
        testID="reset-password-button"
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={s.primaryButtonText}>Reset Password</Text>

            <MaterialCommunityIcons
              name="lock-reset"
              size={21}
              color="#FFFFFF"
            />
          </>
        )}
      </Pressable>
    </>
  );

  const renderSuccessStep = () => (
    <>
      <View style={s.successCircle}>
        <MaterialCommunityIcons
          name="check"
          size={42}
          color="#FFFFFF"
        />
      </View>

      <Text style={s.title}>Password Reset Successfully</Text>

      <Text style={s.subtitle}>
        Your KMT Bazaar password has been changed successfully. You can now
        login with your new password.
      </Text>

      <Pressable
        onPress={() => router.replace("/auth/login" as any)}
        style={({ pressed }) => [
          s.primaryButton,
          pressed && s.buttonPressed,
        ]}
        testID="back-to-login"
      >
        <Text style={s.primaryButtonText}>Back to Login</Text>

        <MaterialCommunityIcons
          name="login"
          size={21}
          color="#FFFFFF"
        />
      </Pressable>
    </>
  );

  return (
    <View style={s.container}>
      <LinearGradient
        colors={["#0284C7", "#0369A1"]}
        style={s.topHeader}
      >
        <Pressable
          onPress={goBack}
          disabled={loading}
          style={s.backButton}
          testID="forgot-password-back"
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={25}
            color="#FFFFFF"
          />
        </Pressable>

        <View style={s.headerLogo}>
          <MaterialCommunityIcons
            name="shopping"
            size={26}
            color="#FFFFFF"
          />

          <Text style={s.headerLogoText}>KMT Bazaar</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={s.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.card}>
            {step !== "success" && step !== "email" ? (
              <View style={s.stepRow}>
                <View
                  style={[
                    s.stepDot,
                    s.stepDotActive,
                  ]}
                >
                  <Text style={s.stepNumber}>1</Text>
                </View>

                <View style={s.stepLine} />

                <View
                  style={[
                    s.stepDot,
                    step === "password" && s.stepDotActive,
                    step === "otp" && s.stepDotActive,
                  ]}
                >
                  <Text style={s.stepNumber}>2</Text>
                </View>

                <View style={s.stepLine} />

                <View
                  style={[
                    s.stepDot,
                    step === "password" && s.stepDotActive,
                  ]}
                >
                  <Text style={s.stepNumber}>3</Text>
                </View>
              </View>
            ) : null}

            {step === "email" && renderEmailStep()}
            {step === "otp" && renderOtpStep()}
            {step === "password" && renderPasswordStep()}
            {step === "success" && renderSuccessStep()}
          </View>

          {step !== "success" ? (
            <Pressable
              onPress={() => router.replace("/auth/login" as any)}
              disabled={loading}
              style={s.loginLink}
              testID="forgot-back-login"
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={17}
                color="#0284C7"
              />

              <Text style={s.loginLinkText}>Back to Login</Text>
            </Pressable>
          ) : null}

          <Text style={s.footer}>KMT Bazaar • Trusted Shopping</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  topHeader: {
    height: 105,
    paddingTop: Platform.OS === "ios" ? 48 : 34,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },

  headerLogo: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },

  headerLogoText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginLeft: 8,
  },

  keyboard: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingVertical: 25,
    alignItems: "center",
  },

  card: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 26,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },

  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 17,
  },

  successCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 18,
  },

  title: {
    color: "#0F172A",
    fontSize: 25,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 9,
  },

  subtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 23,
  },

  emailText: {
    color: "#0F172A",
    fontWeight: "800",
  },

  inputBox: {
    height: 54,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    marginBottom: 13,
  },

  input: {
    flex: 1,
    height: "100%",
    marginLeft: 10,
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "600",
  },

  error: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 13,
    textAlign: "center",
  },

  primaryButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#FF6B00",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginTop: 4,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    marginRight: 8,
  },

  buttonPressed: {
    opacity: 0.82,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  secondaryButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 7,
  },

  secondaryButtonText: {
    color: "#0284C7",
    fontSize: 14,
    fontWeight: "800",
  },

  passwordHint: {
    color: "#64748B",
    fontSize: 12,
    marginTop: -4,
    marginBottom: 10,
  },

  debugBox: {
    flexDirection: "row",
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 14,
    padding: 13,
    marginBottom: 15,
  },

  debugTextWrap: {
    flex: 1,
    marginLeft: 10,
  },

  debugTitle: {
    color: "#0369A1",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 2,
  },

  debugOtp: {
    color: "#0F172A",
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: 4,
    marginBottom: 2,
  },

  debugHint: {
    color: "#64748B",
    fontSize: 11,
    lineHeight: 16,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  stepDot: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },

  stepDotActive: {
    backgroundColor: "#0284C7",
  },

  stepNumber: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  stepLine: {
    width: 42,
    height: 2,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 5,
  },

  loginLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingVertical: 8,
  },

  loginLinkText: {
    color: "#0284C7",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 5,
  },

  footer: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 22,
    marginBottom: 12,
  },
});