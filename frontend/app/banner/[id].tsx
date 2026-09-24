import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Animated as RNAnimated, Dimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/src/api";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

const { width } = Dimensions.get("window");

export default function DynamicBannerPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const planeX = useRef(new RNAnimated.Value(-120)).current;
  const cloudX = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!id) return;
    api.bannerPage(String(id)).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(planeX, { toValue: width + 120, duration: 9000, useNativeDriver: true }),
        RNAnimated.timing(planeX, { toValue: -120, duration: 0, useNativeDriver: true }),
      ])
    ).start();
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(cloudX, { toValue: -70, duration: 7000, useNativeDriver: true }),
        RNAnimated.timing(cloudX, { toValue: 0, duration: 7000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  if (loading) return <SafeAreaView style={s.center}><ActivityIndicator size="large" color={COLORS.brand} /></SafeAreaView>;
  if (!data) return <SafeAreaView style={s.center}><Text style={s.error}>Page not found</Text><Pressable onPress={() => router.back()}><Text style={s.backText}>Go Back</Text></Pressable></SafeAreaView>;

  const page = data.page || {};
  const banner = data.banner || {};
  const packages = data.packages || [];

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Image source={{ uri: page.hero_image || banner.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={["rgba(2,132,199,0.12)", "rgba(2,35,55,0.82)"]} style={StyleSheet.absoluteFill} />
          {page.animation_clouds !== false && (
            <>
              <RNAnimated.View style={[s.cloud, { top: 45, transform: [{ translateX: cloudX }] }]}><Text style={s.cloudText}>☁️ ☁️</Text></RNAnimated.View>
              <RNAnimated.View style={[s.cloud, { top: 90, left: width * 0.48, transform: [{ translateX: cloudX }] }]}><Text style={s.cloudText}>☁️</Text></RNAnimated.View>
            </>
          )}
          {page.animation_plane !== false && (
            <RNAnimated.View style={[s.plane, { transform: [{ translateX: planeX }] }]}>
              <MaterialCommunityIcons name="airplane" size={38} color="#fff" />
              <View style={s.trail} />
            </RNAnimated.View>
          )}
          <Pressable onPress={() => router.back()} style={s.back}><MaterialCommunityIcons name="arrow-left" size={22} color="#fff" /></Pressable>
          <View style={s.heroText}>
            <Text style={s.brand}>{page.brand_name || banner.title}</Text>
            <Text style={s.heroTitle}>{page.hero_title || banner.title}</Text>
            <Text style={s.heroSub}>{page.hero_subtitle || banner.subtitle}</Text>
          </View>
        </View>

        <View style={s.content}>
          {!!page.description && <Text style={s.description}>{page.description}</Text>}
          <View style={s.sectionHead}><Text style={s.sectionTitle}>Explore Holiday Packages</Text><Text style={s.sectionSub}>{packages.length} packages</Text></View>

          {packages.map((p: any) => (
            <PackageCard key={p.id} pkg={p} onBook={() => router.push({ pathname: "/travel/package/[id]", params: { id: p.id, bannerId: String(id) } } as any)} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PackageCard({ pkg, onBook }: any) {
  const image = pkg.images?.[0] || pkg.flight_image;
  return (
    <View style={s.card}>
      <Image source={{ uri: image }} style={s.cardImage} contentFit="cover" />
      <View style={s.cardBody}>
        <Text style={s.destination}>{pkg.destination}</Text>
        <Text style={s.packageTitle}>{pkg.title}</Text>
        <Text style={s.duration}>{pkg.duration}</Text>
        <View style={s.features}>
          <Text style={s.feature}>✈ {pkg.flight || "Flight / transfer"}</Text>
          <Text style={s.feature}>🏨 {pkg.hotel || "Hotel included"}</Text>
        </View>
        <View style={s.cardBottom}>
          <View><Text style={s.from}>Starting from</Text><Text style={s.price}>₹{Number(pkg.price || 0).toLocaleString("en-IN")}</Text><Text style={s.per}>per adult</Text></View>
          <Pressable onPress={onBook} style={s.book}><Text style={s.bookText}>View Package</Text><MaterialCommunityIcons name="arrow-right" size={18} color="#fff" /></Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:"#F7FAFC"},
  center:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:"#fff"},
  error:{fontSize:18,fontWeight:"800",color:COLORS.text},
  backText:{marginTop:12,color:COLORS.brand,fontWeight:"800"},
  hero:{height:330,overflow:"hidden",justifyContent:"flex-end"},
  back:{position:"absolute",top:16,left:16,width:42,height:42,borderRadius:21,backgroundColor:"rgba(0,0,0,.35)",alignItems:"center",justifyContent:"center"},
  heroText:{padding:20,paddingTop:80},
  brand:{color:"#BAE6FD",fontSize:13,fontWeight:"800",letterSpacing:1},
  heroTitle:{color:"#fff",fontSize:32,fontWeight:"900",marginTop:4},
  heroSub:{color:"#E0F2FE",fontSize:15,fontWeight:"600",marginTop:7},
  cloud:{position:"absolute",left:25,opacity:.8},
  cloudText:{fontSize:30},
  plane:{position:"absolute",top:135,left:0,alignItems:"center"},
  trail:{width:75,height:2,backgroundColor:"rgba(255,255,255,.55)",marginTop:-16,marginLeft:-65},
  content:{padding:SPACING.lg},
  description:{fontSize:15,lineHeight:23,color:COLORS.textSecondary,marginBottom:18},
  sectionHead:{flexDirection:"row",alignItems:"flex-end",justifyContent:"space-between",marginBottom:12},
  sectionTitle:{fontSize:21,fontWeight:"900",color:COLORS.text},
  sectionSub:{fontSize:12,color:COLORS.textMuted,fontWeight:"700"},
  card:{backgroundColor:"#fff",borderRadius:20,overflow:"hidden",marginBottom:16,borderWidth:1,borderColor:"#E2E8F0"},
  cardImage:{width:"100%",height:185,backgroundColor:"#E2E8F0"},
  cardBody:{padding:15},
  destination:{fontSize:12,color:COLORS.brand,fontWeight:"800"},
  packageTitle:{fontSize:19,fontWeight:"900",color:COLORS.text,marginTop:3},
  duration:{fontSize:12,color:COLORS.textMuted,fontWeight:"700",marginTop:3},
  features:{marginTop:10,gap:5},
  feature:{fontSize:12,color:COLORS.textSecondary},
  cardBottom:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:14},
  from:{fontSize:10,color:COLORS.textMuted},
  price:{fontSize:20,fontWeight:"900",color:COLORS.text},
  per:{fontSize:10,color:COLORS.textMuted},
  book:{backgroundColor:COLORS.accent,paddingHorizontal:14,paddingVertical:11,borderRadius:RADIUS.pill,flexDirection:"row",alignItems:"center",gap:5},
  bookText:{color:"#fff",fontWeight:"900",fontSize:12},
});
