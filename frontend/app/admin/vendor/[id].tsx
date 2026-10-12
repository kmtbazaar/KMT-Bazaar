import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, Alert, ActivityIndicator, ScrollView, Platform } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { adminApi } from "@/src/roleApi";
import { api, uploadImageAsset } from "@/src/api";
import { COLORS, RADIUS } from "@/src/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AdminVendorProducts from "@/src/components/AdminVendorProducts";

export default function AdminVendorManage() {
  const { id } = useLocalSearchParams<{id:string}>();
  const router = useRouter();
  const [vendor,setVendor]=useState<any>(null);
  const [stores,setStores]=useState<any[]>([]);
  const [products,setProducts]=useState<any[]>([]);
  const [selectedStoreId,setSelectedStoreId]=useState("");
  const [categories,setCategories]=useState<any[]>([]);
  const [itemCategories,setItemCategories]=useState<any[]>([]);
  const [store,setStore]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [search,setSearch]=useState("");
  const [lowStock,setLowStock]=useState(false);
  const [showStore,setShowStore]=useState(false);
  const [showProduct,setShowProduct]=useState(false);
  const [editProduct,setEditProduct]=useState<any>(null);
  const [itemName,setItemName]=useState("");
  const [editingItem,setEditingItem]=useState<string|null>(null);
  const [storeForm,setStoreForm]=useState<any>({name:"",address:"",category_id:"",image:"",delivery_min:30});
  const emptyProduct={name:"",price:"",mrp:"",stock:"10",unit:"1 pc",image:"",description:"",trending:false,item_category_id:"",item_category:""};
  const [productForm,setProductForm]=useState<any>(emptyProduct);

  const load=useCallback(async()=>{
    if(!id)return;
    try{
      const [v,c]=await Promise.all([adminApi.vendorStores(String(id)),api.categories()]);
      const list=v?.stores||[];
      setVendor(v?.vendor||null); setStores(list); setCategories(c||[]);
      const all=await adminApi.products();
      const ids=new Set(list.map((x:any)=>String(x.id)));
      setProducts((all||[]).filter((p:any)=>ids.has(String(p.store_id))));
      if(list.length){
        const active=store && list.find((x:any)=>String(x.id)===String(store.id)) || list[0];
        setSelectedStoreId(String(active.id));
        setStore(active);
        setStoreForm({name:active.name||"",address:active.address||"",category_id:active.category_id||"",image:active.image||"",delivery_min:active.delivery_min||30});
        const ic=await adminApi.storeItemCategories(active.id);
        setItemCategories(ic||[]);
      }
    }catch(e:any){Alert.alert("Load failed",e?.message||"Could not load vendor.");}
  },[id]);
  useFocusEffect(useCallback(()=>{load()},[load]));

  const selectStore=async(s:any)=>{
    setSelectedStoreId(String(s.id || s._id));
    setStore(s); setStoreForm({name:s.name||"",address:s.address||"",category_id:s.category_id||"",image:s.image||"",delivery_min:s.delivery_min||30});
    try{setItemCategories(await adminApi.storeItemCategories(s.id)||[])}catch{}
  };

  const storeProducts=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return products.filter(p=>String(p.store_id)===String(store?.id) && (!q||String(p.name||"").toLowerCase().includes(q)) && (!lowStock||Number(p.stock||0)<=5));
  },[products,store,search,lowStock]);

  const saveStore=async()=>{
    if(!storeForm.name.trim()||!storeForm.address.trim())return Alert.alert("Required","Store name and address are required.");
    setLoading(true); try{await adminApi.updateStore(store.id,{...storeForm,delivery_min:Number(storeForm.delivery_min)||30});setShowStore(false);await load();}catch(e:any){Alert.alert("Error",e?.message||"Could not update store.");}finally{setLoading(false)}
  };

  const pickStoreImage=async()=>{
    const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:ImagePicker.MediaTypeOptions.Images,allowsEditing:true,aspect:[2,1],quality:.6});
    if(!r.canceled&&r.assets[0]){try{setLoading(true);const u=await uploadImageAsset(r.assets[0]);setStoreForm((x:any)=>({...x,image:u}))}finally{setLoading(false)}}
  };

  const saveItem=async()=>{
    const name=itemName.trim(); if(!name||!store)return;
    try{
      if(editingItem) await adminApi.updateStoreItemCategory(store.id,editingItem,{name});
      else await adminApi.createStoreItemCategory(store.id,{name});
      setItemName("");setEditingItem(null);setItemCategories(await adminApi.storeItemCategories(store.id)||[]);await load();
    }catch(e:any){Alert.alert("Error",e?.message||"Could not save item category.")}
  };
  const deleteItem=async(item:any)=>{
    try{await adminApi.deleteStoreItemCategory(store.id,item.id);setItemCategories(await adminApi.storeItemCategories(store.id)||[]);await load()}catch(e:any){Alert.alert("Error",e?.message||"Could not remove category.")}
  };

  const toggleProduct=async(p:any)=>{
    setLoading(true);try{
      await adminApi.updateProduct(p.id,{...p,is_available:p.is_available===false?true:false});
      await load();
    }catch(e:any){Alert.alert("Error",e?.message||"Could not change availability.")}finally{setLoading(false)}
  };
  const openProduct=(p?:any)=>{
    setEditProduct(p||null);
    setProductForm(p?{name:p.name||"",price:String(p.price??""),mrp:String(p.mrp??p.price??""),stock:String(p.stock??0),unit:p.unit||"1 pc",image:p.image||"",description:p.description||"",trending:!!p.trending,item_category_id:p.item_category_id||"",item_category:p.item_category||""}:{...emptyProduct});
    setShowProduct(true);
  };
  const saveProduct=async()=>{
    if(!productForm.name.trim()||!productForm.price||!store)return Alert.alert("Required","Product name and price are required.");
    setLoading(true);try{
      const payload={...productForm,store_id:store.id,category_id:store.category_id,price:Number(productForm.price),mrp:Number(productForm.mrp||productForm.price),stock:Number(productForm.stock||0),is_available:editProduct?editProduct.is_available!==false:true};
      if(editProduct) await adminApi.updateProduct(editProduct.id,payload); else await adminApi.createProduct(payload);
      setShowProduct(false);await load();
    }catch(e:any){Alert.alert("Error",e?.message||"Could not save product.")}finally{setLoading(false)}
  };
  const duplicate=async(p:any)=>{setLoading(true);try{await adminApi.createProduct({...p,id:undefined,name:(p.name||"Product")+" Copy",store_id:store.id,is_available:true}) ;await load()}catch(e:any){Alert.alert("Error","Could not duplicate product.")}finally{setLoading(false)}};
  const remove=async(p:any)=>{
    const ok=Platform.OS!=="web"||window.confirm("Delete "+p.name+"?");
    if(!ok)return;setLoading(true);try{await adminApi.deleteProduct(p.id);await load()}catch(e:any){Alert.alert("Error","Delete failed.")}finally{setLoading(false)}
  };
  const pickProductImage=async()=>{
    const r=await ImagePicker.launchImageLibraryAsync({mediaTypes:ImagePicker.MediaTypeOptions.Images,allowsEditing:true,aspect:[1,1],quality:.6});
    if(!r.canceled&&r.assets[0]){try{setLoading(true);const u=await uploadImageAsset(r.assets[0],"product");setProductForm((x:any)=>({...x,image:u}))}finally{setLoading(false)}}
  };

  return <SafeAreaView style={s.root} edges={["top","bottom"]}>
    <View style={s.header}>
      <Pressable onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text}/></Pressable>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={s.title}>{vendor?.name || "Vendor Manage"}</Text>
        <Text style={s.muted}>{vendor?.email || vendor?.phone || ""}</Text>
      </View>
      <View style={[s.status, vendor?.active === false ? s.off : s.on]}>
        <Text style={s.statusText}>{vendor?.active === false ? "SUSPENDED" : "ACTIVE"}</Text>
      </View>
    </View>
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      {stores.length > 1 ? (
        <View style={s.storeTabs}>
          {stores.map((x: any) => (
            <Pressable key={String(x.id)} onPress={() => selectStore(x)} style={[s.storeTab, String(x.id) === String(store?.id) && s.storeTabActive]}>
              <Text numberOfLines={1} style={s.storeTabText}>{x.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {store ? (
        <View style={s.hero}>
          <Image source={{ uri: storeForm.image || store.image }} style={s.heroImg} contentFit="cover"/>
          <View style={s.heroShade}/>
          <View style={s.heroText}>
            <Text style={s.heroTitle}>{store.name}</Text>
            <Text style={s.heroAddr}>{store.address}</Text>
          </View>
          <Pressable onPress={() => setShowStore(true)} style={s.editCircle}>
            <MaterialCommunityIcons name="pencil" size={19} color="#fff"/>
          </Pressable>
        </View>
      ) : (
        <Text style={s.empty}>{loading ? "Loading vendor store…" : "No store is linked to this vendor."}</Text>
      )}
      {store ? <AdminVendorProducts vendorId={String(id)} selectedStoreId={selectedStoreId} showStoreSelector={false} /> : null}
    </ScrollView>
    <Modal visible={showStore} transparent animationType="slide" onRequestClose={()=>setShowStore(false)}><View style={s.overlay}><View style={s.modal}><Text style={s.modalTitle}>Edit Store</Text><Pressable onPress={pickStoreImage} style={s.imageBox}>{storeForm.image?<Image source={{uri:storeForm.image}} style={s.preview} contentFit="cover"/>:<Text style={s.muted}>Add store image</Text>}</Pressable><TextInput value={storeForm.name} onChangeText={(v)=>setStoreForm((x:any)=>({...x,name:v}))} placeholder="Store name" style={s.input}/><TextInput value={storeForm.address} onChangeText={(v)=>setStoreForm((x:any)=>({...x,address:v}))} placeholder="Address" style={s.input}/><View style={s.rowBetween}><TextInput value={String(storeForm.delivery_min)} onChangeText={(v)=>setStoreForm((x:any)=>({...x,delivery_min:v}))} placeholder="Delivery minutes" keyboardType="number-pad" style={[s.input,{flex:1}]}/><Pressable onPress={()=>setShowStore(false)} style={s.secondary}><Text>Cancel</Text></Pressable><Pressable onPress={saveStore} style={s.primary}>{loading?<ActivityIndicator color="#fff"/>:<Text style={s.white}>Save</Text>}</Pressable></View></View></View></Modal>
  </SafeAreaView>;
}
const s=StyleSheet.create({
root:{flex:1,backgroundColor:"#F8FAFC"},header:{flexDirection:"row",alignItems:"center",padding:16,backgroundColor:"#fff",borderBottomWidth:1,borderColor:"#E2E8F0"},title:{fontSize:19,fontWeight:"900",color:COLORS.text},muted:{fontSize:12,color:"#64748B",marginTop:3},status:{paddingHorizontal:10,paddingVertical:6,borderRadius:20},on:{backgroundColor:"#DCFCE7"},off:{backgroundColor:"#FEE2E2"},statusText:{fontSize:10,fontWeight:"900"},storeTabs:{flexDirection:"row",gap:8,marginBottom:12},storeTab:{paddingHorizontal:13,paddingVertical:9,borderRadius:20,backgroundColor:"#E2E8F0"},storeTabActive:{backgroundColor:"#2563EB"},storeTabText:{fontSize:12,fontWeight:"800",color:"#334155"},hero:{height:190,borderRadius:18,overflow:"hidden",marginBottom:12,backgroundColor:"#CBD5E1"},heroImg:{width:"100%",height:"100%"},heroShade:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(0,0,0,.3)"},heroText:{position:"absolute",left:16,bottom:16},heroTitle:{fontSize:22,fontWeight:"900",color:"#fff"},heroAddr:{fontSize:12,color:"#fff",marginTop:4},editCircle:{position:"absolute",right:14,top:14,width:40,height:40,borderRadius:20,backgroundColor:"rgba(0,0,0,.55)",alignItems:"center",justifyContent:"center"},card:{backgroundColor:"#fff",borderRadius:16,padding:14,marginBottom:14,borderWidth:1,borderColor:"#E2E8F0"},section:{fontSize:16,fontWeight:"900",color:COLORS.text},rowBetween:{flexDirection:"row",alignItems:"center",gap:8,marginBottom:10},itemRow:{flexDirection:"row",gap:8},input:{backgroundColor:"#F8FAFC",borderWidth:1,borderColor:"#CBD5E1",borderRadius:10,paddingHorizontal:12,paddingVertical:10,fontSize:13,color:"#0F172A",marginBottom:8},addBtn:{width:44,height:44,borderRadius:10,backgroundColor:"#2563EB",alignItems:"center",justifyContent:"center"},chips:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:8},chip:{flexDirection:"row",alignItems:"center",gap:6,paddingHorizontal:10,paddingVertical:7,borderRadius:18,backgroundColor:"#EFF6FF"},chipText:{fontSize:12,fontWeight:"800",color:"#334155"},primary:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:5,paddingHorizontal:12,paddingVertical:9,borderRadius:10,backgroundColor:"#2563EB"},white:{color:"#fff",fontWeight:"900"},tools:{flexDirection:"row",gap:8,marginBottom:10},filter:{paddingHorizontal:12,paddingVertical:10,borderRadius:10,borderWidth:1,borderColor:"#F59E0B",justifyContent:"center"},filterOn:{backgroundColor:"#F59E0B"},filterText:{fontSize:12,fontWeight:"800",color:"#92400E"},product:{flexDirection:"row",alignItems:"center",gap:10,backgroundColor:"#fff",borderRadius:14,padding:10,borderWidth:1,borderColor:"#E2E8F0"},thumb:{width:54,height:54,borderRadius:10,backgroundColor:"#F1F5F9"},productName:{fontSize:14,fontWeight:"800",color:COLORS.text},productActions:{flexDirection:"row",gap:12,alignItems:"center"},empty:{textAlign:"center",color:"#64748B",padding:30},overlay:{flex:1,backgroundColor:"rgba(15,23,42,.45)",justifyContent:"flex-end"},modal:{backgroundColor:"#fff",padding:18,borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight:"90%"},modalTitle:{fontSize:20,fontWeight:"900",marginBottom:14,color:COLORS.text},imageBox:{height:150,borderRadius:14,borderWidth:1,borderColor:"#CBD5E1",borderStyle:"dashed",alignItems:"center",justifyContent:"center",marginBottom:10,overflow:"hidden"},preview:{width:"100%",height:"100%"},two:{flexDirection:"row",gap:8},check:{flexDirection:"row",alignItems:"center",gap:7,marginVertical:6},modalActions:{flexDirection:"row",justifyContent:"flex-end",gap:8,marginTop:8},secondary:{paddingHorizontal:15,paddingVertical:11,borderRadius:10,backgroundColor:"#E2E8F0"}});
