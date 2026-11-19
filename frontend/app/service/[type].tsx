import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert, Platform, TextInput, Modal } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "@/src/api";

const META: any = {
  holiday: { title: "Holiday", icon: "airplane-takeoff", sub: "Holiday packages & trip bookings", accent: "#2563EB" },
  car_rental: { title: "Car Rental", icon: "car", sub: "Cars, rentals & trip bookings", accent: "#0284C7" },
  daily_service: { title: "Daily Services", icon: "tools", sub: "Repair, mistri, labour & local services", accent: "#0284C7" },
  decorator: { title: "Decorator", icon: "party-popper", sub: "Wedding, birthday & event decoration", accent: "#C2410C" },
  photography_studio: { title: "Photography Studio", icon: "camera", sub: "Photography, cinematic video & studio shoots", accent: "#7C3AED" },
};

export default function ServiceCatalog({ fixedType }: { fixedType?: string }) {
  const params = useLocalSearchParams<{ type: string }>();
  const type = fixedType || params.type || "daily_service";
  const meta = META[type] || META.daily_service;
  const isCreative = type === "decorator" || type === "photography_studio";
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [mode, setMode] = useState<"direct" | "enquiry">("direct");
  const [form, setForm] = useState({ date: "", time: "", location: "", notes: "", budgetMin: "", budgetMax: "", guestCount: "" });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.serviceCatalog(type).then((result) => { if (active) setItems(result || []); })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [type]);

  const close = () => { setSelected(null); setMode("direct"); setForm({ date: "", time: "", location: "", notes: "", budgetMin: "", budgetMax: "", guestCount: "" }); };
  const notify = (title: string, message: string) => Platform.OS === "web" ? window.alert(message) : Alert.alert(title, message);

  const submit = async () => {
    if (!selected || sending) return;
    if ((!isCreative || mode === "direct") && !form.date.trim()) { notify("Event date required", "Please enter event date in YYYY-MM-DD format."); return; }
    if (isCreative && form.notes.trim().length < 5) { notify("More details needed", "Please describe your event requirements in at least 5 characters."); return; }
    setSending(true);
    try {
      if (isCreative && mode === "direct") {
        const result = await api.createDirectServiceBooking({
          service_type: type,
          service_id: selected.id,
          event_date: form.date.trim(),
          event_time: form.time.trim(),
          event_type: selected.category || selected.type || "",
          event_location: form.location.trim(),
          guest_count: Number(form.guestCount) || 0,
          notes: form.notes.trim(),
        });
        close();
        notify("Request sent", "Your booking request has been sent to the service vendor. It will be confirmed after the vendor accepts it.");
        router.push("/service-bookings" as any);
      } else if (isCreative) {
        await api.createServiceEnquiry({
          service_type: type,
          vendor_id: selected.vendor_id,
          service_id: selected.id,
          event_date: form.date.trim() || null,
          event_time: form.time.trim(),
          event_location: form.location.trim(),
          budget_min: form.budgetMin.trim() ? Number(form.budgetMin) : null,
          budget_max: form.budgetMax.trim() ? Number(form.budgetMax) : null,
          requirements: form.notes.trim(),
        });
        close();
        notify("Enquiry sent", "Your enquiry has been shared with the vendor. You can track their quotation in My Enquiries.");
        router.push("/service-enquiries" as any);
      } else {
        await api.serviceCartAdd({
          service_type: type,
          service_id: selected.id,
          booking_date: form.date.trim(),
          booking_time: form.time.trim(),
          notes: form.notes.trim(),
          quantity: 1,
          extra: {},
        });
        close();
        router.push("/service-booking-cart" as any);
      }
    } catch (error: any) {
      notify("Unable to continue", error?.message || "Please login and try again.");
    } finally {
      setSending(false);
    }
  };

  const emptyDescription = useMemo(() => isCreative
    ? "Verified local professionals and their service packages will appear here."
    : "Approved providers will appear here.", [isCreative]);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.head}>
        <Pressable onPress={() => router.back()} style={s.back}><MaterialCommunityIcons name="arrow-left" size={23} color="#0F172A" /></Pressable>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.title}>{meta.title}</Text>
          <Text style={s.sub}>{meta.sub}</Text>
        </View>
        {isCreative ? (
          <Pressable onPress={() => router.push("/service-enquiries" as any)} style={s.headAction}>
            <MaterialCommunityIcons name="message-text-outline" size={20} color={meta.accent} />
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push("/service-booking-cart" as any)} style={s.headAction}>
            <MaterialCommunityIcons name="calendar-check-outline" size={22} color={meta.accent} />
          </Pressable>
        )}
      </View>

      {isCreative && (
        <View style={[s.hero, { backgroundColor: type === "decorator" ? "#FFF7ED" : "#F5F3FF" }]}>
          <View style={[s.heroIcon, { backgroundColor: type === "decorator" ? "#FFEDD5" : "#EDE9FE" }]}>
            <MaterialCommunityIcons name={meta.icon} size={28} color={meta.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.heroTitle, { color: meta.accent }]}>Make your event memorable</Text>
            <Text style={s.heroSub}>Compare packages, request a custom quote, or send a booking request directly.</Text>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={s.body}>
        {loading ? <ActivityIndicator size="large" color={meta.accent} /> :
          items.length === 0 ? (
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: type === "decorator" ? "#FFF7ED" : "#F1F5F9" }]}>
                <MaterialCommunityIcons name={meta.icon} size={38} color={meta.accent} />
              </View>
              <Text style={s.emptyTitle}>Services coming soon</Text>
              <Text style={s.emptyText}>{emptyDescription}</Text>
            </View>
          ) : items.map((item) => (
            <View key={item.id} style={s.card}>
              {item.image ? <Image source={{ uri: item.image }} style={s.img} contentFit="cover" /> :
                <View style={[s.img, s.placeholder]}><MaterialCommunityIcons name={meta.icon} size={38} color={meta.accent} /></View>}
              <View style={s.cardBody}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{item.name}</Text>
                    {!!item.vendor_name && <Text style={[s.vendor, { color: meta.accent }]}>{item.vendor_name}</Text>}
                    {!!item.location && <Text style={s.meta}><MaterialCommunityIcons name="map-marker-outline" size={13} /> {item.location}</Text>}
                  </View>
                  {!!item.price && <Text style={s.price}>₹{Number(item.price).toLocaleString("en-IN")}</Text>}
                </View>
                {!!item.description && <Text style={s.desc}>{item.description}</Text>}
                {!!item.tag && <Text style={s.tag}>{item.tag}</Text>}
                {isCreative ? (
                  <View style={s.actions}>
                    <Pressable style={[s.btn, { backgroundColor: meta.accent }]} onPress={() => { setSelected(item); setMode("direct"); }}>
                      <MaterialCommunityIcons name="calendar-check" size={17} color="#fff" />
                      <Text style={s.btnText}>Book now</Text>
                    </Pressable>
                    <Pressable style={[s.btn, s.outline, { borderColor: meta.accent }]} onPress={() => { setSelected(item); setMode("enquiry"); }}>
                      <MaterialCommunityIcons name="message-text-outline" size={17} color={meta.accent} />
                      <Text style={[s.btnOutlineText, { color: meta.accent }]}>Get quotation</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable style={[s.btn, { backgroundColor: meta.accent }]} onPress={() => setSelected(item)}>
                    <Text style={s.btnText}>{type === "holiday" ? "Book Holiday" : type === "car_rental" ? "Book Car" : "Book Service"}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={close}>
        <View style={s.modal}>
          <ScrollView style={s.sheet} contentContainerStyle={{ paddingBottom: 26 }} keyboardShouldPersistTaps="handled">
            <View style={s.modalTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>{isCreative ? (mode === "direct" ? "Booking request" : "Request a quotation") : "Booking details"}</Text>
                <Text style={s.vendor}>{selected?.name}</Text>
              </View>
              <Pressable onPress={close}><MaterialCommunityIcons name="close-circle" size={25} color="#64748B" /></Pressable>
            </View>
            <Field label={isCreative && mode === "enquiry" ? "Event date (YYYY-MM-DD, optional)" : "Event date (YYYY-MM-DD) *"} value={form.date} onChange={(v: string) => setForm({ ...form, date: v })} placeholder="2027-01-15" />
            <Field label="Event time" value={form.time} onChange={(v: string) => setForm({ ...form, time: v })} placeholder="18:00" />
            {isCreative && <Field label="Event location" value={form.location} onChange={(v: string) => setForm({ ...form, location: v })} placeholder="Venue, area, city" />}
            {isCreative && mode === "direct" && <Field label="Guest count" value={form.guestCount} onChange={(v: string) => setForm({ ...form, guestCount: v })} placeholder="100" keyboardType="numeric" />}
            {isCreative && mode === "enquiry" && (
              <View style={s.two}>
                <Field label="Budget min (₹)" value={form.budgetMin} onChange={(v: string) => setForm({ ...form, budgetMin: v })} placeholder="10000" keyboardType="numeric" />
                <Field label="Budget max (₹)" value={form.budgetMax} onChange={(v: string) => setForm({ ...form, budgetMax: v })} placeholder="30000" keyboardType="numeric" />
              </View>
            )}
            <Field label={isCreative ? "Requirements *" : type === "daily_service" ? "Requirement / problem" : "Notes"} value={form.notes} onChange={(v: string) => setForm({ ...form, notes: v })} placeholder={isCreative ? "Describe your event and services required..." : "Anything the provider should know"} multiline />
            <View style={s.actions}>
              <Pressable style={[s.btn, s.cancel]} onPress={close}><Text style={{ color: "#334155", fontWeight: "800" }}>Cancel</Text></Pressable>
              <Pressable style={[s.btn, { backgroundColor: meta.accent, opacity: sending ? 0.6 : 1 }]} onPress={submit} disabled={sending}>
                {sending ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{isCreative ? (mode === "direct" ? "Send booking request" : "Send enquiry") : "Add to booking cart"}</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, placeholder, multiline, keyboardType }: any) {
  return <View style={{ marginTop: 11 }}>
    <Text style={s.label}>{label}</Text>
    <TextInput value={value} onChangeText={onChange} placeholder={placeholder} keyboardType={keyboardType}
      placeholderTextColor="#94A3B8" multiline={multiline}
      style={[s.input, multiline && { minHeight: 88, textAlignVertical: "top" }]} />
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  head: { flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  back: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "900", color: "#0F172A" },
  sub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  headAction: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E2E8F0" },
  hero: { margin: 14, borderRadius: 18, padding: 15, flexDirection: "row", alignItems: "center", gap: 12 },
  heroIcon: { width: 54, height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 16, fontWeight: "900" },
  heroSub: { fontSize: 11, lineHeight: 16, color: "#475569", marginTop: 4 },
  body: { padding: 14, paddingBottom: 44 },
  card: { backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", marginBottom: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  img: { width: "100%", height: 185 },
  placeholder: { alignItems: "center", justifyContent: "center", backgroundColor: "#E0F2FE" },
  cardBody: { padding: 15 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  name: { fontSize: 18, fontWeight: "900", color: "#0F172A" },
  vendor: { fontSize: 12, color: "#0284C7", fontWeight: "800", marginTop: 4 },
  meta: { fontSize: 11, color: "#64748B", marginTop: 5 },
  price: { fontSize: 16, color: "#0F172A", fontWeight: "900" },
  desc: { fontSize: 12, lineHeight: 18, color: "#475569", marginTop: 9 },
  tag: { alignSelf: "flex-start", marginTop: 8, borderRadius: 20, backgroundColor: "#F1F5F9", color: "#334155", paddingHorizontal: 10, paddingVertical: 5, fontSize: 10, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 9, marginTop: 12 },
  btn: { flex: 1, minHeight: 44, borderRadius: 12, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  outline: { backgroundColor: "#fff", borderWidth: 1.4 },
  btnOutlineText: { fontWeight: "900", fontSize: 12 },
  empty: { alignItems: "center", padding: 58 },
  emptyIcon: { width: 76, height: 76, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 19, fontWeight: "900", marginTop: 15, color: "#0F172A" },
  emptyText: { color: "#64748B", marginTop: 6, textAlign: "center", lineHeight: 18, maxWidth: 310 },
  modal: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,.5)" },
  sheet: { backgroundColor: "#fff", padding: 18, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92%" },
  modalTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  sheetTitle: { fontSize: 20, fontWeight: "900", color: "#0F172A" },
  label: { fontSize: 11, fontWeight: "900", color: "#475569", marginBottom: 5 },
  input: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, padding: 12, color: "#0F172A", backgroundColor: "#F8FAFC" },
  two: { flexDirection: "row", gap: 8 },
  cancel: { backgroundColor: "#E2E8F0" },
});
