import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Platform, TextInput, Modal, Dimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { api } from "@/src/api";

const { width } = Dimensions.get("window");

const FALLBACK_PHOTOS = [
  "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1200&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=80",
  "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=1200&q=80",
  "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=1200&q=80",
];

type HolidayItem = {
  id: string;
  name: string;
  vendor_name?: string;
  description?: string;
  image?: string;
  gallery?: string[];
  location?: string;
  category?: string;
};

function galleryFor(item: HolidayItem) {
  const supplied = Array.isArray(item.gallery) ? item.gallery.filter(Boolean) : [];
  const first = item.image ? [item.image] : [];
  const unique = Array.from(new Set([...supplied, ...first]));
  const result = unique.slice(0, 5);
  for (let i = result.length; i < 5; i += 1) result.push(FALLBACK_PHOTOS[i]);
  return result;
}

export default function HolidayPage() {
  const router = useRouter();
  const [items, setItems] = useState<HolidayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLocation, setActiveLocation] = useState("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<HolidayItem | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState(0);

  const planeX = useSharedValue(-120);
  const cloudOneX = useSharedValue(-180);
  const cloudTwoX = useSharedValue(-330);

  useEffect(() => {
    planeX.value = withRepeat(
      withSequence(withTiming(width + 150, { duration: 15000 }), withTiming(-140, { duration: 0 })),
      -1,
      false
    );
    cloudOneX.value = withRepeat(
      withSequence(withTiming(width + 180, { duration: 27000 }), withTiming(-220, { duration: 0 })),
      -1,
      false
    );
    cloudTwoX.value = withRepeat(
      withSequence(withTiming(width + 200, { duration: 35000 }), withTiming(-320, { duration: 0 })),
      -1,
      false
    );
  }, [cloudOneX, cloudTwoX, planeX]);

  const planeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: planeX.value }] }));
  const cloudOneStyle = useAnimatedStyle(() => ({ transform: [{ translateX: cloudOneX.value }] }));
  const cloudTwoStyle = useAnimatedStyle(() => ({ transform: [{ translateX: cloudTwoX.value }] }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.serviceCatalog("holiday");
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log("Holiday catalog load error", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const locations = useMemo(() => {
    const values = items.map(function (x) {
      return (x.location || x.category || "").trim();
    }).filter(Boolean);
    return ["All"].concat(Array.from(new Set(values)));
  }, [items]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter(function (item) {
      const location = (item.location || item.category || "").trim();
      const locationMatch = activeLocation === "All" || location === activeLocation;
      const text = [item.name, item.vendor_name, item.location, item.description, item.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return locationMatch && (!needle || text.includes(needle));
    });
  }, [activeLocation, items, query]);

  const openHoliday = (item: HolidayItem) => {
    setSelected(item);
    setSelectedPhoto(0);
  };

  const bookHoliday = async () => {
    if (!selected) return;
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const defaultDate = d.toISOString().slice(0, 10);
    try {
      await api.serviceCartAdd({
        service_type: "holiday",
        service_id: selected.id,
        booking_date: defaultDate,
        booking_time: "",
        notes: "Holiday enquiry for " + (selected.location || selected.name),
        quantity: 1,
        extra: {},
      });
      setSelected(null);
      router.push("/service-booking-cart" as any);
    } catch (e: any) {
      const message = e && e.message ? e.message : "Please login first";
      if (Platform.OS === "web") window.alert(message);
      else Alert.alert("Holiday Booking", message);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={["#0284C7", "#38BDF8", "#BAE6FD", "#F0F9FF"]} style={s.skyHero}>
          <View style={s.skyTopRow}>
            <Pressable onPress={() => router.back()} style={s.roundBtn}>
              <MaterialCommunityIcons name="arrow-left" size={23} color="#fff" />
            </Pressable>
            <View style={s.heroMiniPill}>
              <MaterialCommunityIcons name="airplane" size={16} color="#0C4A6E" />
              <Text style={s.heroMiniText}>KMT Bazaar Holidays</Text>
            </View>
            <Pressable onPress={() => router.push("/service-booking-cart" as any)} style={s.roundBtn}>
              <MaterialCommunityIcons name="calendar-check-outline" size={21} color="#fff" />
            </Pressable>
          </View>

          <Animated.View style={[s.cloud, s.cloudOne, cloudOneStyle]}>
            <View style={s.cloudBubbleLarge} />
            <View style={s.cloudBubbleSmall} />
            <View style={s.cloudBase} />
          </Animated.View>
          <Animated.View style={[s.cloud, s.cloudTwo, cloudTwoStyle]}>
            <View style={s.cloudBubbleMedium} />
            <View style={s.cloudBubbleSmall2} />
            <View style={s.cloudBase} />
          </Animated.View>
          <Animated.View style={[s.plane, planeStyle]}>
            <MaterialCommunityIcons name="airplane" size={42} color="#fff" />
          </Animated.View>

          <View style={s.heroTextBlock}>
            <Animated.View entering={FadeIn.duration(500)}>
              <Text style={s.eyebrow}>TRAVEL • EXPLORE • REPEAT</Text>
              <Text style={s.heroTitle}>Your next holiday{'\n'}starts here ✈️</Text>
              <Text style={s.heroSub}>
                Discover beautiful destinations, explore 5-photo galleries and book a trip from KMT Bazaar.
              </Text>
            </Animated.View>
          </View>

          <View style={s.searchWrap}>
            <MaterialCommunityIcons name="magnify" size={22} color="#0369A1" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search destination, package or vendor"
              placeholderTextColor="#64748B"
              style={s.searchInput}
            />
            {!!query && (
              <Pressable onPress={() => setQuery("")}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#94A3B8" />
              </Pressable>
            )}
          </View>
        </LinearGradient>

        <View style={s.body}>
          <View style={s.sectionHead}>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionTitle}>Explore destinations</Text>
              <Text style={s.sectionSub}>Every holiday listing supports 5 destination photos</Text>
            </View>
            <View style={s.countPill}>
              <Text style={s.countText}>{filtered.length}</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {locations.map(function (location) {
              const active = activeLocation === location;
              return (
                <Pressable key={location} onPress={() => setActiveLocation(location)} style={[s.chip, active && s.chipActive]}>
                  <Text style={[s.chipText, active && s.chipTextActive]}>{location}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color="#0284C7" />
              <Text style={s.loadingText}>Preparing your holiday map…</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <MaterialCommunityIcons name="airplane-search" size={40} color="#0284C7" />
              </View>
              <Text style={s.emptyTitle}>No holiday packages yet</Text>
              <Text style={s.emptyText}>Approved holiday partners and their destinations will appear here.</Text>
            </View>
          ) : (
            filtered.map(function (item) {
              const gallery = galleryFor(item);
              const location = item.location || item.category || "Holiday destination";
              return (
                <View key={item.id} style={s.destinationCard}>
                  <View style={s.coverWrap}>
                    <Image source={{ uri: gallery[0] }} style={s.cover} contentFit="cover" />
                    <LinearGradient colors={["transparent", "rgba(15,23,42,.82)"]} style={s.coverShade} />
                    <View style={s.locationBadge}>
                      <MaterialCommunityIcons name="map-marker" size={14} color="#fff" />
                      <Text style={s.locationBadgeText}>{location}</Text>
                    </View>
                    <View style={s.coverTitle}>
                      <Text style={s.packageName} numberOfLines={2}>{item.name}</Text>
                      {!!item.vendor_name && <Text style={s.vendorName}>{item.vendor_name}</Text>}
                    </View>
                  </View>

                  <View style={s.galleryStrip}>
                    {gallery.map(function (photo, index) {
                      return (
                        <Pressable key={item.id + "-" + index} onPress={() => openHoliday(item)} style={s.thumbWrap}>
                          <Image source={{ uri: photo }} style={s.thumb} contentFit="cover" />
                          {index === 4 && (
                            <View style={s.fiveBadge}>
                              <Text style={s.fiveBadgeText}>5</Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>

                  {!!item.description && <Text style={s.description} numberOfLines={2}>{item.description}</Text>}

                  <View style={s.cardFooter}>
                    <View style={s.footerMeta}>
                      <MaterialCommunityIcons name="camera-image" size={17} color="#0284C7" />
                      <Text style={s.footerMetaText}>5-photo gallery</Text>
                    </View>
                    <Pressable onPress={() => openHoliday(item)} style={s.bookButton}>
                      <Text style={s.bookButtonText}>View & Book</Text>
                      <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>{selected && selected.name}</Text>
                <Text style={s.modalLocation}>{selected && (selected.location || selected.category || "Holiday destination")}</Text>
              </View>
              <Pressable onPress={() => setSelected(null)} style={s.closeBtn}>
                <MaterialCommunityIcons name="close" size={22} color="#0F172A" />
              </Pressable>
            </View>

            {selected && (
              <>
                <Image source={{ uri: galleryFor(selected)[selectedPhoto] }} style={s.mainPhoto} contentFit="cover" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10, paddingBottom: 4 }}>
                  {galleryFor(selected).map(function (photo, index) {
                    const active = index === selectedPhoto;
                    return (
                      <Pressable key={selected.id + "-modal-" + index} onPress={() => setSelectedPhoto(index)}>
                        <Image source={{ uri: photo }} style={[s.modalThumb, active && s.modalThumbActive]} contentFit="cover" />
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {!!selected.description && <Text style={s.modalDescription}>{selected.description}</Text>}

                <View style={s.modalInfoRow}>
                  <View style={s.infoBox}>
                    <MaterialCommunityIcons name="map-marker-radius-outline" size={20} color="#0284C7" />
                    <Text style={s.infoLabel}>Destination</Text>
                    <Text style={s.infoValue} numberOfLines={1}>{selected.location || selected.category || "Holiday"}</Text>
                  </View>
                  <View style={s.infoBox}>
                    <MaterialCommunityIcons name="image-multiple-outline" size={20} color="#0284C7" />
                    <Text style={s.infoLabel}>Gallery</Text>
                    <Text style={s.infoValue}>5 photos</Text>
                  </View>
                </View>

                <Pressable style={s.modalBook} onPress={bookHoliday}>
                  <MaterialCommunityIcons name="airplane-takeoff" size={20} color="#fff" />
                  <Text style={s.modalBookText}>Book this Holiday</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F0F9FF" },
  scroll: { paddingBottom: 30 },
  skyHero: { minHeight: 410, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 22, overflow: "hidden" },
  skyTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roundBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,23,42,.18)", borderWidth: 1, borderColor: "rgba(255,255,255,.35)" },
  heroMiniPill: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(255,255,255,.85)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  heroMiniText: { fontSize: 12, fontWeight: "900", color: "#0C4A6E" },
  cloud: { position: "absolute", top: 155, left: 0, width: 180, height: 50 },
  cloudOne: { opacity: 0.78 },
  cloudTwo: { top: 235, opacity: 0.55 },
  cloudBubbleLarge: { position: "absolute", left: 38, bottom: 8, width: 65, height: 65, borderRadius: 33, backgroundColor: "rgba(255,255,255,.93)" },
  cloudBubbleMedium: { position: "absolute", left: 56, bottom: 8, width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(255,255,255,.90)" },
  cloudBubbleSmall: { position: "absolute", left: 92, bottom: 8, width: 45, height: 45, borderRadius: 23, backgroundColor: "rgba(255,255,255,.90)" },
  cloudBubbleSmall2: { position: "absolute", left: 96, bottom: 8, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,.88)" },
  cloudBase: { position: "absolute", left: 10, right: 10, bottom: 0, height: 27, borderRadius: 18, backgroundColor: "rgba(255,255,255,.92)" },
  plane: { position: "absolute", top: 105, left: 0, opacity: 0.95 },
  heroTextBlock: { marginTop: 110, paddingRight: 20 },
  eyebrow: { fontSize: 11, fontWeight: "900", letterSpacing: 1.4, color: "#0C4A6E" },
  heroTitle: { marginTop: 10, fontSize: 38, lineHeight: 42, fontWeight: "900", color: "#fff" },
  heroSub: { marginTop: 12, fontSize: 14, lineHeight: 21, color: "rgba(255,255,255,.92)" },
  searchWrap: { marginTop: 20, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 18, paddingHorizontal: 14, minHeight: 54, shadowColor: "#0284C7", shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  searchInput: { flex: 1, fontSize: 14, color: "#0F172A" },
  body: { padding: 16, backgroundColor: "#F0F9FF" },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sectionTitle: { fontSize: 22, fontWeight: "900", color: "#0F172A" },
  sectionSub: { marginTop: 3, fontSize: 12, color: "#64748B" },
  countPill: { minWidth: 38, height: 38, borderRadius: 19, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center" },
  countText: { color: "#0369A1", fontWeight: "900" },
  chips: { gap: 9, paddingVertical: 14 },
  chip: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: "#BAE6FD" },
  chipActive: { backgroundColor: "#0284C7", borderColor: "#0284C7" },
  chipText: { color: "#0F172A", fontWeight: "700", fontSize: 12 },
  chipTextActive: { color: "#fff" },
  center: { alignItems: "center", paddingVertical: 80 },
  loadingText: { marginTop: 10, color: "#64748B" },
  empty: { alignItems: "center", paddingVertical: 80, paddingHorizontal: 28 },
  emptyIcon: { width: 78, height: 78, borderRadius: 39, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center" },
  emptyTitle: { marginTop: 14, fontSize: 20, fontWeight: "900", color: "#0F172A" },
  emptyText: { marginTop: 7, fontSize: 13, lineHeight: 19, color: "#64748B", textAlign: "center" },
  destinationCard: { backgroundColor: "#fff", borderRadius: 24, overflow: "hidden", marginBottom: 16, borderWidth: 1, borderColor: "#DBEAFE", shadowColor: "#0C4A6E", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  coverWrap: { height: 245, position: "relative" },
  cover: { width: "100%", height: "100%" },
  coverShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 145 },
  locationBadge: { position: "absolute", top: 14, left: 14, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(15,23,42,.65)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  locationBadgeText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  coverTitle: { position: "absolute", left: 16, right: 16, bottom: 16 },
  packageName: { color: "#fff", fontSize: 23, lineHeight: 28, fontWeight: "900" },
  vendorName: { marginTop: 4, color: "rgba(255,255,255,.88)", fontSize: 12, fontWeight: "700" },
  galleryStrip: { flexDirection: "row", gap: 7, paddingHorizontal: 12, paddingTop: 12 },
  thumbWrap: { flex: 1, height: 58, borderRadius: 10, overflow: "hidden", position: "relative" },
  thumb: { width: "100%", height: "100%" },
  fiveBadge: { position: "absolute", right: 4, bottom: 4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(15,23,42,.72)", alignItems: "center", justifyContent: "center" },
  fiveBadgeText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  description: { paddingHorizontal: 14, paddingTop: 12, color: "#475569", fontSize: 13, lineHeight: 19 },
  cardFooter: { padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  footerMeta: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  footerMetaText: { color: "#0369A1", fontWeight: "800", fontSize: 12 },
  bookButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FF6B00", borderRadius: 999, paddingHorizontal: 15, paddingVertical: 11 },
  bookButtonText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(2,8,23,.55)" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 16, maxHeight: "92%" },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#0F172A" },
  modalLocation: { marginTop: 3, color: "#0284C7", fontWeight: "800", fontSize: 12 },
  closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  mainPhoto: { width: "100%", height: 250, borderRadius: 18 },
  modalThumb: { width: 70, height: 58, borderRadius: 10, borderWidth: 2, borderColor: "transparent" },
  modalThumbActive: { borderColor: "#FF6B00" },
  modalDescription: { marginTop: 12, color: "#475569", fontSize: 13, lineHeight: 20 },
  modalInfoRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  infoBox: { flex: 1, backgroundColor: "#F0F9FF", borderRadius: 14, padding: 11 },
  infoLabel: { marginTop: 6, fontSize: 10, color: "#64748B", fontWeight: "700" },
  infoValue: { marginTop: 2, fontSize: 13, color: "#0F172A", fontWeight: "900" },
  modalBook: { marginTop: 16, backgroundColor: "#FF6B00", borderRadius: 15, minHeight: 52, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  modalBookText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
