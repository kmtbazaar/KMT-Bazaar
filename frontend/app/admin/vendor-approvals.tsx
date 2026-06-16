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
  { key: "suspended", label: "Suspended", icon: "pause-circle-outline" },
] as const;

const statusColor: Record<string, string> = {
  pending: "#F59E0B",
  approved: "#10B981",
  rejected: "#EF4444",
  suspended: "#6B7280",
};

export default function VendorApprovalsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<string>("pending");
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionModal, setActionModal] = useState<{ vendor: any; action: "reject" | "suspend" } | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await adminApi.vendors(tab);
      setVendors(list || []);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleApprove = (v: any) => {
    Alert.alert("Approve vendor?", `Approve "${v.name}" to start selling on the platform?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
          try { await adminApi.approveVendor(v.id); load(); }
          catch (e: any) { Alert.alert("Error", e?.message || "Failed"); }
        },
      },
    ]);
  };

  const handleReactivate = (v: any) => {
    Alert.alert("Reactivate?", `Reactivate "${v.name}" account?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reactivate",
        onPress: async () => {
          try { await adminApi.reactivateVendor(v.id); load(); }
          catch (e: any) { Alert.alert("Error", e?.message || "Failed"); }
        },
      },
    ]);
  };

  const submitAction = async () => {
    if (!actionModal) return;
    setSubmitting(true);
    try {
      if (actionModal.action === "reject") await adminApi.rejectVendor(actionModal.vendor.id, reason);
      if (actionModal.action === "suspend") await adminApi.suspendVendor(actionModal.vendor.id, reason);
      setActionModal(null); setReason(""); load();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="admin-vendor-approvals">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="back-btn">
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Vendor Approvals</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
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
          data={vendors}
          keyExtractor={(v) => v.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <MaterialCommunityIcons name="account-search-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.empty}>No {tab} vendors</Text>
            </View>
          }
          renderItem={({ item: v }) => (
            <View style={s.card} testID={`vendor-card-${v.id}`}>
              <View style={s.cardHeader}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{(v.name || "?").charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.vendorName}>{v.name}</Text>
                  <Text style={s.vendorMeta}>{v.email}</Text>
                  {v.phone && <Text style={s.vendorMeta}>📞 {v.phone}</Text>}
                </View>
                <View style={[s.badge, { backgroundColor: statusColor[v.vendor_status] + "22", borderColor: statusColor[v.vendor_status] }]}>
                  <Text style={[s.badgeText, { color: statusColor[v.vendor_status] }]}>{v.vendor_status}</Text>
                </View>
              </View>

              {/* Meta */}
              <View style={s.metaRow}>
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>Stores</Text>
                  <Text style={s.metaValue}>{v.stores?.length || 0}</Text>
                </View>
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>Products</Text>
                  <Text style={s.metaValue}>{v.products_count || 0}</Text>
                </View>
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>Orders</Text>
                  <Text style={s.metaValue}>{v.orders_count || 0}</Text>
                </View>
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>Applied</Text>
                  <Text style={s.metaValue}>
                    {v.vendor_applied_at ? new Date(v.vendor_applied_at).toLocaleDateString() : "-"}
                  </Text>
                </View>
              </View>

              {v.vendor_rejection_reason && (
                <View style={s.reasonBox}>
                  <MaterialCommunityIcons name="alert-circle" size={14} color="#EF4444" />
                  <Text style={s.reasonText}>{v.vendor_rejection_reason}</Text>
                </View>
              )}

              {/* Actions */}
              <View style={s.actionRow}>
                {tab === "pending" && (
                  <>
                    <Pressable testID={`approve-${v.id}`} onPress={() => handleApprove(v)} style={[s.actionBtn, s.approveBtn]}>
                      <MaterialCommunityIcons name="check" size={16} color="#fff" />
                      <Text style={s.actionText}>Approve</Text>
                    </Pressable>
                    <Pressable testID={`reject-${v.id}`} onPress={() => { setActionModal({ vendor: v, action: "reject" }); setReason(""); }} style={[s.actionBtn, s.rejectBtn]}>
                      <MaterialCommunityIcons name="close" size={16} color="#fff" />
                      <Text style={s.actionText}>Reject</Text>
                    </Pressable>
                  </>
                )}
                {tab === "approved" && (
                  <Pressable testID={`suspend-${v.id}`} onPress={() => { setActionModal({ vendor: v, action: "suspend" }); setReason(""); }} style={[s.actionBtn, s.suspendBtn]}>
                    <MaterialCommunityIcons name="pause" size={16} color="#fff" />
                    <Text style={s.actionText}>Suspend</Text>
                  </Pressable>
                )}
                {(tab === "rejected" || tab === "suspended") && (
                  <Pressable testID={`reactivate-${v.id}`} onPress={() => handleReactivate(v)} style={[s.actionBtn, s.approveBtn]}>
                    <MaterialCommunityIcons name="play" size={16} color="#fff" />
                    <Text style={s.actionText}>Reactivate</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* Reason Modal */}
      <Modal visible={!!actionModal} transparent animationType="slide" onRequestClose={() => setActionModal(null)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>
              {actionModal?.action === "reject" ? "Reject Vendor" : "Suspend Vendor"}
            </Text>
            <Text style={s.modalSub}>{actionModal?.vendor?.name ? `"${actionModal.vendor.name}"` : ""}</Text>
            <TextInput
              testID="reason-input"
              placeholder="Reason (optional, will be shared with vendor)"
              value={reason}
              onChangeText={setReason}
              multiline
              style={s.modalInput}
              placeholderTextColor={COLORS.textMuted}
            />
            <View style={s.modalActions}>
              <Pressable onPress={() => { setActionModal(null); setReason(""); }} style={[s.actionBtn, s.cancelBtn]}>
                <Text style={[s.actionText, { color: COLORS.text }]}>Cancel</Text>
              </Pressable>
              <Pressable testID="submit-reason" onPress={submitAction} disabled={submitting} style={[s.actionBtn, s.rejectBtn]}>
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.actionText}>Confirm</Text>}
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
  card: { backgroundColor: "#fff", borderRadius: RADIUS.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 17 },
  vendorName: { fontWeight: "800", color: COLORS.text, fontSize: 14 },
  vendorMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  metaRow: { flexDirection: "row", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 6 },
  metaItem: { flex: 1, alignItems: "center" },
  metaLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: "600" },
  metaValue: { fontSize: 13, color: COLORS.text, fontWeight: "800", marginTop: 2 },
  reasonBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEF2F2", padding: 8, borderRadius: RADIUS.sm, marginTop: 10 },
  reasonText: { color: "#991B1B", fontSize: 11, flex: 1 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10, borderRadius: RADIUS.sm, minHeight: 38 },
  approveBtn: { backgroundColor: "#10B981" },
  rejectBtn: { backgroundColor: "#EF4444" },
  suspendBtn: { backgroundColor: "#F59E0B" },
  cancelBtn: { backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border },
  actionText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.lg, paddingBottom: 30 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  modalSub: { color: COLORS.textMuted, marginTop: 4, fontSize: 13 },
  modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 12, marginTop: 16, minHeight: 80, color: COLORS.text, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
});
