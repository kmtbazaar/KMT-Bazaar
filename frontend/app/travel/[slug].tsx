import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert, Platform } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { apiFetch } from "@/src/api";

export default function TravelPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<any>(`/travel/pages/${slug}`).then(setPage).catch(() => {
      if (Platform.OS === "web") window.alert("Travel page load nahi ho paya.");
      else Alert.alert("Error", "Travel page load nahi ho paya.");
    }).finally(() => setLoading(false));
  }, [slug]);

  const addToCart = async (id: string) => {
    try {
      setBusy(id);
      await apiFetch("/travel/cart/add", { method:"POST", body:JSON.stringify({package_id:id,quantity:1}) });
      if (Platform.OS === "web") window.alert("Package travel cart mein add ho gaya.");
      else Alert.alert("Added", "Package travel cart mein add ho gaya.");
    } catch (e:any) {
      const msg=e?.message || "Login karke package add karein.";
      if (Platform.OS === "web") window.alert(msg); else Alert.alert("Travel Cart",msg);
    } finally { setBusy(null); }
  };

  if (loading) return <SafeAreaView style={s.center}><ActivityIndicator size="large"/></SafeAreaView>;
  if (!page) return <SafeAreaView style={s.center}><Text>Travel page nahi mila.</Text></SafeAreaView>;

  return <SafeAreaView style={s.root}>
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.hero}>
        <Image source={{uri:page.cover_image}} style={s.heroImg} contentFit="cover"/>
        <View style={s.overlay}/>
        <Pressable onPress={()=>router.back()} style={s.back}><MaterialCommunityIcons name="arrow-left" size={24} color="#fff"/></Pressable>
        <View style={s.heroText}><Text style={s.title}>{page.name}</Text><Text style={s.subtitle}>{page.subtitle}</Text></View>
      </View>
      {!!page.description && <Text style={s.description}>{page.description}</Text>}
      <View style={s.head}><Text style={s.sectionTitle}>Holiday Packages</Text><Text style={s.count}>{page.packages?.length||0} packages</Text></View>
      {(page.packages||[]).map((p:any)=><View key={p.id} style={s.card}>
        <Image source={{uri:p.cover_image}} style={s.packageImg} contentFit="cover"/>
        <View style={s.body}><Text style={s.packageTitle}>{p.title}</Text>
        {!!p.location&&<Text style={s.meta}>📍 {p.location}</Text>}
        {!!p.duration&&<Text style={s.meta}>🗓 {p.duration}</Text>}
        {!!p.hotel&&<Text style={s.meta}>🏨 {p.hotel}</Text>}
        <Text style={s.price}>₹{Number(p.price||0).toLocaleString("en-IN")}</Text>
        {!!p.mrp&&<Text style={s.mrp}>₹{Number(p.mrp).toLocaleString("en-IN")}</Text>}
        {!!p.description&&<Text style={s.desc}>{p.description}</Text>}
        {!!p.inclusions?.length&&<Text style={s.inclusions}>✓ {p.inclusions.join(" • ")}</Text>}
        <View style={s.mediaRow}>{!!p.flight_image&&<Image source={{uri:p.flight_image}} style={s.media} contentFit="cover"/>}{(p.gallery||[]).slice(0,2).map((u:string,i:number)=><Image key={i} source={{uri:u}} style={s.media} contentFit="cover"/>)}</View>
        <Pressable onPress={()=>addToCart(p.id)} disabled={busy===p.id} style={s.cartBtn}>{busy===p.id?<ActivityIndicator color="#fff"/>:<Text style={s.cartText}>Add to Travel Cart</Text>}</Pressable>
        </View>
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}
const s=StyleSheet.create({
root:{flex:1,backgroundColor:"#fff"},content:{paddingBottom:40},center:{flex:1,alignItems:"center",justifyContent:"center"},
hero:{height:260,position:"relative",overflow:"hidden"},heroImg:{...StyleSheet.absoluteFillObject},overlay:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(0,0,0,.38)"},
back:{position:"absolute",top:12,left:16,width:42,height:42,borderRadius:21,backgroundColor:"rgba(0,0,0,.4)",alignItems:"center",justifyContent:"center"},
heroText:{position:"absolute",left:20,right:20,bottom:24},title:{fontSize:30,fontWeight:"900",color:"#fff"},subtitle:{fontSize:15,color:"#fff"},
description:{fontSize:15,lineHeight:22,color:"#475569",padding:18},head:{flexDirection:"row",justifyContent:"space-between",paddingHorizontal:18,paddingBottom:12},sectionTitle:{fontSize:22,fontWeight:"900",color:"#0f172a"},count:{color:"#64748b"},
card:{marginHorizontal:14,marginBottom:18,borderRadius:18,overflow:"hidden",borderWidth:1,borderColor:"#e2e8f0"},packageImg:{width:"100%",height:190},body:{padding:16},packageTitle:{fontSize:20,fontWeight:"900"},meta:{fontSize:13,color:"#475569",marginTop:6},price:{fontSize:24,fontWeight:"900",color:"#ea580c",marginTop:12},mrp:{fontSize:13,color:"#94a3b8",textDecorationLine:"line-through"},desc:{fontSize:14,lineHeight:20,color:"#475569",marginTop:8},inclusions:{fontSize:13,lineHeight:20,color:"#334155",marginTop:8},mediaRow:{flexDirection:"row",gap:8,marginTop:12},media:{width:92,height:62,borderRadius:8},cartBtn:{marginTop:14,height:48,borderRadius:12,backgroundColor:"#0284C7",alignItems:"center",justifyContent:"center"},cartText:{color:"#fff",fontSize:15,fontWeight:"800"}
});