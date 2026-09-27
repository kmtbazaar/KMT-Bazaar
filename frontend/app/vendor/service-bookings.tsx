import React,{useEffect,useState}from"react";
import{View,Text,StyleSheet,Pressable,ScrollView,Alert,Platform,Modal}from"react-native";
import{useRouter}from"expo-router";
import{SafeAreaView}from"react-native-safe-area-context";
import{MaterialCommunityIcons}from"@expo/vector-icons";
import{vendorApi}from"@/src/roleApi";

const NEXT:any={
 holiday:["confirmed","travel_scheduled","completed"],
 car_rental:["accepted","vehicle_assigned","trip_started","completed"],
 daily_service:["provider_accepted","provider_on_the_way","service_started","completed"]
};

export default function VendorBookings(){
 const r=useRouter(),[d,setD]=useState<any[]>([]),[selected,setSelected]=useState<any>(null);
 const load=()=>vendorApi.serviceBookings().then(setD).catch(()=>setD([]));
 useEffect(()=>{load()},[]);
 const update=async(x:any)=>{
  const a=NEXT[x.service_type]||[],i=a.indexOf(x.status),st=a[i>=0?i+1:0];
  if(!st)return;
  try{await vendorApi.updateServiceBooking(x.id,st);await load();setSelected(null)}
  catch(e:any){Platform.OS==="web"?window.alert(e?.message):Alert.alert("Booking",e?.message)}
 };
 const label=selected?.service_type==="car_rental"?"Car Rental":selected?.service_type==="holiday"?"Holiday":"Daily Service";
 return <SafeAreaView style={s.root}>
  <View style={s.h}>
   <Pressable onPress={()=>r.back()}><MaterialCommunityIcons name="arrow-left" size={24}/></Pressable>
   <View style={{flex:1}}><Text style={s.t}>{label} Bookings</Text><Text style={s.sub}>Customer requests for your service</Text></View>
  </View>
  <ScrollView contentContainerStyle={s.b}>
   {d.length===0?<Text style={s.e}>No bookings yet.</Text>:d.map(x=>{
    const a=NEXT[x.service_type]||[],i=a.indexOf(x.status),next=i>=0?a[i+1]:a[0];
    const ex=x.extra||{};
    const title=x.service_type==="car_rental"?"Rental Booking":"Holiday Booking";
    return <Pressable key={x.id} onPress={()=>setSelected(x)} style={s.c}>
      <View style={s.row}><View style={{flex:1}}><Text style={s.n}>{x.service_name||title}</Text><Text style={s.customer}>{x.customer_name||ex.customer_name||"Customer"} · {x.customer_phone||ex.customer_phone||"Mobile not provided"}</Text></View><Text style={s.st}>{String(x.status||"pending").toUpperCase()}</Text></View>
      <Text style={s.meta}>{x.booking_date||"Date not set"}{x.booking_time?" · "+x.booking_time:""}</Text>
      <Text style={s.meta} numberOfLines={1}>{ex.service_address||ex.pickup_location||ex.destination||"Booking details available"}</Text>
      <Text style={s.view}>Tap for customer + order details</Text>
      {next&&<View style={s.btn}><Text style={s.bt}>{i<0?"Accept Request":"Update Status"} · {next.replaceAll("_"," ")}</Text></View>}
    </Pressable>
   })}
  </ScrollView>
  <Modal visible={!!selected} transparent animationType="slide" onRequestClose={()=>setSelected(null)}>
   <View style={m.back}><View style={m.sheet}><ScrollView contentContainerStyle={{paddingBottom:26}}>
    {selected&&(()=>{const ex=selected.extra||{},a=NEXT[selected.service_type]||[],i=a.indexOf(selected.status),next=i>=0?a[i+1]:a[0],type=selected.service_type==="car_rental"?"Car Rental":selected.service_type==="holiday"?"Holiday":"Daily Service";return <>
      <View style={m.head}><View><Text style={m.title}>{type} Booking</Text><Text style={m.id}>{selected.id}</Text></View><Pressable onPress={()=>setSelected(null)}><MaterialCommunityIcons name="close" size={24}/></Pressable></View>
      <Group title="Customer"><Info label="Name" value={selected.customer_name||ex.customer_name}/><Info label="Mobile" value={selected.customer_phone||ex.customer_phone}/><Info label="Email" value={selected.customer_email||ex.customer_email||"Not provided"}/></Group>
      <Group title="Order"><Info label="Service" value={selected.service_name}/><Info label="Date" value={selected.booking_date}/><Info label="Time" value={selected.booking_time||"Not specified"}/><Info label="Address / Pickup" value={ex.service_address||ex.pickup_location||"Not provided"}/><Info label="Destination" value={ex.destination||ex.location||"Not specified"}/><Info label="Notes" value={selected.notes||"Not provided"}/></Group>
      <Group title="Payment"><Info label="Status" value={selected.payment_status||"Not recorded"}/><Info label="Plan" value={selected.payment_plan||"-"}/><Info label="Paid" value={selected.paid_amount!=null?"₹"+Number(selected.paid_amount).toLocaleString("en-IN"):"-"}/><Info label="Total" value={selected.total_amount!=null?"₹"+Number(selected.total_amount).toLocaleString("en-IN"):"-"}/><Info label="Reference" value={selected.gateway_reference||"-"}/></Group>
      <Text style={m.status}>Current status: {String(selected.status||"pending").toUpperCase()}</Text>
      {next&&<Pressable style={s.btn} onPress={()=>update(selected)}><Text style={s.bt}>{i<0?"Accept Request":"Update Status"} · {String(next).replaceAll("_"," ")}</Text></Pressable>}
    </>})()}
   </ScrollView></View></View>
  </Modal>
 </SafeAreaView>
}
function Group({title,children}:{title:string,children:any}){return <View style={m.group}><Text style={m.groupTitle}>{title}</Text>{children}</View>}
function Info({label,value}:{label:string,value:any}){return <View style={m.info}><Text style={m.label}>{label}</Text><Text style={m.value}>{String(value??"-")}</Text></View>}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#f8fafc"},h:{flexDirection:"row",gap:14,alignItems:"center",padding:16,backgroundColor:"#fff",borderBottomWidth:1,borderColor:"#e2e8f0"},t:{fontSize:20,fontWeight:"900"},sub:{fontSize:10,color:"#64748b",marginTop:2},b:{padding:16},c:{backgroundColor:"#fff",padding:16,borderRadius:16,borderWidth:1,borderColor:"#e2e8f0",marginBottom:10},row:{flexDirection:"row",alignItems:"flex-start",gap:10},n:{fontSize:17,fontWeight:"900"},customer:{fontSize:12,color:"#0f172a",marginTop:4,fontWeight:"700"},meta:{fontSize:11,color:"#64748b",marginTop:6},st:{fontSize:10,fontWeight:"900",color:"#0284C7"},view:{fontSize:10,fontWeight:"900",color:"#0284C7",marginTop:8},btn:{backgroundColor:"#0284C7",padding:12,borderRadius:10,alignItems:"center",marginTop:10},bt:{color:"#fff",fontWeight:"900",fontSize:11},e:{textAlign:"center",padding:50,color:"#64748b"}});
const m=StyleSheet.create({back:{flex:1,backgroundColor:"rgba(0,0,0,.55)",justifyContent:"flex-end"},sheet:{backgroundColor:"#fff",maxHeight:"92%",borderTopLeftRadius:24,borderTopRightRadius:24,padding:18},head:{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8},title:{fontSize:20,fontWeight:"900"},id:{fontSize:10,color:"#94a3b8",marginTop:3},group:{marginTop:12,padding:13,borderRadius:14,backgroundColor:"#f8fafc",borderWidth:1,borderColor:"#e2e8f0"},groupTitle:{fontSize:13,fontWeight:"900",color:"#0284C7",marginBottom:6},info:{paddingVertical:5,borderBottomWidth:1,borderColor:"#e2e8f0"},label:{fontSize:9,fontWeight:"900",color:"#64748b",textTransform:"uppercase"},value:{fontSize:13,fontWeight:"700",color:"#0f172a",marginTop:2},status:{marginTop:14,fontSize:13,fontWeight:"900",textAlign:"center"}});
