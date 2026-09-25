import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { vendorApi } from "@/src/roleApi";
import { COLORS, RADIUS, SPACING } from "@/src/theme";
import ImageUploader from "@/src/components/ImageUploader";

const EMPTY = { name:"", vendor_name:"", description:"", image:"", category:"", phone:"", order:"99", active:true };

export default function VendorServices() {
  const router=useRouter();
  const [items,setItems]=useState<any[]>([]);
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState<string|null>(null);
  const [f,setF]=useState<any>({...EMPTY});

  const load=useCallback(async()=>{try{setItems(await vendorApi.services())}catch{}},[]);
  useFocusEffect(useCallback(()=>{load()},[load]));
  const openAdd=()=>{setEditing(null);setF({...EMPTY});setModal(true)};
  const openEdit=(x:any)=>{setEditing(x.id);setF({...x,order:String(x.order??99)});setModal(true)};
  const save=async()=>{
    if(!f.name?.trim()){Platform.OS==="web"?window.alert("Service name is required"):Alert.alert("Required","Service name is required");return}
    const data={...f,name:f.name.trim(),order:Number(f.order)||99};
    if(editing) await vendorApi.updateService(editing,data); else await vendorApi.createService(data);
    setModal(false);load();
  };
  const remove=async(id:string)=>{if(Platform.OS==="web"&&!window.confirm("Delete this service?"))return;await vendorApi.deleteService(id);load()};
  return <SafeAreaView style={s.root} edges={["top"]}>
    <View style={s.header}>
      <Pressable onPress={()=>router.back()}><MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text}/></Pressable>
      <Text style={s.title}>My Services</Text>
      <Pressable onPress={openAdd}><MaterialCommunityIcons name="plus-circle" size={26} color={COLORS.brand}/></Pressable>
    </View>
    <FlatList data={items} numColumns={2} keyExtractor={x=>x.id} contentContainerStyle={{padding:SPACING.lg}} columnWrapperStyle={{gap:10}} ItemSeparatorComponent={()=> <View style={{height:10}}/>}
      renderItem={({item})=><View style={s.card}>
        {item.image?<Image source={{uri:item.image}} style={s.img} contentFit="cover"/>:<View style={[s.img,s.ph]}><MaterialCommunityIcons name="briefcase-outline" size={28} color={COLORS.brand}/></View>}
        <Text style={s.name} numberOfLines={1}>{item.name}</Text>
        {!!item.category&&<Text style={s.meta} numberOfLines={1}>{item.category}</Text>}
        <View style={s.actions}><Pressable onPress={()=>openEdit(item)}><MaterialCommunityIcons name="pencil-outline" size={18} color={COLORS.brand}/></Pressable><Pressable onPress={()=>remove(item.id)}><MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.error}/></Pressable></View>
      </View>)}
      ListEmptyComponent={<View style={s.empty}><MaterialCommunityIcons name="briefcase-outline" size={44} color={COLORS.textMuted}/><Text style={s.emptyText}>No services yet</Text><Text style={s.meta}>Add your first service with +</Text></View>}
    />
    <Modal visible={modal} transparent animationType="slide"><View style={m.back}><KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined} style={m.sheet}>
      <Text style={m.title}>{editing?"Edit Service":"Add Service"}</Text>
      <Input ph="Service Name *" v={f.name} set={(v:string)=>setF({...f,name:v})}/>
      <Input ph="Category (Holiday / Car Rental / Plumber etc.)" v={f.category} set={(v:string)=>setF({...f,category:v})}/>
      <Input ph="Description" v={f.description} set={(v:string)=>setF({...f,description:v})}/>
      <Input ph="Phone" v={f.phone} set={(v:string)=>setF({...f,phone:v})}/>
      <Input ph="Display Order" v={f.order} set={(v:string)=>setF({...f,order:v})}/>
      <ImageUploader value={f.image} onChange={(uri)=>setF({...f,image:uri})} label="Service Image" aspect={[1,1]}/>
      <View style={{flexDirection:"row",gap:8,marginTop:8}}><Pressable onPress={()=>setModal(false)} style={[m.btn,m.ghost]}><Text style={m.ghostText}>Cancel</Text></Pressable><Pressable onPress={save} style={[m.btn,m.primary]}><Text style={m.btnText}>{editing?"Save Changes":"Create"}</Text></Pressable></View>
    </KeyboardAvoidingView></View></Modal>
  </SafeAreaView>;
}
function Input({ph,v,set}:any){return <TextInput placeholder={ph} value={v} onChangeText={set} placeholderTextColor={COLORS.textMuted} style={m.input}/>}
const s=StyleSheet.create({root:{flex:1,backgroundColor:COLORS.surfaceSecondary},header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:SPACING.lg,backgroundColor:"#fff"},title:{fontSize:18,fontWeight:"800",color:COLORS.text},card:{flex:1,backgroundColor:"#fff",padding:10,borderRadius:RADIUS.md,borderWidth:1,borderColor:COLORS.border,alignItems:"center",position:"relative"},img:{width:90,height:90,borderRadius:12,backgroundColor:COLORS.surfaceTertiary},ph:{alignItems:"center",justifyContent:"center"},name:{fontWeight:"800",color:COLORS.text,marginTop:8},meta:{fontSize:11,color:COLORS.textSecondary,marginTop:3},actions:{position:"absolute",top:8,right:8,flexDirection:"row",gap:8},empty:{alignItems:"center",padding:40,flex:1},emptyText:{fontWeight:"800",fontSize:16,color:COLORS.text,marginTop:10}});
const m=StyleSheet.create({back:{flex:1,backgroundColor:"rgba(0,0,0,.5)",justifyContent:"flex-end"},sheet:{backgroundColor:"#fff",padding:SPACING.lg,borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight:"92%"},title:{fontSize:18,fontWeight:"800",color:COLORS.text,marginBottom:12},input:{backgroundColor:COLORS.surfaceSecondary,borderRadius:RADIUS.md,padding:12,marginBottom:8,borderWidth:1,borderColor:COLORS.border},btn:{flex:1,padding:14,borderRadius:RADIUS.pill,alignItems:"center"},primary:{backgroundColor:COLORS.brand},btnText:{color:"#fff",fontWeight:"800"},ghost:{borderWidth:1,borderColor:COLORS.border},ghostText:{color:COLORS.textSecondary,fontWeight:"700"}});
