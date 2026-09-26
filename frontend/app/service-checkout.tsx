import React,{useEffect,useState}from"react";
import{View,Text,StyleSheet,Pressable,ScrollView,ActivityIndicator,Alert}from"react-native";
import{useRouter}from"expo-router";
import{SafeAreaView}from"react-native-safe-area-context";
import{MaterialCommunityIcons}from"@expo/vector-icons";
import{api}from"@/src/api";

export default function ServiceCheckout(){
 const r=useRouter();const[c,setC]=useState<any>(null);const[plan,setPlan]=useState<"booking"|"full">("booking");const[busy,setBusy]=useState(false);
 useEffect(()=>{api.serviceCart().then(setC).catch(()=>setC({items:[]}))},[]);
 const x=c?.items?.[0],e=x?.extra||{},total=Number(e.package_price||0)*Math.max(1,Number(x?.quantity||1)),advance=Math.round(total*.2),pay=plan==="full"?total:advance;
 const go=()=>r.push({pathname:"/service-payment" as any,params:{plan,amount:String(pay),total:String(total)}} as any);
 if(!x)return <SafeAreaView style={s.root}><Text style={s.empty}>Booking cart is empty.</Text></SafeAreaView>;
 return <SafeAreaView style={s.root}><View style={s.h}><Pressable onPress={()=>r.back()}><MaterialCommunityIcons name="arrow-left" size={24}/></Pressable><Text style={s.t}>Holiday Checkout</Text></View><ScrollView contentContainerStyle={s.b}>
 <View style={s.step}><Text style={s.stepOn}>1 Contact</Text><Text style={s.dot}>•</Text><Text style={s.stepOn}>2 Checkout</Text><Text style={s.dot}>•</Text><Text>3 Payment</Text></View>
 <View style={s.card}><Text style={s.label}>TRAVELLER</Text><Text style={s.big}>{c?.customer?.full_name}</Text><Text style={s.meta}>{c?.customer?.phone}{c?.customer?.email?" · "+c.customer.email:""}</Text></View>
 <View style={s.card}><Text style={s.label}>BOOKING DETAILS</Text><Row k="Destination / Package" v={x.service_name||e.package_name}/><Row k="Travel date" v={x.booking_date}/><Row k="Travellers" v={String(x.quantity||1)}/><Row k="Vendor" v={x.vendor_name||"KMT Bazaar Holidays"}/></View>
 <View style={s.card}><Text style={s.label}>PAYMENT PLAN</Text>
 <Pressable onPress={()=>setPlan("booking")} style={[s.option,plan==="booking"&&s.active]}><View style={s.radio}>{plan==="booking"&&<View style={s.dotin}/>}</View><View style={{flex:1}}><Text style={s.optTitle}>Pay booking amount</Text><Text style={s.meta}>20% now · ₹{advance.toLocaleString("en-IN")} remaining later</Text></View><Text style={s.amount}>₹{advance.toLocaleString("en-IN")}</Text></Pressable>
 <Pressable onPress={()=>setPlan("full")} style={[s.option,plan==="full"&&s.active]}><View style={s.radio}>{plan==="full"&&<View style={s.dotin}/>}</View><View style={{flex:1}}><Text style={s.optTitle}>Pay full amount</Text><Text style={s.meta}>Complete payment now</Text></View><Text style={s.amount}>₹{total.toLocaleString("en-IN")}</Text></Pressable>
 </View>
 <View style={s.summary}><Text style={s.muted}>Trip total</Text><Text style={s.total}>₹{total.toLocaleString("en-IN")}</Text></View>
 <Pressable onPress={go} style={s.btn}><Text style={s.bt}>Continue to Payment · ₹{pay.toLocaleString("en-IN")}</Text><MaterialCommunityIcons name="arrow-right" size={20} color="#fff"/></Pressable>
 </ScrollView></SafeAreaView>
}
function Row({k,v}:{k:string,v:any}){return <View style={s.row}><Text style={s.muted}>{k}</Text><Text style={s.val} numberOfLines={2}>{v}</Text></View>}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#f1f7fb"},h:{flexDirection:"row",alignItems:"center",gap:14,padding:16,backgroundColor:"#fff",borderBottomWidth:1,borderColor:"#e2e8f0"},t:{fontSize:21,fontWeight:"900"},b:{padding:16,maxWidth:760,width:"100%",alignSelf:"center",paddingBottom:50},step:{flexDirection:"row",justifyContent:"center",gap:10,paddingVertical:12,color:"#0284C7"},stepOn:{color:"#0284C7",fontWeight:"900"},dot:{color:"#94a3b8"},card:{backgroundColor:"#fff",padding:18,borderRadius:20,marginBottom:14,borderWidth:1,borderColor:"#e2e8f0"},label:{fontSize:11,fontWeight:"900",letterSpacing:1.2,color:"#0284C7",marginBottom:9},big:{fontSize:18,fontWeight:"900"},meta:{fontSize:12,color:"#64748b",marginTop:4},row:{flexDirection:"row",justifyContent:"space-between",gap:15,paddingVertical:10,borderBottomWidth:1,borderColor:"#f1f5f9"},muted:{color:"#64748b"},val:{fontWeight:"800",textAlign:"right",flex:1},option:{flexDirection:"row",alignItems:"center",gap:12,padding:14,borderRadius:14,borderWidth:1,borderColor:"#e2e8f0",marginBottom:10},active:{borderColor:"#0284C7",backgroundColor:"#effaff"},radio:{width:21,height:21,borderRadius:11,borderWidth:2,borderColor:"#0284C7",alignItems:"center",justifyContent:"center"},dotin:{width:11,height:11,borderRadius:6,backgroundColor:"#0284C7"},optTitle:{fontWeight:"900"},amount:{fontWeight:"900",color:"#ea580c"},summary:{flexDirection:"row",justifyContent:"space-between",padding:18,backgroundColor:"#fff",borderRadius:16,marginBottom:12},total:{fontSize:22,fontWeight:"900"},btn:{backgroundColor:"#0284C7",padding:16,borderRadius:15,flexDirection:"row",justifyContent:"center",gap:9},bt:{color:"#fff",fontWeight:"900",fontSize:16},empty:{padding:50,textAlign:"center"}})