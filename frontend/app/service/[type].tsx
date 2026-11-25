import { LocalizedText as Text, LocalizedTextInput as TextInput } from "@/src/LocalizedText";
import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert, Platform, Modal } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "@/src/api";
import PhotographyCustomerPage from "@/components/PhotographyCustomerPage";

const META: Record<string, { title: string; icon: string; sub: string }> = {
  holiday: { title: "Holiday", icon: "airplane-takeoff", sub: "Holiday packages & trip bookings" },
  car_rental: { title: "Car Rental", icon: "car", sub: "Cars, rentals & trip bookings" },
  daily_service: { title: "Daily Services", icon: "tools", sub: "Repair, mistri, labour & local services" },
  premium_decorator: { title: "Premium Decorator", icon: "party-popper", sub: "Premium wedding and event decoration" },
  photography: { title: "Photography", icon: "camera-outline", sub: "Wedding, event and professional photography" },
};

export default function ServiceCatalog({ fixedType }: { fixedType?: string }) {
  const params = useLocalSearchParams<{ type: string }>();
  const type = fixedType || params.type || "daily_service";
  const meta = META[type] || META.daily_service;
  const isEventService = type === "premium_decorator" || type === "photography";
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ date: "", time: "", venue: "", notes: "" });

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.serviceCatalog(type)
      .then((result: any[]) => { if (active) setItems(Array.isArray(result) ? result : []); })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [type]);

  const sortedItems = useMemo(() => items.filter((item) => item && item.active !== false), [items]);

  const notify = (title: string, message: string) => {
    if (Platform.OS === "web") window.alert(message);
    else Alert.alert(title, message);
  };

  const openBooking = (item: any) => {
    setSelected(item);
    setForm({ date: "", time: "", venue: "", notes: "" });
  };

  const book = async () => {
    if (!selected) return;
    if (!form.date.trim()) {
      notify("Date required", "Please enter your event or booking date.");
      return;
    }
    if (isEventService && form.venue.trim().length < 4) {
      notify("Venue required", "Please enter the event venue or shoot location.");
      return;
    }
    try {
      const packagePrice = Number(selected.price || 0);
      await api.serviceCartAdd({
        service_type: type,
        service_id: selected.id,
        booking_date: form.date.trim(),
        booking_time: form.time.trim(),
        notes: form.notes.trim(),
        quantity: 1,
        extra: {
          package_name: selected.name,
          package_price: packagePrice,
          vendor_name: selected.vendor_name || "",
          service_category: selected.category || "",
          category: selected.category || "",
          location: selected.location || "",
          service_address: form.venue.trim(),
          event_venue: form.venue.trim(),
          package_type: selected.type || "",
          duration: selected.duration || "",
          source: "service-marketplace",
        },
      });
      setSelected(null);
      router.push("/service-booking-cart" as any);
    } catch (error: any) {
      notify("Booking", error?.message || "Could not start this booking. Please login first.");
    }
  };

  if (type === "photography") return <PhotographyCustomerPage />;

  return (
    <SafeAreaView style={s.root}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.title}>{meta.title}</Text>
          <Text style={s.sub}>{meta.sub}</Text>
        </View>
        <Pressable onPress={() => router.push("/service-booking-cart" as any)} hitSlop={10}>
          <MaterialCommunityIcons name="calendar-check-outline" size={25} color="#0284C7" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 40 }} />
        ) : sortedItems.length === 0 ? (
          <View style={s.empty}>
            <MaterialCommunityIcons name={meta.icon as any} size={48} color="#0284C7" />
            <Text style={s.emptyTitle}>Packages coming soon</Text>
            <Text style={s.emptyText}>Approved {meta.title.toLowerCase()} partners will publish their packages here.</Text>
          </View>
        ) : (
          sortedItems.map((item) => (
            <View key={item.id} style={s.card}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={s.img} contentFit="cover" />
              ) : (
                <View style={[s.img, s.ph]}>
                  <MaterialCommunityIcons name={meta.icon as any} size={38} color="#0284C7" />
                </View>
              )}
              <View style={s.cardBody}>
                {!!item.category && <Text style={s.category}>{item.category}</Text>}
                <Text style={s.name}>{item.name}</Text>
                {!!item.vendor_name && <Text style={s.vendor}>{item.vendor_name}</Text>}
                {!!item.location && <Text style={s.meta}>{item.location}</Text>}
                {!!item.duration && <Text style={s.meta}>{item.duration}</Text>}
                {!!item.description && <Text style={s.desc}>{item.description}</Text>}
                {!!item.includes?.length && <Text style={s.includes}>Includes: {item.includes.join(" · ")}</Text>}
                <View style={s.priceRow}>
                  <Text style={s.price}>₹{Number(item.price || 0).toLocaleString("en-IN")}</Text>
                  <Text style={s.unit}> / {item.unit || (type === "premium_decorator" ? "event" : type === "photography" ? "shoot" : "package")}</Text>
                </View>
                <Pressable style={s.btn} onPress={() => openBooking(item)}>
                  <Text style={s.btnText}>{type === "premium_decorator" ? "Book Event Decor" : type === "photography" ? "Book Photography" : type === "holiday" ? "Book Holiday" : type === "car_rental" ? "Book Car" : "Book Service"}</Text>
                  <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={s.modal}>
          <View style={s.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={s.modalHead}>
                <View style={{ flex: 1 }}>
                  <Text style={s.sheetTitle}>{isEventService ? "Event / Shoot Details" : "Booking Details"}</Text>
                  <Text style={s.vendor}>{selected?.name}</Text>
                </View>
                <Pressable onPress={() => setSelected(null)} hitSlop={10}>
                  <MaterialCommunityIcons name="close" size={24} color="#475569" />
                </Pressable>
              </View>
              <Text style={s.fieldLabel}>{isEventService ? "Event / Shoot Date *" : "Booking Date *"}</Text>
              <TextInput placeholder="YYYY-MM-DD" value={form.date} onChangeText={(v) => setForm({ ...form, date: v })} style={s.input} />
              <Text style={s.fieldLabel}>Preferred Time</Text>
              <TextInput placeholder="e.g. 10:00 AM" value={form.time} onChangeText={(v) => setForm({ ...form, time: v })} style={s.input} />
              {isEventService && (
                <>
                  <Text style={s.fieldLabel}>Event Venue / Shoot Location *</Text>
                  <TextInput placeholder="Venue name, area and city" value={form.venue} onChangeText={(v) => setForm({ ...form, venue: v })} style={s.input} />
                </>
              )}
              <Text style={s.fieldLabel}>{isEventService ? "Event Requirements" : "Notes"}</Text>
              <TextInput placeholder={isEventService ? "Guest count, theme, setup, deliverables..." : "Any booking notes"} value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} style={[s.input, s.notes]} multiline />
              <Pressable style={s.btn} onPress={book}>
                <Text style={s.btnText}>Continue to Booking Cart</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  head: { flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  title: { fontSize: 20, fontWeight: "900", color: "#0F172A" },
  sub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  body: { padding: 14, paddingBottom: 40, maxWidth: 780, width: "100%", alignSelf: "center" },
  card: { backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", marginBottom: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  img: { width: "100%", height: 190, backgroundColor: "#E0F2FE" },
  ph: { alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 15 },
  category: { color: "#BE185D", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  name: { fontSize: 19, fontWeight: "900", color: "#0F172A", marginTop: 4 },
  vendor: { fontSize: 13, color: "#0284C7", marginTop: 4, fontWeight: "700" },
  meta: { fontSize: 12, color: "#64748B", marginTop: 4 },
  desc: { fontSize: 13, color: "#475569", lineHeight: 19, marginTop: 8 },
  includes: { fontSize: 11, color: "#475569", marginTop: 8, lineHeight: 16 },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginTop: 12 },
  price: { color: "#EA580C", fontSize: 21, fontWeight: "900" },
  unit: { color: "#64748B", fontSize: 12 },
  btn: { backgroundColor: "#0284C7", padding: 14, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 14 },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  empty: { alignItems: "center", padding: 60 },
  emptyTitle: { fontSize: 19, fontWeight: "900", marginTop: 12, color: "#0F172A" },
  emptyText: { color: "#64748B", marginTop: 6, textAlign: "center", lineHeight: 18 },
  modal: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.45)" },
  sheet: { backgroundColor: "#fff", padding: 18, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "88%" },
  modalHead: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  sheetTitle: { fontSize: 20, fontWeight: "900", color: "#0F172A" },
  fieldLabel: { fontSize: 12, color: "#475569", fontWeight: "800", marginTop: 10, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, padding: 12, marginTop: 3, backgroundColor: "#F8FAFC", color: "#0F172A" },
  notes: { minHeight: 82, textAlignVertical: "top" },
});
