import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput } from "react-native";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/src/api";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

export default function TravelPackagePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [pkg, setPkg] = useState<any>(null);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [flight, setFlight] = useState("");
  const [hotel, setHotel] = useState("");

  useEffect(() => {
    if (!id) return;
    // Package data is returned by the banner page endpoint, so this screen
    // uses the bannerId when available and avoids adding a separate public package API.
    const bannerId = String((useLocalSearchParams() as any).bannerId || "");
    if (!bannerId) return;
    api.bannerPage(bannerId).then(d => {
      const found = (d.packages || []).find((x:any) => x.id === String(id));
      setPkg(found || null);
    }).catch(() => setPkg(null));
  }, [id]);

  const total = useMemo(() => {
    if (!pkg) return 0;
    return Number(pkg.price || 0) * adults + Number(pkg.child_price ?? pkg.price ?? 0) * children;
  }, [pkg, adults, children]);

  const addToCart = async () => {
    if (!pkg) return;
    setBusy(true);
    try {
      await api.travelCartAdd({
        package_id: pkg.id,
        adults,
        children,
        travel_date: date,
        hotel_option: hotel,
        flight_option: flight,
      });
      router.push("/travel/cart" as any);
    } finally {
      setBusy(false);
    }
  };

  if (!pkg) return <SafeAreaView style={s.center}><ActivityIndicator size="large" color={COLORS.brand} /></SafeAreaView>;

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:120}}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.back}><MaterialCommunityIcons name="arrow-left" size={22} color="#fff" /></Pressable>
          <Image source={{uri: pkg.images?.[0]}} style={s.hero} contentFit="cover" />
        </View>
        <View style={s.body}>
          <Text style={s.destination}>{pkg.destination}</Text>
          <Text style={s.title}>{pkg.title}</Text>
          <Text style={s.duration}>{pkg.duration}</Text>
          <Text style={s.desc}>{pkg.description}</Text>

          <View style={s.infoRow}>
            <Info icon="airplane" title="Flight" value={pkg.flight} />
            <Info icon="bed" title="Hotel" value={pkg.hotel} />
          </View>

          <Text style={s.section}>Trip Gallery</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:10}}>
            {(pkg.images || []).map((u:string,i:number)=><Image key={i} source={{uri:u}} style={s.gallery} contentFit="cover" />)}
            {pkg.flight_image ? <Image source={{uri:pkg.flight_image}} style={s.gallery} contentFit="cover" /> : null}
          </ScrollView>

          <Text style={s.section}>Customize Your Trip</Text>
          <Text style={s.label}>Travel date</Text>
          <TextInput value={date} onChangeText={setDate} placeholder="e.g. 15 October 2026" placeholderTextColor={COLORS.textMuted} style={s.input} />
          <Text style={s.label}>Flight preference</Text>
          <TextInput value={flight} onChangeText={setFlight} placeholder={pkg.flight || "Flight option"} placeholderTextColor={COLORS.textMuted} style={s.input} />
          <Text style={s.label}>Hotel preference</Text>
          <TextInput value={hotel} onChangeText={setHotel} placeholder={pkg.hotel || "Hotel option"} placeholderTextColor={COLORS.textMuted} style={s.input} />

          <Counter title="Adults" value={adults} min={1} onChange={setAdults} />
          <Counter title="Children" value={children} min={0} onChange={setChildren} />

          <View style={s.priceBox}>
            <Text style={s.priceLabel}>Trip total</Text>
            <Text style={s.price}>₹{total.toLocaleString("en-IN")}</Text>
          </View>
        </View>
      </ScrollView>
      <View style={s.bottom}><Pressable disabled={busy} onPress={addToCart} style={s.cta}>{busy ? <ActivityIndicator color="#fff"/> : <><Text style={s.ctaText}>Add Trip to Cart</Text><MaterialCommunityIcons name="cart-plus" size={20} color="#fff"/></>}</Pressable></View>
    </SafeAreaView>
  );
}

function Info({icon,title,value}:any){return <View style={s.info}><MaterialCommunityIcons name={icon} size={22} color={COLORS.brand}/><Text style={s.infoTitle}>{title}</Text><Text style={s.infoValue} numberOfLines={3}>{value || "Included"}</Text></View>}
function Counter({title,value,min,onChange}:any){return <View style={s.counter}><Text style={s.counterTitle}>{title}</Text><View style={s.counterBtns}><Pressable onPress={()=>onChange(Math.max(min,value-1))} style={s.round}><Text style={s.roundText}>−</Text></Pressable><Text style={s.count}>{value}</Text><Pressable onPress={()=>onChange(value+1)} style={s.round}><Text style={s.roundText}>+</Text></Pressable></View></View>}

const s=StyleSheet.create({
 root:{flex:1,backgroundColor:"#F8FAFC"},center:{flex:1,alignItems:"center",justifyContent:"center"},header:{height:270,position:"relative"},hero:{width:"100%",height:"100%"},back:{position:"absolute",top:14,left:14,zIndex:3,width:42,height:42,borderRadius:21,backgroundColor:"rgba(0,0,0,.45)",alignItems:"center",justifyContent:"center"},body:{padding:SPACING.lg},destination:{color:COLORS.brand,fontSize:13,fontWeight:"800"},title:{fontSize:28,fontWeight:"900",color:COLORS.text,marginTop:3},duration:{color:COLORS.textMuted,fontWeight:"700",marginTop:4},desc:{color:COLORS.textSecondary,lineHeight:22,marginTop:12},infoRow:{flexDirection:"row",gap:10,marginTop:16},info:{flex:1,backgroundColor:"#fff",padding:12,borderRadius:14,borderWidth:1,borderColor:COLORS.border},infoTitle:{fontSize:11,color:COLORS.textMuted,fontWeight:"800",marginTop:5},infoValue:{fontSize:12,color:COLORS.text,fontWeight:"700",marginTop:2},section:{fontSize:19,fontWeight:"900",color:COLORS.text,marginTop:24,marginBottom:10},gallery:{width:210,height:130,borderRadius:14},label:{fontSize:12,fontWeight:"800",color:COLORS.textSecondary,marginTop:9,marginBottom:5},input:{backgroundColor:"#fff",borderWidth:1,borderColor:COLORS.border,borderRadius:12,padding:12,color:COLORS.text},counter:{marginTop:14,backgroundColor:"#fff",padding:13,borderRadius:14,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderWidth:1,borderColor:COLORS.border},counterTitle:{fontWeight:"800",color:COLORS.text},counterBtns:{flexDirection:"row",alignItems:"center",gap:14},round:{width:32,height:32,borderRadius:16,backgroundColor:COLORS.brand,alignItems:"center",justifyContent:"center"},roundText:{color:"#fff",fontSize:20,fontWeight:"800"},count:{fontWeight:"900",fontSize:16},priceBox:{marginTop:18,padding:16,backgroundColor:"#E0F2FE",borderRadius:15,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},priceLabel:{fontWeight:"800",color:COLORS.textSecondary},price:{fontSize:24,fontWeight:"900",color:COLORS.text},bottom:{position:"absolute",left:0,right:0,bottom:0,padding:12,backgroundColor:"#fff",borderTopWidth:1,borderColor:COLORS.border},cta:{backgroundColor:COLORS.accent,borderRadius:RADIUS.pill,paddingVertical:15,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:8},ctaText:{color:"#fff",fontWeight:"900",fontSize:15}
});
