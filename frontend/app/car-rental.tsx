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

const RED = "#ef233c";
const RED_DARK = "#b91c2d";
const BLACK = "#08090b";
const BLACK_2 = "#111318";
const WHITE = "#ffffff";
const MUTED = "#a6abb4";
const LINE = "#242833";

const MOCK_FLEET = [
  {
    id: "mock-car-innova",
    name: "Toyota Innova Crysta",
    location: "Patna",
    category: "With Driver",
    type: "SUV",
    description: "Premium 7-seater for family tours, airport transfers and long outstation journeys.",
    vendor_name: "KMT Tours & Travel",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1400&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1400&q=85",
      "https://images.unsplash.com/photo-1542362567-b07e54358753?w=1400&q=85",
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1400&q=85",
      "https://images.unsplash.com/photo-1542282088-fe8426682b8f?w=1400&q=85",
      "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=1400&q=85",
    ],
    price: 3200,
    unit: "day",
    seats: 7,
    bags: 4,
    transmission: "Automatic",
    fuel: "Diesel",
    tag: "Family favourite",
    rating: 4.9,
    reviews: 312,
    includes: ["Driver", "Fuel", "AC", "Intercity support"],
  },
  {
    id: "mock-car-ertiga",
    name: "Maruti Ertiga",
    location: "Gaya",
    category: "Tour & Travel",
    type: "MUV",
    description: "Comfortable and practical 6-seater for city tours, religious circuits and weekend trips.",
    vendor_name: "Bihar Road Trips",
    image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1400&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1400&q=85",
      "https://images.unsplash.com/photo-1493238792000-8113da705763?w=1400&q=85",
      "https://images.unsplash.com/photo-1518987048-93e29699e79a?w=1400&q=85",
      "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=1400&q=85",
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1400&q=85",
    ],
    price: 2400,
    unit: "day",
    seats: 6,
    bags: 3,
    transmission: "Manual",
    fuel: "Petrol",
    tag: "Best value",
    rating: 4.8,
    reviews: 227,
    includes: ["Driver", "AC", "Local sightseeing", "One-way option"],
  },
  {
    id: "mock-car-dzire",
    name: "Maruti Dzire",
    location: "Patna",
    category: "Airport & City",
    type: "Sedan",
    description: "Reliable sedan for airport pickup, business travel and comfortable city movement.",
    vendor_name: "CityRide Bihar",
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1400&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1400&q=85",
      "https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=1400&q=85",
      "https://images.unsplash.com/photo-1550355291-bbee04a92027?w=1400&q=85",
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1400&q=85",
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1400&q=85",
    ],
    price: 1600,
    unit: "day",
    seats: 4,
    bags: 2,
    transmission: "Manual",
    fuel: "Petrol",
    tag: "City pick",
    rating: 4.7,
    reviews: 188,
    includes: ["Driver", "AC", "Airport transfer", "Local use"],
  },
  {
    id: "mock-car-fortuner",
    name: "Toyota Fortuner",
    location: "Ranchi",
    category: "Premium",
    type: "SUV",
    description: "Premium SUV for executive travel, destination events and high-comfort road tours.",
    vendor_name: "Elite Roadways",
    image: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=1400&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=1400&q=85",
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1400&q=85",
      "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1400&q=85",
      "https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=1400&q=85",
      "https://images.unsplash.com/photo-1519245659620-e859806a8d3b?w=1400&q=85",
    ],
    price: 5200,
    unit: "day",
    seats: 7,
    bags: 5,
    transmission: "Automatic",
    fuel: "Diesel",
    tag: "Premium",
    rating: 4.9,
    reviews: 141,
    includes: ["Driver", "Fuel", "Premium AC", "Priority support"],
  },
  {
    id: "mock-car-tempo",
    name: "Tempo Traveller 12 Seater",
    location: "Varanasi",
    category: "Group Tour",
    type: "Traveller",
    description: "Spacious group vehicle for family pilgrimages, wedding travel and multi-city tours.",
    vendor_name: "India Group Travels",
    image: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=1400&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=1400&q=85",
      "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=1400&q=85",
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1400&q=85",
      "https://images.unsplash.com/photo-1525609004556-c46c7cf7cf81?w=1400&q=85",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=85",
    ],
    price: 6800,
    unit: "day",
    seats: 12,
    bags: 10,
    transmission: "Manual",
    fuel: "Diesel",
    tag: "Group travel",
    rating: 4.8,
    reviews: 103,
    includes: ["Driver", "AC", "Luggage space", "Tour support"],
  },
  {
    id: "mock-car-self-drive",
    name: "Hyundai Creta Self Drive",
    location: "Patna",
    category: "Self Drive",
    type: "SUV",
    description: "A practical self-drive SUV for flexible weekend plans and personal travel.",
    vendor_name: "DriveEasy Rentals",
    image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1400&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1400&q=85",
      "https://images.unsplash.com/photo-1549924231-f129b911e442?w=1400&q=85",
      "https://images.unsplash.com/photo-1494905998402-395d579af36f?w=1400&q=85",
      "https://images.unsplash.com/photo-1504215680853-026ed2a45def?w=1400&q=85",
      "https://images.unsplash.com/photo-1511391409283-4f4c5a2e5f5e?w=1400&q=85",
    ],
    price: 2900,
    unit: "day",
    seats: 5,
    bags: 3,
    transmission: "Automatic",
    fuel: "Petrol",
    tag: "Self drive",
    rating: 4.6,
    reviews: 96,
    includes: ["Insurance", "Roadside support", "GPS", "Self-drive"],
  },
];


type CarItem = {
  id: string;
  name: string;
  location?: string;
  category?: string;
  type?: string;
  description?: string;
  vendor_name?: string;
  image?: string;
  gallery?: string[];
  price?: number;
  unit?: string;
  seats?: number;
  bags?: number;
  transmission?: string;
  fuel?: string;
  tag?: string;
  rating?: number;
  reviews?: number;
  includes?: string[];
};

function enrich(item: CarItem, index: number) {
  const mock = MOCK_FLEET[index % MOCK_FLEET.length];
  return {
    ...item,
    image: item.image || mock.image,
    gallery: Array.isArray(item.gallery) && item.gallery.length ? item.gallery : mock.gallery,
    price: Number(item.price) || mock.price,
    unit: item.unit || mock.unit,
    seats: Number(item.seats) || mock.seats,
    bags: Number(item.bags) || mock.bags,
    transmission: item.transmission || mock.transmission,
    fuel: item.fuel || mock.fuel,
    tag: item.tag || mock.tag,
    rating: Number(item.rating) || mock.rating,
    reviews: Number(item.reviews) || mock.reviews,
    includes: Array.isArray(item.includes) && item.includes.length ? item.includes : mock.includes,
  };
}

function money(value: number) {
  return "₹" + Math.max(0, Number(value || 0)).toLocaleString("en-IN");
}

function galleryFor(item: CarItem) {
  const list = Array.from(new Set([item.image, ...(item.gallery || [])].filter(Boolean) as string[])).slice(0, 5);
  while (list.length < 5) list.push(MOCK_FLEET[list.length % MOCK_FLEET.length].image!);
  return list;
}

function goToTripBuilder(router: any, item: CarItem) {
  router.push({ pathname: "/car-trip-builder" as any, params: { carId: item.id } } as any);
}

export default function CarRentalPage() {
  const router = useRouter();
  const [items, setItems] = useState<CarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CarItem | null>(null);
  const [photo, setPhoto] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [days, setDays] = useState(1);
  const [passengers, setPassengers] = useState(2);
  const [tripNote, setTripNote] = useState("");

  const carX = useSharedValue(-180);
  const roadX = useSharedValue(0);
  const pulse = useSharedValue(0.95);
  const shine = useSharedValue(-1);

  useEffect(() => {
    carX.value = withRepeat(
      withSequence(withTiming(width + 220, { duration: 14500 }), withTiming(-220, { duration: 0 })),
      -1,
      false
    );
    roadX.value = withRepeat(
      withSequence(withTiming(-90, { duration: 1200 }), withTiming(0, { duration: 0 })),
      -1,
      false
    );
    pulse.value = withRepeat(
      withSequence(withTiming(1.04, { duration: 1800 }), withTiming(0.95, { duration: 1800 })),
      -1,
      true
    );
    shine.value = withRepeat(
      withSequence(withTiming(1.15, { duration: 2600 }), withTiming(-1, { duration: 40 })),
      -1,
      false
    );
  }, [carX, pulse, roadX]);

  const carStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: carX.value }, { translateY: -Math.abs(Math.sin(carX.value / 120)) * 4 }],
  }));
  const roadStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: roadX.value }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const shineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shine.value * (width + 260) }, { skewX: "-18deg" }] }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.serviceCatalog("car_rental");
      const real = Array.isArray(data) ? data : [];
      setItems((real.length ? real : MOCK_FLEET).map((x, i) => enrich(x, i)));
    } catch (e) {
      console.log("Car Rental catalog load error", e);
      setItems(MOCK_FLEET.map((x, i) => enrich(x, i)));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => {
      const text = [item.name, item.location, item.category, item.type, item.vendor_name, item.description].filter(Boolean).join(" ").toLowerCase();
      return text.includes(needle);
    });
  }, [items, query]);

  const heroSearch = () => {
    setQuery(query.trim());
  };

  const openDetails = (item: CarItem) => {
    setSelected(item);
    setPhoto(0);
    setBookingOpen(false);
  };

  const openBooking = (item: CarItem) => {
    setSelected(item);
    setPhoto(0);
    setBookingOpen(true);
    setPickup("");
    setDropoff("");
    setBookingDate("");
    setDays(1);
    setPassengers(Math.min(2, Number(item.seats || 2)));
    setTripNote("");
  };

  const submitBooking = async () => {
    if (!selected) return;

    if (!pickup.trim() || !bookingDate.trim()) {
      const message = "Please enter pickup location and travel date.";
      if (Platform.OS === "web") window.alert(message);
      else Alert.alert("Booking details required", message);
      return;
    }

    try {
      await api.serviceCartAdd({
        service_type: "car_rental",
        service_id: selected.id,
        booking_date: bookingDate.trim(),
        booking_time: "09:00",
        quantity: Math.max(1, days),
        notes: tripNote.trim(),
        extra: {
          passengers,
          rental_days: Math.max(1, days),
          pickup_location: pickup.trim(),
          dropoff_location: dropoff.trim(),
          package_name: selected.name,
          destination: selected.location || "India",
          package_price: selected.price || 0,
          duration: Math.max(1, days) + (days > 1 ? " days" : " day"),
          vendor_name: selected.vendor_name || "KMT Bazaar Car Rentals",
          source: String(selected.id).startsWith("mock-") ? "mock-car" : "vendor-service",
        },
      });

      setBookingOpen(false);
      setSelected(null);
      router.push("/service-booking-cart" as any);
    } catch (e: any) {
      const message = e?.message || "Could not add this car to booking cart.";
      if (Platform.OS === "web") window.alert(message);
      else Alert.alert("Car booking", message);
    }
  };

  const totalPreview = Number(selected?.price || 0) * Math.max(1, days);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["#050608", "#111318", "#33090f"]} style={styles.hero}>
          <View style={styles.glow} />
          <Animated.View style={[styles.neonRing, pulseStyle]} />
          <Animated.View pointerEvents="none" style={[styles.heroShine, shineStyle]} />
          <View style={styles.heroTop}>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="steering" size={15} color={RED} />
              <Text style={styles.badgeText}>KMT BAZAAR · TOUR & TRAVEL</Text>
            </View>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE FLEET</Text>
            </View>
          </View>

          <View style={styles.heroCopy}>
            <Animated.View entering={FadeInDown.duration(600)}>
              <Text style={styles.kicker}>DRIVE. DISCOVER. ARRIVE.</Text>
              <Text style={styles.heroTitle}>Your journey starts with the{"\n"}right <Text style={styles.heroAccent}>car.</Text></Text>
              <Text style={styles.heroSub}>
                Book cars, chauffeurs and tour-ready vehicles for city rides, airport transfers and outstation travel.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(160).duration(650)} style={styles.searchBox}>
              <MaterialCommunityIcons name="magnify" size={24} color={MUTED} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search car, city, tour or travel..."
                placeholderTextColor="#7f858f"
                style={styles.searchInput}
                returnKeyType="search"
                onSubmitEditing={heroSearch}
              />
              <Pressable onPress={heroSearch} style={styles.searchBtn}>
                <MaterialCommunityIcons name="arrow-right" size={20} color={WHITE} />
              </Pressable>
            </Animated.View>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}><MaterialCommunityIcons name="car-multiple" size={18} color={RED} /><Text style={styles.heroStatText}>Multiple vehicle types</Text></View>
            <View style={styles.heroStat}><MaterialCommunityIcons name="map-marker-distance" size={18} color={WHITE} /><Text style={styles.heroStatText}>City & outstation</Text></View>
            <View style={styles.heroStat}><MaterialCommunityIcons name="calendar-range" size={18} color={WHITE} /><Text style={styles.heroStatText}>Flexible duration</Text></View>
          </View>

          <View style={styles.road}>
            <Animated.View style={[styles.roadMarks, roadStyle]}>
              {Array.from({ length: 12 }).map((_, i) => <View key={i} style={styles.roadMark} />)}
            </Animated.View>
            <Animated.View style={[styles.heroCar, carStyle]}>
              <MaterialCommunityIcons name="car-sports" size={58} color={WHITE} />
              <View style={styles.carGlow} />
            </Animated.View>
          </View>
        </LinearGradient>

        <Animated.View entering={FadeInUp.delay(80).duration(600)} style={styles.introCard}>
          <View style={styles.introIcon}><MaterialCommunityIcons name="map-marker-distance" size={25} color={RED} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>Tour & Travel made simple</Text>
            <Text style={styles.introText}>Choose a vehicle, share your route and complete booking in the same KMT Bazaar checkout flow.</Text>
          </View>
        </Animated.View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Available Cars</Text>
            <Text style={styles.sectionSub}>Choose any car to open its Trip Builder</Text>
          </View>
          <View style={styles.countPill}><Text style={styles.countText}>{filtered.length} cars</Text></View>
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={RED} />
            <Text style={styles.loaderText}>Loading available cars...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="car-off" size={52} color="#5e6570" />
            <Text style={styles.emptyTitle}>No cars found</Text>
            <Text style={styles.emptyText}>Try a different car name, city or travel keyword.</Text>
            <Pressable onPress={() => setQuery("")} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Show all cars</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map((item, index) => (
              <Animated.View key={item.id} entering={FadeInDown.delay(index * 65).duration(520)} style={styles.card}>
                <Pressable onPress={() => goToTripBuilder(router, item)} android_ripple={{ color: "#272b33" }}>
                  <View style={styles.imageWrap}>
                    <Image source={{ uri: item.image }} style={styles.cardImage} contentFit="cover" transition={350} />
                    <LinearGradient colors={["transparent", "rgba(0,0,0,.75)"]} style={styles.imageShade} />
                    <View style={styles.tag}><Text style={styles.tagText}>{item.tag || item.category}</Text></View>
                    <View style={styles.pricePill}><Text style={styles.price}>{money(Number(item.price || 0))}</Text><Text style={styles.priceMeta}>/day</Text></View>
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.titleLine}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                      <View style={styles.rating}><MaterialCommunityIcons name="star" size={13} color="#ffd166" /><Text style={styles.ratingText}>{item.rating}</Text></View>
                    </View>
                    <Text style={styles.cardLocation}>
                      <MaterialCommunityIcons name="map-marker-outline" size={14} color={RED} /> {item.location} · {item.type}
                    </Text>
                    <View style={styles.specRow}>
                      <Spec icon="seat-outline" text={String(item.seats || 4) + " seats"} />
                      <Spec icon="bag-suitcase-outline" text={String(item.bags || 2) + " bags"} />
                      <Spec icon="car-shift-pattern" text={item.transmission || "Manual"} />
                    </View>
                    <View style={styles.bookBtn}>
                      <Text style={styles.bookBtnText}>Tap to build trip</Text>
                      <MaterialCommunityIcons name="arrow-right" size={18} color={WHITE} />
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        )}

      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => { setSelected(null); setBookingOpen(false); }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {!bookingOpen ? (
              <>
                <View style={styles.modalHero}>
                  <Image source={{ uri: galleryFor(selected || MOCK_FLEET[0])[photo] }} style={styles.modalImage} contentFit="cover" />
                  <Pressable onPress={() => setSelected(null)} style={styles.closeBtn}>
                    <MaterialCommunityIcons name="close" size={21} color={WHITE} />
                  </Pressable>
                  <View style={styles.modalPhotoCount}><Text style={styles.modalPhotoText}>{photo + 1} / 5</Text></View>
                </View>
                <ScrollView contentContainerStyle={styles.modalScroll}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
                    {galleryFor(selected || MOCK_FLEET[0]).map((src, i) => (
                      <Pressable key={src + i} onPress={() => setPhoto(i)}>
                        <Image source={{ uri: src }} style={[styles.thumb, photo === i && styles.thumbActive]} contentFit="cover" />
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Text style={styles.modalKicker}>{selected?.category}</Text>
                  <Text style={styles.modalTitle}>{selected?.name}</Text>
                  <Text style={styles.modalDesc}>{selected?.description}</Text>
                  <View style={styles.modalSpecGrid}>
                    <SpecBox icon="seat-outline" label="Seats" value={String(selected?.seats || 4)} />
                    <SpecBox icon="fuel" label="Fuel" value={selected?.fuel || "Petrol"} />
                    <SpecBox icon="car-shift-pattern" label="Gearbox" value={selected?.transmission || "Manual"} />
                    <SpecBox icon="bag-suitcase-outline" label="Bags" value={String(selected?.bags || 2)} />
                  </View>
                  <View style={styles.includeBox}>
                    <Text style={styles.includeTitle}>Included with this booking</Text>
                    <View style={styles.includeRow}>
                      {(selected?.includes || []).map((x) => (
                        <View key={x} style={styles.includePill}>
                          <MaterialCommunityIcons name="check-circle" size={14} color={RED} />
                          <Text style={styles.includeText}>{x}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={styles.modalBottom}>
                    <View>
                      <Text style={styles.fromText}>From</Text>
                      <Text style={styles.modalPrice}>{money(Number(selected?.price || 0))}<Text style={styles.per}> / day</Text></Text>
                    </View>
                    <Pressable onPress={() => openBooking(selected!)} style={styles.modalBook}>
                      <Text style={styles.modalBookText}>Plan this trip</Text>
                      <MaterialCommunityIcons name="arrow-right" size={19} color={WHITE} />
                    </Pressable>
                  </View>
                </ScrollView>
              </>
            ) : (
              <View style={styles.bookingWrap}>
                <View style={styles.bookingHeader}>
                  <View>
                    <Text style={styles.modalKicker}>TRIP BUILDER</Text>
                    <Text style={styles.modalTitle}>Book {selected?.name}</Text>
                  </View>
                  <Pressable onPress={() => { setBookingOpen(false); setSelected(null); }} style={styles.darkClose}>
                    <MaterialCommunityIcons name="close" size={21} color={WHITE} />
                  </Pressable>
                </View>
                <ScrollView contentContainerStyle={styles.formScroll}>
                  <View style={styles.summaryBanner}>
                    <Image source={{ uri: selected?.image }} style={styles.summaryImage} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.summaryTitle}>{selected?.name}</Text>
                      <Text style={styles.summaryMeta}>{selected?.location} · {selected?.category}</Text>
                      <Text style={styles.summaryPrice}>{money(Number(selected?.price || 0))} / day</Text>
                    </View>
                  </View>

                  <Text style={styles.formLabel}>PICKUP LOCATION *</Text>
                  <TextInput value={pickup} onChangeText={setPickup} placeholder="e.g. Patna Airport" placeholderTextColor="#7d828c" style={styles.formInput} />
                  <Text style={styles.formLabel}>DROP / DESTINATION</Text>
                  <TextInput value={dropoff} onChangeText={setDropoff} placeholder="e.g. Bodh Gaya / Patna" placeholderTextColor="#7d828c" style={styles.formInput} />
                  <Text style={styles.formLabel}>TRAVEL DATE *</Text>
                  <TextInput value={bookingDate} onChangeText={setBookingDate} placeholder="YYYY-MM-DD" placeholderTextColor="#7d828c" style={styles.formInput} maxLength={10} />
                  
                  <View style={styles.counterRow}>
                    <View style={styles.counterBox}>
                      <Text style={styles.formLabel}>RENTAL DAYS</Text>
                      <View style={styles.counter}>
                        <Pressable onPress={() => setDays((v) => Math.max(1, v - 1))} style={styles.counterBtn}><Text style={styles.counterBtnText}>−</Text></Pressable>
                        <Text style={styles.counterValue}>{days}</Text>
                        <Pressable onPress={() => setDays((v) => Math.min(30, v + 1))} style={styles.counterBtn}><Text style={styles.counterBtnText}>+</Text></Pressable>
                      </View>
                    </View>
                    <View style={styles.counterBox}>
                      <Text style={styles.formLabel}>PASSENGERS</Text>
                      <View style={styles.counter}>
                        <Pressable onPress={() => setPassengers((v) => Math.max(1, v - 1))} style={styles.counterBtn}><Text style={styles.counterBtnText}>−</Text></Pressable>
                        <Text style={styles.counterValue}>{passengers}</Text>
                        <Pressable onPress={() => setPassengers((v) => Math.min(Number(selected?.seats || 7), v + 1))} style={styles.counterBtn}><Text style={styles.counterBtnText}>+</Text></Pressable>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.formLabel}>TRIP NOTES</Text>
                  <TextInput value={tripNote} onChangeText={setTripNote} placeholder="Airport timing, sightseeing, special request..." placeholderTextColor="#7d828c" style={[styles.formInput, styles.noteInput]} multiline />

                  <View style={styles.totalBox}>
                    <View>
                      <Text style={styles.totalSmall}>{days} day{days > 1 ? "s" : ""} × {money(Number(selected?.price || 0))}</Text>
                      <Text style={styles.totalLabel}>Estimated vehicle total</Text>
                    </View>
                    <Text style={styles.totalValue}>{money(totalPreview)}</Text>
                  </View>

                  <Pressable onPress={submitBooking} style={styles.confirmBtn}>
                    <Text style={styles.confirmText}>Continue to Booking Cart</Text>
                    <MaterialCommunityIcons name="arrow-right" size={20} color={WHITE} />
                  </Pressable>
                  <Text style={styles.testNote}>Mock fleet is active until vendors publish live Car Rental services.</Text>
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Spec({ icon, text }: { icon: any; text: string }) {
  return <View style={styles.spec}><MaterialCommunityIcons name={icon} size={15} color={MUTED} /><Text style={styles.specText}>{text}</Text></View>;
}

function SpecBox({ icon, label, value }: { icon: any; label: string; value: string }) {
  return <View style={styles.specBox}><MaterialCommunityIcons name={icon} size={21} color={RED} /><Text style={styles.specBoxLabel}>{label}</Text><Text style={styles.specBoxValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BLACK },
  page: { paddingBottom: 70 },
  hero: { minHeight: 470, paddingHorizontal: 18, paddingTop: 22, overflow: "hidden", borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  glow: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(239,35,60,.13)", right: -80, top: 35 },
  heroShine: { position: "absolute", top: -70, left: -180, width: 110, height: 620, backgroundColor: "rgba(255,255,255,.045)", zIndex: 2 },
  neonRing: { position: "absolute", width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: "rgba(239,35,60,.28)", right: -44, top: 40 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", zIndex: 4 },
  badge: { flexDirection: "row", gap: 7, alignItems: "center", paddingHorizontal: 11, paddingVertical: 8, backgroundColor: "rgba(255,255,255,.06)", borderWidth: 1, borderColor: "rgba(255,255,255,.09)", borderRadius: 999 },
  badgeText: { color: "#e8e9ec", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  livePill: { flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(239,35,60,.12)", borderWidth: 1, borderColor: "rgba(239,35,60,.3)" },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: RED },
  liveText: { color: "#ffd7dc", fontSize: 10, fontWeight: "900" },
  heroStats: { position: "absolute", left: 18, right: 18, bottom: 112, flexDirection: "row", flexWrap: "wrap", gap: 8, zIndex: 4 },
  heroStat: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,.065)", borderWidth: 1, borderColor: "rgba(255,255,255,.11)" },
  heroStatText: { color: "#dce0e6", fontSize: 10, fontWeight: "800" },
  heroCopy: { zIndex: 5, maxWidth: 920, width: "100%", alignSelf: "center", paddingTop: 56 },
  kicker: { color: RED, fontSize: 12, fontWeight: "900", letterSpacing: 2.2, marginBottom: 10 },
  heroTitle: { color: WHITE, fontSize: 39, lineHeight: 46, fontWeight: "900" },
  heroAccent: { color: RED },
  heroSub: { color: "#c4c7cd", fontSize: 15, lineHeight: 23, maxWidth: 730, marginTop: 15 },
  searchBox: { marginTop: 24, backgroundColor: WHITE, borderWidth: 1, borderColor: "rgba(255,255,255,.25)", borderRadius: 17, padding: 7, flexDirection: "row", alignItems: "center", maxWidth: 840, shadowColor: RED, shadowOpacity: .18, shadowRadius: 28 },
  searchInput: { flex: 1, paddingHorizontal: 10, paddingVertical: 13, fontSize: 15, color: BLACK },
  searchBtn: { width: 48, height: 48, borderRadius: 13, backgroundColor: RED, alignItems: "center", justifyContent: "center" },
  road: { position: "absolute", left: 0, right: 0, bottom: 0, height: 100, backgroundColor: "#08090b", borderTopWidth: 1, borderTopColor: "#22262e", overflow: "hidden" },
  roadMarks: { flexDirection: "row", alignItems: "center", gap: 40, position: "absolute", top: 46, left: -80, right: -80 },
  roadMark: { width: 46, height: 4, backgroundColor: "rgba(255,255,255,.62)", borderRadius: 2 },
  heroCar: { position: "absolute", top: 19, left: 0, alignItems: "center", justifyContent: "center" },
  carGlow: { position: "absolute", width: 90, height: 24, borderRadius: 50, backgroundColor: "rgba(239,35,60,.35)", bottom: 3, zIndex: -1 },
  introCard: { maxWidth: 980, width: "calc(100% - 36px)" as any, alignSelf: "center", marginTop: -22, flexDirection: "row", gap: 14, alignItems: "center", padding: 16, borderRadius: 20, backgroundColor: WHITE, borderWidth: 1, borderColor: "#e6e7eb", shadowColor: "#000", shadowOpacity: .14, shadowRadius: 18 },
  introIcon: { width: 49, height: 49, borderRadius: 15, backgroundColor: "#fff1f2", alignItems: "center", justifyContent: "center" },
  introTitle: { color: BLACK, fontSize: 16, fontWeight: "900" },
  introText: { color: "#636873", fontSize: 12, lineHeight: 18, marginTop: 3 },
  sectionTitle: { maxWidth: 980, width: "calc(100% - 36px)" as any, alignSelf: "center", color: WHITE, fontSize: 22, fontWeight: "900", marginTop: 27, marginBottom: 9 },
  sectionSub: { color: MUTED, fontSize: 12, lineHeight: 18 },
  filterRow: { paddingHorizontal: 18, gap: 9, paddingBottom: 4 },
  filterChip: { flexDirection: "row", gap: 7, alignItems: "center", paddingVertical: 11, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: LINE, backgroundColor: BLACK_2 },
  filterChipActive: { backgroundColor: RED, borderColor: RED },
  filterText: { color: MUTED, fontWeight: "800", fontSize: 12 },
  filterTextActive: { color: WHITE },
  locationRow: { paddingHorizontal: 18, paddingTop: 10, gap: 7 },
  locationChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#30343d", backgroundColor: "#0f1115" },
  locationActive: { borderColor: RED, backgroundColor: "#2a0b10" },
  locationText: { color: "#9ba0a9", fontSize: 11, fontWeight: "800" },
  locationTextActive: { color: "#ffdce0" },
  sectionHeader: { maxWidth: 980, width: "calc(100% - 36px)" as any, alignSelf: "center", marginTop: 30, marginBottom: 12, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  countPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#1a1d23", borderWidth: 1, borderColor: LINE },
  countText: { color: "#e6e8ec", fontSize: 11, fontWeight: "900" },
  loader: { alignItems: "center", paddingVertical: 80 },
  loaderText: { color: MUTED, marginTop: 10 },
  empty: { alignItems: "center", paddingVertical: 75, paddingHorizontal: 25 },
  emptyTitle: { color: WHITE, fontSize: 20, fontWeight: "900", marginTop: 12 },
  emptyText: { color: MUTED, marginTop: 5, textAlign: "center" },
  primaryBtn: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: RED },
  primaryBtnText: { color: WHITE, fontWeight: "900" },
  grid: { width: "100%", maxWidth: 1010, alignSelf: "center", paddingHorizontal: 12, flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  card: { width: Platform.OS === "web" && width > 1000 ? 314 : "100%", margin: 6, borderRadius: 21, overflow: "hidden", backgroundColor: BLACK_2, borderWidth: 1, borderColor: LINE },
  imageWrap: { height: 204, backgroundColor: "#171920", overflow: "hidden" },
  cardImage: { width: "100%", height: "100%" },
  imageShade: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end" },
  tag: { position: "absolute", top: 10, left: 10, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: "rgba(0,0,0,.66)", borderWidth: 1, borderColor: "rgba(255,255,255,.12)" },
  tagText: { color: WHITE, fontSize: 10, fontWeight: "900" },
  pricePill: { position: "absolute", right: 10, bottom: 10, flexDirection: "row", gap: 3, alignItems: "baseline", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: RED },
  price: { color: WHITE, fontSize: 15, fontWeight: "900" },
  priceMeta: { color: "#ffe4e7", fontSize: 10, fontWeight: "800" },
  cardBody: { padding: 15 },
  cardGlow: { position: "absolute", left: 0, right: 0, bottom: 0, height: 2, backgroundColor: RED, opacity: .9 },
  titleLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { flex: 1, color: WHITE, fontSize: 17, fontWeight: "900" },
  rating: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { color: "#d7d9de", fontSize: 11, fontWeight: "900" },
  cardLocation: { color: MUTED, fontSize: 11, marginTop: 7 },
  specRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  spec: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: "#171a20" },
  specText: { color: "#b8bcc4", fontSize: 10, fontWeight: "800" },
  bookBtn: { marginTop: 13, padding: 12, borderRadius: 12, backgroundColor: RED, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  bookBtnText: { color: WHITE, fontSize: 13, fontWeight: "900" },
  workflow: { maxWidth: 980, width: "calc(100% - 36px)" as any, alignSelf: "center", marginTop: 44, padding: 20, borderRadius: 24, backgroundColor: "#0e1014", borderWidth: 1, borderColor: LINE },
  workflowRow: { flexDirection: "row", flexWrap: "wrap", gap: 11, marginTop: 14 },
  workflowItem: { flex: 1, minWidth: 210, padding: 15, borderRadius: 16, backgroundColor: "#13161b", borderWidth: 1, borderColor: "#262a33" },
  workflowNum: { width: 31, height: 31, borderRadius: 16, backgroundColor: "#2a0b10", borderWidth: 1, borderColor: "rgba(239,35,60,.35)", alignItems: "center", justifyContent: "center" },
  workflowNumText: { color: RED, fontWeight: "900" },
  workflowTitle: { color: WHITE, fontSize: 14, fontWeight: "900", marginTop: 11 },
  workflowDesc: { color: MUTED, fontSize: 11, lineHeight: 17, marginTop: 4 },
  trustRow: { maxWidth: 980, width: "calc(100% - 36px)" as any, alignSelf: "center", flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  trustCard: { flex: 1, minWidth: 190, padding: 15, borderRadius: 18, backgroundColor: WHITE },
  trustTitle: { color: BLACK, fontWeight: "900", marginTop: 8 },
  trustText: { color: "#666b74", fontSize: 11, lineHeight: 17, marginTop: 3 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.82)", justifyContent: "center", padding: 14 },
  modalCard: { width: "100%", maxWidth: 780, maxHeight: "92%", alignSelf: "center", backgroundColor: "#0d0f13", borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "#2d323c" },
  modalHero: { height: 250, backgroundColor: "#171920" },
  modalImage: { width: "100%", height: "100%" },
  closeBtn: { position: "absolute", top: 12, right: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,.62)", alignItems: "center", justifyContent: "center" },
  modalPhotoCount: { position: "absolute", left: 12, bottom: 12, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: "rgba(0,0,0,.62)" },
  modalPhotoText: { color: WHITE, fontSize: 11, fontWeight: "900" },
  modalScroll: { padding: 16 },
  thumbRow: { gap: 8, paddingBottom: 10 },
  thumb: { width: 67, height: 47, borderRadius: 9, opacity: .58 },
  thumbActive: { opacity: 1, borderWidth: 2, borderColor: RED },
  modalKicker: { color: RED, fontSize: 10, fontWeight: "900", letterSpacing: 1.6, marginTop: 3 },
  modalTitle: { color: WHITE, fontSize: 23, fontWeight: "900", marginTop: 5 },
  modalDesc: { color: "#b9bdc5", lineHeight: 19, marginTop: 7 },
  modalSpecGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  specBox: { width: "48%", backgroundColor: "#14171c", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#262a33" },
  specBoxLabel: { color: "#7f858f", fontSize: 10, marginTop: 6 },
  specBoxValue: { color: WHITE, fontWeight: "900", marginTop: 2 },
  includeBox: { marginTop: 13, padding: 14, borderRadius: 15, backgroundColor: "#14171c", borderWidth: 1, borderColor: "#262a33" },
  includeTitle: { color: WHITE, fontWeight: "900" },
  includeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 9 },
  includePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 7, backgroundColor: "#0d1014", borderRadius: 999 },
  includeText: { color: "#c5c8ce", fontSize: 10, fontWeight: "800" },
  modalBottom: { marginTop: 16, paddingTop: 13, borderTopWidth: 1, borderTopColor: "#242833", flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  fromText: { color: "#7f858f", fontSize: 10 },
  modalPrice: { color: WHITE, fontSize: 22, fontWeight: "900", marginTop: 2 },
  per: { color: MUTED, fontSize: 11, fontWeight: "700" },
  modalBook: { backgroundColor: RED, borderRadius: 13, paddingHorizontal: 16, paddingVertical: 13, flexDirection: "row", gap: 7, alignItems: "center" },
  modalBookText: { color: WHITE, fontWeight: "900" },
  bookingWrap: { minHeight: 520 },
  bookingHeader: { padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#242833" },
  darkClose: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#1a1d23", alignItems: "center", justifyContent: "center" },
  formScroll: { padding: 16, paddingBottom: 24 },
  summaryBanner: { flexDirection: "row", gap: 11, padding: 11, borderRadius: 15, backgroundColor: "#14171c", borderWidth: 1, borderColor: "#262a33", marginBottom: 15 },
  summaryImage: { width: 84, height: 64, borderRadius: 10 },
  summaryTitle: { color: WHITE, fontWeight: "900", fontSize: 15 },
  summaryMeta: { color: MUTED, fontSize: 11, marginTop: 4 },
  summaryPrice: { color: "#ffdfe3", fontWeight: "900", fontSize: 13, marginTop: 6 },
  formLabel: { color: "#9ea3ad", fontSize: 10, fontWeight: "900", letterSpacing: 1.1, marginBottom: 7, marginTop: 8 },
  formInput: { backgroundColor: "#14171c", borderWidth: 1, borderColor: "#2a2f39", borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, color: WHITE, fontSize: 14 },
  noteInput: { minHeight: 80, textAlignVertical: "top" as any },
  counterRow: { flexDirection: "row", gap: 9, marginTop: 7 },
  counterBox: { flex: 1 },
  counter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#14171c", borderRadius: 12, borderWidth: 1, borderColor: "#2a2f39", padding: 6 },
  counterBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#242933", alignItems: "center", justifyContent: "center" },
  counterBtnText: { color: WHITE, fontSize: 20, lineHeight: 22 },
  counterValue: { color: WHITE, fontSize: 16, fontWeight: "900" },
  totalBox: { marginTop: 17, padding: 14, borderRadius: 14, backgroundColor: "#260a0e", borderWidth: 1, borderColor: "rgba(239,35,60,.32)", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalSmall: { color: "#ffb9c1", fontSize: 11, fontWeight: "800" },
  totalLabel: { color: WHITE, fontWeight: "900", marginTop: 4 },
  totalValue: { color: WHITE, fontSize: 20, fontWeight: "900" },
  confirmBtn: { marginTop: 11, borderRadius: 14, backgroundColor: RED, padding: 15, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  confirmText: { color: WHITE, fontSize: 15, fontWeight: "900" },
  testNote: { color: "#6f7580", fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: 10 },
});
