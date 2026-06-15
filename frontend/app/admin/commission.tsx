import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { adminApi } from "@/src/roleApi";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

export default function AdminCommission() {
  const router = useRouter();
  const [percent, setPercent] = useState("10");
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const c = await adminApi.getCommission(); setPercent(String(c.commission_percent || 10)); } catch {}
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onSave = async () => {
    setBusy(true);
    try {
      const p = parseFloat(percent);
      await adminApi.setCommission(p);
      setSaved("Commission saved!"); setTimeout(() => setSaved(null), 1800);
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="admin-commission-screen">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} /></Pressable>
        <Text style={s.title}>Commission Settings</Text>
        <View style={{ width: 22 }} />
      </View>
      <View style={s.body}>
        <View style={s.card}>
          <Text style={s.label}>Platform Commission</Text>
          <Text style={s.hint}>Applied to all vendor revenue. Vendors receive (100 − x)% of their gross.</Text>
          <View style={s.inputRow}>
            <TextInput
              testID="commission-input"
              value={percent}
              onChangeText={setPercent}
              keyboardType="numeric"
              style={s.input}
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={s.suffix}>%</Text>
          </View>

          {/* Quick presets */}
          <View style={s.presets}>
            {[5, 8, 10, 12, 15, 20].map(p => (
              <Pressable
                key={p}
                testID={`preset-${p}`}
                onPress={() => setPercent(String(p))}
                style={[s.preset, percent === String(p) && s.presetActive]}
              >
                <Text style={[s.presetText, percent === String(p) && { color: "#fff" }]}>{p}%</Text>
              </Pressable>
            ))}
          </View>

          <Pressable testID="save-commission" onPress={onSave} disabled={busy} style={{ marginTop: 20 }}>
            <LinearGradient colors={[COLORS.accent, COLORS.accentDark]} style={s.saveBtn}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.saveText}>Save Commission</Text>}
            </LinearGradient>
          </Pressable>

          {saved && (
            <View style={s.toast}>
              <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.success} />
              <Text style={s.toastText}>{saved}</Text>
            </View>
          )}
        </View>

        <View style={s.example}>
          <Text style={s.exTitle}>Example</Text>
          <Text style={s.exText}>On ₹1000 vendor gross sale:</Text>
          <View style={s.exRow}>
            <Text style={s.exLabel}>Platform earns</Text>
            <Text style={s.exVal}>₹{(1000 * parseFloat(percent || "0") / 100).toFixed(2)}</Text>
          </View>
          <View style={s.exRow}>
            <Text style={s.exLabel}>Vendor receives</Text>
            <Text style={[s.exVal, { color: COLORS.success }]}>₹{(1000 * (1 - parseFloat(percent || "0") / 100)).toFixed(2)}</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  body: { padding: SPACING.lg },
  card: { backgroundColor: "#fff", padding: SPACING.lg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  label: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  hint: { color: COLORS.textMuted, marginTop: 4, fontSize: 13 },
  inputRow: { flexDirection: "row", alignItems: "center", marginTop: 16, borderWidth: 1.5, borderColor: COLORS.brand, borderRadius: RADIUS.md, paddingHorizontal: 16, backgroundColor: COLORS.brandLight },
  input: { flex: 1, paddingVertical: 14, fontSize: 22, fontWeight: "800", color: COLORS.brandDark },
  suffix: { fontSize: 22, fontWeight: "800", color: COLORS.brandDark },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  preset: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#fff" },
  presetActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  presetText: { fontWeight: "700", color: COLORS.textSecondary },
  saveBtn: { paddingVertical: 14, borderRadius: RADIUS.pill, alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "800" },
  toast: { flexDirection: "row", gap: 6, marginTop: 12, padding: 10, borderRadius: RADIUS.md, backgroundColor: "#DCFCE7", justifyContent: "center" },
  toastText: { color: COLORS.success, fontWeight: "700" },
  example: { backgroundColor: COLORS.brandLight, padding: SPACING.lg, borderRadius: RADIUS.md, marginTop: 12 },
  exTitle: { fontWeight: "800", color: COLORS.brandDark, fontSize: 14 },
  exText: { color: COLORS.brandDark, marginTop: 6, fontSize: 13 },
  exRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  exLabel: { color: COLORS.brandDark, fontSize: 13 },
  exVal: { color: COLORS.text, fontWeight: "800", fontSize: 15 },
});
