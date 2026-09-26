import React from"react";
import{View,Text,StyleSheet,Pressable,ScrollView}from"react-native";
import{useLocalSearchParams,useRouter}from"expo-router";
import{SafeAreaView}from"react-native-safe-area-context";
import{MaterialCommunityIcons}from"@expo/vector-icons";

export default function Confirmed(){
 const r=useRouter(),p=useLocalSearchParams<any>();
 return <SafeAreaView style={s.root}><ScrollView contentContainerStyle={s.b}><View style={s.icon}><MaterialCommunityIcons name="check" size={52} color="#fff"/></View><Text style={s.title}>Booking Confirmed!</Text><Text style={s.sub}>Your holiday booking has been received successfully.</Text>
 <View style={s.card}><Text style={s.label}>CONFIRMATION ID</Text><Text style={s.id}>{p.confirmation||p.id}</Text><View style={s.line}/><Row k="Payment today" v={"₹"+Number(p.amount||0).toLocaleString("en-IN")}/><Row k="Payment plan" v={p.plan==="full"?"Full payment":"Booking amount (20%)"}/><Row k="Trip total" v={"₹"+Number(p.total||0).toLocaleString("en-IN")}/></View>
 <View style={s.info}><MaterialCommunityIcons name="information-outline" size={20} color="#0284C7"/><Text style={s.infoT}>Our holiday service partner will contact you using the mobile number provided during checkout.</Text></View>
 <Pressable onPress={()=>r.replace("/service-bookings" as any)} style={s.btn}><Text style={s.bt}>View My Bookings</Text></Pressable><Pressable onPress={()=>r.replace("/holiday" as any)} style={s.link}><Text style={s.linkT}>Explore more holidays</Text></Pressable>
 </ScrollView></SafeAreaView>
}
function Row({k,v}:{k:string,v:string}){return <View style={s.row}><Text style={s.muted}>{k}</Text><Text style={s.val}>{v}</Text></View>}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#f1f7fb"},b:{padding:24,maxWidth:680,width:"100%",alignSelf:"center",alignItems:"stretch"},icon:{width:86,height:86,borderRadius:43,backgroundColor:"#16a34a",alignSelf:"center",alignItems:"center",justifyContent:"center",marginTop:30},title:{fontSize:30,fontWeight:"900",textAlign:"center",marginTop:18},sub:{textAlign:"center",color:"#64748b",lineHeight:20,marginTop:7,marginBottom:22},card:{backgroundColor:"#fff",borderRadius:22,padding:20,borderWidth:1,borderColor:"#e2e8f0"},label:{fontSize:11,fontWeight:"900",letterSpacing:1.2,color:"#0284C7"},id:{fontSize:18,fontWeight:"900",marginTop:7},line:{height:1,backgroundColor:"#e2e8f0",marginVertical:15},row:{flexDirection:"row",justifyContent:"space-between",paddingVertical:7},muted:{color:"#64748b"},val:{fontWeight:"800"},info:{flexDirection:"row",gap:9,backgroundColor:"#eaf8ff",padding:14,borderRadius:15,marginTop:14},infoT:{flex:1,color:"#334155",fontSize:12,lineHeight:18},btn:{backgroundColor:"#0284C7",padding:16,borderRadius:15,alignItems:"center",marginTop:18},bt:{color:"#fff",fontWeight:"900",fontSize:16},link:{alignItems:"center",padding:15},linkT:{color:"#0284C7",fontWeight:"800"}})