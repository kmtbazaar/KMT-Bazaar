import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { adminApi } from "@/src/roleApi";
import { COLORS, RADIUS, SPACING } from "@/src/theme";
import ImageUploader from "@/src/components/ImageUploader";

const EMPTY = { name: "", vendor_name: "", description: "", image: "", category: "", phone: "", order: "99", active: true };

export default function AdminVendorServices() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [f, setF] = useState<any>({ ...EMPTY });

  const load = useCallback(async () => {
    try { setItems(await adminApi.vendorServices()); } catch (e) { console.log("Vendor services load error", e); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => { setEditingId(null); setF({ ...EMPTY }); setModal(true); };
  const openEdit = (item: any) => {
    setEditingId(item.id);
    setF({
      name: item.name || "", vendor_name: item.vendor_name || "", description: item.description || "",
      image: item.image || "", category: item.category || "", phone: item.phone || "",
      order: String(item.order ?? 99), active: item.active !== false
    });
    setModal(true);
  };

  const save = async () => {
    if (!f.name.trim()) {
      Platform.OS === "web" ? window.alert("Service name is required") : Alert.alert("Required", "Service name is required");
      return;
    }
    const data = { ...f, name: f.name.trim(), order: Number(f.order) || 99 };
    if (editingId) await adminApi.updateVendorService(editingId, data);
    else await adminApi.createVendorService(data);
    setModal(false); setEditingId(null); setF({ ...EMPTY }); load();
  };

  const remove = async (id: string) => {
    const ok = Platform.OS === "web" ? window.confirm("Delete this vendor service?") : true;
    if (!ok) return;
    await adminApi.deleteVendorService(id);
    load();
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} /></Pressable>
        <Text style={s.title}>Vendor Service ({items.length})</Text>
        <Pressable onPress={openAdd} hitSlop={10}><MaterialCommunityIcons name="plus-circle" size={26} color={COLORS.brand} /></Pressable>
      </View>
      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        numColumns={2}
        contentContainerStyle={{ padding: SPACING.lg }}
        columnWrapperStyle={{ gap: 10 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <View style={s.card}>
            {item.image ? <Image source={{ uri: item.image }} style={s.img} contentFit="cover" /> : <View style={[s.img, s.placeholder]}><MaterialCommunityIcons name="briefcase-outline" size={30} color={COLORS.brand} /></View>}
            <Text style={s.name} numberOfLines={1}>{item.name}</Text>
            {!!item.vendor_name && <Text style={s.vendor} numberOfLines={1}>{item.vendor_name}</Text>}
            <Text style={[s.status, { color: item.active !== false ? "#16A34A" : COLORS.textMuted }]}>{item.active !== false ? "ACTIVE" : "HIDDEN"}</Text>
            <View style={s.actions}>
              <Pressable onPress={() => openEdit(item)}><MaterialCommunityIcons name="pencil-outline" size={18} color={COLORS.brand} /></Pressable>
              <Pressable onPress={() => remove(item.id)}><MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.error} /></Pressable>
            </View>
          </View>
        )}
      />
      <Modal visible={modal} transparent animationType="slide">
        <View style={m.backdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={m.sheet}>
            <Text style={m.title}>{editingId ? "Edit Vendor Service" : "Add Vendor Service"}</Text>
            <Input ph="Service Name *" v={f.name} oc={(v:string)=>setF({...f,name:v})} />
            <Input ph="Vendor Name" v={f.vendor_name} oc={(v:string)=>setF({...f,vendor_name:v})} />
            <Input ph="Category" v={f.category} oc={(v:string)=>setF({...f,category:v})} />
            <Input ph="Description" v={f.description} oc={(v:string)=>setF({...f,description:v})} />
            <Input ph="Phone" v={f.phone} oc={(v:string)=>setF({...f,phone:v})} keyboardType="phone-pad" />
            <Input ph="Display Order" v={f.order} oc={(v:string)=>setF({...f,order:v})} keyboardType="numeric" />
            <ImageUploader value={f.image} onChange={(uri)=>setF({...f,image:uri})} label="Service Image" aspect={[1,1]} />
            <View style={{flexDirection:"row",gap:8,marginTop:8}}>
              <Pressable onPress={()=>setModal(false)} style={[m.btn,m.ghost]}><Text style={m.ghostText}>Cancel</Text></Pressable>
              <Pressable onPress={save} style={[m.btn,m.primary]}><Text style={m.btnText}>{editingId ? "Save Changes" : "Create"}</Text></Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Input({ph,v,oc,keyboardType}:any) {
  return <TextInput placeholder={ph} value={v} onChangeText={oc} keyboardType={keyboardType} placeholderTextColor={COLORS.textMuted} style={m.input} />;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.surfaceSecondary},
  header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:SPACING.lg,paddingVertical:SPACING.md,backgroundColor:"#fff"},
  title:{fontSize:18,fontWeight:"800",color:COLORS.text},
  card:{flex:1,backgroundColor:"#fff",padding:12,borderRadius:RADIUS.md,borderWidth:1,borderColor:COLORS.border,alignItems:"center",position:"relative"},
  img:{width:80,height:80,borderRadius:12,backgroundColor:COLORS.surfaceTertiary},
  placeholder:{alignItems:"center",justifyContent:"center"},
  name:{fontWeight:"800",color:COLORS.text,marginTop:8},
  vendor:{fontSize:11,color:COLORS.textSecondary,marginTop:3},
  status:{fontSize:10,fontWeight:"800",marginTop:5},
  actions:{position:"absolute",top:8,right:8,flexDirection:"row",gap:8}
});
const m=StyleSheet.create({
  backdrop:{flex:1,backgroundColor:"rgba(0,0,0,.5)",justifyContent:"flex-end"},
  sheet:{backgroundColor:"#fff",padding:SPACING.lg,borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight:"92%"},
  title:{fontSize:18,fontWeight:"800",color:COLORS.text,marginBottom:12},
  input:{backgroundColor:COLORS.surfaceSecondary,borderRadius:RADIUS.md,padding:12,marginBottom:8,borderWidth:1,borderColor:COLORS.border},
  btn:{flex:1,padding:14,borderRadius:RADIUS.pill,alignItems:"center"},
  primary:{backgroundColor:COLORS.brand},btnText:{color:"#fff",fontWeight:"800"},
  ghost:{borderWidth:1,borderColor:COLORS.border},ghostText:{color:COLORS.textSecondary,fontWeight:"700"}
});