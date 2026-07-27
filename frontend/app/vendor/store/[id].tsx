import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, Alert, ActivityIndicator, ScrollView, Platform } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker"; 
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { vendorApi } from "@/src/roleApi";
import { api } from "@/src/api"; 
import { COLORS, RADIUS, shadow } from "@/src/theme";

export default function VendorStoreDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = params.id as string;
  const initialName = (params.name as string) || "Store Detail";
  const initialImage = (params.image as string) || "";
  const initialAddress = (params.address as string) || "";
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [editForm, setEditForm] = useState({ name: initialName, address: initialAddress, image: initialImage });

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: "", category_id: "", price: "", mrp: "", unit: "1 pc", stock: "10", image: "", description: "" });

  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [editProductForm, setEditProductForm] = useState({ name: "", category_id: "", price: "", mrp: "", unit: "1 pc", stock: "10", image: "", description: "" });

  const load = useCallback(async () => {
    try {
      const all = await vendorApi.products();
      setProducts(all.filter((p: any) => p.store_id === id));
      setCategories(await api.categories());
    } catch (e) {
      console.log(e);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [2, 1], quality: 0.6, base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setEditForm({ ...editForm, image: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  };

  const pickProductImage = async (isEditMode: boolean) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      const b64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      if (isEditMode) {
        setEditProductForm({ ...editProductForm, image: b64 });
      } else {
        setForm({ ...form, image: b64 });
      }
    }
  };

  const handleUpdateStore = async () => {
    if (!editForm.name) return Alert.alert("Error", "Shop name is required");
    setLoading(true);
    try {
      await vendorApi.updateStore(id, editForm);
      Alert.alert("Success", "Shop details updated!");
      setShowSettings(false);
    } catch (e) { Alert.alert("Error", "Update failed."); }
    finally { setLoading(false); }
  };

  // 🔥 Web + Native Safe Store Delete Logic
  const executeStoreDelete = async () => {
    try {
      if (vendorApi.deleteStore) {
        await vendorApi.deleteStore(id);
      } else {
        await vendorApi.updateStore(id, { is_deleted: true });
      }
      if (Platform.OS === 'web') {
        window.alert("Store deleted successfully.");
      } else {
        Alert.alert("Deleted", "Store has been deleted successfully.");
      }
      router.replace("/vendor");
    } catch (e: any) { 
      console.log("Delete Store Error:", e);
      const msg = e?.message || "Could not delete store. Please try again.";
      if (Platform.OS === 'web') window.alert("Error: " + msg);
      else Alert.alert("Error", msg); 
    }
  };

  const handleDeleteStore = () => {
    const warningMsg = `Are you sure you want to permanently delete '${editForm.name}'?\n\nThis action cannot be undone and all associated products will be removed.`;

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`⚠️ WARNING: DELETE STORE\n\n${warningMsg}`);
      if (confirmed) {
        executeStoreDelete();
      }
    } else {
      Alert.alert(
        "⚠️ Warning: Delete Store", 
        warningMsg, 
        [
          { text: "Cancel", style: "cancel" },
          { text: "Yes, Delete Store", style: "destructive", onPress: executeStoreDelete }
        ]
      );
    }
  };

  const handleAddProduct = async () => {
    if (!form.name || !form.price || !form.category_id) {
      Alert.alert("Error", "Name, Price, and Category are required.");
      return;
    }
    try {
      await vendorApi.createProduct({
        ...form, store_id: id,
        price: parseFloat(form.price), mrp: form.mrp ? parseFloat(form.mrp) : parseFloat(form.price), stock: parseInt(form.stock) || 0
      });
      setShowAddModal(false);
      setForm({ name: "", category_id: "", price: "", mrp: "", unit: "1 pc", stock: "10", image: "", description: "" });
      load();
    } catch (e) { Alert.alert("Error", "Could not add product."); }
  };

  const openEditProduct = (prod: any) => {
    setSelectedProductId(prod.id);
    setEditProductForm({
      name: prod.name, category_id: prod.category_id || "", price: String(prod.price), mrp: String(prod.mrp || prod.price),
      unit: prod.unit || "1 pc", stock: String(prod.stock || 0), image: prod.image || "", description: prod.description || ""
    });
    setShowEditProductModal(true);
  };

  const handleUpdateProduct = async () => {
    if (!editProductForm.name || !editProductForm.price) {
      Alert.alert("Error", "Name and Price are required.");
      return;
    }
    setLoading(true);
    try {
      await vendorApi.updateProduct(selectedProductId, {
        ...editProductForm, store_id: id, price: parseFloat(editProductForm.price),
        mrp: editProductForm.mrp ? parseFloat(editProductForm.mrp) : parseFloat(editProductForm.price), stock: parseInt(editProductForm.stock) || 0
      });
      Alert.alert("Success", "Product updated!");
      setShowEditProductModal(false);
      load();
    } catch (e) { Alert.alert("Error", "Failed to update product."); }
    finally { setLoading(false); }
  };

  const handleDelete = (prodId: string, prodName: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete Product: Are you sure you want to delete ${prodName}?`)) {
        vendorApi.deleteProduct(prodId).then(() => load()).catch(() => window.alert("Delete failed."));
      }
    } else {
      Alert.alert("Delete Product", `Are you sure you want to delete ${prodName}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            try { await vendorApi.deleteProduct(prodId); load(); } catch (e) { Alert.alert("Error", "Delete failed."); }
        }}
      ]);
    }
  };

  return (
    <View style={s.root}>
      
      {/* PERFECTLY PLACED FLOATING HEADER */}
      <View style={s.floatingHeader}>
        <Pressable onPress={() => router.back()} style={s.circleBtn} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </Pressable>
        
        <View style={s.rightActions}>
          <Pressable onPress={handleDeleteStore} style={[s.circleBtn, s.deleteBtn]} hitSlop={8}>
            <MaterialCommunityIcons name="trash-can-outline" size={20} color="#fff" />
          </Pressable>
          <Pressable onPress={() => setShowSettings(true)} style={s.circleBtn} hitSlop={8}>
            <MaterialCommunityIcons name="cog" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <>
            {/* Banner Image */}
            <View style={s.bannerWrap}>
              <Image source={{ uri: editForm.image }} style={s.bannerImg} contentFit="cover" />
            </View>

            {/* Store Details Card */}
            <View style={s.storeDetailsCard}>
              <Text style={s.storeTitleText}>{editForm.name}</Text>
              {editForm.address ? (
                <Text style={s.storeAddressText}>📍 {editForm.address}</Text>
              ) : null}
            </View>

            <Text style={s.listTitle}>My Products ({products.length})</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <Image source={{ uri: item.image }} style={s.img} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={s.name} numberOfLines={2}>{item.name}</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable onPress={() => openEditProduct(item)} hitSlop={10}>
                    <MaterialCommunityIcons name="pencil-outline" size={20} color={COLORS.brand} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(item.id, item.name)} hitSlop={10}>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.error} />
                  </Pressable>
                </View>
              </View>
              <Text style={s.meta}>{item.unit} · Stock: {item.stock}</Text>
              <Text style={s.price}>₹{item.price}</Text>
            </View>
          </View>
        )}
      />

      <Pressable style={s.fab} onPress={() => setShowAddModal(true)}>
        <MaterialCommunityIcons name="plus" size={30} color="#fff" />
      </Pressable>

      {/* SHOP SETTINGS MODAL */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Shop Settings</Text>
            <Pressable onPress={pickImage} style={s.imagePickerBtn}>
               {editForm.image ? <Image source={{ uri: editForm.image }} style={s.previewImg} /> : <Text style={{color: COLORS.textMuted}}>Change Banner</Text>}
            </Pressable>
            <TextInput value={editForm.name} onChangeText={(t) => setEditForm({...editForm, name: t})} style={s.input} placeholder="Shop Name" />
            <TextInput value={editForm.address} onChangeText={(t) => setEditForm({...editForm, address: t})} style={s.input} placeholder="Address" />
            <View style={s.modalActions}>
                <Pressable onPress={() => setShowSettings(false)} style={{padding: 10}}><Text>Cancel</Text></Pressable>
                <Pressable onPress={handleUpdateStore} style={s.saveBtnSmall}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={{color: '#fff', fontWeight: 'bold'}}>Save</Text>}
                </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD PRODUCT MODAL */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={s.modalOverlayBottom}>
          <View style={s.modalContentBottom}>
            <View style={s.modalHeader}><Text style={s.modalTitle}>Add Product</Text><Pressable onPress={() => setShowAddModal(false)}><MaterialCommunityIcons name="close" size={24} /></Pressable></View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Pressable onPress={() => pickProductImage(false)} style={s.prodImgPicker}>{form.image ? <Image source={{uri: form.image}} style={{width:'100%', height:'100%'}}/> : <Text>Select Image</Text>}</Pressable>
              <TextInput placeholder="Product Name" value={form.name} onChangeText={(t) => setForm({...form, name: t})} style={s.input} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {categories.map((c) => (
                  <Pressable key={c.id} style={[s.chip, form.category_id === c.id && s.chipActive]} onPress={() => setForm({...form, category_id: c.id})}><Text style={form.category_id === c.id ? {color: COLORS.brand} : {}}>{c.name}</Text></Pressable>
                ))}
              </ScrollView>
              <View style={{flexDirection:'row', gap:10}}><TextInput placeholder="Price" value={form.price} onChangeText={(t) => setForm({...form, price: t})} style={[s.input, {flex:1}]} keyboardType="numeric"/><TextInput placeholder="MRP" value={form.mrp} onChangeText={(t) => setForm({...form, mrp: t})} style={[s.input, {flex:1}]} keyboardType="numeric"/></View>
              <View style={{flexDirection:'row', gap:10}}><TextInput placeholder="Unit" value={form.unit} onChangeText={(t) => setForm({...form, unit: t})} style={[s.input, {flex:1}]}/><TextInput placeholder="Stock" value={form.stock} onChangeText={(t) => setForm({...form, stock: t})} style={[s.input, {flex:1}]} keyboardType="numeric"/></View>
              <Pressable onPress={handleAddProduct} style={s.saveBtnBig}><Text style={{color:'#fff', fontWeight:'800'}}>Save Product</Text></Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* EDIT PRODUCT MODAL */}
      <Modal visible={showEditProductModal} transparent animationType="slide">
        <View style={s.modalOverlayBottom}>
          <View style={s.modalContentBottom}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Product Details</Text>
              <Pressable onPress={() => setShowEditProductModal(false)}><MaterialCommunityIcons name="close" size={24} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Pressable onPress={() => pickProductImage(true)} style={s.prodImgPicker}>
                {editProductForm.image ? <Image source={{uri: editProductForm.image}} style={{width:'100%', height:'100%'}}/> : <Text>Change Image</Text>}
              </Pressable>
              
              <Text style={s.labelHeading}>Product Name</Text>
              <TextInput placeholder="Product Name" value={editProductForm.name} onChangeText={(t) => setEditProductForm({...editProductForm, name: t})} style={s.input} />
              
              <View style={{flexDirection:'row', gap:10}}>
                <View style={{flex: 1}}><Text style={s.labelHeading}>Price (₹)</Text><TextInput value={editProductForm.price} onChangeText={(t) => setEditProductForm({...editProductForm, price: t})} style={s.input} keyboardType="numeric"/></View>
                <View style={{flex: 1}}><Text style={s.labelHeading}>MRP (₹)</Text><TextInput value={editProductForm.mrp} onChangeText={(t) => setEditProductForm({...editProductForm, mrp: t})} style={s.input} keyboardType="numeric"/></View>
              </View>

              <View style={{flexDirection:'row', gap:10}}>
                <View style={{flex: 1}}><Text style={s.labelHeading}>Unit</Text><TextInput value={editProductForm.unit} onChangeText={(t) => setEditProductForm({...editProductForm, unit: t})} style={s.input}/></View>
                <View style={{flex: 1}}><Text style={s.labelHeading}>Stock Qty</Text><TextInput value={editProductForm.stock} onChangeText={(t) => setEditProductForm({...editProductForm, stock: t})} style={s.input} keyboardType="numeric"/></View>
              </View>
              
              <Text style={s.labelHeading}>Description</Text>
              <TextInput placeholder="Description" value={editProductForm.description} onChangeText={(t) => setEditProductForm({...editProductForm, description: t})} style={[s.input, {height: 60}]} multiline/>

              <Pressable onPress={handleUpdateProduct} style={s.saveBtnBig}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={{color:'#fff', fontWeight:'800'}}>Update Changes</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  
  // 🌟 Clean Header Styles
  floatingHeader: {
    position: 'absolute',
    top: 16, 
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1000, 
    elevation: 20,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  circleBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(0,0,0,0.45)', 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    ...shadow.soft
  },
  deleteBtn: {
    backgroundColor: '#dc2626',
    borderColor: '#b91c1c',
  },

  bannerWrap: { width: "100%", height: 210, backgroundColor: '#e2e8f0' },
  bannerImg: { width: "100%", height: "100%" },
  
  storeDetailsCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadow.soft
  },
  storeTitleText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
  },
  storeAddressText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: '500'
  },

  listTitle: { fontSize: 16, fontWeight: '800', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10, color: COLORS.text },
  card: { flexDirection: 'row', gap: 12, padding: 12, marginHorizontal: 20, backgroundColor: '#fff', borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, ...shadow.soft },
  img: { width: 70, height: 70, borderRadius: 8 },
  name: { fontWeight: '700', fontSize: 14, color: COLORS.text, flex: 1 },
  meta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  price: { color: COLORS.brand, fontWeight: '800', marginTop: 4, fontSize: 15 },
  fab: { position: "absolute", bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center", ...shadow.card },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#fff", padding: 20, borderRadius: 15, ...shadow.soft },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  input: { backgroundColor: COLORS.surfaceSecondary, padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text },
  saveBtnSmall: { backgroundColor: COLORS.brand, paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.pill },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, alignItems: 'center' },
  imagePickerBtn: { height: 100, marginBottom: 15, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1 },
  previewImg: { width: '100%', height: '100%' },
  modalOverlayBottom: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContentBottom: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "85%" },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  prodImgPicker: { height: 100, backgroundColor: '#f0f0f0', marginBottom: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#f0f0f0', marginRight: 8 },
  chipActive: { backgroundColor: COLORS.brand + '22', borderWidth: 1, borderColor: COLORS.brand },
  saveBtnBig: { backgroundColor: COLORS.brand, padding: 14, borderRadius: 25, alignItems: 'center', marginTop: 10 },
  labelHeading: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4 },
});
