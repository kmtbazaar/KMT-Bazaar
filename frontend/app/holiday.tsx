import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  Modal,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { api } from "@/src/api";

const { width } = Dimensions.get("window");

const FALLBACK_PHOTOS = [
  "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1400&q=85",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=85",
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1400&q=85",
  "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=1400&q=85",
  "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=1400&q=85",
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
  const unique = Array.from(new Set([...supplied, ...first])).slice(0, 5);
  for (let i = unique.length; i < 5; i += 1) unique.push(FALLBACK_PHOTOS[i]);
  return unique;
}

function labelFor(item: HolidayItem) {
  return (item.location || item.category || "India").trim();
}

function moodFor(item: HolidayItem) {
  const text = [item.name, item.category, item.location, item.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/beach|goa|andaman|maldives|sea|island|coast/.test(text)) return "Beach";
  if (/mountain|manali|leh|ladakh|kashmir|himachal|uttarakhand|valley/.test(text)) return "Mountains";
  if (/temple|spiritual|ayodhya|varanasi|kashi|tirupati|haridwar|rishikesh|kailash/.test(text)) return "Spiritual";
  if (/adventure|trek|camp|rafting|safari|wildlife/.test(text)) return "Adventure";
  return "Explore";
}

export default function HolidayPage() {
  const router = useRouter();
  const [items, setItems] = useState<HolidayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLocation, setActiveLocation] = useState("All");
  const [activeMood, setActiveMood] = useState("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<HolidayItem | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState(0);

  const planeX = useSharedValue(-150);
  const planeY = useSharedValue(0);
  const cloudOneX = useSharedValue(-220);
  const cloudTwoX = useSharedValue(-360);
  const sunPulse = useSharedValue(0.92);

  useEffect(() => {
    planeX.value = withRepeat(
      withSequence(
        withTiming(width + 170, { duration: 16000 }),
        withTiming(-180, { duration: 0 })
      ),
      -1,
      false
    );
    planeY.value = withRepeat(
      withSequence(
        withTiming(-11, { duration: 2300 }),
        withTiming(7, { duration: 2300 })
      ),
      -1,
      true
    );
    cloudOneX.value = withRepeat(
      withSequence(
        withTiming(width + 220, { duration: 30000 }),
        withTiming(-250, { duration: 0 })
      ),
      -1,
      false
    );
    cloudTwoX.value = withRepeat(
      withSequence(
        withTiming(width + 260, { duration: 39000 }),
        withTiming(-390, { duration: 0 })
      ),
      -1,
      false
    );
    sunPulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 2800 }),
        withTiming(0.92, { duration: 2800 })
      ),
      -1,
      true
    );
  }, [cloudOneX, cloudTwoX, planeX, planeY, sunPulse]);

  const planeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: planeX.value }, { translateY: planeY.value }],
  }));
  const cloudOneStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cloudOneX.value }],
  }));
  const cloudTwoStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cloudTwoX.value }],
  }));
  const sunStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sunPulse.value }],
  }));

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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const locations = useMemo(() => {
    const values = items
      .map((x) => labelFor(x))
      .filter((x) => x !== "India");
    return ["All", ...Array.from(new Set(values))];
  }, [items]);

  const moods = useMemo(() => {
    const values = Array.from(new Set(items.map(moodFor)));
    return ["All", ...values];
  }, [items]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const location = labelFor(item);
      const text = [item.name, item.vendor_name, item.location, item.description, item.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const locationMatch = activeLocation === "All" || location === activeLocation;
      const moodMatch = activeMood === "All" || moodFor(item) === activeMood;
      const searchMatch = !needle || text.includes(needle);

      return locationMatch && moodMatch && searchMatch;
    });
  }, [activeLocation, activeMood, items, query]);

  const featured = filtered.slice(0, 3);
  const allRemaining = filtered.slice(3);

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
      const message = e?.message || "Please login first";
      if (Platform.OS === "web") window.alert(message);
      else Alert.alert("Holiday Booking", message);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={["#0B5EA7", "#0284C7", "#38BDF8", "#BAE6FD"]}
          locations={[0, 0.35, 0.72, 1]}
          style={s.hero}
        >
          <Animated.View style={[s.sunGlow, sunStyle]} />
          <Animated.View style={[s.cloud, s.cloudOne, cloudOneStyle]}>
            <View style={s.cloudBubbleXL} />
            <View style={s.cloudBubbleL} />
            <View style={s.cloudBubbleS} />
            <View style={s.cloudBase} />
          </Animated.View>
          <Animated.View style={[s.cloud, s.cloudTwo, cloudTwoStyle]}>
            <View style={s.cloudBubbleL} />
            <View style={s.cloudBubbleS} />
            <View style={s.cloudBase} />
          </Animated.View>
          <Animated.View style={[s.plane, planeStyle]}>
            <View style={s.flightTrail} />
            <MaterialCommunityIcons name="airplane" size={42} color="#FFFFFF" />
          </Animated.View>

          <View style={s.heroNav}>
            <Pressable onPress={() => router.back()} style={s.navCircle}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="#FFFFFF" />
            </Pressable>

            <View style={s.brandPill}>
              <MaterialCommunityIcons name="airplane-takeoff" size={17} color="#0C4A6E" />
              <Text style={s.brandPillText}>KMT BAZAAR HOLIDAYS</Text>
            </View>

            <Pressable onPress={() => router.push("/service-booking-cart" as any)} style={s.navCircle}>
              <MaterialCommunityIcons name="calendar-check-outline" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          <Animated.View entering={FadeIn.duration(500)} style={s.heroCopy}>
            <View style={s.heroBadge}>
              <MaterialCommunityIcons name="star-four-points" size={14} color="#0F172A" />
              <Text style={s.heroBadgeText}>TRAVEL MADE SIMPLE</Text>
            </View>
            <Text style={s.heroTitle}>Go somewhere{"\n"}you'll remember.</Text>
            <Text style={s.heroSubtitle}>
              Curated holiday experiences, destination galleries and easy booking — all in one place.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(120).duration(650)} style={s.searchCard}>
            <View style={s.searchIconBox}>
              <MaterialCommunityIcons name="magnify" size={22} color="#0284C7" />
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Where do you want to go?"
              placeholderTextColor="#64748B"
              style={s.searchInput}
              returnKeyType="search"
            />
            {!!query && (
              <Pressable onPress={() => setQuery("")}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#94A3B8" />
              </Pressable>
            )}
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(220).duration(700)} style={s.heroStats}>
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>5</Text>
              <Text style={s.heroStatLabel}>Photos / trip</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{items.length || "—"}</Text>
              <Text style={s.heroStatLabel}>Holiday listings</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>24/7</Text>
              <Text style={s.heroStatLabel}>Browse anytime</Text>
            </View>
          </Animated.View>
        </LinearGradient>

        <View style={s.body}>
          <Animated.View entering={FadeInDown.duration(550)}>
            <View style={s.sectionHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.sectionEyebrow}>DISCOVER</Text>
                <Text style={s.sectionTitle}>Explore the world</Text>
                <Text style={s.sectionSub}>Filter by destination or travel mood.</Text>
              </View>
              <View style={s.resultPill}>
                <Text style={s.resultCount}>{filtered.length}</Text>
                <Text style={s.resultLabel}>trips</Text>
              </View>
            </View>
          </Animated.View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {locations.map((location) => {
              const active = activeLocation === location;
              return (
                <Pressable
                  key={"loc-" + location}
                  onPress={() => setActiveLocation(location)}
                  style={[s.chip, active && s.chipActive]}
                >
                  <MaterialCommunityIcons
                    name={location === "All" ? "compass-outline" : "map-marker-outline"}
                    size={15}
                    color={active ? "#FFFFFF" : "#0F5C86"}
                  />
                  <Text style={[s.chipText, active && s.chipTextActive]}>{location}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {moods.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.moodChips}>
              {moods.map((mood) => {
                const active = activeMood === mood;
                const icon =
                  mood === "Beach" ? "waves" :
                  mood === "Mountains" ? "terrain" :
                  mood === "Spiritual" ? "hands-pray" :
                  mood === "Adventure" ? "hiking" :
                  "earth";

                return (
                  <Pressable
                    key={"mood-" + mood}
                    onPress={() => setActiveMood(mood)}
                    style={[s.moodChip, active && s.moodChipActive]}
                  >
                    <MaterialCommunityIcons
                      name={icon as any}
                      size={15}
                      color={active ? "#FF6B00" : "#64748B"}
                    />
                    <Text style={[s.moodText, active && s.moodTextActive]}>{mood}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color="#0284C7" />
              <Text style={s.loadingTitle}>Finding beautiful places…</Text>
              <Text style={s.loadingSub}>Loading the latest holiday listings.</Text>
            </View>
          ) : filtered.length === 0 ? (
            <Animated.View entering={FadeIn.duration(500)} style={s.empty}>
              <LinearGradient colors={["#E0F2FE", "#FFFFFF"]} style={s.emptyIcon}>
                <MaterialCommunityIcons name="airplane-search" size={44} color="#0284C7" />
              </LinearGradient>
              <Text style={s.emptyTitle}>No trips match that search</Text>
              <Text style={s.emptyText}>
                Try another destination or reset the travel mood filter.
              </Text>
              <Pressable
                onPress={() => {
                  setQuery("");
                  setActiveLocation("All");
                  setActiveMood("All");
                }}
                style={s.resetBtn}
              >
                <Text style={s.resetBtnText}>Show all holidays</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <>
              <View style={s.sectionRow}>
                <View>
                  <Text style={s.sectionEyebrow}>FEATURED</Text>
                  <Text style={s.sectionTitleSmall}>Handpicked escapes</Text>
                </View>
                <MaterialCommunityIcons name="sparkles" size={21} color="#FF6B00" />
              </View>

              <View style={s.featureGrid}>
                {featured.map((item, index) => {
                  const gallery = galleryFor(item);
                  return (
                    <Animated.View
                      key={item.id}
                      entering={FadeInUp.delay(index * 90).duration(650)}
                      style={s.featureCard}
                    >
                      <Pressable onPress={() => openHoliday(item)}>
                        <View style={s.featureImageWrap}>
                          <Image source={{ uri: gallery[0] }} style={s.featureImage} contentFit="cover" />
                          <LinearGradient
                            colors={["rgba(15,23,42,0.05)", "rgba(15,23,42,0.80)"]}
                            style={s.featureShade}
                          />
                          <View style={s.locationPill}>
                            <MaterialCommunityIcons name="map-marker" size={12} color="#FFFFFF" />
                            <Text style={s.locationPillText}>{labelFor(item)}</Text>
                          </View>
                          <View style={s.photoCountPill}>
                            <MaterialCommunityIcons name="image-multiple-outline" size={13} color="#FFFFFF" />
                            <Text style={s.photoCountText}>5</Text>
                          </View>
                          <View style={s.featureBottom}>
                            <Text style={s.featureTitle} numberOfLines={2}>{item.name}</Text>
                            {!!item.vendor_name && (
                              <Text style={s.featureVendor} numberOfLines={1}>{item.vendor_name}</Text>
                            )}
                          </View>
                        </View>

                        <View style={s.featureBottomBar}>
                          <View style={s.miniGallery}>
                            {gallery.slice(0, 3).map((photo, i) => (
                              <Image key={item.id + "-mini-" + i} source={{ uri: photo }} style={s.miniGalleryImage} contentFit="cover" />
                            ))}
                          </View>
                          <View style={s.exploreCircle}>
                            <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
                          </View>
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>

              {allRemaining.length > 0 && (
                <>
                  <View style={[s.sectionRow, { marginTop: 26 }]}>
                    <View>
                      <Text style={s.sectionEyebrow}>ALL DESTINATIONS</Text>
                      <Text style={s.sectionTitleSmall}>More places to explore</Text>
                    </View>
                  </View>

                  {allRemaining.map((item, index) => {
                    const gallery = galleryFor(item);
                    return (
                      <Animated.View key={item.id} entering={FadeInUp.delay(index * 60).duration(500)}>
                        <Pressable onPress={() => openHoliday(item)} style={s.listCard}>
                          <Image source={{ uri: gallery[0] }} style={s.listImage} contentFit="cover" />
                          <View style={s.listBody}>
                            <View style={s.listTopLine}>
                              <View style={s.listLocationPill}>
                                <MaterialCommunityIcons name="map-marker-outline" size={13} color="#0284C7" />
                                <Text style={s.listLocationText}>{labelFor(item)}</Text>
                              </View>
                              <Text style={s.listMood}>{moodFor(item)}</Text>
                            </View>
                            <Text style={s.listTitle} numberOfLines={2}>{item.name}</Text>
                            {!!item.description && (
                              <Text style={s.listDescription} numberOfLines={2}>{item.description}</Text>
                            )}
                            <View style={s.listFooter}>
                              <Text style={s.listGalleryText}>5 destination photos</Text>
                              <View style={s.listArrow}>
                                <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" />
                              </View>
                            </View>
                          </View>
                        </Pressable>
                      </Animated.View>
                    );
                  })}
                </>
              )}
            </>
          )}

          <Animated.View entering={FadeInUp.delay(180).duration(600)} style={s.promiseCard}>
            <LinearGradient colors={["#0F172A", "#164E63"]} style={s.promiseInner}>
              <View style={s.promiseCopy}>
                <Text style={s.promiseEyebrow}>THE KMT BAZAAR PROMISE</Text>
                <Text style={s.promiseTitle}>Plan less. Travel more.</Text>
                <Text style={s.promiseText}>
                  Discover the destination, inspect the full gallery and send your booking request from one simple experience.
                </Text>
              </View>
              <View style={s.promiseIconWrap}>
                <MaterialCommunityIcons name="airplane-marker" size={38} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </Animated.View>

          <View style={s.benefitsRow}>
            <View style={s.benefitCard}>
              <View style={s.benefitIcon}><MaterialCommunityIcons name="image-multiple-outline" size={21} color="#0284C7" /></View>
              <Text style={s.benefitTitle}>See before you book</Text>
              <Text style={s.benefitText}>Every listing is built around a 5-photo destination gallery.</Text>
            </View>
            <View style={s.benefitCard}>
              <View style={s.benefitIcon}><MaterialCommunityIcons name="calendar-check-outline" size={21} color="#0284C7" /></View>
              <Text style={s.benefitTitle}>Simple booking</Text>
              <Text style={s.benefitText}>Choose a trip and move straight into the booking flow.</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={s.modalEyebrowRow}>
                  <Text style={s.modalEyebrow}>HOLIDAY EXPERIENCE</Text>
                  <View style={s.modalMoodPill}><Text style={s.modalMoodText}>{selected ? moodFor(selected) : "Explore"}</Text></View>
                </View>
                <Text style={s.modalTitle}>{selected?.name}</Text>
                <Text style={s.modalLocation}>
                  {selected?.location || selected?.category || "India"}{selected?.vendor_name ? " · " + selected.vendor_name : ""}
                </Text>
              </View>
              <Pressable onPress={() => setSelected(null)} style={s.closeBtn}>
                <MaterialCommunityIcons name="close" size={21} color="#0F172A" />
              </Pressable>
            </View>

            {selected && (
              <>
                <View style={s.modalHeroImageWrap}>
                  <Image source={{ uri: galleryFor(selected)[selectedPhoto] }} style={s.modalHeroImage} contentFit="cover" />
                  <View style={s.modalPhotoCounter}>
                    <MaterialCommunityIcons name="camera-outline" size={14} color="#FFFFFF" />
                    <Text style={s.modalPhotoCounterText}>{selectedPhoto + 1} / 5</Text>
                  </View>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingTop: 10, paddingBottom: 4 }}
                >
                  {galleryFor(selected).map((photo, index) => (
                    <Pressable key={selected.id + "-modal-" + index} onPress={() => setSelectedPhoto(index)}>
                      <Image
                        source={{ uri: photo }}
                        style={[s.modalThumb, index === selectedPhoto && s.modalThumbActive]}
                        contentFit="cover"
                      />
                    </Pressable>
                  ))}
                </ScrollView>

                {!!selected.description && (
                  <Text style={s.modalDescription}>{selected.description}</Text>
                )}

                <View style={s.modalInfoGrid}>
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
                  <View style={s.infoBox}>
                    <MaterialCommunityIcons name="calendar-clock-outline" size={20} color="#0284C7" />
                    <Text style={s.infoLabel}>Booking</Text>
                    <Text style={s.infoValue}>Flexible date</Text>
                  </View>
                  <View style={s.infoBox}>
                    <MaterialCommunityIcons name="airplane-check-outline" size={20} color="#0284C7" />
                    <Text style={s.infoLabel}>Experience</Text>
                    <Text style={s.infoValue}>{moodFor(selected)}</Text>
                  </View>
                </View>

                <View style={s.modalActions}>
                  <Pressable style={s.modalSecondary} onPress={() => setSelected(null)}>
                    <Text style={s.modalSecondaryText}>Close</Text>
                  </Pressable>
                  <Pressable style={s.modalBook} onPress={bookHoliday}>
                    <MaterialCommunityIcons name="airplane-takeoff" size={19} color="#FFFFFF" />
                    <Text style={s.modalBookText}>Book this holiday</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7FBFF" },
  scroll: { paddingBottom: 40 },

  hero: {
    minHeight: 585,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 22,
    overflow: "hidden",
  },
  heroNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.30)",
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,.91)",
  },
  brandPillText: { fontSize: 10, fontWeight: "900", color: "#0C4A6E", letterSpacing: 1.15 },

  sunGlow: {
    position: "absolute",
    top: 52,
    right: -45,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,.22)",
  },
  cloud: { position: "absolute", left: 0, top: 165, width: 220, height: 70 },
  cloudOne: { opacity: 0.75 },
  cloudTwo: { top: 265, opacity: 0.45 },
  cloudBubbleXL: {
    position: "absolute", left: 45, bottom: 9, width: 82, height: 82, borderRadius: 41,
    backgroundColor: "rgba(255,255,255,.90)",
  },
  cloudBubbleL: {
    position: "absolute", left: 88, bottom: 8, width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(255,255,255,.92)",
  },
  cloudBubbleS: {
    position: "absolute", left: 132, bottom: 8, width: 48, height: 48, borderRadius: 24,
    backgroundColor: "rgba(255,255,255,.94)",
  },
  cloudBase: {
    position: "absolute", left: 16, right: 12, bottom: 0, height: 30, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,.93)",
  },
  plane: {
    position: "absolute",
    top: 114,
    left: 0,
    flexDirection: "row",
    alignItems: "center",
    opacity: 0.98,
  },
  flightTrail: {
    width: 78,
    height: 2,
    marginRight: 8,
    backgroundColor: "rgba(255,255,255,.65)",
    borderRadius: 2,
  },

  heroCopy: { marginTop: 126, paddingRight: 14 },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,.24)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.28)",
  },
  heroBadgeText: { color: "#0C4A6E", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  heroTitle: {
    marginTop: 12,
    fontSize: 42,
    lineHeight: 44,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.7,
  },
  heroSubtitle: {
    marginTop: 13,
    maxWidth: 520,
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(255,255,255,.93)",
  },

  searchCard: {
    marginTop: 24,
    minHeight: 61,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingRight: 14,
    gap: 10,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0C4A6E",
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 11 },
    elevation: 7,
  },
  searchIconBox: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0F2FE",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0F172A" },

  heroStats: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,.17)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.18)",
  },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatValue: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  heroStatLabel: { marginTop: 2, color: "rgba(255,255,255,.80)", fontSize: 9, fontWeight: "700", textAlign: "center" },
  statDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,.18)" },

  body: { padding: 16, backgroundColor: "#F7FBFF" },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  sectionEyebrow: { fontSize: 10, color: "#0284C7", fontWeight: "900", letterSpacing: 1.5 },
  sectionTitle: { marginTop: 4, fontSize: 26, lineHeight: 31, color: "#0F172A", fontWeight: "900" },
  sectionTitleSmall: { marginTop: 4, fontSize: 20, lineHeight: 24, color: "#0F172A", fontWeight: "900" },
  sectionSub: { marginTop: 4, fontSize: 12, lineHeight: 18, color: "#64748B" },
  resultPill: {
    minWidth: 54,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#E0F2FE",
  },
  resultCount: { fontSize: 18, color: "#0369A1", fontWeight: "900" },
  resultLabel: { fontSize: 9, color: "#0369A1", fontWeight: "800" },

  chips: { gap: 9, paddingTop: 15, paddingBottom: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CFE8F8",
  },
  chipActive: { backgroundColor: "#0284C7", borderColor: "#0284C7" },
  chipText: { fontSize: 11, color: "#0F5C86", fontWeight: "800" },
  chipTextActive: { color: "#FFFFFF" },

  moodChips: { gap: 8, paddingBottom: 18 },
  moodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  moodChipActive: { borderColor: "#FDBA74", backgroundColor: "#FFF7ED" },
  moodText: { fontSize: 11, color: "#64748B", fontWeight: "800" },
  moodTextActive: { color: "#C2410C" },

  center: { alignItems: "center", paddingVertical: 85 },
  loadingTitle: { marginTop: 13, fontSize: 17, color: "#0F172A", fontWeight: "900" },
  loadingSub: { marginTop: 5, fontSize: 12, color: "#64748B" },

  empty: { alignItems: "center", paddingVertical: 70, paddingHorizontal: 24 },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  emptyTitle: { marginTop: 16, fontSize: 20, color: "#0F172A", fontWeight: "900" },
  emptyText: { marginTop: 6, color: "#64748B", fontSize: 13, lineHeight: 19, textAlign: "center" },
  resetBtn: { marginTop: 16, borderRadius: 999, backgroundColor: "#0284C7", paddingHorizontal: 17, paddingVertical: 11 },
  resetBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },

  sectionRow: {
    marginTop: 4,
    marginBottom: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  featureGrid: { gap: 13 },
  featureCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#DCECF7",
    shadowColor: "#0C4A6E",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  featureImageWrap: { height: 285, position: "relative" },
  featureImage: { width: "100%", height: "100%" },
  featureShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 170 },
  locationPill: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,.60)",
  },
  locationPillText: { fontSize: 10, color: "#FFFFFF", fontWeight: "800" },
  photoCountPill: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,.60)",
  },
  photoCountText: { fontSize: 10, color: "#FFFFFF", fontWeight: "900" },
  featureBottom: { position: "absolute", left: 16, right: 16, bottom: 16 },
  featureTitle: { color: "#FFFFFF", fontSize: 25, lineHeight: 29, fontWeight: "900" },
  featureVendor: { marginTop: 5, color: "rgba(255,255,255,.82)", fontSize: 11, fontWeight: "700" },
  featureBottomBar: { padding: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  miniGallery: { flexDirection: "row", gap: 6 },
  miniGalleryImage: { width: 50, height: 40, borderRadius: 9, backgroundColor: "#E2E8F0" },
  exploreCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FF6B00",
    alignItems: "center",
    justifyContent: "center",
  },

  listCard: {
    marginBottom: 12,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  listImage: { width: 108, minHeight: 152, backgroundColor: "#E2E8F0" },
  listBody: { flex: 1, padding: 12 },
  listTopLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  listLocationPill: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  listLocationText: { color: "#0284C7", fontSize: 10, fontWeight: "800" },
  listMood: { color: "#FF6B00", fontSize: 9, fontWeight: "900" },
  listTitle: { marginTop: 7, color: "#0F172A", fontSize: 17, lineHeight: 21, fontWeight: "900" },
  listDescription: { marginTop: 6, color: "#64748B", fontSize: 11, lineHeight: 17 },
  listFooter: { marginTop: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  listGalleryText: { color: "#475569", fontSize: 10, fontWeight: "800" },
  listArrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#0284C7", alignItems: "center", justifyContent: "center" },

  promiseCard: { marginTop: 24, borderRadius: 24, overflow: "hidden" },
  promiseInner: { padding: 19, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 168 },
  promiseCopy: { flex: 1 },
  promiseEyebrow: { color: "#67E8F9", fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  promiseTitle: { marginTop: 7, color: "#FFFFFF", fontSize: 23, fontWeight: "900" },
  promiseText: { marginTop: 7, color: "rgba(255,255,255,.72)", fontSize: 11, lineHeight: 17 },
  promiseIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.14)",
  },

  benefitsRow: { marginTop: 12, flexDirection: "row", gap: 10 },
  benefitCard: {
    flex: 1,
    minHeight: 155,
    padding: 13,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  benefitIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0F2FE",
  },
  benefitTitle: { marginTop: 11, color: "#0F172A", fontSize: 13, lineHeight: 17, fontWeight: "900" },
  benefitText: { marginTop: 5, color: "#64748B", fontSize: 10, lineHeight: 16 },

  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(2,8,23,.60)" },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 16,
    maxHeight: "94%",
  },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  modalEyebrowRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalEyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1.2, color: "#0284C7" },
  modalMoodPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "#FFF7ED" },
  modalMoodText: { color: "#C2410C", fontSize: 9, fontWeight: "900" },
  modalTitle: { marginTop: 5, fontSize: 22, lineHeight: 27, color: "#0F172A", fontWeight: "900" },
  modalLocation: { marginTop: 4, color: "#64748B", fontSize: 11, fontWeight: "700" },
  closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  modalHeroImageWrap: { position: "relative" },
  modalHeroImage: { width: "100%", height: 260, borderRadius: 20, backgroundColor: "#E2E8F0" },
  modalPhotoCounter: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,.64)",
  },
  modalPhotoCounterText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  modalThumb: { width: 69, height: 56, borderRadius: 10, borderWidth: 2, borderColor: "transparent" },
  modalThumbActive: { borderColor: "#FF6B00" },
  modalDescription: { marginTop: 12, color: "#475569", fontSize: 12, lineHeight: 19 },
  modalInfoGrid: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  infoBox: { width: "48%", minHeight: 78, backgroundColor: "#F0F9FF", borderRadius: 14, padding: 10 },
  infoLabel: { marginTop: 6, color: "#64748B", fontSize: 9, fontWeight: "800" },
  infoValue: { marginTop: 2, color: "#0F172A", fontSize: 12, fontWeight: "900" },
  modalActions: { marginTop: 15, flexDirection: "row", gap: 9 },
  modalSecondary: {
    flex: 0.36,
    minHeight: 52,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryText: { color: "#334155", fontSize: 13, fontWeight: "900" },
  modalBook: {
    flex: 1,
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: "#FF6B00",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  modalBookText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
});
