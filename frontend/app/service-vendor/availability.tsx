import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Platform } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { vendorApi } from "@/src/roleApi";

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const title = (value: string) => value.charAt(0).toUpperCase()+value.slice(1);

export default function ServiceAvailabilityScreen() {
 const router=useRouter();
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [days,setDays]=useState<any>(()=>Object.fromEntries(DAYS.map(d=>[d,{enabled:true,start:"09:00",end:"20:00"}])));
 const [blocked,setBlocked]=useState(""),[notice,setNotice]=useState("24"),[capacity,setCapacity]=useState("1");
 const [error,setError]=useState("");
 const load=useCallback(async()=>{setLoading(true);try{const v=await vendorApi.vendorServiceAvailability();setDays(Object.fromEntries(DAYS.map(d=>[d,{enabled:v?.weekly_schedule?.[d]?.enabled!==false,start:v?.weekly_schedule?.[d]?.start||"09:00",end:v?.weekly_schedule?.[d]?.end||"20:00"}])));setBlocked((v?.blocked_dates||[]).join(", "));setNotice(String(v?.min_notice_hours??24));setCapacity(String(v?.max_bookings_per_day??1));}catch(e:any){setError(e?.message||"Could not load availability.")}finally{setLoading(false)}},[]);
 useFocusEffect(useCallback(()=>{load()},[load]));
 const save=async()=>{setSaving(true);setError("");try{await vendorApi.saveVendorServiceAvailability({weekly_schedule:days,blocked_dates:blocked.split(",").map(x=>x.trim()).filter(Boolean),min_notice_hours:Number(notice)||0,max_bookings_per_day:Math.max(1,Number(capacity)||1)});Platform.OS==="web"?window.alert("Availability saved."):Alert.alert("Saved","Your availability has been updated.");}catch(e:any){setError(e?.message||"Could not save availability.")}finally{setSaving(false)}};
 if(loading)return <View style={s.center}><ActivityIndicator size="large" color="#0284C7"/></View>;
 return <SafeAreaView style={s.root} edges={["top"]}>
  <View style={s.header}><Pressable onPress={()=>router.back()}><MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A"/></Pressable><View style={{flex:1,marginLeft:12}}><Text style={s.title}>Availability & Schedule</Text><Text style={s.sub}>Control when customers can request your services</Text></View></View>
  <ScrollView contentContainerStyle={s.body}>
   <View style={s.panel}><Text style={s.section}>Weekly working days</Text><Text style={s.helper}>Switch off the days when your studio or team is not available.</Text>
    {DAYS.map(d=><View key={d} style={s.dayRow}><View style={{flex:1}}><Text style={s.day}>{title(d)}</Text><Text style={s.time}>{days[d].enabled?days[d].start+" – "+days[d].end:"Closed"}</Text></View><Pressable onPress={()=>setDays((p:any)=>({...p,[d]:{...p[d],enabled:!p[d].enabled}}))} style={[s.toggle,{backgroundColor:days[d].enabled?"#DCFCE7":"#F1F5F9"}]}><MaterialCommunityIcons name={days[d].enabled?"check-circle":"minus-circle"} size={17} color={days[d].enabled?"#15803D":"#64748B"}/><Text style={[s.toggleText,{color:days[d].enabled?"#15803D":"#64748B"}]}>{days[d].enabled?"Open":"Closed"}</Text></Pressable></View>)}
    <View style={s.two}><Field label="Start time (HH:MM)" value={days.monday.start} onChange={(v:string)=>setDays((p:any)=>Object.fromEntries(DAYS.map(d=>[d,{...p[d],start:v}])))} placeholder="09:00"/><Field label="End time (HH:MM)" value={days.monday.end} onChange={(v:string)=>setDays((p:any)=>Object.fromEntries(DAYS.map(d=>[d,{...p[d],end:v}])))} placeholder="20:00"/></View>
    <Text style={s.helper}>The time range above will be applied to all open days.</Text>
   </View>
   <View style={s.panel}><Text style={s.section}>Booking limits</Text><View style={s.two}><Field label="Advance notice (hours)" value={notice} onChange={setNotice} keyboardType="numeric" placeholder="24"/><Field label="Bookings per day" value={capacity} onChange={setCapacity} keyboardType="numeric" placeholder="1"/></View><Field label="Blocked dates (YYYY-MM-DD, comma separated)" value={blocked} onChange={setBlocked} multiline placeholder="2027-01-01, 2027-01-26"/></View>
   {!!error&&<Text style={s.error}>{error}</Text>}
   <Pressable onPress={save} disabled={saving} style={s.save}>{saving?<ActivityIndicator color="#fff"/>:<><MaterialCommunityIcons name="content-save-check-outline" color="#fff" size={18}/><Text style={s.saveText}>Save availability</Text></>}</Pressable>
  </ScrollView>
 </SafeAreaView>;
}
function Field({label,value,onChange,keyboardType,placeholder,multiline}:any){return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChange} keyboardType={keyboardType} placeholder={placeholder} multiline={multiline} placeholderTextColor="#94A3B8" style={[s.input,multiline&&{minHeight:65,textAlignVertical:"top"}]}/></View>}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#F1F5F9"},center:{flex:1,alignItems:"center",justifyContent:"center"},header:{flexDirection:"row",alignItems:"center",padding:16,backgroundColor:"#fff"},title:{fontSize:18,fontWeight:"900",color:"#0F172A"},sub:{fontSize:10,color:"#64748B",marginTop:3},body:{padding:14,paddingBottom:40},panel:{backgroundColor:"#fff",borderRadius:18,padding:16,marginBottom:13,borderWidth:1,borderColor:"#E2E8F0"},section:{fontSize:15,fontWeight:"900",color:"#0F172A"},helper:{fontSize:10,color:"#64748B",lineHeight:15,marginTop:5,marginBottom:10},dayRow:{flexDirection:"row",alignItems:"center",paddingVertical:9,borderBottomWidth:1,borderColor:"#F1F5F9"},day:{fontSize:12,fontWeight:"800",color:"#0F172A"},time:{fontSize:10,color:"#64748B",marginTop:2},toggle:{paddingHorizontal:10,paddingVertical:7,borderRadius:20,flexDirection:"row",alignItems:"center",gap:5},toggleText:{fontSize:10,fontWeight:"900"},two:{flexDirection:"row",gap:9,marginTop:12},field:{flex:1,marginTop:11},label:{fontSize:10,fontWeight:"900",color:"#475569",marginBottom:5},input:{borderWidth:1,borderColor:"#E2E8F0",backgroundColor:"#F8FAFC",borderRadius:11,padding:11,fontSize:12,color:"#0F172A"},save:{backgroundColor:"#0F172A",minHeight:48,borderRadius:13,alignItems:"center",justifyContent:"center",flexDirection:"row",gap:8},saveText:{color:"#fff",fontSize:12,fontWeight:"900"},error:{color:"#B91C1C",fontSize:11,marginBottom:10}});
