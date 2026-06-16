import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, RefreshControl, Alert, Modal, TextInput, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { adminApi } from "@/src/roleApi";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

const TABS = [
  { key: "pending", label: "Pending", icon: "clock-outline" },
  { key: "approved", label: "Approved", icon: "check-circle-outline" },
  { key: "rejected", label: "Rejected", icon: "close-circle-outline" },
] as const;

const statusColor: Record<string, string> = {
  pending: "#F59E0B",
  approved: "#10B981",
  rejected: "#EF4444",
};

export default function ProductApprovalsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<string>("pending");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectFor, setRejectFor] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await adminApi.listAllProducts(tab);
      setProducts(list || []);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleApprove = (p: any) => {
    Alert.alert("Approve product?", `Approve "${p.name}" to make it visible to customers?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
          try { await adminApi.approveProduct(p.id); load(); }
          catch (e: any) { Alert.alert("Error", e?.message || "Failed"); }
        },
      },
    ]);
  };

  const submitReject = async () => {
    if (!rejectFor) return;
    setSubmitting(true);
    try {
      await adminApi.rejectProduct(rejectFor.id, reason);
      setRejectFor(null); setReason(""); load();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="admin-product-approvals">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="back-btn">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Product Approvals</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            testID={`tab-${t.key}`}
            onPress={() => setTab(t.key)}
            style={[s.tab, tab === t.key && s.tabActive]}
          >
            <MaterialCommunityIcons name={t.icon as any} size={16} color={tab === t.key ? "#fff" : COLORS.textSecondary} />
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={s.loaderWrap}><ActivityIndicator color={COLORS.brand} /></View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <MaterialCommunityIcons name="package-variant" size={48} color={COLORS.textMuted} />
              <Text style={s.empty}>No {tab} products</Text>
            </View>
          }
          renderItem={({ item: p }) => (
            <View style={s.card} testID={`product-card-${p.id}`}>
              <View style={s.cardTop}>
                <View style={s.imgWrap}>
                  {p.image ? (
                    <Image source={{ uri: p.image }} style={s.img} contentFit="cover" />
                  ) : (
                    <MaterialCommunityIcons name="image-off" size={28} color={COLORS.textMuted} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.pname} numberOfLines={2}>{p.name}</Text>
                  <Text style={s.pmeta}>{p.unit || "—"}</Text>
                  <View style={s.priceRow}>
                    <Text style={s.price}>₹{p.price}</Text>
                    {p.mrp > p.price && <Text style={s.mrp}>₹{p.mrp}</Text>}
                  </View>
                  <Text style={s.vendor}>
                    <MaterialCommunityIcons name="store-outline" size={11} color={COLORS.textMuted} />
                    {" "}{p.vendor?.name || "Admin"}
                  </Text>
                </View>
                <View style={[s.badge, { backgroundColor: statusColor[p.status] + "22", borderColor: statusColor[p.status] }]}>
                  <Text style={[s.badgeText, { color: statusColor[p.status] }]}>{p.status}</Text>
                </View>
              </View>

              <View style={s.statRow}>
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Stock</Text>
                  <Text style={s.statValue}>{p.stock ?? 0}</Text>
                </View>
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Category</Text>
                  <Text style={s.statValue} numberOfLines={1}>{p.category_id || "-"}</Text>
                </View>
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Added</Text>
                  <Text style={s.statValue}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : "-"}</Text>
                </View>
              </View>

              {p.description && (
                <Text style={s.desc} numberOfLines={3}>{p.description}</Text>
              )}

              {p.rejection_reason && (
                <View style={s.reasonBox}>
                  <MaterialCommunityIcons name="alert-circle" size={14} color="#EF4444" />
                  <Text style={s.reasonText}>{p.rejection_reason}</Text>
                </View>
              )}

              {tab === "pending" && (
                <View style={s.actionRow}>
                  <Pressable testID={`approve-${p.id}`} onPress={() => handleApprove(p)} style={[s.actionBtn, s.approveBtn]}>
                    <MaterialCommunityIcons name="check" size={16} color="#fff" />
                    <Text style={s.actionText}>Approve</Text>
                  </Pressable>
                  <Pressable testID={`reject-${p.id}`} onPress={() => { setRejectFor(p); setReason(""); }} style={[s.actionBtn, s.rejectBtn]}>
                    <MaterialCommunityIcons name="close" size={16} color="#fff" />
                    <Text style={s.actionText}>Reject</Text>
                  </Pressable>
                </View>
              )}
              {tab === "rejected" && (
                <Pressable testID={`reapprove-${p.id}`} onPress={() => handleApprove(p)} style={[s.actionBtn, s.approveBtn, { marginTop: 12 }]}>
                  <MaterialCommunityIcons name="refresh" size={16} color="#fff" />
                  <Text style={s.actionText}>Re-Approve</Text>
                </Pressable>
              )}
            </View>
          )}
        />
      )}

      <Modal visible={!!rejectFor} transparent animationType="slide" onRequestClose={() => setRejectFor(null)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Reject Product</Text>
            <Text style={s.modalSub}>{rejectFor?.name ? `"${rejectFor.name}"` : ""}</Text>
            <TextInput
              testID="reason-input"
              placeholder="Reason for rejection (visible to vendor)"
              value={reason}
              onChangeText={setReason}
              multiline
              style={s.modalInput}
              placeholderTextColor={COLORS.textMuted}
            />
            <View style={s.modalActions}>
              <Pressable onPress={() => { setRejectFor(null); setReason(""); }} style={[s.actionBtn, s.cancelBtn]}>
                <Text style={[s.actionText, { color: COLORS.text }]}>Cancel</Text>
              </Pressable>
              <Pressable testID="submit-reason" onPress={submitReject} disabled={submitting} style={[s.actionBtn, s.rejectBtn]}>
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.actionText}>Reject</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: 12, backgroundColor: COLORS.brand },
  headerTitle: { color: "#fff", fontWeight: "800", fontSize: 17 },
  tabs: { flexDirection: "row", padding: SPACING.sm, gap: 6, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, gap: 4, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceSecondary },
  tabActive: { backgroundColor: COLORS.brand },
  tabText: { fontSize: 11, fontWeight: "700", color: COLORS.textSecondary },
  tabTextActive: { color: "#fff" },
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { alignItems: "center", paddingVertical: 60, gap: 12 },
  empty: { color: COLORS.textMuted, fontSize: 13 },
  card: { backgroundColor: "#fff", borderRadius: RADIUS.md, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: "row", gap: 10 },
  imgWrap: { width: 72, height: 72, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceSecondary, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  img: { width: 72, height: 72 },
  pname: { fontWeight: "700", color: COLORS.text, fontSize: 13 },
  pmeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 },
  price: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  mrp: { fontSize: 11, color: COLORS.textMuted, textDecorationLine: "line-through" },
  vendor: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill, borderWidth: 1, alignSelf: "flex-start" },
  badgeText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  statRow: { flexDirection: "row", marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  statItem: { flex: 1 },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: "600" },
  statValue: { fontSize: 12, color: COLORS.text, fontWeight: "700", marginTop: 2 },
  desc: { color: COLORS.textSecondary, fontSize: 12, marginTop: 10, lineHeight: 16 },
  reasonBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEF2F2", padding: 8, borderRadius: RADIUS.sm, marginTop: 10 },
  reasonText: { color: "#991B1B", fontSize: 11, flex: 1 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10, borderRadius: RADIUS.sm, minHeight: 38 },
  approveBtn: { backgroundColor: "#10B981" },
  rejectBtn: { backgroundColor: "#EF4444" },
  cancelBtn: { backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border },
  actionText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.lg, paddingBottom: 30 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  modalSub: { color: COLORS.textMuted, marginTop: 4, fontSize: 13 },
  modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 12, marginTop: 16, minHeight: 80, color: COLORS.text, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
});
