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

const MOCK_PHOTOS = [
  "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1400&q=85",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=85",
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1400&q=85",
  "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=1400&q=85",
  "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=1400&q=85",
];

const MOCK_PACKAGES = [
  {
    id: "mock-goa",
    name: "Goa Beach Escape",
    location: "Goa",
    category: "Beach",
    description: "4 nights of beaches, sunsets, local experiences and relaxed coastal stays.",
    vendor_name: "KMT Travel Desk",
    image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1400&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1400&q=85",
      "https://images.unsplash.com/photo-1548013146-72479768bada?w=1400&q=85",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=85",
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1400&q=85",
      "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=1400&q=85",
    ],
    price: 12999,
    duration: "4N / 5D",
    rating: 4.8,
    reviews: 128,
    tag: "Best seller",
    includes: ["Hotel", "Breakfast", "Airport pickup"],
  },
  {
    id: "mock-manali",
    name: "Manali Mountain Retreat",
    location: "Manali",
    category: "Mountains",
    description: "Snowy valleys, mountain cafes and peaceful Himalayan stays for a refreshing escape.",
    vendor_name: "Himalayan Holidays",
    image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1400&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1400&q=85",
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1400&q=85",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1400&q=85",
      "https://images.unsplash.com/photo-1486911278844-a81c5267e227?w=1400&q=85",
      "https://images.unsplash.com/photo-1464278533981-50106e6176b1?w=1400&q=85",
    ],
    price: 15999,
    duration: "5N / 6D",
    rating: 4.9,
    reviews: 96,
    tag: "Mountain pick",
    includes: ["Hotel", "Breakfast", "Sightseeing"],
  },
  {
    id: "mock-varanasi",
    name: "Kashi Spiritual Journey",
    location: "Varanasi",
    category: "Spiritual",
    description: "Ganga aarti, heritage lanes, temple visits and a calm cultural stay in Kashi.",
    vendor_name: "Sacred India Tours",
    image: "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=1400&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=1400&q=85",
      "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1400&q=85",
      "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=1400&q=85",
      "https://images.unsplash.com/photo-1548013146-72479768bada?w=1400&q=85",
      "https://images.unsplash.com/photo-1514222134-b57cbb8ce073?w=1400&q=85",
    ],
    price: 8999,
    duration: "2N / 3D",
    rating: 4.7,
    reviews: 84,
    tag: "Cultural",
    includes: ["Hotel", "Breakfast", "Local guide"],
  },
  {
    id: "mock-kashmir",
    name: "Kashmir Valley Dream",
    location: "Kashmir",
    category: "Explore",
    description: "Lakes, valleys and unforgettable mountain views across Srinagar and Gulmarg.",
    vendor_name: "Valley Trails",
    image: "https://images.unsplash.com/photo-1548013146-72479768bada?w=1400&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1548013146-72479768bada?w=1400&q=85",
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=1400&q=85",
      "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=1400&q=85",
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1400&q=85",
      "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=1400&q=85",
    ],
    price: 18999,
    duration: "5N / 6D",
    rating: 4.9,
    reviews: 153,
    tag: "Top rated",
    includes: ["Hotel", "Breakfast", "Transfers"],
  },
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
  price?: number;
  duration?: string;
  rating?: number;
  reviews?: number;
  tag?: string;
  includes?: string[];
};

function enrichItem(item: HolidayItem, index = 0): HolidayItem {
  const mock = MOCK_PACKAGES[index % MOCK_PACKAGES.length];
  return {
    ...item,
    image: item.image || mock.image,
    gallery: Array.isArray(item.gallery) && item.gallery.length ? item.gallery : mock.gallery,
    price: Number(item.price) || mock.price,
    duration: item.duration || mock.duration,
    rating: Number(item.rating) || mock.rating,
    reviews: Number(item.reviews) || mock.reviews,
    tag: item.tag || mock.tag,
    includes: Array.isArray(item.includes) && item.includes.length ? item.includes : mock.includes,
  };
}

function galleryFor(item: HolidayItem) {
  const primary = item.image ? [item.image] : [];
  const supplied = Array.isArray(item.gallery) ? item.gallery.filter(Boolean) : [];
  const unique = Array.from(new Set([...primary, ...supplied])).slice(0, 5);

  for (let i = unique.length; i < 5; i += 1) {
    unique.push(MOCK_PHOTOS[i]);
  }

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
  if (/temple|spiritual|ayodhya|varanasi|kashi|tirupati|haridwar|rishikesh/.test(text)) return "Spiritual";
  if (/adventure|trek|camp|rafting|safari|wildlife/.test(text)) return "Adventure";
  return "Explore";
}

function money(value?: number) {
  return "₹" + Math.max(0, Number(value || 0)).toLocaleString("en-IN");
}

export default function HolidayPage() {
  const router = useRouter();

  const [items, setItems] = useState<HolidayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMood, setActiveMood] = useState("All");
  const [activeLocation, setActiveLocation] = useState("All");
  const [query, setQuery] = useState("");

  const [selected, setSelected] = useState<HolidayItem | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [travellers, setTravellers] = useState(2);
  const [bookingNote, setBookingNote] = useState("");

  const planeX = useSharedValue(-170);
  const planeY = useSharedValue(0);
  const cloudOneX = useSharedValue(-230);
  const cloudTwoX = useSharedValue(-380);
  const sunPulse = useSharedValue(0.92);

  useEffect(() => {
    planeX.value = withRepeat(
      withSequence(
        withTiming(width + 180, { duration: 16000 }),
        withTiming(-180, { duration: 0 })
      ),
      -1,
      false
    );
    planeY.value = withRepeat(
      withSequence(withTiming(-10, { duration: 2200 }), withTiming(8, { duration: 2200 })),
      -1,
      true
    );
    cloudOneX.value = withRepeat(
      withSequence(
        withTiming(width + 230, { duration: 30000 }),
        withTiming(-260, { duration: 0 })
      ),
      -1,
      false
    );
    cloudTwoX.value = withRepeat(
      withSequence(
        withTiming(width + 290, { duration: 39000 }),
        withTiming(-390, { duration: 0 })
      ),
      -1,
      false
    );
    sunPulse.value = withRepeat(
      withSequence(withTiming(1.04, { duration: 2800 }), withTiming(0.92, { duration: 2800 })),
      -1,
      true
    );
  }, [cloudOneX, cloudTwoX, planeX, planeY, sunPulse]);

  const planeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: planeX.value }, { translateY: planeY.value }],
  }));
  const cloudOneStyle = useAnimatedStyle(() => ({ transform: [{ translateX: cloudOneX.value }] }));
  const cloudTwoStyle = useAnimatedStyle(() => ({ transform: [{ translateX: cloudTwoX.value }] }));
  const sunStyle = useAnimatedStyle(() => ({ transform: [{ scale: sunPulse.value }] }));

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api.serviceCatalog("holiday");
      const real = Array.isArray(data) ? data : [];

      // Mock content keeps the production UI populated until vendors add live holiday packages.
      const source = real.length ? real : MOCK_PACKAGES;
      setItems(source.map((x, i) => enrichItem(x, i)));
    } catch (e) {
      console.log("Holiday catalog load error", e);
      setItems(MOCK_PACKAGES.map((x, i) => enrichItem(x, i)));
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
    const values = items.map(labelFor).filter(Boolean);
    return ["All", ...Array.from(new Set(values))];
  }, [items]);

  const moods = useMemo(() => {
    return ["All", ...Array.from(new Set(items.map(moodFor)))];
  }, [items]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return items.filter((item) => {
      const text = [item.name, item.vendor_name, item.location, item.description, item.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (activeLocation === "All" || labelFor(item) === activeLocation) &&
        (activeMood === "All" || moodFor(item) === activeMood) &&
        (!needle || text.includes(needle))
      );
    });
  }, [activeLocation, activeMood, items, query]);

  const openDetails = (item: HolidayItem) => {
    setSelected(item);
    setSelectedPhoto(0);
    setBookingOpen(false);
  };

  const openBooking = (item: HolidayItem) => {
    setSelected(item);
    setSelectedPhoto(0);
    setBookingOpen(true);
    setBookingDate("");
    setTravellers(2);
    setBookingNote("");
  };

  const submitBooking = async () => {
    if (!selected) return;

    if (!bookingDate.trim()) {
      const message = "Please enter your travel date.";
      if (Platform.OS === "web") window.alert(message);
      else Alert.alert("Travel date required", message);
      return;
    }

    try {
      await api.serviceCartAdd({
        service_type: "holiday",
        service_id: selected.id,
        booking_date: bookingDate.trim(),
        booking_time: "",
        quantity: travellers,
        notes: bookingNote.trim(),
        extra: {
          travellers,
          package_name: selected.name,
          destination: labelFor(selected),
          package_price: selected.price || 0,
          duration: selected.duration || "",
          source: String(selected.id).startsWith("mock-") ? "mock-package" : "vendor-package",
        },
      });

      setBookingOpen(false);
      setSelected(null);
      router.push("/service-booking-cart" as any);
    } catch (e: any) {
      const message = e?.message || "Please login first";
      if (Platform.OS === "web") window.alert(message);
      else Alert.alert("Holiday booking", message);
    }
  };

  const featured = filtered.slice(0, 3);
  const more = filtered.slice(3);

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <LinearGradient
          colors={["#075985", "#0284C7", "#38BDF8", "#BAE6FD"]}
          locations={[0, 0.38, 0.75, 1]}
          style={s.hero}
        >
          <Animated.View style={[s.sun, sunStyle]} />
          <Animated.View style={[s.cloud, s.cloudA, cloudOneStyle]}>
            <View style={s.cloudXL} />
            <View style={s.cloudL} />
            <View style={s.cloudS} />
            <View style={s.cloudBase} />
          </Animated.View>
          <Animated.View style={[s.cloud, s.cloudB, cloudTwoStyle]}>
            <View style={s.cloudL} />
            <View style={s.cloudS} />
            <View style={s.cloudBase} />
          </Animated.View>

          <Animated.View style={[s.plane, planeStyle]}>
            <View style={s.flightTrail} />
            <MaterialCommunityIcons name="airplane" size={42} color="#fff" />
          </Animated.View>

          <View style={s.heroNav}>
            <Pressable onPress={() => router.back()} style={s.navCircle}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
            </Pressable>
            <View style={s.brandPill}>
              <MaterialCommunityIcons name="airplane-takeoff" size={16} color="#0C4A6E" />
              <Text style={s.brandText}>KMT BAZAAR HOLIDAYS</Text>
            </View>
            <Pressable onPress={() => router.push("/service-booking-cart" as any)} style={s.navCircle}>
              <MaterialCommunityIcons name="calendar-check-outline" size={20} color="#fff" />
            </Pressable>
          </View>

          <Animated.View entering={FadeIn.duration(450)} style={s.heroCopy}>
            <View style={s.heroTag}>
              <MaterialCommunityIcons name="star-four-points" size={13} color="#0F172A" />
              <Text style={s.heroTagText}>DISCOVER • PLAN • ESCAPE</Text>
            </View>
            <Text style={s.heroTitle}>Go somewhere{"\n"}you'll remember.</Text>
            <Text style={s.heroSub}>
              Explore handpicked holiday packages, view every destination through five photos and book from one simple flow.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(100).duration(600)} style={s.searchCard}>
            <View style={s.searchIcon}>
              <MaterialCommunityIcons name="magnify" size={22} color="#0284C7" />
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search Goa, Manali, Kashmir..."
              placeholderTextColor="#64748B"
              style={s.searchInput}
            />
            {query ? (
              <Pressable onPress={() => setQuery("")}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#94A3B8" />
              </Pressable>
            ) : null}
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(170).duration(650)} style={s.heroStats}>
            <View style={s.stat}>
              <Text style={s.statValue}>5</Text>
              <Text style={s.statLabel}>photos / listing</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text style={s.statValue}>{items.length || "—"}</Text>
              <Text style={s.statLabel}>holiday packages</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text style={s.statValue}>24/7</Text>
              <Text style={s.statLabel}>browse & enquire</Text>
            </View>
          </Animated.View>
        </LinearGradient>

        <View style={s.body}>
          <Animated.View entering={FadeInDown.duration(450)} style={s.sectionHead}>
            <View style={{ flex: 1 }}>
              <Text style={s.eyebrow}>YOUR NEXT ESCAPE</Text>
              <Text style={s.sectionTitle}>Find your kind of holiday</Text>
              <Text style={s.sectionSub}>Use travel style and destination to narrow the list.</Text>
            </View>
            <View style={s.resultPill}>
              <Text style={s.resultNum}>{filtered.length}</Text>
              <Text style={s.resultText}>trips</Text>
            </View>
          </Animated.View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
            {moods.map((mood) => {
              const active = activeMood === mood;
              const icon =
                mood === "Beach" ? "waves" :
                mood === "Mountains" ? "terrain" :
                mood === "Spiritual" ? "hands-pray" :
                mood === "Adventure" ? "hiking" : "compass-outline";

              return (
                <Pressable
                  key={"mood-" + mood}
                  onPress={() => setActiveMood(mood)}
                  style={[s.filterPill, active && s.filterPillActive]}
                >
                  <MaterialCommunityIcons name={icon as any} size={15} color={active ? "#fff" : "#475569"} />
                  <Text style={[s.filterText, active && s.filterTextActive]}>{mood}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRowSmall}>
            {locations.map((location) => {
              const active = activeLocation === location;
              return (
                <Pressable
                  key={"location-" + location}
                  onPress={() => setActiveLocation(location)}
                  style={[s.locationPill, active && s.locationPillActive]}
                >
                  <MaterialCommunityIcons name="map-marker-outline" size={14} color={active ? "#0C4A6E" : "#64748B"} />
                  <Text style={[s.locationText, active && s.locationTextActive]}>{location}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loading ? (
            <View style={s.loadingBox}>
              <ActivityIndicator size="large" color="#0284C7" />
              <Text style={s.loadingTitle}>Preparing your holiday collection…</Text>
              <Text style={s.loadingSub}>Finding destination packages for you.</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <MaterialCommunityIcons name="airplane-search" size={42} color="#0284C7" />
              </View>
              <Text style={s.emptyTitle}>No matching trips</Text>
              <Text style={s.emptyText}>Try another location, travel style or search phrase.</Text>
              <Pressable
                onPress={() => {
                  setQuery("");
                  setActiveMood("All");
                  setActiveLocation("All");
                }}
                style={s.resetBtn}
              >
                <Text style={s.resetText}>Show all holidays</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={s.sectionRow}>
                <View>
                  <Text style={s.eyebrow}>FEATURED PACKAGES</Text>
                  <Text style={s.sectionTitleSmall}>Popular escapes</Text>
                </View>
                <MaterialCommunityIcons name="sparkles" size={21} color="#FF6B00" />
              </View>

              <View style={s.featureGrid}>
                {featured.map((item, index) => {
                  const gallery = galleryFor(item);

                  return (
                    <Animated.View key={item.id} entering={FadeInUp.delay(index * 80).duration(550)} style={s.packageCard}>
                      <Pressable onPress={() => openDetails(item)}>
                        <View style={s.packageImageWrap}>
                          <Image source={{ uri: gallery[0] }} style={s.packageImage} contentFit="cover" />
                          <LinearGradient colors={["rgba(15,23,42,0.02)", "rgba(15,23,42,0.84)"]} style={s.imageShade} />

                          <View style={s.topBadgeRow}>
                            <View style={s.packageTag}>
                              <Text style={s.packageTagText}>{item.tag || "Featured"}</Text>
                            </View>
                            <View style={s.photoBadge}>
                              <MaterialCommunityIcons name="image-multiple-outline" size={13} color="#fff" />
                              <Text style={s.photoBadgeText}>5</Text>
                            </View>
                          </View>

                          <View style={s.imageBottom}>
                            <View style={s.locationLine}>
                              <MaterialCommunityIcons name="map-marker" size={13} color="#fff" />
                              <Text style={s.locationLineText}>{labelFor(item)}</Text>
                            </View>
                            <Text style={s.packageTitle} numberOfLines={2}>{item.name}</Text>
                            <View style={s.ratingRow}>
                              <View style={s.ratingPill}>
                                <MaterialCommunityIcons name="star" size={13} color="#F59E0B" />
                                <Text style={s.ratingText}>{Number(item.rating || 4.8).toFixed(1)}</Text>
                              </View>
                              <Text style={s.reviewText}>({item.reviews || 0} reviews)</Text>
                              <Text style={s.dotText}>•</Text>
                              <Text style={s.durationText}>{item.duration || "Flexible"}</Text>
                            </View>
                          </View>
                        </View>

                        <View style={s.packageBody}>
                          <View style={s.thumbRow}>
                            {gallery.slice(0, 4).map((photo, i) => (
                              <Image key={item.id + "-thumb-" + i} source={{ uri: photo }} style={s.thumb} contentFit="cover" />
                            ))}
                          </View>

                          <View style={s.priceRow}>
                            <View>
                              <Text style={s.priceCaption}>Starting from</Text>
                              <Text style={s.price}>{money(item.price)}</Text>
                              <Text style={s.priceSub}>per person</Text>
                            </View>
                            <View style={s.viewCircle}>
                              <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
                            </View>
                          </View>
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>

              {more.length > 0 ? (
                <>
                  <View style={[s.sectionRow, { marginTop: 28 }]}>
                    <View>
                      <Text style={s.eyebrow}>MORE TO EXPLORE</Text>
                      <Text style={s.sectionTitleSmall}>More destinations</Text>
                    </View>
                  </View>

                  {more.map((item, index) => {
                    const gallery = galleryFor(item);

                    return (
                      <Animated.View key={item.id} entering={FadeInUp.delay(index * 50).duration(500)}>
                        <Pressable onPress={() => openDetails(item)} style={s.listCard}>
                          <Image source={{ uri: gallery[0] }} style={s.listImage} contentFit="cover" />
                          <View style={s.listContent}>
                            <View style={s.listMetaRow}>
                              <View style={s.listLocation}>
                                <MaterialCommunityIcons name="map-marker-outline" size={13} color="#0284C7" />
                                <Text style={s.listLocationText}>{labelFor(item)}</Text>
                              </View>
                              <Text style={s.listMood}>{moodFor(item)}</Text>
                            </View>
                            <Text style={s.listTitle} numberOfLines={2}>{item.name}</Text>
                            {!!item.description && <Text style={s.listDescription} numberOfLines={2}>{item.description}</Text>}
                            <View style={s.listBottom}>
                              <View>
                                <Text style={s.listDuration}>{item.duration || "Flexible trip"} · ★ {Number(item.rating || 4.8).toFixed(1)}</Text>
                                <Text style={s.listPrice}>{money(item.price)} <Text style={s.listPriceSub}>/ person</Text></Text>
                              </View>
                              <View style={s.listArrow}>
                                <MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />
                              </View>
                            </View>
                          </View>
                        </Pressable>
                      </Animated.View>
                    );
                  })}
                </>
              ) : null}
            </>
          )}

          <View style={s.styleSection}>
            <View style={s.sectionRow}>
              <View>
                <Text style={s.eyebrow}>TRAVEL INSPIRATION</Text>
                <Text style={s.sectionTitleSmall}>Choose your mood</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.inspirationRow}>
              {[
                { title: "Beach days", sub: "Sun, sand & sea", icon: "waves", image: MOCK_PHOTOS[1] },
                { title: "Mountain air", sub: "Cool escapes", icon: "terrain", image: MOCK_PHOTOS[2] },
                { title: "Soulful journeys", sub: "Temples & culture", icon: "hands-pray", image: MOCK_PHOTOS[3] },
                { title: "Wild adventures", sub: "Trails & camps", icon: "hiking", image: MOCK_PHOTOS[4] },
              ].map((x) => (
                <Pressable key={x.title} style={s.inspirationCard} onPress={() => setActiveMood(x.title === "Beach days" ? "Beach" : x.title === "Mountain air" ? "Mountains" : x.title === "Soulful journeys" ? "Spiritual" : "Adventure")}>
                  <Image source={{ uri: x.image }} style={s.inspirationImage} contentFit="cover" />
                  <LinearGradient colors={["transparent", "rgba(15,23,42,.80)"]} style={s.inspirationShade} />
                  <View style={s.inspirationIcon}>
                    <MaterialCommunityIcons name={x.icon as any} size={17} color="#fff" />
                  </View>
                  <View style={s.inspirationText}>
                    <Text style={s.inspirationTitle}>{x.title}</Text>
                    <Text style={s.inspirationSub}>{x.sub}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={s.workflowCard}>
            <LinearGradient colors={["#0F172A", "#164E63"]} style={s.workflowInner}>
              <Text style={s.workflowEyebrow}>HOW KMT BAZAAR HOLIDAYS WORKS</Text>
              <Text style={s.workflowTitle}>From inspiration to booking in 3 steps.</Text>

              {[
                { n: "01", icon: "compass-outline", title: "Discover", text: "Explore destinations and compare holiday packages." },
                { n: "02", icon: "image-multiple-outline", title: "Inspect", text: "Open the package, browse all five photos and details." },
                { n: "03", icon: "calendar-check-outline", title: "Book", text: "Choose travel date, travellers and send your booking request." },
              ].map((step) => (
                <View key={step.n} style={s.workflowStep}>
                  <View style={s.stepNo}><Text style={s.stepNoText}>{step.n}</Text></View>
                  <View style={s.stepIcon}><MaterialCommunityIcons name={step.icon as any} size={19} color="#67E8F9" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.stepTitle}>{step.title}</Text>
                    <Text style={s.stepText}>{step.text}</Text>
                  </View>
                </View>
              ))}
            </LinearGradient>
          </View>

          <View style={s.trustRow}>
            <View style={s.trustCard}>
              <View style={s.trustIcon}><MaterialCommunityIcons name="shield-check-outline" size={22} color="#0284C7" /></View>
              <Text style={s.trustTitle}>Clear package details</Text>
              <Text style={s.trustText}>Destination, duration, photos and booking information in one place.</Text>
            </View>
            <View style={s.trustCard}>
              <View style={s.trustIcon}><MaterialCommunityIcons name="headset" size={22} color="#0284C7" /></View>
              <Text style={s.trustTitle}>Service marketplace</Text>
              <Text style={s.trustText}>Holiday packages are connected to KMT Bazaar's service booking workflow.</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={!!selected && !bookingOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.detailSheet}>
            {selected ? (
              <>
                <View style={s.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalEyebrow}>HOLIDAY PACKAGE</Text>
                    <Text style={s.modalTitle}>{selected.name}</Text>
                    <Text style={s.modalLocation}>
                      {labelFor(selected)} · {selected.vendor_name || "KMT Bazaar partner"}
                    </Text>
                  </View>
                  <Pressable onPress={() => setSelected(null)} style={s.closeBtn}>
                    <MaterialCommunityIcons name="close" size={21} color="#0F172A" />
                  </Pressable>
                </View>

                <View style={s.detailHero}>
                  <Image source={{ uri: galleryFor(selected)[selectedPhoto] }} style={s.detailHeroImage} contentFit="cover" />
                  <View style={s.detailCounter}>
                    <MaterialCommunityIcons name="camera-outline" size={13} color="#fff" />
                    <Text style={s.detailCounterText}>{selectedPhoto + 1} / 5</Text>
                  </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.modalThumbRow}>
                  {galleryFor(selected).map((photo, index) => (
                    <Pressable key={selected.id + "-detail-" + index} onPress={() => setSelectedPhoto(index)}>
                      <Image source={{ uri: photo }} style={[s.modalThumb, index === selectedPhoto && s.modalThumbActive]} contentFit="cover" />
                    </Pressable>
                  ))}
                </ScrollView>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                  <View style={s.detailStats}>
                    <View style={s.detailStat}>
                      <Text style={s.detailStatLabel}>Starting</Text>
                      <Text style={s.detailStatValue}>{money(selected.price)}</Text>
                    </View>
                    <View style={s.detailStat}>
                      <Text style={s.detailStatLabel}>Duration</Text>
                      <Text style={s.detailStatValue}>{selected.duration || "Flexible"}</Text>
                    </View>
                    <View style={s.detailStat}>
                      <Text style={s.detailStatLabel}>Rating</Text>
                      <Text style={s.detailStatValue}>★ {Number(selected.rating || 4.8).toFixed(1)}</Text>
                    </View>
                  </View>

                  {!!selected.description && <Text style={s.detailDescription}>{selected.description}</Text>}

                  <Text style={s.detailSectionTitle}>Package highlights</Text>
                  <View style={s.highlightGrid}>
                    {(selected.includes || ["Hotel", "Breakfast", "Sightseeing"]).map((item) => (
                      <View key={item} style={s.highlightPill}>
                        <MaterialCommunityIcons name="check-circle-outline" size={16} color="#16A34A" />
                        <Text style={s.highlightText}>{item}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={s.detailSectionTitle}>Your 5-photo gallery</Text>
                  <Text style={s.detailHint}>Swipe through the destination photos before you book.</Text>

                  <View style={s.ctaBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.ctaTitle}>Ready to plan this trip?</Text>
                      <Text style={s.ctaText}>Choose your travel date and number of travellers.</Text>
                    </View>
                    <Pressable onPress={() => setBookingOpen(true)} style={s.ctaButton}>
                      <Text style={s.ctaButtonText}>Continue</Text>
                      <MaterialCommunityIcons name="arrow-right" size={17} color="#fff" />
                    </Pressable>
                  </View>
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!selected && bookingOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setBookingOpen(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.bookingSheet}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalEyebrow}>BOOK YOUR HOLIDAY</Text>
                <Text style={s.modalTitle}>{selected?.name}</Text>
                <Text style={s.modalLocation}>{selected ? labelFor(selected) : ""}</Text>
              </View>
              <Pressable onPress={() => setBookingOpen(false)} style={s.closeBtn}>
                <MaterialCommunityIcons name="close" size={21} color="#0F172A" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.bookingSummary}>
                <Image source={{ uri: selected ? galleryFor(selected)[0] : MOCK_PHOTOS[0] }} style={s.bookingImage} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={s.bookingSummaryTitle}>{selected?.name}</Text>
                  <Text style={s.bookingSummaryMeta}>{selected ? selected.duration : ""} · From {selected ? money(selected.price) : "—"}</Text>
                  <Text style={s.bookingSummaryRating}>★ {selected ? Number(selected.rating || 4.8).toFixed(1) : "4.8"} · {selected?.reviews || 0} reviews</Text>
                </View>
              </View>

              <Text style={s.formLabel}>Travel date</Text>
              <TextInput
                value={bookingDate}
                onChangeText={setBookingDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
                style={s.formInput}
              />
              <Text style={s.helperText}>Example: 2026-11-20</Text>

              <Text style={s.formLabel}>Travellers</Text>
              <View style={s.counterRow}>
                <Pressable onPress={() => setTravellers((v) => Math.max(1, v - 1))} style={s.counterBtn}>
                  <MaterialCommunityIcons name="minus" size={19} color="#0F172A" />
                </Pressable>
                <View style={s.counterValueBox}>
                  <Text style={s.counterValue}>{travellers}</Text>
                  <Text style={s.counterLabel}>travellers</Text>
                </View>
                <Pressable onPress={() => setTravellers((v) => Math.min(12, v + 1))} style={s.counterBtn}>
                  <MaterialCommunityIcons name="plus" size={19} color="#0F172A" />
                </Pressable>
              </View>

              <Text style={s.formLabel}>Notes (optional)</Text>
              <TextInput
                value={bookingNote}
                onChangeText={setBookingNote}
                placeholder="Pickup request, room preference, special requirement..."
                placeholderTextColor="#94A3B8"
                multiline
                style={[s.formInput, s.formTextarea]}
              />

              <View style={s.totalCard}>
                <View>
                  <Text style={s.totalLabel}>Estimated package total</Text>
                  <Text style={s.totalSub}>{travellers} travellers × {selected ? money(selected.price) : "₹0"}</Text>
                </View>
                <Text style={s.totalValue}>{selected ? money((selected.price || 0) * travellers) : "₹0"}</Text>
              </View>

              <Pressable onPress={submitBooking} style={s.confirmBtn}>
                <MaterialCommunityIcons name="calendar-check" size={20} color="#fff" />
                <Text style={s.confirmText}>Continue to booking cart</Text>
              </Pressable>

              <Text style={s.disclaimer}>
                This is a booking request flow. Final availability and price can be confirmed by the holiday partner before fulfilment.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7FBFF" },
  scroll: { paddingBottom: 42 },

  hero: {
    minHeight: 590,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 22,
    overflow: "hidden",
  },
  heroNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  navCircle: {
    width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center",
    backgroundColor: "rgba(15,23,42,.18)", borderWidth: 1, borderColor: "rgba(255,255,255,.28)",
  },
  brandPill: {
    flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,.92)", paddingHorizontal: 13, paddingVertical: 8,
  },
  brandText: { color: "#0C4A6E", fontWeight: "900", fontSize: 10, letterSpacing: 1.1 },
  sun: {
    position: "absolute", width: 185, height: 185, borderRadius: 100, top: 48, right: -52,
    backgroundColor: "rgba(255,255,255,.20)",
  },
  cloud: { position: "absolute", width: 220, height: 70, left: 0, top: 165 },
  cloudA: { opacity: 0.75 },
  cloudB: { top: 265, opacity: 0.45 },
  cloudXL: { position: "absolute", width: 86, height: 86, borderRadius: 44, left: 38, bottom: 8, backgroundColor: "rgba(255,255,255,.92)" },
  cloudL: { position: "absolute", width: 64, height: 64, borderRadius: 32, left: 86, bottom: 8, backgroundColor: "rgba(255,255,255,.93)" },
  cloudS: { position: "absolute", width: 48, height: 48, borderRadius: 24, left: 132, bottom: 8, backgroundColor: "rgba(255,255,255,.94)" },
  cloudBase: { position: "absolute", left: 15, right: 12, bottom: 0, height: 30, borderRadius: 20, backgroundColor: "rgba(255,255,255,.93)" },
  plane: { position: "absolute", top: 112, left: 0, flexDirection: "row", alignItems: "center" },
  flightTrail: { width: 80, height: 2, marginRight: 8, borderRadius: 2, backgroundColor: "rgba(255,255,255,.65)" },

  heroCopy: { marginTop: 128, paddingRight: 12 },
  heroTag: {
    alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,.24)", borderWidth: 1, borderColor: "rgba(255,255,255,.28)",
  },
  heroTagText: { color: "#0C4A6E", fontSize: 10, fontWeight: "900", letterSpacing: 1.05 },
  heroTitle: { marginTop: 12, color: "#fff", fontSize: 42, lineHeight: 44, fontWeight: "900", letterSpacing: -0.7 },
  heroSub: { marginTop: 13, color: "rgba(255,255,255,.93)", fontSize: 14, lineHeight: 21, maxWidth: 560 },

  searchCard: {
    minHeight: 62, marginTop: 24, paddingHorizontal: 9, paddingRight: 14,
    borderRadius: 19, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", gap: 10,
    shadowColor: "#0C4A6E", shadowOpacity: 0.14, shadowRadius: 22, shadowOffset: { width: 0, height: 11 }, elevation: 7,
  },
  searchIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#E0F2FE" },
  searchInput: { flex: 1, color: "#0F172A", fontSize: 14 },

  heroStats: {
    marginTop: 15, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16,
    backgroundColor: "rgba(15,23,42,.18)", borderWidth: 1, borderColor: "rgba(255,255,255,.18)",
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { color: "#fff", fontSize: 18, fontWeight: "900" },
  statLabel: { marginTop: 2, color: "rgba(255,255,255,.78)", fontSize: 9, fontWeight: "700", textAlign: "center" },
  statDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,.18)" },

  body: { padding: 16, backgroundColor: "#F7FBFF" },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 2 },
  eyebrow: { color: "#0284C7", fontSize: 10, fontWeight: "900", letterSpacing: 1.45 },
  sectionTitle: { marginTop: 4, color: "#0F172A", fontSize: 26, lineHeight: 31, fontWeight: "900" },
  sectionTitleSmall: { marginTop: 4, color: "#0F172A", fontSize: 20, lineHeight: 24, fontWeight: "900" },
  sectionSub: { marginTop: 4, color: "#64748B", fontSize: 12, lineHeight: 18 },
  resultPill: { minWidth: 54, alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 16, backgroundColor: "#E0F2FE" },
  resultNum: { color: "#0369A1", fontSize: 18, fontWeight: "900" },
  resultText: { color: "#0369A1", fontSize: 9, fontWeight: "800" },

  filterRow: { gap: 9, paddingTop: 15, paddingBottom: 7 },
  filterPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: "#DBEAFE" },
  filterPillActive: { backgroundColor: "#0284C7", borderColor: "#0284C7" },
  filterText: { color: "#475569", fontSize: 11, fontWeight: "800" },
  filterTextActive: { color: "#fff" },

  filterRowSmall: { gap: 8, paddingBottom: 18 },
  locationPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0" },
  locationPillActive: { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" },
  locationText: { color: "#64748B", fontSize: 10, fontWeight: "800" },
  locationTextActive: { color: "#92400E" },

  loadingBox: { alignItems: "center", paddingVertical: 82 },
  loadingTitle: { marginTop: 13, color: "#0F172A", fontSize: 17, fontWeight: "900" },
  loadingSub: { marginTop: 5, color: "#64748B", fontSize: 12 },

  empty: { alignItems: "center", paddingVertical: 72, paddingHorizontal: 24 },
  emptyIcon: { width: 86, height: 86, borderRadius: 43, alignItems: "center", justifyContent: "center", backgroundColor: "#E0F2FE" },
  emptyTitle: { marginTop: 16, color: "#0F172A", fontSize: 20, fontWeight: "900" },
  emptyText: { marginTop: 6, color: "#64748B", fontSize: 13, lineHeight: 19, textAlign: "center" },
  resetBtn: { marginTop: 16, borderRadius: 999, paddingHorizontal: 17, paddingVertical: 11, backgroundColor: "#0284C7" },
  resetText: { color: "#fff", fontSize: 12, fontWeight: "900" },

  sectionRow: { marginTop: 3, marginBottom: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  featureGrid: { gap: 13 },
  packageCard: {
    overflow: "hidden", borderRadius: 24, backgroundColor: "#fff", borderWidth: 1, borderColor: "#DCECF7",
    shadowColor: "#0C4A6E", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3,
  },
  packageImageWrap: { height: 292, position: "relative" },
  packageImage: { width: "100%", height: "100%" },
  imageShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 190 },
  topBadgeRow: { position: "absolute", top: 14, left: 14, right: 14, flexDirection: "row", justifyContent: "space-between" },
  packageTag: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: "#FF6B00" },
  packageTagText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  photoBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 999, backgroundColor: "rgba(15,23,42,.60)" },
  photoBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  imageBottom: { position: "absolute", left: 16, right: 16, bottom: 15 },
  locationLine: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationLineText: { color: "rgba(255,255,255,.90)", fontSize: 10, fontWeight: "800" },
  packageTitle: { marginTop: 5, color: "#fff", fontSize: 25, lineHeight: 29, fontWeight: "900" },
  ratingRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  ratingPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,.92)" },
  ratingText: { color: "#0F172A", fontSize: 10, fontWeight: "900" },
  reviewText: { color: "rgba(255,255,255,.78)", fontSize: 9, fontWeight: "700" },
  dotText: { color: "rgba(255,255,255,.55)", fontSize: 9 },
  durationText: { color: "rgba(255,255,255,.80)", fontSize: 9, fontWeight: "700" },

  packageBody: { padding: 12 },
  thumbRow: { flexDirection: "row", gap: 6 },
  thumb: { flex: 1, height: 46, borderRadius: 8, backgroundColor: "#E2E8F0" },
  priceRow: { marginTop: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceCaption: { color: "#64748B", fontSize: 9, fontWeight: "700" },
  price: { marginTop: 1, color: "#0F172A", fontSize: 21, fontWeight: "900" },
  priceSub: { color: "#64748B", fontSize: 9, fontWeight: "700" },
  viewCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#FF6B00", alignItems: "center", justifyContent: "center" },

  listCard: { marginBottom: 12, overflow: "hidden", flexDirection: "row", borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0" },
  listImage: { width: 112, minHeight: 166, backgroundColor: "#E2E8F0" },
  listContent: { flex: 1, padding: 12 },
  listMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  listLocation: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  listLocationText: { color: "#0284C7", fontSize: 10, fontWeight: "800" },
  listMood: { color: "#C2410C", fontSize: 9, fontWeight: "900" },
  listTitle: { marginTop: 6, color: "#0F172A", fontSize: 17, lineHeight: 21, fontWeight: "900" },
  listDescription: { marginTop: 5, color: "#64748B", fontSize: 11, lineHeight: 17 },
  listBottom: { marginTop: 10, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 },
  listDuration: { color: "#64748B", fontSize: 9, fontWeight: "800" },
  listPrice: { marginTop: 3, color: "#0F172A", fontSize: 16, fontWeight: "900" },
  listPriceSub: { color: "#64748B", fontSize: 9, fontWeight: "700" },
  listArrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#0284C7", alignItems: "center", justifyContent: "center" },

  styleSection: { marginTop: 22 },
  inspirationRow: { gap: 10, paddingBottom: 2 },
  inspirationCard: { width: 205, height: 145, borderRadius: 18, overflow: "hidden", position: "relative", backgroundColor: "#E2E8F0" },
  inspirationImage: { width: "100%", height: "100%" },
  inspirationShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 90 },
  inspirationIcon: { position: "absolute", top: 11, right: 11, width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(15,23,42,.55)", alignItems: "center", justifyContent: "center" },
  inspirationText: { position: "absolute", left: 12, right: 12, bottom: 11 },
  inspirationTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
  inspirationSub: { marginTop: 2, color: "rgba(255,255,255,.78)", fontSize: 9, fontWeight: "700" },

  workflowCard: { marginTop: 24, overflow: "hidden", borderRadius: 24 },
  workflowInner: { padding: 19, minHeight: 360 },
  workflowEyebrow: { color: "#67E8F9", fontSize: 9, fontWeight: "900", letterSpacing: 1.3 },
  workflowTitle: { marginTop: 8, color: "#fff", fontSize: 24, lineHeight: 29, fontWeight: "900" },
  workflowStep: { marginTop: 17, flexDirection: "row", alignItems: "center", gap: 9 },
  stepNo: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,.09)", alignItems: "center", justifyContent: "center" },
  stepNoText: { color: "#A5F3FC", fontSize: 8, fontWeight: "900" },
  stepIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: "rgba(255,255,255,.09)", borderWidth: 1, borderColor: "rgba(255,255,255,.10)", alignItems: "center", justifyContent: "center" },
  stepTitle: { color: "#fff", fontSize: 13, fontWeight: "900" },
  stepText: { marginTop: 2, color: "rgba(255,255,255,.70)", fontSize: 10, lineHeight: 15 },

  trustRow: { marginTop: 12, flexDirection: "row", gap: 10 },
  trustCard: { flex: 1, minHeight: 154, padding: 13, borderRadius: 18, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0" },
  trustIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center" },
  trustTitle: { marginTop: 11, color: "#0F172A", fontSize: 12, lineHeight: 16, fontWeight: "900" },
  trustText: { marginTop: 5, color: "#64748B", fontSize: 10, lineHeight: 16 },

  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(2,8,23,.62)" },
  detailSheet: { maxHeight: "94%", padding: 16, backgroundColor: "#fff", borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  bookingSheet: { maxHeight: "92%", padding: 16, backgroundColor: "#fff", borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  modalEyebrow: { color: "#0284C7", fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  modalTitle: { marginTop: 4, color: "#0F172A", fontSize: 22, lineHeight: 27, fontWeight: "900" },
  modalLocation: { marginTop: 4, color: "#64748B", fontSize: 11, fontWeight: "700" },
  closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },

  detailHero: { position: "relative" },
  detailHeroImage: { width: "100%", height: 258, borderRadius: 20, backgroundColor: "#E2E8F0" },
  detailCounter: { position: "absolute", right: 11, bottom: 11, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 999, backgroundColor: "rgba(15,23,42,.65)" },
  detailCounterText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  modalThumbRow: { gap: 8, paddingVertical: 10 },
  modalThumb: { width: 70, height: 58, borderRadius: 10, borderWidth: 2, borderColor: "transparent" },
  modalThumbActive: { borderColor: "#FF6B00" },

  detailStats: { flexDirection: "row", gap: 8, marginTop: 3 },
  detailStat: { flex: 1, padding: 10, borderRadius: 14, backgroundColor: "#F0F9FF" },
  detailStatLabel: { color: "#64748B", fontSize: 9, fontWeight: "800" },
  detailStatValue: { marginTop: 3, color: "#0F172A", fontSize: 12, fontWeight: "900" },
  detailDescription: { marginTop: 12, color: "#475569", fontSize: 12, lineHeight: 19 },
  detailSectionTitle: { marginTop: 15, color: "#0F172A", fontSize: 14, fontWeight: "900" },
  highlightGrid: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  highlightPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 999, backgroundColor: "#F0FDF4" },
  highlightText: { color: "#166534", fontSize: 10, fontWeight: "800" },
  detailHint: { marginTop: 4, color: "#64748B", fontSize: 10, lineHeight: 16 },

  ctaBox: { marginTop: 16, padding: 13, borderRadius: 18, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", flexDirection: "row", alignItems: "center", gap: 10 },
  ctaTitle: { color: "#0F172A", fontSize: 13, fontWeight: "900" },
  ctaText: { marginTop: 3, color: "#64748B", fontSize: 9, lineHeight: 14 },
  ctaButton: { minHeight: 43, paddingHorizontal: 13, borderRadius: 13, backgroundColor: "#FF6B00", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5 },
  ctaButtonText: { color: "#fff", fontSize: 11, fontWeight: "900" },

  bookingSummary: { padding: 10, borderRadius: 16, backgroundColor: "#F8FAFC", flexDirection: "row", gap: 10, alignItems: "center" },
  bookingImage: { width: 78, height: 70, borderRadius: 12, backgroundColor: "#E2E8F0" },
  bookingSummaryTitle: { color: "#0F172A", fontSize: 14, fontWeight: "900" },
  bookingSummaryMeta: { marginTop: 4, color: "#64748B", fontSize: 10, fontWeight: "700" },
  bookingSummaryRating: { marginTop: 4, color: "#B45309", fontSize: 9, fontWeight: "900" },

  formLabel: { marginTop: 15, marginBottom: 7, color: "#0F172A", fontSize: 12, fontWeight: "900" },
  formInput: { minHeight: 50, borderRadius: 13, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#fff", paddingHorizontal: 13, color: "#0F172A", fontSize: 13 },
  formTextarea: { minHeight: 92, paddingTop: 12, textAlignVertical: "top" },
  helperText: { marginTop: 5, color: "#94A3B8", fontSize: 9 },

  counterRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  counterBtn: { width: 44, height: 44, borderRadius: 13, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  counterValueBox: { flex: 1, minHeight: 50, borderRadius: 13, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center" },
  counterValue: { color: "#0369A1", fontSize: 19, fontWeight: "900" },
  counterLabel: { marginTop: 1, color: "#0369A1", fontSize: 9, fontWeight: "700" },

  totalCard: { marginTop: 16, padding: 13, borderRadius: 16, backgroundColor: "#F0F9FF", borderWidth: 1, borderColor: "#BAE6FD", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  totalLabel: { color: "#0F172A", fontSize: 12, fontWeight: "900" },
  totalSub: { marginTop: 3, color: "#64748B", fontSize: 9 },
  totalValue: { color: "#0F172A", fontSize: 19, fontWeight: "900" },

  confirmBtn: { marginTop: 14, minHeight: 54, borderRadius: 15, backgroundColor: "#FF6B00", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  confirmText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  disclaimer: { marginTop: 9, marginBottom: 6, color: "#94A3B8", fontSize: 9, lineHeight: 14, textAlign: "center" },
});
