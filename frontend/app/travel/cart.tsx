import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "@/src/api";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

export default function TravelCart() {
  const router=useRouter();
  const [cart,setCart]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);

  const load=useCallback(async()=>{try{setCart(await api.travelCart())}catch{setCart(null)}finally{setLoading(false)}},[]);
  useEffect(()=>{load()},[load]);

  const clear=async()=>{setBusy(true);try{await api.travelCartClear();await load()}finally{setBusy(false)}};

  if(loading)return <SafeAreaView style={s.center}><ActivityIndicator size="large" color={COLORS.brand}/></SafeAreaView>;

  if(!cart?.items?.length)return <SafeAreaView style={s.center}><MaterialCommunityIcons name="bag-suitcase-outline" size={76} color={COLORS.textMuted}/><Text style={s.empty}>Your travel cart is empty</Text><Pressable onPress={()=>router.back()} style={s.explore}><Text style={s.exploreText}>Explore Holidays</Text></Pressable></SafeAreaView>;

  return <SafeAreaView style={s.root}>
    <View style={s.header}><Pressable onPress={()=>router.back()}><MaterialCommunityIcons name="arrow-left" size={23} color={COLORS.text}/></Pressable><Text style={s.title}>Travel Cart</Text><Pressable disabled={busy} onPress={clear}><MaterialCommunityIcons name="delete-outline" size={23} color={COLORS.danger || "#DC2626"}/></Pressable></View>
    <ScrollView contentContainerStyle={{padding:SPACING.lg,paddingBottom:130}}>
      {cart.items.map((it:any)=><View key={it.item_id} style={s.card}><Image source={{uri:it.image}} style={s.img} contentFit="cover"/><View style={{flex:1}}><Text style={s.destination}>{it.destination}</Text><Text style={s.name}>{it.title}</Text><Text style={s.meta}>{it.duration}</Text><Text style={s.meta}>👤 {it.adults} adults · {it.children} children</Text><Text style={s.meta}>📅 {it.travel_date || "Date to be confirmed"}</Text><Text style={s.line}>₹{Number(it.line_total).toLocaleString("en-IN")}</Text></View></View>)}
      <View style={s.bill}><Text style={s.billTitle}>Trip Summary</Text><Row label="Package total" value={cart.subtotal}/><Row label="Service fee" value={cart.service_fee}/><View style={s.lineSep}/><Row label="Total" value={cart.total} bold/></View>
    </ScrollView>
    <View style={s.bottom}><Pressable onPress={()=>router.push("/travel/checkout" as any)} style={s.cta}><Text style={s.ctaText}>Continue to Booking</Text><MaterialCommunityIcons name="arrow-right" size={20} color="#fff"/></Pressable></View>
  </SafeAreaView>;
}
function Row({label,value,bold}:any){return <View style={s.row}><Text style={[s.rowLabel,bold&&s.bold]}>{label}</Text><Text style={[s.rowValue,bold&&s.bold]}>₹{Number(value||0).toLocaleString("en-IN")}</Text></View>}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#F8FAFC"},center:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:"#fff"},empty:{fontSize:19,fontWeight:"900",color:COLORS.text,marginTop:12},explore:{marginTop:18,paddingHorizontal:22,paddingVertical:12,borderRadius:RADIUS.pill,backgroundColor:COLORS.accent},exploreText:{color:"#fff",fontWeight:"900"},header:{height:58,backgroundColor:"#fff",flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:SPACING.lg,borderBottomWidth:1,borderColor:COLORS.border},title:{fontSize:19,fontWeight:"900",color:COLORS.text},card:{backgroundColor:"#fff",borderRadius:16,padding:12,flexDirection:"row",gap:12,marginBottom:12,borderWidth:1,borderColor:COLORS.border},img:{width:95,height:95,borderRadius:12},destination:{fontSize:11,color:COLORS.brand,fontWeight:"800"},name:{fontSize:16,fontWeight:"900",color:COLORS.text,marginTop:2},meta:{fontSize:11,color:COLORS.textMuted,marginTop:3},line:{fontSize:16,fontWeight:"900",color:COLORS.text,marginTop:7},bill:{backgroundColor:"#fff",borderRadius:16,padding:16,marginTop:8,borderWidth:1,borderColor:COLORS.border},billTitle:{fontSize:16,fontWeight:"900",color:COLORS.text,marginBottom:8},row:{flexDirection:"row",justifyContent:"space-between",marginVertical:5},rowLabel:{fontSize:13,color:COLORS.textSecondary},rowValue:{fontSize:13,color:COLORS.text,fontWeight:"700"},bold:{fontSize:17,fontWeight:"900"},lineSep:{height:1,backgroundColor:COLORS.border,marginVertical:8},bottom:{position:"absolute",left:0,right:0,bottom:0,padding:12,backgroundColor:"#fff",borderTopWidth:1,borderColor:COLORS.border},cta:{backgroundColor:COLORS.accent,paddingVertical:15,borderRadius:RADIUS.pill,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:8},ctaText:{color:"#fff",fontWeight:"900",fontSize:15}});
