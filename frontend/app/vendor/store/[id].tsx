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
  
  const [storeData, setStoreData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [editForm, setEditForm] = useState({ name: initialName, address: initialAddress, image: initialImage });

  // 🔥 Screenshot jaisa updated form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ 
    name: "", 
    category_id: "", 
    price: "", 
    mrp: "", 
    unit: "1 pc", 
    stock: "10", 
    image: "", 
    description: "",
    is_trending: false 
  });

  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [editProductForm, setEditProductForm] = useState({ 
    name: "", 
    category_id: "", 
    price: "", 
    mrp: "", 
    unit: "1 pc", 
    stock: "10", 
    image: "", 
    description: "",
    is_trending: false 
  });

  const load = useCallback(async () => {
    try {
      // Store ki current approval status nikalne ke liye stats se check kar rahe hain
      const stats = await vendorApi.stats();
      const currentStore = stats?.stores?.find((s: any) => s.id === id);
      if (currentStore) setStoreData(currentStore);

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

  // 🔥 Image via Gallery / Camera
  const pickProductImageSource = async (isEditMode: boolean, source: 'gallery' | 'camera') => {
    let result;
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Camera access is required.");
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true,
      });
    }

    if (!result.canceled && result.assets[0].base64) {
      const b64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      if (isEditMode) {
        setEditProductForm(prev => ({ ...prev, image: b64 }));
      } else {
        setForm(prev => ({ ...prev, image: b64 }));
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
    setLoading(true);
    try {
      await vendorApi.createProduct({
        ...form, 
        store_id: id,
        price: parseFloat(form.price), 
        mrp: form.mrp ? parseFloat(form.mrp) : parseFloat(form.price), 
        stock: parseInt(form.stock) || 0,
        // Agar store approve nahi hai, product by default hidden/unapproved rahega
        is_active: storeData?.is_approved ?? false
      });
      setShowAddModal(false);
      setForm({ name: "", category_id: "", price: "", mrp: "", unit: "1 pc", stock: "10", image: "", description: "", is_trending: false });
      load();
    } catch (e) { Alert.alert("Error", "Could not add product."); }
    finally { setLoading(false); }
  };

  const openEditProduct = (prod: any) => {
    setSelectedProductId(prod.id);
    setEditProductForm({
      name: prod.name, 
      category_id: prod.category_id || "", 
      price: String(prod.price), 
      mrp: String(prod.mrp || prod.price),
      unit: prod.unit || "1 pc", 
      stock: String(prod.stock || 0), 
      image: prod.image || "", 
      description: prod.description || "",
      is_trending: prod.is_trending || false
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
        ...editProductForm, 
        store_id: id, 
        price: parseFloat(editProductForm.price),
        mrp: editProductForm.mrp ? parseFloat(editProductForm.mrp) : parseFloat(editProductForm.price), 
        stock: parseInt(editProductForm.stock) || 0
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
      
      {/* FLOATING HEADER */}
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

              {/* 🔥 Store Pending Status Warning Box */}
              {storeData && !storeData.is_approved && (
                <View style={s.pendingBanner}>
                  <MaterialCommunityIcons name="clock-alert-outline" size={18} color="#854d0e" />
                  <Text style={s.pendingBannerText}>
                    Store pending admin approval. Products added now will stay hidden from customers until approved.
                  </Text>
                </View>
              )}
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

      {/* 🔥 EXACT ADD PRODUCT MODAL (AS PER SCREENSHOT) */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={s.modalOverlayBottom}>
          <View style={s.modalContentBottom}>
            <View style={s.dragHandle} />
            
            <Text style={s.screenshotTitle}>Add Product</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              
              {/* Name Input */}
              <TextInput 
                placeholder="Name" 
                placeholderTextColor="#9ca3af"
                value={form.name} 
                onChangeText={(t) => setForm({...form, name: t})} 
                style={s.screenshotInputFull} 
              />

              {/* Price & MRP Row */}
              <View style={{flexDirection:'row', gap: 10, marginBottom: 12}}>
                <TextInput 
                  placeholder="Price" 
                  placeholderTextColor="#9ca3af"
                  value={form.price} 
                  onChangeText={(t) => setForm({...form, price: t})} 
                  style={[s.screenshotInputFull, {flex: 1, marginBottom: 0}]} 
                  keyboardType="numeric"
                />
                <TextInput 
                  placeholder="MRP" 
                  placeholderTextColor="#9ca3af"
                  value={form.mrp} 
                  onChangeText={(t) => setForm({...form, mrp: t})} 
                  style={[s.screenshotInputFull, {flex: 1, marginBottom: 0}]} 
                  keyboardType="numeric"
                />
              </View>

              {/* Stock & Unit Row */}
              <View style={{flexDirection:'row', gap: 10, marginBottom: 12}}>
                <TextInput 
                  placeholder="Stock" 
                  placeholderTextColor="#9ca3af"
                  value={form.stock} 
                  onChangeText={(t) => setForm({...form, stock: t})} 
                  style={[s.screenshotInputFull, {flex: 1, marginBottom: 0}]} 
                  keyboardType="numeric"
                />
                <TextInput 
                  placeholder="Unit (e.g. 1 kg)" 
                  placeholderTextColor="#9ca3af"
                  value={form.unit} 
                  onChangeText={(t) => setForm({...form, unit: t})} 
                  style={[s.screenshotInputFull, {flex: 1, marginBottom: 0}]} 
                />
              </View>

              {/* Image Picker Section */}
              <Text style={s.fieldLabel}>Product Image</Text>
              <View style={{flexDirection: 'row', gap: 12, marginBottom: 16}}>
                <View style={s.imgBoxPreview}>
                  {form.image ? (
                    <Image source={{uri: form.image}} style={{width:'100%', height:'100%', borderRadius: 8}} />
                  ) : (
                    <MaterialCommunityIcons name="image-outline" size={32} color="#9ca3af" />
                  )}
                </View>
                
                <View style={{flex: 1, gap: 10}}>
                  <Pressable style={s.pickerBtnOutline} onPress={() => pickProductImageSource(false, 'gallery')}>
                    <MaterialCommunityIcons name="image-multiple-outline" size={18} color="#ea580c" />
                    <Text style={s.pickerBtnText}>Gallery</Text>
                  </Pressable>
                  
                  <Pressable style={s.pickerBtnOutline} onPress={() => pickProductImageSource(false, 'camera')}>
                    <MaterialCommunityIcons name="camera-outline" size={18} color="#ea580c" />
                    <Text style={s.pickerBtnText}>Camera</Text>
                  </Pressable>
                </View>
              </View>

              {/* Description Input */}
              <TextInput 
                placeholder="Description" 
                placeholderTextColor="#9ca3af"
                value={form.description} 
                onChangeText={(t) => setForm({...form, description: t})} 
                style={[s.screenshotInputFull, {height: 70, textAlignVertical: 'top'}]} 
                multiline
              />

              {/* Category Chips */}
              <Text style={s.fieldLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {categories.map((c) => (
                  <Pressable 
                    key={c.id} 
                    style={[s.chipPill, form.category_id === c.id && s.chipPillActive]} 
                    onPress={() => setForm({...form, category_id: c.id})}
                  >
                    <Text style={[s.chipText, form.category_id === c.id && s.chipTextActive]}>{c.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Mark as Trending Checkbox */}
              <Pressable 
                style={s.checkboxRow} 
                onPress={() => setForm({...form, is_trending: !form.is_trending})}
              >
                <MaterialCommunityIcons 
                  name={form.is_trending ? "checkbox-marked" : "checkbox-blank-outline"} 
                  size={24} 
                  color="#ea580c" 
                />
                <Text style={s.checkboxLabel}>Mark as trending</Text>
              </Pressable>

              {/* Bottom Action Buttons */}
              <View style={{flexDirection: 'row', gap: 12, marginTop: 10}}>
                <Pressable style={s.btnCancel} onPress={() => setShowAddModal(false)}>
                  <Text style={s.btnCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={s.btnCreate} onPress={handleAddProduct}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnCreateText}>Create</Text>}
                </Pressable>
              </View>

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
              
              <Text style={s.fieldLabel}>Product Image</Text>
              <View style={{flexDirection: 'row', gap: 12, marginBottom: 16}}>
                <View style={s.imgBoxPreview}>
                  {editProductForm.image ? (
                    <Image source={{uri: editProductForm.image}} style={{width:'100%', height:'100%', borderRadius: 8}} />
                  ) : (
                    <MaterialCommunityIcons name="image-outline" size={32} color="#9ca3af" />
                  )}
                </View>
                
                <View style={{flex: 1, gap: 10}}>
                  <Pressable style={s.pickerBtnOutline} onPress={() => pickProductImageSource(true, 'gallery')}>
                    <MaterialCommunityIcons name="image-multiple-outline" size={18} color="#ea580c" />
                    <Text style={s.pickerBtnText}>Gallery</Text>
                  </Pressable>
                  
                  <Pressable style={s.pickerBtnOutline} onPress={() => pickProductImageSource(true, 'camera')}>
                    <MaterialCommunityIcons name="camera-outline" size={18} color="#ea580c" />
                    <Text style={s.pickerBtnText}>Camera</Text>
                  </Pressable>
                </View>
              </View>
              
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
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef08a',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  pendingBannerText: {
    fontSize: 11,
    color: '#854d0e',
    fontWeight: '700',
    flex: 1,
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
  
  // 🔥 SCREENSHOT MODAL STYLES
  modalOverlayBottom: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContentBottom: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: "90%" },
  dragHandle: { width: 40, height: 4, backgroundColor: '#cbd5e1', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  screenshotTitle: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 16 },
  screenshotInputFull: { 
    backgroundColor: '#f8fafc', 
    borderWidth: 1.5, 
    borderColor: '#334155', 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    borderRadius: 12, 
    marginBottom: 12, 
    fontSize: 15, 
    color: '#0f172a' 
  },
  fieldLabel: { fontSize: 14, fontWeight: '800', color: '#1f2937', marginBottom: 8 },
  imgBoxPreview: { width: 90, height: 90, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  pickerBtnOutline: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    borderWidth: 1.5, 
    borderColor: '#fdba74', 
    borderRadius: 24, 
    backgroundColor: '#fff7ed' 
  },
  pickerBtnText: { color: '#ea580c', fontWeight: '800', fontSize: 14 },
  chipPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', marginRight: 8 },
  chipPillActive: { borderColor: '#ea580c', backgroundColor: '#fff7ed' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  chipTextActive: { color: '#ea580c', fontWeight: '800' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 },
  checkboxLabel: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  btnCancel: { flex: 1, paddingVertical: 14, borderRadius: 24, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center' },
  btnCancelText: { color: '#475569', fontWeight: '800', fontSize: 15 },
  btnCreate: { flex: 1, paddingVertical: 14, borderRadius: 24, backgroundColor: '#ea580c', alignItems: 'center' },
  btnCreateText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  saveBtnBig: { backgroundColor: COLORS.brand, padding: 14, borderRadius: 25, alignItems: 'center', marginTop: 10 },
  labelHeading: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4 },
});
