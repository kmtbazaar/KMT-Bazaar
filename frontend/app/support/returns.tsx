import { LocalizedText as Text } from "@/src/LocalizedText";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "@/src/api";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

const REASONS = [
  "Damaged item",
  "Wrong item received",
  "Item missing",
  "Quality issue",
  "Other",
] as const;

type RequestType = "return" | "refund";

export default function OrderSupportReturns() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const [orders, setOrders] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState(String(params.orderId || ""));
  const [requestType, setRequestType] = useState<RequestType>("return");
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [orderList, requestList] = await Promise.all([
          api.orders(),
          api.supportRequests(),
        ]);
        if (!active) return;
        const safeOrders = Array.isArray(orderList) ? orderList : [];
        setOrders(safeOrders);
        setRequests(Array.isArray(requestList) ? requestList : []);
        setSelectedOrderId((current) => {
          if (current && safeOrders.some((order: any) => String(order.id) === current)) return current;
          return String(safeOrders[0]?.id || "");
        });
      } catch (error: any) {
        if (active) Alert.alert("Help & Support", error?.message || "Could not load your orders.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [params.orderId]);

  const selectedOrder = useMemo(
    () => orders.find((order) => String(order.id) === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const activeRequest = requests.find((request) =>
    String(request.order_id) === selectedOrderId &&
    ["submitted", "under_review"].includes(String(request.status))
  );

  const submitRequest = async () => {
    if (!selectedOrderId || !selectedOrder) {
      Alert.alert("Select an order", "Choose the order you need help with.");
      return;
    }
    if (activeRequest) {
      Alert.alert("Request already submitted", "A request for this order is already being reviewed.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.createOrderSupportRequest(selectedOrderId, {
        request_type: requestType,
        reason,
        details: details.trim(),
      });
      setRequests((current) => [created, ...current]);
      setDetails("");
      Alert.alert(
        "Request submitted",
        "Your request has been recorded. KMT Bazaar Support will review it and contact you."
      );
    } catch (error: any) {
      Alert.alert("Could not submit request", error?.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="order-support-screen">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} />
        </Pressable>
        <Text style={s.title}>Help & Support</Text>
        <View style={{ width: 34 }} />
      </View>

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator color={COLORS.brand} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.intro}>
            <MaterialCommunityIcons name="headset" size={28} color={COLORS.brand} />
            <View style={{ flex: 1 }}>
              <Text style={s.introTitle}>Order help</Text>
              <Text style={s.introText}>Select an order and submit a return or refund request for the support team to review.</Text>
            </View>
          </View>

          <Text style={s.sectionTitle}>Select order</Text>
          {orders.length === 0 ? (
            <View style={s.empty}>
              <MaterialCommunityIcons name="package-variant" size={32} color={COLORS.textMuted} />
              <Text style={s.emptyText}>No orders found yet.</Text>
            </View>
          ) : orders.map((item) => {
            const selected = String(item.id) === selectedOrderId;
            const title = item.items?.[0]?.name || "Order";
            const active = requests.find((request) =>
              String(request.order_id) === String(item.id) &&
              ["submitted", "under_review"].includes(String(request.status))
            );
            return (
              <Pressable
                key={String(item.id)}
                testID={`support-order-${item.id}`}
                onPress={() => setSelectedOrderId(String(item.id))}
                style={[s.orderCard, selected && s.orderCardSelected]}
              >
                <View style={s.orderCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.orderNumber}>#{item.order_no || item.id}</Text>
                    <Text style={s.orderName} numberOfLines={1}>{title}{item.items?.length > 1 ? ` + ${item.items.length - 1} more` : ""}</Text>
                    <Text style={s.orderMeta}>{item.created_at ? new Date(item.created_at).toLocaleDateString() : ""} · Rs. {Number(item.total || 0).toFixed(2)}</Text>
                  </View>
                  <MaterialCommunityIcons
                    name={selected ? "radiobox-marked" : "radiobox-blank"}
                    size={22}
                    color={selected ? COLORS.brand : COLORS.textMuted}
                  />
                </View>
                {active && <Text style={s.pendingTag}>Request submitted · {active.request_type}</Text>}
              </Pressable>
            );
          })}

          {!!selectedOrder && (
            <View style={s.formCard}>
              <Text style={s.sectionTitle}>What do you need?</Text>
              <View style={s.typeRow}>
                <Pressable
                  testID="support-type-return"
                  onPress={() => setRequestType("return")}
                  style={[s.typeButton, requestType === "return" && s.typeButtonActive]}
                >
                  <MaterialCommunityIcons name="package-return" size={19} color={requestType === "return" ? "#fff" : COLORS.brand} />
                  <Text style={[s.typeText, requestType === "return" && s.typeTextActive]}>Return</Text>
                </Pressable>
                <Pressable
                  testID="support-type-refund"
                  onPress={() => setRequestType("refund")}
                  style={[s.typeButton, requestType === "refund" && s.typeButtonActive]}
                >
                  <MaterialCommunityIcons name="cash-refund" size={19} color={requestType === "refund" ? "#fff" : COLORS.brand} />
                  <Text style={[s.typeText, requestType === "refund" && s.typeTextActive]}>Refund</Text>
                </Pressable>
              </View>

              <Text style={s.fieldLabel}>Reason</Text>
              <View style={s.reasonWrap}>
                {REASONS.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setReason(option)}
                    style={[s.reasonChip, reason === option && s.reasonChipActive]}
                  >
                    <Text style={[s.reasonText, reason === option && s.reasonTextActive]}>{option}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={s.fieldLabel}>Additional details (optional)</Text>
              <TextInput
                testID="support-request-details"
                value={details}
                onChangeText={setDetails}
                placeholder="Tell us a little more about the issue..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                maxLength={1000}
                textAlignVertical="top"
                style={s.detailsInput}
              />

              {activeRequest ? (
                <View style={s.alreadySubmitted}>
                  <MaterialCommunityIcons name="clock-check-outline" size={19} color="#92400E" />
                  <Text style={s.alreadySubmittedText}>A request for this order is already submitted and awaiting review.</Text>
                </View>
              ) : (
                <Pressable
                  testID="submit-support-request"
                  onPress={submitRequest}
                  disabled={submitting}
                  style={[s.submitButton, submitting && { opacity: 0.65 }]}
                >
                  {submitting ? <ActivityIndicator color="#fff" /> : <MaterialCommunityIcons name="send" size={18} color="#fff" />}
                  <Text style={s.submitText}>{submitting ? "Submitting..." : `Submit ${requestType === "return" ? "Return" : "Refund"} Request`}</Text>
                </Pressable>
              )}
              <Text style={s.reviewNote}>Submitting a request does not automatically approve a return or issue a refund. The support team will review your request.</Text>
            </View>
          )}

          {requests.length > 0 && (
            <View style={s.history}>
              <Text style={s.sectionTitle}>Your support requests</Text>
              {requests.map((request) => (
                <View key={String(request.id)} style={s.historyCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.orderNumber}>#{request.order_no || request.order_id}</Text>
                    <Text style={s.historyReason}>{request.request_type === "refund" ? "Refund" : "Return"} · {request.reason}</Text>
                    <Text style={s.orderMeta}>{request.created_at ? new Date(request.created_at).toLocaleDateString() : ""}</Text>
                  </View>
                  <Text style={s.historyStatus}>{String(request.status || "submitted").replace("_", " ")}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    minHeight: 58,
    paddingHorizontal: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  backButton: { width: 34, height: 38, justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  content: { padding: SPACING.lg, paddingBottom: 50, gap: 12 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  intro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 15,
    borderRadius: RADIUS.md,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  introTitle: { fontWeight: "800", fontSize: 15, color: COLORS.text },
  introText: { fontSize: 12, lineHeight: 18, color: COLORS.textSecondary, marginTop: 3 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text, marginTop: 5, marginBottom: 2 },
  empty: { padding: 24, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, backgroundColor: COLORS.surface },
  emptyText: { color: COLORS.textMuted, marginTop: 7, fontSize: 13 },
  orderCard: { padding: 13, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, marginBottom: 8 },
  orderCardSelected: { borderColor: COLORS.brand, borderWidth: 2, backgroundColor: "#F0FDF4" },
  orderCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  orderNumber: { fontSize: 11, fontWeight: "800", color: COLORS.brand },
  orderName: { fontSize: 13, fontWeight: "700", color: COLORS.text, marginTop: 3 },
  orderMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  pendingTag: { color: "#92400E", fontSize: 11, fontWeight: "700", marginTop: 8 },
  formCard: { padding: 15, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, marginTop: 2 },
  typeRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  typeButton: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, backgroundColor: COLORS.surface },
  typeButtonActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  typeText: { color: COLORS.brand, fontWeight: "800", fontSize: 13 },
  typeTextActive: { color: "#fff" },
  fieldLabel: { marginTop: 15, marginBottom: 7, fontSize: 12, color: COLORS.text, fontWeight: "800" },
  reasonWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reasonChip: { borderRadius: 18, paddingVertical: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  reasonChipActive: { borderColor: COLORS.brand, backgroundColor: "#ECFDF5" },
  reasonText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: "600" },
  reasonTextActive: { color: COLORS.brand, fontWeight: "800" },
  detailsInput: { minHeight: 92, padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, fontSize: 13, backgroundColor: COLORS.background },
  submitButton: { minHeight: 48, marginTop: 15, borderRadius: RADIUS.md, backgroundColor: COLORS.brand, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  reviewNote: { color: COLORS.textMuted, fontSize: 10, lineHeight: 15, marginTop: 10 },
  alreadySubmitted: { flexDirection: "row", alignItems: "center", gap: 8, padding: 11, borderRadius: RADIUS.md, backgroundColor: "#FFFBEB", marginTop: 15 },
  alreadySubmittedText: { color: "#92400E", flex: 1, fontSize: 11, fontWeight: "600" },
  history: { marginTop: 8 },
  historyCard: { flexDirection: "row", gap: 10, alignItems: "center", padding: 13, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, marginTop: 7 },
  historyReason: { fontWeight: "700", fontSize: 12, color: COLORS.text, marginTop: 4 },
  historyStatus: { fontSize: 10, textTransform: "capitalize", color: COLORS.brand, fontWeight: "800" },
});
