import { LocalizedText as Text } from "@/src/LocalizedText";
import React from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { Head } from "expo-router/head";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const OPTIONS = [
  {
    title: "Wedding Photography",
    subtitle: "Watch wedding reels, explore the Karizma album and book a shoot.",
    icon: "camera-iris",
    href: "/service/photography",
    accent: "#9B6A25",
  },
  {
    title: "Wedding & Event Decoration",
    subtitle: "Explore decoration services for weddings and special occasions.",
    icon: "party-popper",
    href: "/service/premium_decorator",
    accent: "#A33C75",
  },
  {
    title: "Holiday Packages",
    subtitle: "Explore trips, holiday packages and travel experiences.",
    icon: "airplane-takeoff",
    href: "/holiday",
    accent: "#16856D",
  },
  {
    title: "Car Rental",
    subtitle: "Find a vehicle for local travel, events and outstation trips.",
    icon: "car",
    href: "/car-rental",
    accent: "#C33E43",
  },
  {
    title: "Home & Daily Services",
    subtitle: "Browse local home repair and professional services.",
    icon: "tools",
    href: "/daily-services",
    accent: "#2878A8",
  },
];

export default function BookNowPage() {
  const router = useRouter();
  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <Head>
        <title>Book Now | KMT Bazaar Services</title>
        <meta name="description" content="Book wedding photography, event decoration, holiday packages, car rentals and home services with KMT Bazaar." />
        <link rel="canonical" href="https://kmtbazaar.com/book-now" />
        <meta property="og:title" content="Book Now | KMT Bazaar Services" />
        <meta property="og:description" content="Explore and book photography, events, travel and local services with KMT Bazaar." />
      </Head>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.back} accessibilityRole="button" accessibilityLabel="Go back">
            <MaterialCommunityIcons name="arrow-left" size={22} color="#FFF7E9" />
          </Pressable>
          <Text style={s.brand}>KMT BAZAAR · BOOKING DESK</Text>
          <Text style={s.title}>What would you like to book?</Text>
          <Text style={s.subtitle}>Choose a service and explore packages, details and booking options.</Text>
        </View>
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Explore Services</Text>
          <Text style={s.sectionSub}>Choose a category to continue</Text>
        </View>
        {OPTIONS.map((option) => (
          <Link key={option.href} href={option.href as any} asChild>
            <Pressable style={s.card} accessibilityRole="link">
              <View style={[s.iconWrap, { backgroundColor: option.accent }]}>
                <MaterialCommunityIcons name={option.icon as any} size={24} color="#FFFFFF" />
              </View>
              <View style={s.cardCopy}>
                <Text style={s.cardTitle}>{option.title}</Text>
                <Text style={s.cardSubtitle}>{option.subtitle}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#D8BE90" />
            </Pressable>
          </Link>
        ))}
        <Link href="/(tabs)/categories" asChild>
          <Pressable style={s.shopLink} accessibilityRole="link">
            <MaterialCommunityIcons name="shopping-bag" size={20} color="#24180E" />
            <Text style={s.shopLinkText}>Looking to shop products? Shop Now</Text>
          </Pressable>
        </Link>
        <Text style={s.footer}>KMT Bazaar · Shop Local · Book with Confidence</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#100E12" },
  page: { width: "100%", maxWidth: 900, alignSelf: "center", padding: 18, paddingBottom: 42 },
  header: { padding: 22, paddingTop: 16, borderRadius: 22, backgroundColor: "#1C2638", borderWidth: 1, borderColor: "#3C5275" },
  back: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,.1)", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  brand: { color: "#E9C98D", fontSize: 9, fontWeight: "900", letterSpacing: 2 },
  title: { color: "#FFFFFF", fontSize: 29, lineHeight: 36, fontWeight: "900", marginTop: 11 },
  subtitle: { color: "#D1DCEB", fontSize: 12, lineHeight: 19, marginTop: 8, maxWidth: 580 },
  sectionHead: { marginTop: 26, marginBottom: 13 },
  sectionTitle: { color: "#FFF5E4", fontSize: 19, fontWeight: "900" },
  sectionSub: { color: "#B7AFA5", fontSize: 11, marginTop: 4 },
  card: { flexDirection: "row", alignItems: "center", gap: 13, padding: 14, marginBottom: 10, borderRadius: 17, backgroundColor: "#211B20", borderWidth: 1, borderColor: "#493C40" },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { color: "#FFF2DF", fontSize: 14, fontWeight: "900" },
  cardSubtitle: { color: "#C5B8AC", fontSize: 11, lineHeight: 17, marginTop: 4 },
  shopLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 14, padding: 15, borderRadius: 15, backgroundColor: "#D8B976" },
  shopLinkText: { color: "#24180E", fontSize: 12, fontWeight: "900" },
  footer: { color: "#968A80", fontSize: 10, textAlign: "center", marginTop: 25 },
});
