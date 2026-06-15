import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/AuthContext";
import { COLORS, RADIUS, SPACING, shadow } from "@/src/theme";

const ROLES = [
  { id: "customer", label: "Customer", icon: "account" },
  { id: "vendor", label: "Vendor", icon: "store" },
  { id: "delivery", label: "Delivery", icon: "moped" },
];

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null); setLoading(true);
    try {
      const user = await register({ name, email, phone, password, role });
      router.replace(user.role === "customer" ? "/(tabs)/home" : (`/role/${user.role}` as any));
    } catch (e: any) {
      setError(e.message || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="register-screen">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} testID="register-back-button" hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={26} color={COLORS.text} />
        </Pressable>
        <Text style={s.title}>Create account</Text>
        <View style={{ width: 26 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <Text style={s.sub}>I want to join as</Text>
          <View style={s.rolesRow}>
            {ROLES.map(r => (
              <Pressable key={r.id} testID={`role-${r.id}`} onPress={() => setRole(r.id)} style={[s.roleCard, role === r.id && s.roleCardActive]}>
                <MaterialCommunityIcons name={r.icon as any} size={24} color={role === r.id ? "#fff" : COLORS.brand} />
                <Text style={[s.roleLabel, role === r.id && { color: "#fff" }]}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
          <Field icon="account-outline" placeholder="Full name" value={name} onChangeText={setName} testID="register-name-input" />
          <Field icon="email-outline" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" testID="register-email-input" />
          <Field icon="cellphone" placeholder="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" testID="register-phone-input" />
          <Field icon="lock-outline" placeholder="Password (min 6 chars)" value={password} onChangeText={setPassword} secure testID="register-password-input" />
          {error && <Text style={s.err}>{error}</Text>}
          <Pressable onPress={onSubmit} testID="register-submit-button" style={s.cta}>
            <LinearGradient colors={[COLORS.accent, COLORS.accentDark]} style={s.ctaGrad}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>Create account</Text>}
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
      <MaterialCommunityIcons name={icon} size={20} color={COLORS.textMuted} />
      <TextInput {...rest} testID={testID} secureTextEntry={secure} autoCapitalize="none" placeholderTextColor={COLORS.textMuted} style={s.input} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  body: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  sub: { color: COLORS.textSecondary, marginBottom: SPACING.sm, fontSize: 13 },
  rolesRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.lg },
  roleCard: { flex: 1, alignItems: "center", padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface, gap: 6 },
  roleCardActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  roleLabel: { fontWeight: "600", color: COLORS.text, fontSize: 13 },
  fieldWrap: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, paddingHorizontal: 14, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: COLORS.text },
  cta: { marginTop: SPACING.lg, borderRadius: RADIUS.pill, overflow: "hidden" },
  ctaGrad: { paddingVertical: 16, alignItems: "center" },
  ctaText: { color: "#fff", fontWeight: "700", letterSpacing: 0.5 },
  err: { color: COLORS.error, marginTop: 4 },
});
