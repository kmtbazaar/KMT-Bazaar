import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
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
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationCaptured, setLocationCaptured] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [locationError, setLocationError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "Home", full_name: "", phone: "", line1: "", line2: "", landmark: "", district: "", city: "", state: "", pincode: "" });

  const loadAddrs = async () => {
    try {
      const a = await api.addresses();
      setAddresses(a || []);

      const stored = await AsyncStorage.getItem("selected_address");
      if (stored) {
        const parsed = JSON.parse(stored);
        const storedId = parsed.id || parsed._id;
        if (storedId && a?.some((x: any) => String(x.id || x._id) === String(storedId))) {
          setSelectedAddr(String(storedId));
          return;
        }
      }

      if (a?.length && !selectedAddr) {
        const def = a.find((x: any) => x.is_default);
        const firstId = def ? (def.id || def._id) : (a[0].id || a[0]._id);
        setSelectedAddr(firstId ? String(firstId) : null);
      }

      if (a?.length === 0) {
        setShowForm(false);
        setSelectedAddr(null);
      }
    } catch (e) {
      console.log("Failed to load addresses", e);
    }
  };

  useEffect(() => { loadAddrs(); }, []);

  const handleSelectAddr = async (addr: any) => {
    const id = String(addr.id || addr._id);
    setSelectedAddr(id);
    try {
      await AsyncStorage.setItem("selected_address", JSON.stringify(addr));
    } catch (e) {
      console.log("Failed to save address locally", e);
    }
  };

  const handleEdit = (addr: any) => {
    const addressId = String(addr.id || addr._id);
    setEditingId(addressId);
    setForm({
      label: addr.label || "Home",
      full_name: addr.full_name || "",
      phone: addr.phone || "",
      line1: addr.line1 || "",
      line2: addr.line2 || "",
      landmark: addr.landmark || "",
      district: addr.district || "",
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || ""
    });
    setLocationCaptured(null);
    setLocationError("");
    setShowForm(true);
  };

  const captureNewAddressLocation = async () => {
    setLocationLoading(true);
    setLocationError("");

    try {
      let result: { latitude: number; longitude: number; accuracy?: number };

      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && !window.isSecureContext) {
          throw new Error("Location requires a secure HTTPS connection.");
        }
        if (!navigator.geolocation) {
          throw new Error("This browser does not support location access.");
        }

        result = await new Promise<{ latitude: number; longitude: number; accuracy?: number }>((resolve, reject) => {
          let watchId: number | null = null;
          let best: { latitude: number; longitude: number; accuracy?: number } | null = null;
          let settled = false;

          const finish = (value?: { latitude: number; longitude: number; accuracy?: number }, error?: Error) => {
            if (settled) return;
            settled = true;
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            window.clearTimeout(timeoutId);
            if (error) reject(error);
            else resolve(value || best as { latitude: number; longitude: number; accuracy?: number });
          };

          const timeoutId = window.setTimeout(() => {
            if (best && Number.isFinite(best.accuracy) && (best.accuracy as number) <= 150) finish(best);
            else finish(undefined, new Error("Precise GPS is not accurate enough yet. Turn on Location/GPS and try again."));
          }, 30000);

          watchId = navigator.geolocation.watchPosition(
            (position) => {
              const current = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: Number(position.coords.accuracy),
              };

              if (!best || current.accuracy < (best.accuracy ?? Infinity)) best = current;
              if (current.accuracy <= 75) finish(current);
            },
            (error) => {
              const messages: Record<number, string> = {
                1: "Location permission was denied. Allow KMT Bazaar to use your location.",
                2: "Turn on your device Location/GPS and try again.",
                3: "Precise GPS timed out. Try again with Location/GPS on.",
              };
              finish(undefined, new Error(messages[error?.code] || error?.message || "Could not get your precise current location."));
            },
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
          );
        });
      } else {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          throw new Error("Location permission is required for delivery. Please allow it and try again.");
        }

        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        result = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
          accuracy: current.coords.accuracy,
        };
      }

      setLocationCaptured(result);

      try {
        const geo = await api.reverseGeocode(result.latitude, result.longitude);
        setForm(prev => ({
          ...prev,
          line1: geo?.line1 || prev.line1,
          district: geo?.district || prev.district,
          city: geo?.city || prev.city,
          state: geo?.state || prev.state,
          pincode: geo?.pincode || prev.pincode,
        }));
      } catch (error) {
        console.log("Checkout reverse geocode failed:", error);
        setLocationError("GPS captured. Please enter the address details manually.");
      }

      return result;
    } catch (error: any) {
      const message = error?.message || "Could not fetch your current location.";
      setLocationError(message);
      throw error;
    } finally {
      setLocationLoading(false);
    }
  };

  const handleAddNewAddress = async () => {
    setEditingId(null);
    setLocationCaptured(null);
    setLocationError("");
    setForm({
      label: "Home",
      full_name: "",
      phone: "",
      line1: "",
      line2: "",
      landmark: "",
      district: "",
      city: "",
      state: "",
      pincode: "",
    });
    setShowForm(true);

    try {
      await captureNewAddressLocation();
    } catch {}
  };

  // 🔥 FIXED DELETE BUTTON LOGIC (WEB & MOBILE COMPATIBLE)
  const handleDelete = async (targetId: string) => {
    const idToDelete = String(targetId);

    const executeDelete = async () => {
      try {
        setLoading(true);
        
        // 1. Backend API Call
        await api.deleteAddress(idToDelete);

        // 2. Clear Local Selection if this address was selected
        if (String(selectedAddr) === idToDelete) {
          await AsyncStorage.removeItem("selected_address");
          setSelectedAddr(null);
        }

        // 3. Instant UI Refresh & Reload
        await loadAddrs();
      } catch (e: any) {
        console.log("CHECKOUT DELETE ERROR:", e);
        Alert.alert("Error", e.message || "Failed to delete address");
      } finally {
        setLoading(false);
      }
    };

    // Platform Check for Web Async Fix
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to delete this address?")) {
        executeDelete();
      }
    } else {
      Alert.alert("Delete Address", "Are you sure you want to delete this address?", [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: executeDelete
        }
      ]);
    }
  };

  const saveAddr = async () => {
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
        await api.updateAddress(editingId, form);
      } else {
        if (!locationCaptured) {
          Alert.alert("Location Required", "Please allow current location for this new delivery address.");
          return;
        }

        const a = await api.createAddress({
          ...form,
          latitude: locationCaptured.latitude,
          longitude: locationCaptured.longitude,
          is_default: addresses.length === 0,
        });
        const createdId = String(a.id || a._id);
        setSelectedAddr(createdId);
        await AsyncStorage.setItem("selected_address", JSON.stringify(a));
      }

      setEditingId(null);
      setLocationCaptured(null);
      setLocationError("");
      setForm({
        label: "Home",
        full_name: "",
        phone: "",
        line1: "",
        line2: "",
        landmark: "",
        district: "",
        city: "",
        state: "",
        pincode: "",
      });
      setShowForm(false);
      await loadAddrs();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save address");
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setLocationCaptured(null);
    setLocationError("");
    setForm({ label: "Home", full_name: "", phone: "", line1: "", line2: "", landmark: "", district: "", city: "", state: "", pincode: "" });
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
    } catch (e: any) {
      Alert.alert("Checkout Error", e.message || "Failed to place order");
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
            const addrId = String(a.id || a._id);
            const isSelected = selectedAddr === addrId;
            return (
              <Pressable
                key={addrId}
                testID={`addr-${addrId}`}
                onPress={() => handleSelectAddr(a)}
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
                
                {isSelected && (
                  <View style={s.actionRow}>
                    <TouchableOpacity onPress={() => handleEdit(a)} hitSlop={10} style={{ padding: 4 }}>
                      <MaterialCommunityIcons name="pencil" size={18} color={COLORS.brand} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(addrId)} hitSlop={10} style={{ padding: 4 }}>
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </Pressable>
            );
          })}
          
          {!showForm && (
            <Pressable testID="add-address-btn" onPress={handleAddNewAddress} style={s.addBtn}>
              <MaterialCommunityIcons name="plus" size={18} color={COLORS.brand} />
              <Text style={s.addBtnText}>Add new address</Text>
            </Pressable>
          )}

          {showForm && (
            <View style={s.form}>
              <Input ph="Full name" v={form.full_name} oc={(v: string) => setForm({ ...form, full_name: v })} testID="addr-name" />
              <Input ph="Phone (10 digits)" v={form.phone} oc={(v: string) => setForm({ ...form, phone: v.replace(/[^0-9]/g, '') })} kt="number-pad" maxLength={10} testID="addr-phone" />
              <Input ph="House no, Building" v={form.line1} oc={(v: string) => setForm({ ...form, line1: v })} testID="addr-line1" />
              <Input ph="Area, Street (optional)" v={form.line2} oc={(v: string) => setForm({ ...form, line2: v })} testID="addr-line2" />
              <Input ph="Nearby / Landmark (optional)" v={form.landmark} oc={(v: string) => setForm({ ...form, landmark: v })} testID="addr-landmark" />
              <Input ph="District" v={form.district} oc={(v: string) => setForm({ ...form, district: v })} testID="addr-district" />
              
              {!editingId && (
                <View style={s.locationCard}>
                  <View style={s.locationRow}>
                    <MaterialCommunityIcons name={locationCaptured ? "check-circle" : "crosshairs-gps"} size={19} color={locationCaptured ? "#15803D" : COLORS.brand} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.locationTitle}>{locationLoading ? "Detecting your live location…" : locationCaptured ? "Live location captured" : "Location required for delivery"}</Text>
                      <Text style={s.locationText}>{locationCaptured ? "Your device GPS is attached to this new address." : "Tap Add new address to start location capture."}</Text>
                    </View>
                  </View>
                  {!!locationCaptured && <Text style={s.locationSuccess}>GPS ready{locationCaptured.accuracy ? " · ±" + Math.round(locationCaptured.accuracy) + " m" : ""}</Text>}
                  {!!locationError && <Text style={s.locationError}>{locationError}</Text>}
                  {locationLoading && <ActivityIndicator size="small" color={COLORS.brand} style={{ marginTop: 8, alignSelf: "flex-start" }} />}
                </View>
              )}

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}><Input ph="City" v={form.city} oc={(v: string) => setForm({ ...form, city: v })} testID="addr-city" /></View>
                <View style={{ flex: 1 }}><Input ph="State" v={form.state} oc={(v: string) => setForm({ ...form, state: v })} testID="addr-state" /></View>
              </View>
              <Input ph="Pincode" v={form.pincode} oc={(v: string) => setForm({ ...form, pincode: v.replace(/[^0-9]/g, '') })} kt="number-pad" maxLength={6} testID="addr-pincode" />
              
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                 {addresses.length > 0 && (
                   <Pressable testID="cancel-address" onPress={cancelForm} style={[s.saveBtn, { flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border }]}>
                    <Text style={[s.saveBtnText, { color: COLORS.textSecondary }]}>Cancel</Text>
                  </Pressable>
                 )}
                <Pressable testID="save-address" onPress={saveAddr} disabled={!editingId && (!locationCaptured || locationLoading)} style={[s.saveBtn, { flex: 1 }, (!editingId && (!locationCaptured || locationLoading)) && { opacity: 0.55 }]}>
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
  locationCard: { marginTop: 4, marginBottom: 10, padding: 12, borderRadius: RADIUS.md, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  locationTitle: { color: COLORS.text, fontSize: 13, fontWeight: "800" },
  locationText: { color: COLORS.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 2 },
  locationSuccess: { color: "#15803D", fontSize: 10, fontWeight: "700", marginTop: 6 },
  locationError: { color: "#B91C1C", fontSize: 10, fontWeight: "700", lineHeight: 15, marginTop: 6 },
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
