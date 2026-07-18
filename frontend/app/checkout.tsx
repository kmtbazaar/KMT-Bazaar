import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api } from "@/src/api";
import { useCart } from "@/src/CartContext";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

export default function Checkout() {
  const router = useRouter();
  const { cart, refresh } = useCart();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<string | null>(null);
  const [payment, setPayment] = useState<"cod" | "online">("cod");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // FIX: Added edit mode tracking
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "Home", full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });

  const loadAddrs = async () => {
    try {
      const a = await api.addresses();
      setAddresses(a || []);
      if (a?.length && !selectedAddr) {
        setSelectedAddr(a.find((x: any) => x.is_default)?.id || a[0].id);
      }
      if (a?.length === 0) setShowForm(true);
    } catch (e) {
      console.log("Failed to load addresses", e);
    }
  };
  useEffect(() => { loadAddrs(); }, []);

  // FIX: Edit button logic
  const handleEdit = (addr: any) => {
    const addressId = addr.id || addr._id;
    setEditingId(addressId);
    setForm({
      label: addr.label || "Home",
      full_name: addr.full_name || "",
      phone: addr.phone || "",
      line1: addr.line1 || "",
      line2: addr.line2 || "",
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || ""
    });
    setShowForm(true);
  };

  // FIX: Delete button logic
  const handleDelete = async (id: string) => {
    Alert.alert("Delete Address", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await api.deleteAddress(id);
            if (selectedAddr === id) setSelectedAddr(null);
            loadAddrs();
          } catch (e) {
            Alert.alert("Error", "Failed to delete address");
          }
        }
      }
    ]);
  };

  const saveAddr = async () => {
    // FIX: Strict Validation
    if (!form.full_name || !form.phone || !form.line1 || !form.city || !form.state || !form.pincode) {
      Alert.alert("Required", "Please fill all required fields.");
      return;
    }
    if (form.phone.trim().length !== 10) {
      Alert.alert("Invalid Phone", "Phone number must be exactly 10 digits.");
      return;
    }
    if (form.pincode.trim().length !== 6) {
      Alert.alert("Invalid Pincode", "Pincode must be exactly 6 digits.");
      return;
    }

    try {
      if (editingId) {
        // FIX: Update existing address
        await api.updateAddress(editingId, form);
      } else {
        // FIX: Create new address
        const a = await api.createAddress({ ...form, is_default: addresses.length === 0 });
        if (addresses.length === 0) setSelectedAddr(a.id);
      }
      
      // Reset form
      setEditingId(null);
      setForm({ label: "Home", full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });
      setShowForm(false);
      loadAddrs(); // Reload the list
    } catch (e) {
      Alert.alert("Error", "Failed to save address");
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ label: "Home", full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });
  };

  const onPlace = async () => {
    if (!selectedAddr) return;
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const order = await api.checkout({ address_id: selectedAddr, payment_method: payment });
      await refresh();
      router.replace(`/orders/${order.id}` as any);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="checkout-screen">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} /></Pressable>
        <Text style={s.title}>Checkout</Text>
        <View style={{ width: 22 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 200 }} keyboardShouldPersistTaps="handled">
          
          <Text style={s.section}>Delivery Address</Text>
          {addresses.map((a) => {
            const isSelected = selectedAddr === (a.id || a._id);
            return (
              <Pressable
                key={a.id || a._id}
                testID={`addr-${a.id || a._id}`}
                onPress={() => setSelectedAddr(a.id || a._id)}
                style={[s.addrCard, isSelected && s.addrCardActive]}
              >
                <View style={{ flexDirection: "row", flex: 1 }}>
                  <MaterialCommunityIcons name={isSelected ? "radiobox-marked" : "radiobox-blank"} size={20} color={COLORS.brand} style={{ marginTop: 2, marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.addrLabel}>{a.label} · {a.full_name}</Text>
                    <Text style={s.addrText}>{a.line1}, {a.line2 ? a.line2 + "," : ""} {a.city}, {a.state} - {a.pincode}</Text>
                    <Text style={s.addrPhone}>{a.phone}</Text>
                  </View>
                </View>
                
                {/* FIX: Edit & Delete Icons inside the card */}
                {isSelected && (
                  <View style={s.actionRow}>
                    <TouchableOpacity onPress={() => handleEdit(a)} hitSlop={10} style={{ padding: 4 }}>
                      <MaterialCommunityIcons name="pencil" size={18} color={COLORS.brand} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(a.id || a._id)} hitSlop={10} style={{ padding: 4 }}>
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </Pressable>
            );
          })}
          
          {!showForm && (
            <Pressable testID="add-address-btn" onPress={() => {
              setEditingId(null);
              setForm({ label: "Home", full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });
              setShowForm(true);
            }} style={s.addBtn}>
              <MaterialCommunityIcons name="plus" size={18} color={COLORS.brand} />
              <Text style={s.addBtnText}>Add new address</Text>
            </Pressable>
          )}

          {showForm && (
            <View style={s.form}>
              <Input ph="Full name" v={form.full_name} oc={(v: string) => setForm({ ...form, full_name: v })} testID="addr-name" />
              {/* FIX: Phone max 10 and numeric filter */}
              <Input ph="Phone (10 digits)" v={form.phone} oc={(v: string) => setForm({ ...form, phone: v.replace(/[^0-9]/g, '') })} kt="number-pad" maxLength={10} testID="addr-phone" />
              <Input ph="House no, Building" v={form.line1} oc={(v: string) => setForm({ ...form, line1: v })} testID="addr-line1" />
              <Input ph="Area, Street (optional)" v={form.line2} oc={(v: string) => setForm({ ...form, line2: v })} testID="addr-line2" />
              
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}><Input ph="City" v={form.city} oc={(v: string) => setForm({ ...form, city: v })} testID="addr-city" /></View>
                <View style={{ flex: 1 }}><Input ph="State" v={form.state} oc={(v: string) => setForm({ ...form, state: v })} testID="addr-state" /></View>
              </View>
              {/* FIX: Pincode max 6 and numeric filter */}
              <Input ph="Pincode" v={form.pincode} oc={(v: string) => setForm({ ...form, pincode: v.replace(/[^0-9]/g, '') })} kt="number-pad" maxLength={6} testID="addr-pincode" />
              
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                 {addresses.length > 0 && (
                   <Pressable testID="cancel-address" onPress={cancelForm} style={[s.saveBtn, { flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border }]}>
                    <Text style={[s.saveBtnText, { color: COLORS.textSecondary }]}>Cancel</Text>
                  </Pressable>
                 )}
                <Pressable testID="save-address" onPress={saveAddr} style={[s.saveBtn, { flex: 1 }]}>
                  <Text style={s.saveBtnText}>{editingId ? "Update Address" : "Save Address"}</Text>
                </Pressable>
              </View>
            </View>
          )}

          <Text style={s.section}>Payment Method</Text>
          <Pressable testID="payment-cod" onPress={() => setPayment("cod")} style={[s.pay, payment === "cod" && s.payActive]}>
            <MaterialCommunityIcons name={payment === "cod" ? "radiobox-marked" : "radiobox-blank"} size={20} color={COLORS.brand} />
            <MaterialCommunityIcons name="cash" size={24} color={COLORS.success} />
            <View style={{ flex: 1 }}>
              <Text style={s.payTitle}>Cash on Delivery</Text>
              <Text style={s.paySub}>Pay when your order arrives</Text>
            </View>
          </Pressable>
          <Pressable testID="payment-online" onPress={() => setPayment("online")} style={[s.pay, payment === "online" && s.payActive]}>
            <MaterialCommunityIcons name={payment === "online" ? "radiobox-marked" : "radiobox-blank"} size={20} color={COLORS.brand} />
            <MaterialCommunityIcons name="credit-card-outline" size={24} color={COLORS.brand} />
            <View style={{ flex: 1 }}>
              <Text style={s.payTitle}>Online Payment</Text>
              <Text style={s.paySub}>UPI · Card · Wallet (Razorpay) — Mock</Text>
            </View>
          </Pressable>

          <Text style={s.section}>Order Summary</Text>
          <View style={s.summary}>
            <Row l="Subtotal" v={`₹${cart?.subtotal || 0}`} />
            <Row l="Delivery" v={cart?.delivery_fee ? `₹${cart?.delivery_fee}` : "FREE"} />
            <Row l="Tax" v={`₹${cart?.tax || 0}`} />
            <View style={s.divider} />
            <Row l="Total" v={`₹${cart?.total || 0}`} bold />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={s.bar}>
        <Pressable testID="place-order-btn" onPress={onPlace} disabled={!selectedAddr || loading || showForm} style={{ flex: 1 }}>
          <LinearGradient colors={[COLORS.accent, COLORS.accentDark]} style={[s.placeBtn, (!selectedAddr || loading || showForm) && { opacity: 0.6 }]}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={s.placeText}>Place Order · ₹{cart?.total || 0}</Text>
                <MaterialCommunityIcons name="arrow-right" color="#fff" size={20} />
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// FIX: Added maxLength support in Input helper
function Input({ ph, v, oc, kt, maxLength, testID }: any) {
  return <TextInput testID={testID} placeholder={ph} value={v} onChangeText={oc} keyboardType={kt} maxLength={maxLength} placeholderTextColor={COLORS.textMuted} style={ss.input} />;
}
function Row({ l, v, bold }: any) {
  return <View style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 4 }}>
    <Text style={{ color: COLORS.textSecondary, fontSize: bold ? 16 : 13, fontWeight: bold ? "800" : "500" }}>{l}</Text>
    <Text style={{ color: COLORS.text, fontSize: bold ? 18 : 13, fontWeight: bold ? "800" : "700" }}>{v}</Text>
  </View>;
}

const ss = StyleSheet.create({ input: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, fontSize: 14 } });
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  section: { fontSize: 15, fontWeight: "800", color: COLORS.text, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  addrCard: { flexDirection: "column", padding: 12, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 8 },
  addrCardActive: { borderColor: COLORS.brand, backgroundColor: COLORS.brandLight },
  addrLabel: { fontWeight: "700", color: COLORS.text },
  addrText: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  addrPhone: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  actionRow: { flexDirection: "row", justifyContent: "flex-end", gap: 12, borderTopWidth: 1, borderColor: COLORS.border, marginTop: 8, paddingTop: 8 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, gap: 6, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.brand, borderStyle: "dashed" },
  addBtnText: { color: COLORS.brand, fontWeight: "700" },
  form: { backgroundColor: COLORS.surfaceSecondary, padding: 12, borderRadius: RADIUS.md, marginTop: 8 },
  saveBtn: { backgroundColor: COLORS.brand, padding: 12, borderRadius: RADIUS.pill, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "800" },
  pay: { flexDirection: "row", gap: 12, padding: 14, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 8, alignItems: "center" },
  payActive: { borderColor: COLORS.brand, backgroundColor: COLORS.brandLight },
  payTitle: { fontWeight: "700", color: COLORS.text },
  paySub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  summary: { padding: 12, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 6 },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, padding: SPACING.md, paddingBottom: 24, backgroundColor: "#fff", borderTopWidth: 1, borderColor: COLORS.border },
  placeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: RADIUS.pill, gap: 8 },
  placeText: { color: "#fff", fontWeight: "800" },
});