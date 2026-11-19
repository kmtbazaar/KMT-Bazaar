import React,{useCallback,useState}from"react";
import{View,Text,StyleSheet,ScrollView,Pressable,ActivityIndicator}from"react-native";
import{useFocusEffect,useRouter}from"expo-router";
import{SafeAreaView}from"react-native-safe-area-context";
import{MaterialCommunityIcons}from"@expo/vector-icons";
import{api}from"@/src/api";

const META:any={
 holiday:{label:"Holiday",icon:"airplane-takeoff",color:"#2563EB"},
 car_rental:{label:"Car Rental",icon:"car",color:"#0284C7"},
 daily_service:{label:"Daily Service",icon:"tools",color:"#0F766E"},
 decorator:{label:"Decorator",icon:"party-popper",color:"#C2410C"},
 photography_studio:{label:"Photography Studio",icon:"camera",color:"#7C3AED"}
};
const STATUS:any={
 booking_requested:{label:"Awaiting vendor",tone:"pending"},
 accepted:{label:"Accepted by vendor",tone:"success"},
 confirmed:{label:"Confirmed",tone:"success"},
 completed:{label:"Completed",tone:"success"},
 cancelled:{label:"Cancelled",tone:"danger"},
 rejected:{label:"Rejected",tone:"danger"},
 pending:{label:"Pending",tone:"pending"}
};

export default function Bookings(){
 const router=useRouter(),[items,setItems]=useState<any[]>([]),[loading,setLoading]=useState(true);
 const load=useCallback(async()=>{setLoading(true);try{setItems(await api.serviceBookings())}catch{setItems([])}finally{setLoading(false)}},[]);
 useFocusEffect(useCallback(()=>{load()},[load]));
 return <SafeAreaView style={s.root} edges={["top"]}>
  <View style={s.header}>
   <Pressable onPress={()=>router.back()} style={s.back}><MaterialCommunityIcons name="arrow-left" size={23} color="#0F172A"/></Pressable>
   <View style={{flex:1,marginLeft:11}}><Text style={s.title}>My Service Bookings</Text><Text style={s.sub}>Track your requests and confirmed events</Text></View>
   <Pressable onPress={load} style={s.refresh}><MaterialCommunityIcons name="refresh" size={20} color="#0284C7"/></Pressable>
  </View>
  <ScrollView contentContainerStyle={s.body}>
   {loading?<ActivityIndicator size="large" color="#0284C7"/>:items.length===0?<View style={s.empty}><MaterialCommunityIcons name="calendar-blank-outline" size={48} color="#94A3B8"/><Text style={s.emptyTitle}>No service bookings yet</Text><Text style={s.emptySub}>Your Holiday, Car Rental, Decorator and Photography bookings will appear here.</Text></View>:items.map(x=>{
    const meta=META[x.service_type]||META.daily_service,status=STATUS[x.status]||{label:String(x.status||"Pending").replaceAll("_"," "),tone:"pending"};
    return <View key={x.id} style={s.card}>
     <View style={s.top}><View style={[s.icon,{backgroundColor:meta.color+"18"}]}><MaterialCommunityIcons name={meta.icon} size={21} color={meta.color}/></View><View style={{flex:1}}><Text style={s.name}>{x.service_name||meta.label}</Text><Text style={[s.type,{color:meta.color}]}>{meta.label} · {x.booking_mode==="enquiry_quote"?"Quote accepted":"Direct request"}</Text></View><View style={[s.status,{backgroundColor:status.tone==="success"?"#DCFCE7":status.tone==="danger"?"#FEE2E2":"#FEF3C7"}]}><Text style={{fontSize:8,fontWeight:"900",color:status.tone==="success"?"#166534":status.tone==="danger"?"#991B1B":"#92400E"}}>{status.label.toUpperCase()}</Text></View></View>
     <View style={s.details}><View style={s.detail}><Text style={s.label}>EVENT DATE</Text><Text style={s.value}>{x.booking_date||"To be discussed"}</Text></View><View style={s.detail}><Text style={s.label}>TIME</Text><Text style={s.value}>{x.booking_time||"Flexible"}</Text></View></View>
     {!!x.event_location&&<Text style={s.meta}><MaterialCommunityIcons name="map-marker-outline" size={13}/> {x.event_location}</Text>}
     {!!x.notes&&<Text style={s.notes}>{x.notes}</Text>}
     {Number(x.total_amount||0)>0&&<View style={s.amountRow}><Text style={s.amountLabel}>Package / quoted amount</Text><Text style={s.amount}>₹{Number(x.total_amount).toLocaleString("en-IN")}</Text></View>}
     <Text style={s.id}>Booking ID · {x.id}</Text>
    </View>
   })}
   <Pressable style={s.enquiryLink} onPress={()=>router.push("/service-enquiries" as any)}><MaterialCommunityIcons name="message-text-outline" size={18} color="#0369A1"/><Text style={s.enquiryText}>View my service enquiries & quotations</Text><MaterialCommunityIcons name="chevron-right" size={20} color="#0369A1"/></Pressable>
  </ScrollView>
 </SafeAreaView>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#F1F5F9"},header:{flexDirection:"row",alignItems:"center",padding:15,backgroundColor:"#fff",borderBottomWidth:1,borderColor:"#E2E8F0"},back:{width:36,height:36,borderRadius:12,backgroundColor:"#F1F5F9",alignItems:"center",justifyContent:"center"},title:{fontSize:18,fontWeight:"900",color:"#0F172A"},sub:{fontSize:10,color:"#64748B",marginTop:3},refresh:{width:36,height:36,borderRadius:12,alignItems:"center",justifyContent:"center",backgroundColor:"#EFF6FF"},body:{padding:14,paddingBottom:42},card:{backgroundColor:"#fff",padding:15,borderRadius:18,borderWidth:1,borderColor:"#E2E8F0",marginBottom:11},top:{flexDirection:"row",alignItems:"center",gap:10},icon:{width:44,height:44,borderRadius:14,alignItems:"center",justifyContent:"center"},name:{fontSize:14,fontWeight:"900",color:"#0F172A"},type:{fontSize:10,fontWeight:"800",marginTop:3},status:{paddingHorizontal:8,paddingVertical:6,borderRadius:12},details:{flexDirection:"row",gap:10,marginTop:14},detail:{flex:1,backgroundColor:"#F8FAFC",padding:10,borderRadius:11},label:{fontSize:8,fontWeight:"900",color:"#94A3B8"},value:{fontSize:11,fontWeight:"800",color:"#334155",marginTop:4},meta:{fontSize:10,color:"#64748B",marginTop:8},notes:{fontSize:11,lineHeight:17,color:"#475569",marginTop:8},amountRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:12,paddingTop:11,borderTopWidth:1,borderColor:"#F1F5F9"},amountLabel:{fontSize:10,color:"#64748B",fontWeight:"700"},amount:{fontSize:15,fontWeight:"900",color:"#0F172A"},id:{fontSize:8,color:"#94A3B8",marginTop:11},empty:{alignItems:"center",padding:55},emptyTitle:{fontSize:17,fontWeight:"900",color:"#0F172A",marginTop:10},emptySub:{fontSize:11,color:"#64748B",lineHeight:17,textAlign:"center",marginTop:6},enquiryLink:{backgroundColor:"#E0F2FE",borderRadius:13,padding:13,flexDirection:"row",alignItems:"center",gap:8,marginTop:5},enquiryText:{fontSize:11,fontWeight:"900",color:"#0369A1",flex:1}});
