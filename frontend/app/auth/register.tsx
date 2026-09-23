import React, { useState } from "react";
import {
View,
Text,
TextInput,
Pressable,
StyleSheet,
ScrollView,
KeyboardAvoidingView,
Platform,
ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/AuthContext";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

const ROLES = [
{ id: "customer", label: "Customer", icon: "account" },
{ id: "vendor", label: "Vendor", icon: "store" },
{ id: "delivery", label: "Delivery", icon: "moped" },
];

export default function Register() {
const router = useRouter();
const { register } = useAuth();
const params = useLocalSearchParams<{ email?: string; phone?: string }>();

const [name, setName] = useState("");
const [email, setEmail] = useState(params.email || "");
const [phone, setPhone] = useState(params.phone || "");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [role, setRole] = useState("customer");
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Password validation rules
const hasMinLength = password.length >= 8;
const hasUppercase = /[A-Z]/.test(password);
const hasNumber = /[0-9]/.test(password);
const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

const passwordValid =
hasMinLength &&
hasUppercase &&
hasNumber &&
hasSpecialChar;

const passwordsMatch =
password.length > 0 &&
confirmPassword.length > 0 &&
password === confirmPassword;

const onSubmit = async () => {
setError(null);

// Required field validation
if (!name.trim()) {
  setError("Please enter your full name.");
  return;
}

if (!email.trim()) {
  setError("Please enter your email address.");
  return;
}

const normalizedEmail = email.trim().toLowerCase();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
  setError("Please enter a valid email address.");
  return;
}

if (!phone.trim()) {
  setError("Please enter your phone number.");
  return;
}

if (!/^[0-9]{10}$/.test(phone.trim())) {
  setError("Please enter a valid 10-digit phone number.");
  return;
}

if (!passwordValid) {
  setError("Please fulfill all password requirements.");
  return;
}

if (!confirmPassword) {
  setError("Please confirm your password.");
  return;
}

if (password !== confirmPassword) {
  setError("Passwords do not match.");
  return;
}

setLoading(true);

try {
  const user = await register({
    name: name.trim(),
    email: normalizedEmail,
    phone: phone.trim(),
    password,
    role,
  });

  router.replace(
    user.role === "customer"
      ? "/(tabs)/home"
      : (`/${user.role}` as any)
  );
} catch (e: any) {
  setError(e?.message || "Registration failed. Please try again.");
} finally {
  setLoading(false);
}

};

return (
<SafeAreaView style={s.root} edges={["top"]} testID="register-screen">
<View style={s.header}>
<Pressable
onPress={() => router.back()}
testID="register-back-button"
hitSlop={12}
>
<MaterialCommunityIcons
name="arrow-left"
size={26}
color={COLORS.text}
/>
</Pressable>

    <Text style={s.title}>Create account</Text>

    <View style={{ width: 26 }} />
  </View>

  <KeyboardAvoidingView
    behavior={Platform.OS === "ios" ? "padding" : undefined}
    style={{ flex: 1 }}
  >
    <ScrollView
      contentContainerStyle={s.body}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.sub}>I want to join as</Text>

      <View style={s.rolesRow}>
        {ROLES.map((r) => (
          <Pressable
            key={r.id}
            testID={`role-${r.id}`}
            onPress={() => setRole(r.id)}
            style={[
              s.roleCard,
              role === r.id && s.roleCardActive,
            ]}
          >
            <MaterialCommunityIcons
              name={r.icon as any}
              size={24}
              color={role === r.id ? "#fff" : COLORS.brand}
            />

            <Text
              style={[
                s.roleLabel,
                role === r.id && { color: "#fff" },
              ]}
            >
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Field
        icon="account-outline"
        placeholder="Full name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        testID="register-name-input"
      />

      <Field
        icon="email-outline"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        testID="register-email-input"
      />

      {/* Phone is now required for every role */}
      <Field
        icon="cellphone"
        placeholder="Phone"
        value={phone}
        onChangeText={(value: string) =>
          setPhone(value.replace(/[^0-9]/g, "").slice(0, 10))
        }
        keyboardType="phone-pad"
        maxLength={10}
        testID="register-phone-input"
      />

      <Field
        icon="lock-outline"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secure
        testID="register-password-input"
      />

      {/* Password Rule Hint */}
      {password.length > 0 && (
        <View style={s.ruleBox}>
          <Text style={s.ruleHeading}>Password requirements</Text>

          <PasswordRule
            text="At least 8 characters"
            valid={hasMinLength}
          />

          <PasswordRule
            text="At least one uppercase letter (A-Z)"
            valid={hasUppercase}
          />

          <PasswordRule
            text="At least one number (0-9)"
            valid={hasNumber}
          />

          <PasswordRule
            text="At least one special character (!@#$)"
            valid={hasSpecialChar}
          />
        </View>
      )}

      {/* Confirm Password */}
      <Field
        icon="lock-check-outline"
        placeholder="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secure
        testID="register-confirm-password-input"
      />

      {confirmPassword.length > 0 && (
        <Text
          style={[
            s.matchText,
            passwordsMatch ? s.ruleValid : s.ruleInvalid,
          ]}
        >
          {passwordsMatch
            ? "✓ Passwords match"
            : "✕ Passwords do not match"}
        </Text>
      )}

      {error && <Text style={s.err}>{error}</Text>}

      <Pressable
        onPress={onSubmit}
        disabled={loading}
        testID="register-submit-button"
        style={[s.cta, loading && { opacity: 0.7 }]}
      >
        <LinearGradient
          colors={[COLORS.accent, COLORS.accentDark]}
          style={s.ctaGrad}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.ctaText}>Create account</Text>
          )}
        </LinearGradient>
      </Pressable>
    </ScrollView>
  </KeyboardAvoidingView>
</SafeAreaView>

);
}

function Field({ icon, secure, testID, ...rest }: any) {
return (
<View style={s.fieldWrap}>
<MaterialCommunityIcons
name={icon}
size={20}
color={COLORS.textMuted}
/>

  <TextInput
    {...rest}
    testID={testID}
    secureTextEntry={secure}
    autoCapitalize={rest.autoCapitalize || "none"}
    placeholderTextColor={COLORS.textMuted}
    style={s.input}
  />
</View>

);
}

function PasswordRule({
text,
valid,
}: {
text: string;
valid: boolean;
}) {
return (
<View style={s.ruleRow}>
<MaterialCommunityIcons
name={valid ? "check-circle" : "circle-outline"}
size={16}
color={valid ? "#16A34A" : COLORS.textMuted}
/>

  <Text style={[s.ruleText, valid && s.ruleValid]}>
    {text}
  </Text>
</View>

);
}

const s = StyleSheet.create({
root: {
flex: 1,
backgroundColor: COLORS.surface,
},

header: {
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
paddingHorizontal: SPACING.lg,
paddingVertical: SPACING.md,
},

title: {
fontSize: 18,
fontWeight: "700",
color: COLORS.text,
},

body: {
padding: SPACING.lg,
paddingBottom: SPACING.xxxl,
},

sub: {
color: COLORS.textSecondary,
marginBottom: SPACING.sm,
fontSize: 13,
},

rolesRow: {
flexDirection: "row",
gap: SPACING.sm,
marginBottom: SPACING.lg,
},

roleCard: {
flex: 1,
alignItems: "center",
padding: SPACING.md,
borderRadius: RADIUS.md,
borderWidth: 1.5,
borderColor: COLORS.border,
backgroundColor: COLORS.surface,
gap: 6,
},

roleCardActive: {
backgroundColor: COLORS.brand,
borderColor: COLORS.brand,
},

roleLabel: {
fontWeight: "600",
color: COLORS.text,
fontSize: 13,
},

fieldWrap: {
flexDirection: "row",
alignItems: "center",
gap: 10,
backgroundColor: COLORS.surfaceSecondary,
borderRadius: RADIUS.md,
paddingHorizontal: 14,
marginBottom: SPACING.md,
borderWidth: 1,
borderColor: COLORS.border,
},

input: {
flex: 1,
paddingVertical: 14,
fontSize: 15,
color: COLORS.text,
},

ruleBox: {
backgroundColor: COLORS.surfaceSecondary,
borderRadius: RADIUS.md,
padding: SPACING.md,
marginTop: -SPACING.sm,
marginBottom: SPACING.md,
borderWidth: 1,
borderColor: COLORS.border,
gap: 8,
},

ruleHeading: {
fontSize: 13,
fontWeight: "700",
color: COLORS.text,
marginBottom: 2,
},

ruleRow: {
flexDirection: "row",
alignItems: "center",
gap: 8,
},

ruleText: {
fontSize: 12,
color: COLORS.textMuted,
},

ruleValid: {
color: "#16A34A",
},

ruleInvalid: {
color: COLORS.error,
},

matchText: {
fontSize: 12,
marginTop: -SPACING.sm,
marginBottom: SPACING.md,
},

cta: {
marginTop: SPACING.lg,
borderRadius: RADIUS.pill,
overflow: "hidden",
},

ctaGrad: {
paddingVertical: 16,
alignItems: "center",
},

ctaText: {
color: "#fff",
fontWeight: "700",
letterSpacing: 0.5,
},

err: {
color: COLORS.error,
marginTop: 4,
},
});