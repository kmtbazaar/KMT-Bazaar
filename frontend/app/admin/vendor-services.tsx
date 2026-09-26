import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { adminApi } from "@/src/roleApi";
import { COLORS, RADIUS, SPACING } from "@/src/theme";
import ImageUploader from "@/src/components/ImageUploader";

const EMPTY = {
  name:"", vendor_name:"", description:"", image:"", gallery:[],
  location:"", category:"", type:"", phone:"", order:"99", active:true,
  price:"", unit:"day", duration:"", seats:"", bags:"",
  transmission:"Automatic", fuel:"Petrol", tag:"", includesText:""
};

const CAR_TYPES = ["Sedan","SUV","MUV","Traveller","Hatchback","Luxury"];
const FUEL_TYPES = ["Petrol","Diesel","CNG","Electric"];
const TRANSMISSIONS = ["Automatic","Manual"];

export default function AdminVendorServices() {
  const router = useRouter();
  const { vendor_id, service_type } = useLocalSearchParams<{vendor_id?:string;service_type?:string}>();
  const isVendorMode = !!vendor_id;
  const isCar = (service_type || "") === "car_rental";

  const [items,setItems]=useState<any[]>([]);
  const [modal,setModal]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [f,setF]=useState<any>({...EMPTY});

  const load=useCallback(async()=>{
    try{
      const all=await adminApi.vendorServices();
      setItems((all||[]).filter((x:any)=>{
        if(isVendorMode) return String(x.vendor_id||"")===String(vendor_id);
        return true;
      }));
    }catch(e){console.log("Vendor services load error",e)}
  },[isVendorMode,vendor_id]);

  useFocusEffect(useCallback(()=>{load()},[load]));

  const baseForm=(x?:any)=>({
    ...EMPTY,
    ...x,
    gallery:Array.isArray(x?.gallery)?x.gallery:[],
    order:String(x?.order??99),
    price:String(x?.price??""),
    duration:String(x?.duration??""),
    seats:String(x?.seats??""),
    bags:String(x?.bags??""),
    transmission:x?.transmission||"Automatic",
    fuel:x?.fuel||"Petrol",
    includesText:Array.isArray(x?.includes)?x.includes.join(", "):(x?.includesText||"")
  });

  const openAdd=()=>{
    setEditingId(null);
    setF({...EMPTY, vendor_name: items[0]?.vendor_name||"", unit:isCar?"day":"per person"});
    setModal(true);
  };

  const openEdit=(item:any)=>{
    setEditingId(item.id);
    setF(baseForm(item));
    setModal(true);
  };

  const save=async()=>{
    if(!String(f.name||"").trim()){
      const msg=isCar?"Car name is required":"Holiday package name is required";
      Platform.OS==="web"?window.alert(msg):Alert.alert("Required",msg);
      return;
    }

    const includes=String(f.includesText||"").split(",").map((x:string)=>x.trim()).filter(Boolean);
    const data={
      name:String(f.name||"").trim(),
      vendor_name:String(f.vendor_name||items[0]?.vendor_name||"").trim(),
      description:String(f.description||"").trim(),
      image:f.image||"",
      gallery:Array.isArray(f.gallery)?f.gallery.filter(Boolean).slice(0,isCar?2:5):[],
      location:String(f.location||"").trim(),
      category:String(f.category||"").trim(),
      type:String(f.type||"").trim(),
      phone:String(f.phone||"").trim(),
      order:Number(f.order)||99,
      active:true,
      price:Number(f.price)||0,
      unit:isCar?"day":"per person",
      duration:String(f.duration||"").trim(),
      seats:isCar?(Number(f.seats)||0):0,
      bags:isCar?(Number(f.bags)||0):0,
      transmission:isCar?String(f.transmission||""):"",
      fuel:isCar?String(f.fuel||"):"",
      tag:String(f.tag||"").trim(),
      includes,
      service_type:isVendorMode?(service_type||"holiday"):(f.service_type||"daily_service"),
      ...(isVendorMode && vendor_id ? {vendor_id:String(vendor_id)} : {})
    };

    try{
      if(editingId) await adminApi.updateVendorService(editingId,data);
      else await adminApi.createVendorService(data);
      setModal(false);
      setEditingId(null);
      setF({...EMPTY});
      await load();
      const msg=editingId?"Changes saved and live":"Service added and live";
      Platform.OS==="web"?window.alert(msg):Alert.alert("Saved",msg);
    }catch(e:any){
      const msg=e?.message||"Could not save service.";
      Platform.OS==="web"?window.alert(msg):Alert.alert("Save failed",msg);
    }
  };

  const remove=async(id:string)=>{
    const ok=Platform.OS==="web"?window.confirm("Delete this service?"):true;
    if(!ok)return;
    try{await adminApi.deleteVendorService(id);await load();}catch(e:any){
      const msg=e?.message||"Could not delete service.";
      Platform.OS==="web"?window.alert(msg):Alert.alert("Delete failed",msg);
    }
  };

  return <SafeAreaView style={s.root} edges={["top"]}>
    <View style={s.header}>
      <Pressable onPress={()=>router.back()} hitSlop={12}><MaterialCommunityIcons name="arrow-left" size={23} color={COLORS.text}/></Pressable>
      <View style={{alignItems:"center",flex:1}}>
        <Text style={s.title}>{isVendorMode?(isCar?"Rental Fleet":"Holiday Packages"):`Vendor Service (${items.length})`}</Text>
        {isVendorMode?<Text style={{fontSize:10,fontWeight:"900",color:isCar?"#0EA5E9":"#2563EB",marginTop:2}}>{isCar?"CAR RENTAL ADMIN":"HOLIDAY ADMIN"}</Text>:null}
      </View>
      <Pressable onPress={openAdd} hitSlop={12}><MaterialCommunityIcons name="plus-circle" size={27} color={isCar?"#0EA5E9":COLORS.brand}/></Pressable>
    </View>

    <FlatList
      data={items}
      keyExtractor={(x)=>x.id}
      numColumns={2}
      contentContainerStyle={{padding:SPACING.lg,paddingBottom:100}}
      columnWrapperStyle={{gap:10}}
      ItemSeparatorComponent={()=> <View style={{height:10}}/>}
      renderItem={({item})=><View style={s.card}>
        {item.image?<Image source={{uri:item.image}} style={s.img} contentFit="cover"/>:<View style={[s.img,s.placeholder]}><MaterialCommunityIcons name={isCar?"car":"airplane-takeoff"} size={30} color={isCar?"#0EA5E9":"#2563EB"}/></View>}
        <Text style={s.name} numberOfLines={2}>{item.name}</Text>
        {isCar?<>
          {!!item.type&&<Text style={s.meta} numberOfLines={1}>{item.type}{item.transmission?" · "+item.transmission:""}</Text>}
          <Text style={s.meta}>{Number(item.seats||0)} seats · {Number(item.bags||0)} bags</Text>
          <Text style={s.price}>₹{Number(item.price||0).toLocaleString("en-IN")} / day</Text>
        </>:<>
          {!!item.location&&<Text style={s.meta} numberOfLines={1}>{item.location}</Text>}
          <Text style={s.meta}>{item.duration||"Flexible trip"}</Text>
          <Text style={s.price}>₹{Number(item.price||0).toLocaleString("en-IN")} / person</Text>
        </>}
        <View style={s.actions}>
          <Pressable onPress={()=>openEdit(item)} hitSlop={8}><MaterialCommunityIcons name="pencil-outline" size={19} color={isCar?"#0EA5E9":COLORS.brand}/></Pressable>
          <Pressable onPress={()=>remove(item.id)} hitSlop={8}><MaterialCommunityIcons name="trash-can-outline" size={19} color={COLORS.error}/></Pressable>
        </View>
      </View>}
      ListEmptyComponent={<View style={s.empty}><MaterialCommunityIcons name={isCar?"car-off":"airplane-off"} size={46} color={COLORS.textMuted}/><Text style={s.emptyText}>No {isCar?"cars":"holiday packages"} yet</Text><Text style={s.meta}>Tap + to add.</Text></View>}
    />

    <Modal visible={modal} transparent animationType="slide" onRequestClose={()=>setModal(false)}>
      <View style={m.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined} style={m.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator contentContainerStyle={{paddingBottom:30}}>
            <View style={m.topRow}>
              <View style={{flex:1}}>
                <Text style={m.modalTitle}>{editingId?(isCar?"Edit Rental Car":"Edit Holiday Package"):(isCar?"Add Rental Car":"Add Holiday Package")}</Text>
                <Text style={m.helper}>Admin changes save directly to the live catalog.</Text>
              </View>
              <Pressable onPress={()=>setModal(false)}><MaterialCommunityIcons name="close" size={22} color={COLORS.text}/></Pressable>
            </View>

            <Field label={isCar?"Car Name *":"Package Name *"} value={f.name} onChange={(v:string)=>setF({...f,name:v})} placeholder={isCar?"Toyota Innova Crysta":"Goa Beach Escape"}/>

            {isCar?<>
              <SelectRow label="Vehicle Type" options={CAR_TYPES} value={f.type} onChange={(v:string)=>setF({...f,type:v})}/>
              <Field label="Category / Use" value={f.category} onChange={(v:string)=>setF({...f,category:v})} placeholder="Self Drive / With Driver / Airport & City"/>
              <Field label="Location / Pickup City" value={f.location} onChange={(v:string)=>setF({...f,location:v})} placeholder="Patna"/>
              <View style={m.two}>
                <Field label="Seats" value={f.seats} onChange={(v:string)=>setF({...f,seats:v})} placeholder="7" keyboardType="numeric"/>
                <Field label="Bags" value={f.bags} onChange={(v:string)=>setF({...f,bags:v})} placeholder="4" keyboardType="numeric"/>
              </View>
              <SelectRow label="Transmission" options={TRANSMISSIONS} value={f.transmission} onChange={(v:string)=>setF({...f,transmission:v})}/>
              <SelectRow label="Fuel" options={FUEL_TYPES} value={f.fuel} onChange={(v:string)=>setF({...f,fuel:v})}/>
              <Field label="Price / Day (₹)" value={f.price} onChange={(v:string)=>setF({...f,price:v})} placeholder="3200" keyboardType="numeric"/>
              <Field label="Tag" value={f.tag} onChange={(v:string)=>setF({...f,tag:v})} placeholder="Family favourite"/>
              <Field label="Description" value={f.description} onChange={(v:string)=>setF({...f,description:v})} placeholder="Premium 7-seater..." multiline/>
              <Field label="Phone" value={f.phone} onChange={(v:string)=>setF({...f,phone:v})} placeholder="Vendor contact" keyboardType="phone-pad"/>
            </>:<>
              <Field label="Destination / Location" value={f.location} onChange={(v:string)=>setF({...f,location:v})} placeholder="Goa"/>
              <Field label="Category" value={f.category} onChange={(v:string)=>setF({...f,category:v})} placeholder="Beach / Mountains / Spiritual"/>
              <View style={m.two}>
                <Field label="Duration" value={f.duration} onChange={(v:string)=>setF({...f,duration:v})} placeholder="4 nights / 5 days"/>
                <Field label="Price / Person (₹)" value={f.price} onChange={(v:string)=>setF({...f,price:v})} placeholder="14999" keyboardType="numeric"/>
              </View>
              <Field label="Tag" value={f.tag} onChange={(v:string)=>setF({...f,tag:v})} placeholder="Best value"/>
              <Field label="Description" value={f.description} onChange={(v:string)=>setF({...f,description:v})} placeholder="Package details..." multiline/>
              <Field label="Includes" value={f.includesText} onChange={(v:string)=>setF({...f,includesText:v})} placeholder="Hotel, Breakfast, Transfer, Sightseeing"/>
              <Field label="Phone" value={f.phone} onChange={(v:string)=>setF({...f,phone:v})} placeholder="Vendor contact" keyboardType="phone-pad"/>
            </>}

            <ImageUploader value={f.image} onChange={(uri)=>setF({...f,image:uri})} label={isCar?"Car Main Photo":"Package Cover Photo"} aspect={[16,9]}/>
            <Text style={m.galleryTitle}>{isCar?"Car Photos · 2 Gallery Photos":"Destination Gallery · Up to 5 Photos"}</Text>
            {(isCar?[0,1]:[0,1,2,3,4]).map((i)=>
              <ImageUploader key={i} value={f.gallery?.[i]||""} onChange={(uri)=>setF({...f,gallery:Object.assign([],f.gallery||[],{[i]:uri}).slice(isCar?2:5)})} label={isCar?(i===0?"Main Car Photo":"Second Car Photo"):`Photo ${i+1}`} aspect={[4,3]}/>
            )}

            <View style={{flexDirection:"row",gap:8,marginTop:10}}>
              <Pressable onPress={()=>setModal(false)} style={[m.btn,m.ghost]}><Text style={m.ghostText}>Cancel</Text></Pressable>
              <Pressable onPress={save} style={[m.btn,m.primary]}><Text style={m.btnText}>{editingId?"Save Changes":"Add & Go Live"}</Text></Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  </SafeAreaView>;
}

function Field({label,value,onChange,placeholder,keyboardType,multiline}:any){
  return <View style={{marginBottom:9}}><Text style={m.label}>{label}</Text><TextInput value={String(value??"")} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#94A3B8" keyboardType={keyboardType} multiline={multiline} style={[m.input,multiline&&{minHeight:72,textAlignVertical:"top"}]}/></View>;
}
function SelectRow({label,options,value,onChange}:any){
  return <View style={{marginBottom:10}}><Text style={m.label}>{label}</Text><View style={m.selectWrap}>{options.map((x:string)=><Pressable key={x} onPress={()=>onChange(x)} style={[m.chip,value===x&&m.chipActive]}><Text style={[m.chipText,value===x&&m.chipTextActive]}>{x}</Text></Pressable>)}</View></View>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:"#F8FAFC"},
  header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:SPACING.lg,paddingVertical:SPACING.md,backgroundColor:"#fff",borderBottomWidth:1,borderBottomColor:"#E2E8F0"},
  title:{fontSize:18,fontWeight:"900",color:COLORS.text},
  card:{flex:1,backgroundColor:"#fff",padding:11,borderRadius:RADIUS.md,borderWidth:1,borderColor:COLORS.border,position:"relative",overflow:"hidden"},
  img:{width:"100%",height:105,borderRadius:12,backgroundColor:COLORS.surfaceTertiary},
  placeholder:{alignItems:"center",justifyContent:"center"},
  name:{fontWeight:"900",color:COLORS.text,marginTop:9,fontSize:14},
  meta:{fontSize:11,color:COLORS.textSecondary,marginTop:3},
  price:{fontSize:13,fontWeight:"900",color:COLORS.brand,marginTop:7},
  actions:{position:"absolute",top:14,right:14,flexDirection:"row",gap:9,backgroundColor:"rgba(255,255,255,.92)",paddingHorizontal:7,paddingVertical:5,borderRadius:10},
  empty:{alignItems:"center",padding:40,flex:1},
  emptyText:{fontWeight:"900",fontSize:16,color:COLORS.text,marginTop:10}
});

const m=StyleSheet.create({
  backdrop:{flex:1,backgroundColor:"rgba(0,0,0,.55)",justifyContent:"flex-end"},
  sheet:{backgroundColor:"#fff",padding:SPACING.lg,borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight:"94%"},
  topRow:{flexDirection:"row",alignItems:"center",marginBottom:12},
  modalTitle:{fontSize:19,fontWeight:"900",color:COLORS.text},
  helper:{fontSize:11,color:COLORS.textMuted,marginTop:3},
  label:{fontSize:11,fontWeight:"900",color:COLORS.textSecondary,marginBottom:4},
  input:{backgroundColor:"#F8FAFC",borderRadius:RADIUS.md,padding:12,borderWidth:1,borderColor:COLORS.border,color:COLORS.text},
  two:{flexDirection:"row",gap:9},
  selectWrap:{flexDirection:"row",flexWrap:"wrap",gap:7},
  chip:{paddingHorizontal:12,paddingVertical:9,borderRadius:20,borderWidth:1,borderColor:COLORS.border,backgroundColor:"#fff"},
  chipActive:{backgroundColor:COLORS.brand,borderColor:COLORS.brand},
  chipText:{fontSize:11,fontWeight:"800",color:COLORS.textSecondary},
  chipTextActive:{color:"#fff"},
  galleryTitle:{fontSize:13,fontWeight:"900",color:COLORS.text,marginTop:6,marginBottom:8},
  btn:{flex:1,padding:14,borderRadius:RADIUS.pill,alignItems:"center"},
  primary:{backgroundColor:COLORS.brand},
  btnText:{color:"#fff",fontWeight:"900"},
  ghost:{borderWidth:1,borderColor:COLORS.border},
  ghostText:{color:COLORS.textSecondary,fontWeight:"800"}
});
