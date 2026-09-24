import React,{useEffect,useState}from"react";
import{View,Text,StyleSheet,ActivityIndicator,Pressable}from"react-native";
import{useLocalSearchParams,useRouter}from"expo-router";
import{SafeAreaView}from"react-native-safe-area-context";
import{MaterialCommunityIcons}from"@expo/vector-icons";
import{api}from"@/src/api";
import{COLORS,SPACING}from"@/src/theme";

export default function TravelBooking(){
 const{id}=useLocalSearchParams<{id:string}>();const router=useRouter();const[b,setB]=useState<any>();const[loading,setLoading]=useState(true);
 useEffect(()=>{if(id)api.travelBooking(String(id)).then(setB).finally(()=>setLoading(false))},[id]);
 if(loading)return <SafeAreaView style={s.center}><ActivityIndicator size="large" color={COLORS.brand}/></SafeAreaView>;
 return <SafeAreaView style={s.root}><View style={s.card}><View style={s.icon}><MaterialCommunityIcons name="airplane-check" size={42} color="#fff"/></View><Text style={s.title}>Booking Confirmed</Text><Text style={s.sub}>Your holiday booking has been received by KMT Bazaar.</Text><View style={s.box}><Text style={s.label}>Booking ID</Text><Text style={s.value}>{b?.id}</Text><Text style={s.label}>Status</Text><Text style={s.value}>{b?.status||"confirmed"}</Text><Text style={s.label}>Total</Text><Text style={s.price}>₹{Number(b?.total||0).toLocaleString("en-IN")}</Text></View><Pressable onPress={()=>router.replace("/(tabs)/home" as any)} style={s.cta}><Text style={s.ctaText}>Back to KMT Bazaar</Text></Pressable></View></SafeAreaView>
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#F8FAFC",alignItems:"center",justifyContent:"center",padding:SPACING.lg},center:{flex:1,alignItems:"center",justifyContent:"center"},card:{width:"100%",maxWidth:520,backgroundColor:"#fff",padding:24,borderRadius:22,alignItems:"center",borderWidth:1,borderColor:COLORS.border},icon:{width:78,height:78,borderRadius:39,backgroundColor:COLORS.brand,alignItems:"center",justifyContent:"center"},title:{fontSize:27,fontWeight:"900",color:COLORS.text,marginTop:18},sub:{textAlign:"center",color:COLORS.textSecondary,lineHeight:21,marginTop:7},box:{width:"100%",backgroundColor:"#F0F9FF",borderRadius:15,padding:16,marginTop:22},label:{fontSize:11,color:COLORS.textMuted,fontWeight:"800",marginTop:5},value:{fontSize:14,color:COLORS.text,fontWeight:"800",marginTop:2},price:{fontSize:24,color:COLORS.text,fontWeight:"900",marginTop:2},cta:{marginTop:22,width:"100%",backgroundColor:COLORS.accent,borderRadius:30,paddingVertical:15,alignItems:"center"},ctaText:{color:"#fff",fontWeight:"900"}});
