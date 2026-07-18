import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, Alert, ActivityIndicator, ScrollView } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker"; 
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { vendorApi } from "@/src/roleApi";
import { api } from "@/src/api"; 
import { COLORS, RADIUS, SPACING, shadow } from "@/src/theme";

export default function VendorProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    name: "", category_id: "", price: "", mrp: "", unit: "1 pc", stock: "10", image: "", description: ""
  });

  const load = useCallback(async () => { 
    try { 
      setProducts(await vendorApi.products()); 
      setCategories(await api.categories());
    } catch (e) {
      console.log(e);
    } 
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // 🔥 UPDATE: Base64 Image Picker (Jaise profile upload mein kiya tha)
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], 
      quality: 0.6, // Optimize quality for fast network transfer
      base64: true, // 🔥 Base64 enabled kiya hai
    });

    if (!result.canceled && result.assets[0].base64) {
      // Photo ko proper Base64 format mein convert kiya
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setForm({ ...form, image: base64Image });
    }
  };

  // Add Product Logic
  const handleAddProduct = async () => {
    if (!form.name || !form.price || !form.category_id) {
      Alert.alert("Error", "Name, Price, and Category are required.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        mrp: form.mrp ? parseFloat(form.mrp) : parseFloat(form.price),
        stock: parseInt(form.stock) || 0,
        image: form.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80" // Fallback image if empty
      };
      await vendorApi.createProduct(payload);
      Alert.alert("Success", "Product added to your store!");
      setShowAddModal(false);
      setForm({ name: "", category_id: "", price: "", mrp: "", unit: "1 pc", stock: "10", image: "", description: "" });
      load(); 
    } catch (e) {
      Alert.alert("Error", "Could not add product.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Delete Product", `Are you sure you want to delete ${name}?`, [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          try {
            await vendorApi.deleteProduct(id);
            load(); 
          } catch (e) {
            Alert.alert("Error", "Could not delete product.");
          }
        } 
      }
    ]);
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="vendor-products-screen">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} /></Pressable>
        <Text style={s.title}>My Products ({products.length})</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={<Text style={s.empty}>No products yet. Click '+' to add.</Text>}
        renderItem={({ item }) => (
          <View style={s.card} testID={`vp-${item.id}`}>
            <Image source={{ uri: item.image }} style={s.img} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={s.name} numberOfLines={2}>{item.name}</Text>
                <Pressable onPress={() => handleDelete(item.id, item.name)} hitSlop={10} style={{ padding: 4 }}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.error} />
                </Pressable>
              </View>
              
              <Text style={s.meta}>{item.unit} · Stock: {item.stock}</Text>
              
              <View style={s.priceRow}>
                <Text style={s.price}>₹{item.price}</Text>
                {item.mrp > item.price && <Text style={s.mrp}>₹{item.mrp}</Text>}
                {item.trending && <View style={s.trendPill}><Text style={s.trendText}>TRENDING</Text></View>}
              </View>
            </View>
          </View>
        )}
      />

      <Pressable style={s.fab} onPress={() => setShowAddModal(true)}>
        <MaterialCommunityIcons name="plus" size={30} color="#fff" />
      </Pressable>

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add New Product</Text>
              <Pressable onPress={() => setShowAddModal(false)}><MaterialCommunityIcons name="close" size={24} color={COLORS.text} /></Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              
              <Text style={s.label}>Product Image</Text>
              <Pressable onPress={pickImage} style={s.imagePickerBtn}>
                {form.image ? (
                  <Image source={{ uri: form.image }} style={s.previewImg} contentFit="cover" />
                ) : (
                  <View style={s.imagePlaceholder}>
                    <MaterialCommunityIcons name="camera-plus" size={32} color={COLORS.textMuted} />
                    <Text style={s.imagePlaceholderText}>Tap to upload from Gallery</Text>
                  </View>
                )}
              </Pressable>

              <Text style={s.label}>Product Details</Text>
              <TextInput placeholder="Product Name (e.g. Kapoor Kachri)" value={form.name} onChangeText={(t) => setForm({...form, name: t})} style={s.input} />
              
              <Text style={s.label}>Select Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
                {categories.map((c) => (
                  <Pressable 
                    key={c.id} 
                    style={[s.catChip, form.category_id === c.id && s.catChipActive]}
                    onPress={() => setForm({...form, category_id: c.id})}
                  >
                    <Text style={[s.catChipText, form.category_id === c.id && s.catChipTextActive]}>{c.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <TextInput placeholder="Selling Price (₹)" value={form.price} onChangeText={(t) => setForm({...form, price: t})} style={[s.input, { flex: 1 }]} keyboardType="numeric" />
                <TextInput placeholder="MRP (₹)" value={form.mrp} onChangeText={(t) => setForm({...form, mrp: t})} style={[s.input, { flex: 1 }]} keyboardType="numeric" />
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <TextInput placeholder="Unit (e.g. 1 kg, 100g)" value={form.unit} onChangeText={(t) => setForm({...form, unit: t})} style={[s.input, { flex: 1 }]} />
                <TextInput placeholder="Stock Qty" value={form.stock} onChangeText={(t) => setForm({...form, stock: t})} style={[s.input, { flex: 1 }]} keyboardType="numeric" />
              </View>

              <TextInput placeholder="Short Description" value={form.description} onChangeText={(t) => setForm({...form, description: t})} style={[s.input, { height: 80, textAlignVertical: "top" }]} multiline />

              <Pressable onPress={handleAddProduct} style={s.saveBtn}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveText}>Save Product</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: "#fff", ...shadow.soft },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  card: { flexDirection: "row", gap: 12, padding: 12, backgroundColor: "#fff", borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, ...shadow.soft },
  img: { width: 75, height: 75, borderRadius: 8, backgroundColor: COLORS.surfaceSecondary },
  name: { fontWeight: "700", color: COLORS.text, fontSize: 15, flex: 1, paddingRight: 8 },
  meta: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" },
  price: { fontWeight: "800", color: COLORS.text, fontSize: 16 },
  mrp: { color: COLORS.textMuted, textDecorationLine: "line-through", fontSize: 12 },
  trendPill: { backgroundColor: COLORS.accent + "22", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  trendText: { color: COLORS.accent, fontSize: 9, fontWeight: "800" },
  empty: { textAlign: "center", marginTop: 80, color: COLORS.textMuted, fontSize: 15 },
  
  fab: { position: "absolute", bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center", ...shadow.card },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, padding: SPACING.lg, maxHeight: "90%", ...shadow.card },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.lg },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  label: { fontSize: 13, fontWeight: "700", color: COLORS.textSecondary, marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border, padding: 14, borderRadius: RADIUS.md, marginBottom: SPACING.md, color: COLORS.text },
  saveBtn: { backgroundColor: COLORS.brand, paddingVertical: 16, borderRadius: RADIUS.pill, alignItems: "center", marginTop: SPACING.sm },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  
  imagePickerBtn: { height: 140, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed", marginBottom: SPACING.lg, overflow: "hidden" },
  previewImg: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  imagePlaceholderText: { color: COLORS.textMuted, marginTop: 8, fontSize: 13, fontWeight: "600" },

  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  catChipActive: { backgroundColor: COLORS.brand + "22", borderColor: COLORS.brand },
  catChipText: { fontSize: 13, color: COLORS.textMuted, fontWeight: "600" },
  catChipTextActive: { color: COLORS.brand, fontWeight: "800" },
});