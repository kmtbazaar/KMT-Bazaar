import React,{useEffect,useState}from"react";
import{View,Text,StyleSheet,Pressable,ScrollView,Alert,Platform,Modal}from"react-native";
import{useRouter}from"expo-router";
import{SafeAreaView}from"react-native-safe-area-context";
import{MaterialCommunityIcons}from"@expo/vector-icons";
import{adminApi}from"@/src/roleApi";

export default function AdminServiceBookings(){
 const r=useRouter(),[d,setD]=useState<any[]>([]),[selected,setSelected]=useState<any>(null);
 const load=()=>adminApi.serviceBookings().then(setD).catch(()=>setD([]));
 useEffect(()=>{load()},[]);
 const update=async(x:any,status:string)=>{
  try{
   await adminApi.updateServiceBooking(x.id,status);
   await load();
   if(Platform.OS==="web")window.alert(status==="confirmed"?"Daily Service booking confirmed":"Daily Service booking cancelled");
   else Alert.alert("Booking",status==="confirmed"?"Booking confirmed":"Booking cancelled");
  }catch(e:any){
   if(Platform.OS==="web")window.alert(e?.message||"Could not update booking");
   else Alert.alert("Booking",e?.message||"Could not update booking");
  }
 };
 const extra=(x:any)=>x.extra||{};
 return <SafeAreaView style={s.root}>
  <View style={s.h}>
   <Pressable onPress={()=>r.back()}><MaterialCommunityIcons name="arrow-left" size={24}/></Pressable>
   <View style={{flex:1}}><Text style={s.t}>Service Bookings</Text><Text style={s.sub}>Daily Service requests need admin confirmation</Text></View>
  </View>
  <ScrollView contentContainerStyle={s.b}>
   {d.length===0?<Text style={s.e}>No service bookings yet.</Text>:d.map(x=>{
    const isDaily=x.service_type==="daily_service";
    const pending=String(x.status||"pending").toLowerCase()==="pending";
    const ex=extra(x);
    return <Pressable key={x.id} onPress={()=>setSelected(x)} style={s.c}>
      <View style={s.row}>
       <View style={{flex:1}}><Text style={s.n}>{x.service_name||"Service Booking"}</Text><Text style={s.type}>{isDaily?"Daily Service":String(x.service_type||"service").replace("_"," ")}</Text></View>
       <Text style={[s.st,String(x.status)==="cancelled"&&s.cancelled,String(x.status)==="confirmed"&&s.confirmed]}>{String(x.status||"pending").toUpperCase()}</Text>
      </View>
      <Text style={s.line}>{x.customer_name||ex.customer_name||"Customer"} · {x.customer_phone||ex.customer_phone||"Mobile not provided"}</Text>
      <Text style={s.line}>{x.booking_date||"Date not set"}{x.booking_time?" · "+x.booking_time:""}</Text>
      {isDaily&&<Text style={s.line} numberOfLines={1}>{ex.service_address||"Service address not provided"}</Text>}
      {isDaily&&pending&&<View style={s.actions}>
       <Pressable onPress={()=>update(x,"confirmed")} style={[s.action,s.confirm]}><MaterialCommunityIcons name="check-circle" size={17} color="#fff"/><Text style={s.actionText}>Confirm</Text></Pressable>
       <Pressable onPress={()=>update(x,"cancelled")} style={[s.action,s.cancel]}><MaterialCommunityIcons name="close-circle" size={17} color="#fff"/><Text style={s.actionText}>Cancel</Text></Pressable>
      </View>}
      {isDaily&&<Text style={s.view}>Tap to view full booking + customer details</Text>}
    </Pressable>
   })}
  </ScrollView>
  <Modal visible={!!selected} transparent animationType="slide" onRequestClose={()=>setSelected(null)}>
   <View style={m.back}><View style={m.sheet}>
    <ScrollView contentContainerStyle={{paddingBottom:26}}>
     {selected&&(()=>{const ex=selected.extra||{};return <>
      <View style={m.head}><View><Text style={m.title}>Booking Details</Text><Text style={m.id}>{selected.id}</Text></View><Pressable onPress={()=>setSelected(null)}><MaterialCommunityIcons name="close" size={24}/></Pressable></View>
      <Section title="Service"><Info label="Service" value={selected.service_name||"-"}/><Info label="Category" value={ex.service_category||"-"}/><Info label="Provider" value={selected.vendor_name||ex.vendor_name||"KMT Bazaar Home Services"}/></Section>
      <Section title="Customer"><Info label="Name" value={selected.customer_name||ex.customer_name||"-"}/><Info label="Mobile" value={selected.customer_phone||ex.customer_phone||"-"}/><Info label="Email" value={selected.customer_email||ex.customer_email||"-"}/></Section>
      <Section title="Visit"><Info label="Date" value={selected.booking_date||"-"}/><Info label="Time" value={selected.booking_time||"-"}/><Info label="Address" value={ex.service_address||"-"}/><Info label="Work / Problem" value={selected.notes||"-"}/></Section>
      <Section title="Payment"><Info label="Status" value={selected.payment_status||"pending"}/><Info label="Plan" value={selected.payment_plan||"-"}/><Info label="Paid" value={selected.paid_amount!=null?"₹"+Number(selected.paid_amount).toLocaleString("en-IN"):"-"}/><Info label="Total" value={selected.total_amount!=null?"₹"+Number(selected.total_amount).toLocaleString("en-IN"):"-"}/><Info label="Reference" value={selected.gateway_reference||"-"}/></Section>
      <Text style={m.status}>Current status: {String(selected.status||"pending").toUpperCase()}</Text>
      {selected.service_type==="daily_service"&&String(selected.status||"pending")==="pending"&&<View style={s.actions}>
       <Pressable onPress={()=>{setSelected(null);update(selected,"confirmed")}} style={[s.action,s.confirm]}><Text style={s.actionText}>Confirm Booking</Text></Pressable>
       <Pressable onPress={()=>{setSelected(null);update(selected,"cancelled")}} style={[s.action,s.cancel]}><Text style={s.actionText}>Cancel Booking</Text></Pressable>
      </View>}
     </>})()}
    </ScrollView>
   </View></View>
  </Modal>
 </SafeAreaView>
}
function Section({title,children}:{title:string,children:any}){return <View style={m.section}><Text style={m.sectionTitle}>{title}</Text>{children}</View>}
function Info({label,value}:{label:string,value:any}){return <View style={m.info}><Text style={m.label}>{label}</Text><Text style={m.value}>{String(value??"-")}</Text></View>}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#f8fafc"},h:{flexDirection:"row",gap:14,alignItems:"center",padding:16,backgroundColor:"#fff",borderBottomWidth:1,borderColor:"#e2e8f0"},t:{fontSize:20,fontWeight:"900"},sub:{fontSize:10,color:"#64748b",marginTop:2},b:{padding:16},c:{backgroundColor:"#fff",padding:16,borderRadius:16,borderWidth:1,borderColor:"#e2e8f0",marginBottom:10},n:{fontSize:17,fontWeight:"900"},type:{color:"#0284C7",fontSize:11,fontWeight:"800",marginTop:3,textTransform:"uppercase"},row:{flexDirection:"row",alignItems:"flex-start",gap:10},line:{fontSize:12,color:"#475569",marginTop:7},st:{fontSize:10,fontWeight:"900",color:"#0284C7"},confirmed:{color:"#16A34A"},cancelled:{color:"#DC2626"},actions:{flexDirection:"row",gap:8,marginTop:12},action:{flex:1,padding:11,borderRadius:10,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6},confirm:{backgroundColor:"#16A34A"},cancel:{backgroundColor:"#DC2626"},actionText:{color:"#fff",fontWeight:"900",fontSize:12},view:{marginTop:10,fontSize:10,color:"#0284C7",fontWeight:"800"},e:{textAlign:"center",padding:50,color:"#64748b"}});
const m=StyleSheet.create({back:{flex:1,backgroundColor:"rgba(0,0,0,.55)",justifyContent:"flex-end"},sheet:{backgroundColor:"#fff",maxHeight:"92%",borderTopLeftRadius:24,borderTopRightRadius:24,padding:18},head:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8},title:{fontSize:20,fontWeight:"900"},id:{fontSize:10,color:"#94a3b8",marginTop:3},section:{marginTop:14,padding:13,borderRadius:14,backgroundColor:"#f8fafc",borderWidth:1,borderColor:"#e2e8f0"},sectionTitle:{fontSize:13,fontWeight:"900",color:"#0284C7",marginBottom:6},info:{paddingVertical:5,borderBottomWidth:1,borderColor:"#e2e8f0"},label:{fontSize:9,fontWeight:"900",color:"#64748b",textTransform:"uppercase"},value:{fontSize:13,fontWeight:"700",color:"#0f172a",marginTop:2},status:{marginTop:14,fontSize:13,fontWeight:"900",textAlign:"center"}});
