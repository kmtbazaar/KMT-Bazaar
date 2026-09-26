import React,{useEffect,useState}from"react";
import{View,Text,StyleSheet,Pressable,ActivityIndicator,Platform,Alert,ScrollView,TextInput}from"react-native";
import{useRouter}from"expo-router";
import{SafeAreaView}from"react-native-safe-area-context";
import{MaterialCommunityIcons}from"@expo/vector-icons";
import{api}from"@/src/api";

export default function Cart(){
 const r=useRouter(),[c,setC]=useState<any>(null),[busy,setBusy]=useState(false);
 const [name,setName]=useState(""),[phone,setPhone]=useState(""),[email,setEmail]=useState("");
 useEffect(()=>{api.serviceCart().then((x:any)=>{setC(x);const u=x?.customer||{};setName(u.full_name||"");setPhone(u.phone||"");setEmail(u.email||"")}).catch(()=>setC({items:[]}))},[]);
 const x=c?.items?.[0], extra=x?.extra||{}, total=Number(extra.package_price||0)*Math.max(1,Number(x?.quantity||1));
 const saveAndContinue=async()=>{
  if(!x)return;
  if(name.trim().length<2){Alert.alert("Name required","Please enter your full name.");return}
  if(phone.replace(/\D/g,"").length!==10){Alert.alert("Mobile required","Please enter a valid 10-digit mobile number.");return}
  try{setBusy(true);await api.serviceCartCustomer({full_name:name.trim(),phone:phone.replace(/\D/g,""),email:email.trim()});r.push("/service-checkout" as any)}catch(e:any){Alert.alert("Booking",""+(e?.message||"Could not save details"))}finally{setBusy(false)}
 };
 return <SafeAreaView style={s.root}><View style={s.h}><Pressable onPress={()=>r.back()}><MaterialCommunityIcons name="arrow-left" size={24}/></Pressable><View style={{flex:1}}><Text style={s.t}>Booking Cart</Text><Text style={s.sub}>Almost ready for your holiday</Text></View><MaterialCommunityIcons name="airplane-takeoff" size={25} color="#0284C7"/></View>
 <ScrollView contentContainerStyle={s.b}>
 {!x?<View style={s.empty}><MaterialCommunityIcons name="bag-suitcase-outline" size={48} color="#94a3b8"/><Text style={s.emptyT}>Your booking cart is empty</Text></View>:
 <>
 <View style={s.card}><Text style={s.label}>YOUR TRIP</Text><Text style={s.name}>{x.service_name||extra.package_name}</Text><Text style={s.meta}>{x.booking_date}{x.booking_time?" · "+x.booking_time:""}</Text><View style={s.row}><Text style={s.muted}>Travellers</Text><Text style={s.bold}>{x.quantity||1}</Text></View><View style={s.row}><Text style={s.muted}>Package total</Text><Text style={s.price}>₹{total.toLocaleString("en-IN")}</Text></View></View>
 <View style={s.card}><Text style={s.label}>BOOKING CONTACT</Text><Text style={s.helper}>These details will be used for booking confirmation and travel communication.</Text>
 <TextInput value={name} onChangeText={setName} placeholder="Full name *" style={s.input}/>
 <TextInput value={phone} onChangeText={v=>setPhone(v.replace(/[^0-9]/g,""))} placeholder="Mobile number *" keyboardType="phone-pad" maxLength={10} style={s.input}/>
 <TextInput value={email} onChangeText={setEmail} placeholder="Email address (optional)" keyboardType="email-address" autoCapitalize="none" style={s.input}/>
 </View>
 <Pressable disabled={busy} onPress={saveAndContinue} style={s.btn}>{busy?<ActivityIndicator color="#fff"/>:<><Text style={s.bt}>Continue to Checkout</Text><MaterialCommunityIcons name="arrow-right" size={20} color="#fff"/></>}</Pressable>
 </>}
 </ScrollView></SafeAreaView>
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:"#f1f7fb"},h:{flexDirection:"row",gap:14,alignItems:"center",padding:16,backgroundColor:"#fff",borderBottomWidth:1,borderColor:"#e2e8f0"},t:{fontSize:21,fontWeight:"900",color:"#0f172a"},sub:{fontSize:12,color:"#64748b",marginTop:2},b:{padding:16,paddingBottom:50,maxWidth:760,width:"100%",alignSelf:"center"},card:{backgroundColor:"#fff",padding:18,borderRadius:20,borderWidth:1,borderColor:"#e2e8f0",marginBottom:14,shadowColor:"#0f172a",shadowOpacity:.06,shadowRadius:12},label:{fontSize:11,fontWeight:"900",letterSpacing:1.2,color:"#0284C7",marginBottom:9},name:{fontSize:22,fontWeight:"900",color:"#0f172a"},meta:{color:"#64748b",marginTop:5},row:{flexDirection:"row",justifyContent:"space-between",marginTop:16,paddingTop:12,borderTopWidth:1,borderColor:"#f1f5f9"},muted:{color:"#64748b"},bold:{fontWeight:"800"},price:{fontSize:20,fontWeight:"900",color:"#ea580c"},helper:{fontSize:12,color:"#64748b",lineHeight:18,marginBottom:12},input:{backgroundColor:"#f8fafc",borderWidth:1,borderColor:"#dbe4ee",borderRadius:12,padding:13,fontSize:15,marginBottom:9},btn:{backgroundColor:"#0284C7",borderRadius:15,padding:16,flexDirection:"row",justifyContent:"center",alignItems:"center",gap:9},bt:{color:"#fff",fontSize:16,fontWeight:"900"},empty:{alignItems:"center",padding:70},emptyT:{fontWeight:"800",fontSize:18,marginTop:12}})