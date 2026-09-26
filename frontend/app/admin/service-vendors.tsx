import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Modal, ScrollView, Alert, Platform } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { adminApi } from "@/src/roleApi";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

export default function AdminServiceVendors() {
  const router=useRouter();
  const [vendors,setVendors]=useState<any[]>([]);
  const [services,setServices]=useState<any[]>([]);
  const [bookings,setBookings]=useState<any[]>([]);
  const [selected,setSelected]=useState<any>(null);
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState<any>({name:"",email:"",phone:""});

  const load=useCallback(async()=>{
    try{
      const [u,s,b]=await Promise.all([adminApi.serviceVendors(),adminApi.vendorServices(),adminApi.serviceBookings()]);
      setVendors((u||[]).filter((x:any)=>x.vendor_type==="service" && ["holiday","car_rental"].includes(x.service_type)));
      setServices(s||[]); setBookings(b||[]);
    }catch(e){console.log("service vendor load",e)}
  },[]);
  useFocusEffect(useCallback(()=>{load()},[load]));

  const open=(v:any)=>{setSelected(v);setForm({name:v.name||"",email:v.email||"",phone:v.phone||""});setModal(true)};
  const save=async()=>{
    try{await adminApi.updateServiceVendor(selected.id,form);setModal(false);await load();window.alert?.("Vendor profile saved");}catch(e:any){Platform.OS==="web"?window.alert(e?.message||"Update failed"):Alert.alert("Update failed",e?.message||"Update failed")}
  };

  const vendorServices=selected?services.filter((x:any)=>x.vendor_id===selected.id || x.service_type===selected.service_type && x.vendor_id===selected.id):[];
  const vendorBookings=selected?bookings.filter((x:any)=>x.vendor_id===selected.id || x.vendor_id===selected.id):[];
  const revenue=vendorBookings.reduce((a:any,x:any)=>a+Number(x.paid_amount||x.total_amount||x.amount||0),0);
  const completed=vendorBookings.filter((x:any)=>["completed","delivered"].includes(x.status)).length;
  const pending=vendorBookings.filter((x:any)=>!["completed","cancelled","delivered"].includes(x.status)).length;
  const payout=Math.round(revenue*(1-(Number((selected as any)?.commission_percent)||10)/100));

  return <SafeAreaView style={s.root} edges={["top"]}>
    <View style={s.header}><Pressable onPress={()=>router.back()}><MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text}/></Pressable><Text style={s.title}>Service Vendors</Text><View style={{width:24}}/></View>
    <FlatList data={vendors} keyExtractor={(x)=>x.id} contentContainerStyle={{padding:SPACING.lg,paddingBottom:60}} ItemSeparatorComponent={()=> <View style={{height:10}}/>}
      renderItem={({item})=><Pressable style={s.card} onPress={()=>open(item)}>
        <View style={[s.avatar,{backgroundColor:item.service_type==="holiday"?"#DBEAFE":"#E0F2FE"}]}><MaterialCommunityIcons name={item.service_type==="holiday"?"airplane-takeoff":"car"} size={25} color={item.service_type==="holiday"?"#2563EB":"#0EA5E9"}/></View>
        <View style={{flex:1}}><Text style={s.name}>{item.name}</Text><Text style={s.meta}>{item.service_type==="holiday"?"Holiday Vendor":"Car Rental Vendor"}</Text><Text style={s.meta}>{item.phone||item.email||"Contact unavailable"}</Text></View>
        <MaterialCommunityIcons name="chevron-right" size={23} color={COLORS.textMuted}/>
      </Pressable>}
      ListEmptyComponent={<View style={s.empty}><MaterialCommunityIcons name="briefcase-off-outline" size={48} color={COLORS.textMuted}/><Text style={s.emptyText}>No Holiday or Car Rental service vendors</Text></View>}
    />
    {selected&&<Modal visible={modal} transparent animationType="slide" onRequestClose={()=>setModal(false)}>
      <View style={m.back}><View style={m.sheet}><ScrollView showsVerticalScrollIndicator={false}>
        <View style={m.head}><View><Text style={m.title}>{selected.service_type==="holiday"?"Holiday Vendor":"Car Rental Vendor"}</Text><Text style={m.sub}>Admin management profile</Text></View><Pressable onPress={()=>setModal(false)}><MaterialCommunityIcons name="close" size={24}/></Pressable></View>
        <Text style={m.section}>Vendor Profile</Text>
        <Field label="Name" value={form.name} onChangeText={(v:string)=>setForm({...form,name:v})}/>
        <Field label="Email" value={form.email} onChangeText={(v:string)=>setForm({...form,email:v})}/>
        <Field label="Mobile" value={form.phone} onChangeText={(v:string)=>setForm({...form,phone:v})} keyboardType="phone-pad"/>
        <Pressable style={m.save} onPress={save}><Text style={m.saveText}>Save Vendor Profile</Text></Pressable>

        <Text style={m.section}>Dashboard Summary</Text>
        <View style={s.kpiRow}><KPI label="Bookings" value={vendorBookings.length}/><KPI label="Completed" value={completed}/><KPI label="Pending" value={pending}/></View>
        <View style={s.kpiRow}><KPI label="Revenue" value={`₹${revenue}`}/><KPI label="Est. Payout" value={`₹${payout}`}/></View>

        <Text style={m.section}>{selected.service_type==="holiday"?"Holiday Packages":"Rental Fleet"} ({vendorServices.length})</Text>
        {vendorServices.map((x:any)=><View key={x.id} style={m.item}><View style={{flex:1}}><Text style={m.itemName}>{x.name}</Text><Text style={m.itemMeta}>{selected.service_type==="car_rental"?`${x.seats||0} seats · ${x.bags||0} bags · ${x.transmission||""} · ₹${x.price||0}/day`:`${x.location||""} · ${x.duration||""} · ₹${x.price||0}/person`}</Text></View><Pressable onPress={()=>{setModal(false);router.push({pathname:"/admin/vendor-services",params:{vendor_id:selected.id}} as any)}}><MaterialCommunityIcons name="pencil-outline" size={20} color={COLORS.brand}/></Pressable></View>)}

        <Text style={m.section}>Bookings & Orders ({vendorBookings.length})</Text>
        {vendorBookings.length===0?<Text style={m.empty}>No bookings yet.</Text>:vendorBookings.map((x:any)=><View key={x.id} style={m.booking}><Text style={m.itemName}>{x.service_name||"Service Booking"}</Text><Text style={m.itemMeta}>{x.customer_name||"Customer"} · {x.booking_date||""}</Text><Text style={m.status}>{String(x.status||"pending").toUpperCase()}</Text></View>)}
      </ScrollView></View></View>
    </Modal>}
  </SafeAreaView>;
}
function Field(p:any){return <View style={{marginBottom:9}}><Text style={m.label}>{p.label}</Text><TextInput value={p.value} onChangeText={p.onChangeText} keyboardType={p.keyboardType} style={m.input}/></View>}
function KPI({label,value}:any){return <View style={s.kpi}><Text style={s.kpiVal}>{value}</Text><Text style={s.kpiLab}>{label}</Text></View>}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#F8FAFC"},header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:16,backgroundColor:"#fff",borderBottomWidth:1,borderBottomColor:"#E2E8F0"},title:{fontSize:19,fontWeight:"900"},card:{flexDirection:"row",alignItems:"center",gap:12,backgroundColor:"#fff",padding:14,borderRadius:16,borderWidth:1,borderColor:"#E2E8F0"},avatar:{width:48,height:48,borderRadius:24,alignItems:"center",justifyContent:"center"},name:{fontWeight:"900",fontSize:15},meta:{fontSize:11,color:"#64748B",marginTop:3},empty:{padding:40,alignItems:"center",textAlign:"center",color:"#64748B"},emptyText:{marginTop:10,color:"#64748B"},kpiRow:{flexDirection:"row",gap:8,marginBottom:8},kpi:{flex:1,backgroundColor:"#F8FAFC",padding:12,borderRadius:12},kpiVal:{fontSize:17,fontWeight:"900"},kpiLab:{fontSize:10,color:"#64748B",marginTop:2}});
const m=StyleSheet.create({back:{flex:1,backgroundColor:"rgba(0,0,0,.55)",justifyContent:"flex-end"},sheet:{backgroundColor:"#fff",maxHeight:"94%",borderTopLeftRadius:24,borderTopRightRadius:24,padding:18},head:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:10},title:{fontSize:20,fontWeight:"900"},sub:{fontSize:11,color:"#64748B"},section:{fontSize:16,fontWeight:"900",marginTop:15,marginBottom:9},label:{fontSize:11,fontWeight:"800",color:"#475569",marginBottom:4},input:{backgroundColor:"#F8FAFC",borderWidth:1,borderColor:"#E2E8F0",borderRadius:10,padding:11,marginBottom:1},save:{backgroundColor:"#F97316",padding:13,borderRadius:12,alignItems:"center",marginTop:2},saveText:{color:"#fff",fontWeight:"900"},item:{flexDirection:"row",alignItems:"center",padding:12,borderRadius:12,backgroundColor:"#F8FAFC",marginBottom:7},itemName:{fontWeight:"900"},itemMeta:{fontSize:11,color:"#64748B",marginTop:3},booking:{padding:12,borderRadius:12,borderWidth:1,borderColor:"#E2E8F0",marginBottom:7},status:{fontSize:10,fontWeight:"900",color:"#0284C7",marginTop:5}});
