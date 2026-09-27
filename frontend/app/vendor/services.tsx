import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { vendorApi } from "@/src/roleApi";
import { useAuth } from "@/src/AuthContext";
import { COLORS, RADIUS, SPACING } from "@/src/theme";
import ImageUploader from "@/src/components/ImageUploader";

const EMPTY = {
  name: "", vendor_name: "", description: "", image: "", gallery: [],
  location: "", category: "", type: "", phone: "", order: "99", active: true,
  price: "", adult_price: "", child_price: "", unit: "day", duration: "", seats: "", bags: "",
  transmission: "Automatic", fuel: "Petrol", tag: "", includesText: ""
};

const CAR_TYPES = ["Sedan", "SUV", "MUV", "Traveller", "Hatchback", "Luxury"];
const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Electric"];
const TRANSMISSIONS = ["Automatic", "Manual"];

export default function VendorServices() {
  const router = useRouter();
  const { user } = useAuth();
  const serviceType = user?.service_type || "holiday";
  const isCar = serviceType === "car_rental";
  const currentLabel = isCar ? "Car Rental" : "Holiday";
  const [items, setItems] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [f, setF] = useState<any>({ ...EMPTY });

  const load = useCallback(async () => {
    try { setItems(await vendorApi.services()); } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const baseForm = (x?: any) => ({
    ...EMPTY,
    ...x,
    gallery: Array.isArray(x?.gallery) ? x.gallery : [],
    order: String(x?.order ?? 99),
    price: String(x?.price ?? ""),
    adult_price: String(x?.adult_price ?? x?.price ?? ""),
    child_price: String(x?.child_price ?? ((Number(x?.adult_price ?? x?.price) || 0) * 0.5 || "")),
    duration: String(x?.duration ?? ""),
    seats: String(x?.seats ?? ""),
    bags: String(x?.bags ?? ""),
    transmission: x?.transmission || "Automatic",
    fuel: x?.fuel || "Petrol",
    includesText: Array.isArray(x?.includes) ? x.includes.join(", ") : (x?.includesText || "")
  });

  const openAdd = () => {
    setEditing(null);
    setF({ ...EMPTY, unit: isCar ? "day" : "per person" });
    setModal(true);
  };

  const openEdit = (x: any) => {
    setEditing(x.id);
    setF(baseForm(x));
    setModal(true);
  };

  const save = async () => {
    if (!f.name?.trim()) {
      Platform.OS === "web" ? window.alert(isCar ? "Car name is required" : "Holiday package name is required") : Alert.alert("Required", isCar ? "Car name is required" : "Holiday package name is required");
      return;
    }
    const includes = String(f.includesText || "").split(",").map((x: string) => x.trim()).filter(Boolean);
    const data = {
      name: f.name.trim(),
      vendor_name: String(f.vendor_name || user?.name || "").trim(),
      description: String(f.description || "").trim(),
      image: f.image || "",
      gallery: Array.isArray(f.gallery) ? f.gallery.filter(Boolean).slice(0, 5) : [],
      location: String(f.location || "").trim(),
      category: String(f.category || "").trim(),
      type: String(f.type || "").trim(),
      phone: String(f.phone || "").trim(),
      order: Number(f.order) || 99,
      active: f.active !== false,
      price: Number(f.adult_price || f.price) || 0,
      adult_price: Number(f.adult_price || f.price) || 0,
      child_price: isCar ? 0 : (Number(f.child_price) || ((Number(f.adult_price || f.price) || 0) * 0.5)),
      unit: isCar ? "day" : "per person",
      duration: String(f.duration || "").trim(),
      seats: isCar ? (Number(f.seats) || 0) : 0,
      bags: isCar ? (Number(f.bags) || 0) : 0,
      transmission: isCar ? String(f.transmission || "") : "",
      fuel: isCar ? String(f.fuel || "") : "",
      tag: String(f.tag || "").trim(),
      includes,
      service_type: serviceType
    };
    try {
      if (editing) await vendorApi.updateService(editing, data);
      else await vendorApi.createService(data);
      setModal(false);
      await load();
      if (Platform.OS === "web") window.alert(editing ? "Saved and live" : "Service added and live");
      else Alert.alert("Saved", editing ? "Changes are live" : "Service is live");
    } catch (e: any) {
      const msg = e?.message || "Could not save service.";
      Platform.OS === "web" ? window.alert(msg) : Alert.alert("Save failed", msg);
    }
  };

  const remove = async (id: string) => {
    if (Platform.OS === "web" && !window.confirm("Delete this service?")) return;
    try { await vendorApi.deleteService(id); await load(); } catch (e: any) {
      const msg = e?.message || "Could not delete service.";
      Platform.OS === "web" ? window.alert(msg) : Alert.alert("Delete failed", msg);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
        </Pressable>
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text style={s.title}>{isCar ? "Rental Fleet" : "Holiday Packages"}</Text>
          <Text style={{ fontSize: 10, color: isCar ? "#0EA5E9" : "#2563EB", fontWeight: "900", marginTop: 2 }}>
            {isCar ? "CAR RENTAL VENDOR" : "HOLIDAY VENDOR"}
          </Text>
        </View>
        <Pressable onPress={openAdd} hitSlop={10}>
          <MaterialCommunityIcons name="plus-circle" size={27} color={isCar ? "#0EA5E9" : "#2563EB"} />
        </Pressable>
      </View>

      <FlatList
        data={items}
        numColumns={2}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        columnWrapperStyle={{ gap: 10 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <View style={s.card}>
            {item.image ? <Image source={{ uri: item.image }} style={s.img} contentFit="cover" /> : <View style={[s.img, s.ph]}><MaterialCommunityIcons name={isCar ? "car" : "airplane-takeoff"} size={30} color={isCar ? "#0EA5E9" : "#2563EB"} /></View>}
            <View style={{ width: "100%" }}>
              <Text style={s.name} numberOfLines={2}>{item.name}</Text>
              {isCar ? (
                <>
                  {!!item.type && <Text style={s.meta} numberOfLines={1}>{item.type}{item.transmission ? " · " + item.transmission : ""}</Text>}
                  <Text style={s.meta}>{Number(item.seats || 0)} seats · {Number(item.bags || 0)} bags</Text>
                  <Text style={s.price}>₹{Number(item.price || 0).toLocaleString("en-IN")} / day</Text>
                </>
              ) : (
                <>
                  {!!item.location && <Text style={s.meta} numberOfLines={1}>{item.location}</Text>}
                  <Text style={s.meta}>{item.duration || "Flexible trip"}</Text>
                  <Text style={s.price}>₹{Number(item.price || 0).toLocaleString("en-IN")} / person</Text>
                </>
              )}
            </View>
            <View style={s.actions}>
              <Pressable onPress={() => openEdit(item)} hitSlop={8}><MaterialCommunityIcons name="pencil-outline" size={19} color={isCar ? "#0EA5E9" : "#2563EB"} /></Pressable>
              <Pressable onPress={() => remove(item.id)} hitSlop={8}><MaterialCommunityIcons name="trash-can-outline" size={19} color={COLORS.error} /></Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={s.empty}><MaterialCommunityIcons name={isCar ? "car-off" : "airplane-off"} size={46} color={COLORS.textMuted}/><Text style={s.emptyText}>No {isCar ? "cars" : "holiday packages"} yet</Text><Text style={s.meta}>Tap + to add your first {isCar ? "rental car" : "holiday package"}.</Text></View>}
      />

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={m.back}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={m.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 28 }}>
              <Text style={m.title}>{editing ? (isCar ? "Edit Rental Car" : "Edit Holiday Package") : (isCar ? "Add Rental Car" : "Add Holiday Package")}</Text>
              <Text style={m.helper}>Save करने के बाद listing live catalog में दिखाई देगी.</Text>

              <Field label={isCar ? "Car Name *" : "Package Name *"} value={f.name} onChange={(v:any)=>setF({...f,name:v})} placeholder={isCar ? "Toyota Innova Crysta" : "Goa Beach Escape"} />

              {isCar ? (
                <>
                  <SelectRow label="Vehicle Type" options={CAR_TYPES} value={f.type} onChange={(v:any)=>setF({...f,type:v})} />
                  <Field label="Category / Use" value={f.category} onChange={(v:any)=>setF({...f,category:v})} placeholder="Self Drive / With Driver / Airport & City" />
                  <Field label="Location / Pickup City" value={f.location} onChange={(v:any)=>setF({...f,location:v})} placeholder="Patna" />
                  <View style={m.two}>
                    <Field label="Seats" value={f.seats} onChange={(v:any)=>setF({...f,seats:v})} placeholder="7" keyboardType="numeric" />
                    <Field label="Bags" value={f.bags} onChange={(v:any)=>setF({...f,bags:v})} placeholder="4" keyboardType="numeric" />
                  </View>
                  <SelectRow label="Transmission" options={TRANSMISSIONS} value={f.transmission} onChange={(v:any)=>setF({...f,transmission:v})} />
                  <SelectRow label="Fuel" options={FUEL_TYPES} value={f.fuel} onChange={(v:any)=>setF({...f,fuel:v})} />
                  <Field label="Price / Day (₹)" value={f.price} onChange={(v:any)=>setF({...f,price:v})} placeholder="3200" keyboardType="numeric" />
                  <Field label="Tag" value={f.tag} onChange={(v:any)=>setF({...f,tag:v})} placeholder="Family favourite" />
                  <Field label="Description" value={f.description} onChange={(v:any)=>setF({...f,description:v})} placeholder="Premium 7-seater..." multiline />
                  <Field label="Phone" value={f.phone} onChange={(v:any)=>setF({...f,phone:v})} placeholder="Vendor contact" keyboardType="phone-pad" />
                </>
              ) : (
                <>
                  <Field label="Destination / Location" value={f.location} onChange={(v:any)=>setF({...f,location:v})} placeholder="Goa" />
                  <Field label="Category" value={f.category} onChange={(v:any)=>setF({...f,category:v})} placeholder="Beach / Mountains / Spiritual" />
                  <View style={m.two}>
                    <Field label="Duration" value={f.duration} onChange={(v:any)=>setF({...f,duration:v})} placeholder="4 nights / 5 days" />
                    <View style={m.two}>
                      <Field label="Adult Price / Person (₹)" value={f.adult_price || f.price} onChange={(v:any)=>setF({...f,adult_price:v,price:v})} placeholder="14999" keyboardType="numeric" />
                      <Field label="Child Price / Person (₹)" value={f.child_price} onChange={(v:any)=>setF({...f,child_price:v})} placeholder="7499" keyboardType="numeric" />
                    </View>
                    <Text style={m.priceHint}>Child price can be set separately. Default is 50% of adult price.</Text>
                  </View>
                  <Field label="Tag" value={f.tag} onChange={(v:any)=>setF({...f,tag:v})} placeholder="Best value" />
                  <Field label="Description" value={f.description} onChange={(v:any)=>setF({...f,description:v})} placeholder="Package details..." multiline />
                  <Field label="Includes" value={f.includesText} onChange={(v:any)=>setF({...f,includesText:v})} placeholder="Hotel, Breakfast, Transfer, Sightseeing" />
                  <Field label="Phone" value={f.phone} onChange={(v:any)=>setF({...f,phone:v})} placeholder="Vendor contact" keyboardType="phone-pad" />
                </>
              )}

              <ImageUploader value={f.image} onChange={(uri)=>setF({...f,image:uri})} label={isCar ? "Car Main Photo" : "Package Cover Photo"} aspect={[16,9]} />

              <Text style={m.galleryTitle}>{isCar ? "Car Photos · 2 Photos" : "Destination Gallery · Up to 5 Photos"}</Text>
              {(isCar ? [0,1] : [0,1,2,3,4]).map((i)=>
                <ImageUploader
                  key={i}
                  value={f.gallery?.[i] || ""}
                  onChange={(uri)=>setF({...f,gallery:Object.assign([],f.gallery || [], {[i]:uri}).slice(isCar ? 2 : 5)})}
                  label={isCar ? (i === 0 ? "Main Car Photo" : "Second Car Photo") : `Photo ${i+1}`}
                  aspect={[4,3]}
                />
              )}

              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <Pressable onPress={()=>setModal(false)} style={[m.btn,m.ghost]}><Text style={m.ghostText}>Cancel</Text></Pressable>
                <Pressable onPress={save} style={[m.btn,m.primary]}><Text style={m.btnText}>{editing ? "Save Changes" : "Add & Go Live"}</Text></Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType, multiline }: any) {
  return <View style={{ marginBottom: 9 }}>
    <Text style={m.label}>{label}</Text>
    <TextInput
      value={String(value ?? "")}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#94A3B8"
      keyboardType={keyboardType}
      multiline={multiline}
      style={[m.input, multiline && { minHeight: 72, textAlignVertical: "top" }]}
    />
  </View>;
}

function SelectRow({ label, options, value, onChange }: any) {
  return <View style={{ marginBottom: 10 }}>
    <Text style={m.label}>{label}</Text>
    <View style={m.selectWrap}>
      {options.map((x: string) => (
        <Pressable key={x} onPress={() => onChange(x)} style={[m.chip, value === x && m.chipActive]}>
          <Text style={[m.chipText, value === x && m.chipTextActive]}>{x}</Text>
        </Pressable>
      ))}
    </View>
  </View>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.surfaceSecondary},
  header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:SPACING.lg,backgroundColor:"#fff"},
  title:{fontSize:18,fontWeight:"900",color:COLORS.text},
  card:{flex:1,backgroundColor:"#fff",padding:11,borderRadius:RADIUS.md,borderWidth:1,borderColor:COLORS.border,position:"relative",overflow:"hidden"},
  img:{width:"100%",height:105,borderRadius:12,backgroundColor:COLORS.surfaceTertiary},
  ph:{alignItems:"center",justifyContent:"center"},
  name:{fontWeight:"900",color:COLORS.text,marginTop:9,fontSize:14},
  meta:{fontSize:11,color:COLORS.textSecondary,marginTop:3},
  price:{fontSize:13,fontWeight:"900",color:COLORS.brand,marginTop:7},
  actions:{position:"absolute",top:14,right:14,flexDirection:"row",gap:9,backgroundColor:"rgba(255,255,255,.92)",paddingHorizontal:7,paddingVertical:5,borderRadius:10},
  empty:{alignItems:"center",padding:40,flex:1},
  emptyText:{fontWeight:"900",fontSize:16,color:COLORS.text,marginTop:10},
});
const m=StyleSheet.create({
  back:{flex:1,backgroundColor:"rgba(0,0,0,.55)",justifyContent:"flex-end"},
  sheet:{backgroundColor:"#fff",padding:SPACING.lg,borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight:"94%"},
  title:{fontSize:19,fontWeight:"900",color:COLORS.text,marginBottom:4},
  helper:{fontSize:11,color:COLORS.textMuted,marginBottom:12},
  label:{fontSize:11,fontWeight:"900",color:COLORS.textSecondary,marginBottom:4},
  input:{backgroundColor:"#F8FAFC",borderRadius:RADIUS.md,padding:12,marginBottom:1,borderWidth:1,borderColor:COLORS.border,color:COLORS.text},
  two:{flexDirection:"row",gap:9},
  twoField:{flex:1},
  galleryTitle:{fontSize:13,fontWeight:"900",color:COLORS.text,marginTop:6,marginBottom:8},
  selectWrap:{flexDirection:"row",flexWrap:"wrap",gap:7},
  chip:{paddingHorizontal:12,paddingVertical:9,borderRadius:20,borderWidth:1,borderColor:COLORS.border,backgroundColor:"#fff"},
  chipActive:{backgroundColor:COLORS.brand,borderColor:COLORS.brand},
  chipText:{fontSize:11,fontWeight:"800",color:COLORS.textSecondary},
  chipTextActive:{color:"#fff"},
  btn:{flex:1,padding:14,borderRadius:RADIUS.pill,alignItems:"center"},
  primary:{backgroundColor:COLORS.brand},
  btnText:{color:"#fff",fontWeight:"900"},
  ghost:{borderWidth:1,borderColor:COLORS.border},
  ghostText:{color:COLORS.textSecondary,fontWeight:"800"},
});
