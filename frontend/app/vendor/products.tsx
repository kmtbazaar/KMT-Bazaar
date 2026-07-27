import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
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
    name: "",
    category_id: "",
    price: "",
    mrp: "",
    unit: "1 pc",
    stock: "10",
    image: "",
    description: "",
    trending: false,
  });

  const load = useCallback(async () => {
    try {
      setProducts(await vendorApi.products());
      setCategories(await api.categories());
    } catch (e) {
      console.log(e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Image Picker Logic (Gallery & Camera)
  const pickImage = async (useCamera = false) => {
    let result;
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    };

    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Camera access is needed to take a photo.");
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled && result.assets[0].base64) {
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
        image: form.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80",
      };
      await vendorApi.createProduct(payload);
      Alert.alert("Success", "Product added to your store!");
      setShowAddModal(false);
      resetForm();
      load();
    } catch (e) {
      Alert.alert("Error", "Could not add product.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      category_id: "",
      price: "",
      mrp: "",
      unit: "1 pc",
      stock: "10",
      image: "",
      description: "",
      trending: false,
    });
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
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="vendor-products-screen">
      {/* Header with Top-Right Add (+) Button */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </Pressable>
        <Text style={s.headerTitle}>Products ({products.length})</Text>
        <Pressable onPress={() => setShowAddModal(true)} style={s.headerAddBtn}>
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Product List */}
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={<Text style={s.empty}>No products yet. Click '+' to add.</Text>}
        renderItem={({ item }) => (
          <View style={s.card} testID={`vp-${item.id}`}>
            <Image source={{ uri: item.image }} style={s.img} contentFit="cover" />
            <View style={s.cardDetails}>
              <Text style={s.name} numberOfLines={1}>{item.name}</Text>
              <Text style={s.meta}>{item.unit} · Stock: {item.stock}</Text>
            </View>
            <Pressable onPress={() => handleDelete(item.id, item.name)} hitSlop={10} style={s.editBtn}>
              <MaterialCommunityIcons name="pencil-outline" size={22} color="#D97706" />
            </Pressable>
          </View>
        )}
      />

      {/* Modal - Exact Match with Screenshot */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.dragHandle} />
            <Text style={s.modalTitle}>Add Product</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              
              {/* Name Input */}
              <TextInput
                placeholder="Name"
                placeholderTextColor="#9CA3AF"
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
                style={[s.input, s.inputHighlighted]}
              />

              {/* Price & MRP Row */}
              <View style={s.row}>
                <TextInput
                  placeholder="Price"
                  placeholderTextColor="#9CA3AF"
                  value={form.price}
                  onChangeText={(t) => setForm({ ...form, price: t })}
                  style={[s.input, s.flex1]}
                  keyboardType="numeric"
                />
                <TextInput
                  placeholder="MRP"
                  placeholderTextColor="#9CA3AF"
                  value={form.mrp}
                  onChangeText={(t) => setForm({ ...form, mrp: t })}
                  style={[s.input, s.flex1]}
                  keyboardType="numeric"
                />
              </View>

              {/* Stock & Unit Row */}
              <View style={s.row}>
                <TextInput
                  placeholder="Stock"
                  placeholderTextColor="#9CA3AF"
                  value={form.stock}
                  onChangeText={(t) => setForm({ ...form, stock: t })}
                  style={[s.input, s.flex1]}
                  keyboardType="numeric"
                />
                <TextInput
                  placeholder="Unit (e.g. 1 kg)"
                  placeholderTextColor="#9CA3AF"
                  value={form.unit}
                  onChangeText={(t) => setForm({ ...form, unit: t })}
                  style={[s.input, s.flex1]}
                />
              </View>

              {/* Product Image Section */}
              <Text style={s.sectionLabel}>Product Image</Text>
              <View style={s.imageSectionRow}>
                <View style={s.imageBox}>
                  {form.image ? (
                    <Image source={{ uri: form.image }} style={s.previewImg} contentFit="cover" />
                  ) : (
                    <MaterialCommunityIcons name="image-outline" size={36} color="#9CA3AF" />
                  )}
                </View>

                <View style={s.imagePickerCol}>
                  <Pressable style={s.pickBtn} onPress={() => pickImage(false)}>
                    <MaterialCommunityIcons name="image-multiple-outline" size={20} color="#EA580C" />
                    <Text style={s.pickBtnText}>Gallery</Text>
                  </Pressable>

                  <Pressable style={s.pickBtn} onPress={() => pickImage(true)}>
                    <MaterialCommunityIcons name="camera-outline" size={20} color="#EA580C" />
                    <Text style={s.pickBtnText}>Camera</Text>
                  </Pressable>
                </View>
              </View>

              {/* Description Input */}
              <TextInput
                placeholder="Description"
                placeholderTextColor="#9CA3AF"
                value={form.description}
                onChangeText={(t) => setForm({ ...form, description: t })}
                style={[s.input, { height: 75, textAlignVertical: "top" }]}
                multiline
              />

              {/* Category Chips Section */}
              <Text style={s.sectionLabel}>Category</Text>
              <View style={s.catContainer}>
                {categories.map((c) => {
                  const active = form.category_id === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      style={[s.catChip, active && s.catChipActive]}
                      onPress={() => setForm({ ...form, category_id: c.id })}
                    >
                      <Text style={[s.catChipText, active && s.catChipTextActive]}>{c.name}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Mark as Trending Checkbox */}
              <Pressable
                style={s.checkboxRow}
                onPress={() => setForm({ ...form, trending: !form.trending })}
              >
                <MaterialCommunityIcons
                  name={form.trending ? "checkbox-marked" : "checkbox-blank-outline"}
                  size={24}
                  color="#EA580C"
                />
                <Text style={s.checkboxLabel}>Mark as trending</Text>
              </Pressable>

              {/* Action Buttons Row */}
              <View style={[s.row, { marginTop: 10 }]}>
                <Pressable
                  style={[s.actionBtn, s.cancelBtn]}
                  onPress={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[s.actionBtn, s.createBtn]}
                  onPress={handleAddProduct}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.createBtnText}>Create</Text>
                  )}
                </Pressable>
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9FAFB" },
  
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#000" },
  headerAddBtn: {
    backgroundColor: "#EA580C",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  // Card Design (Exact Match)
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  img: { width: 60, height: 60, borderRadius: 12, backgroundColor: "#F3F4F6" },
  cardDetails: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: "700", color: "#000" },
  meta: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  editBtn: { padding: 6 },
  empty: { textAlign: "center", marginTop: 80, color: "#9CA3AF", fontSize: 15 },

  // Modal Overlay & Sheet
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "88%",
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#000", marginBottom: 16 },

  // Inputs
  row: { flexDirection: "row", gap: 12 },
  flex1: { flex: 1 },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#000",
    marginBottom: 12,
  },
  inputHighlighted: {
    borderColor: "#000",
    borderWidth: 1.5,
  },
  sectionLabel: { fontSize: 15, fontWeight: "700", color: "#000", marginBottom: 10, marginTop: 4 },

  // Image Upload Row
  imageSectionRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  imageBox: {
    width: 100,
    height: 100,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  previewImg: { width: "100%", height: "100%" },
  imagePickerCol: { flex: 1, justifyContent: "space-between" },
  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    height: 46,
    borderRadius: 23,
  },
  pickBtnText: { color: "#EA580C", fontWeight: "700", fontSize: 15 },

  // Categories
  catContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  catChipActive: { backgroundColor: "#EA580C", borderColor: "#EA580C" },
  catChipText: { fontSize: 13, color: "#374151", fontWeight: "600" },
  catChipTextActive: { color: "#fff", fontWeight: "700" },

  // Checkbox
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 },
  checkboxLabel: { fontSize: 15, fontWeight: "700", color: "#000" },

  // Footer Buttons
  actionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB" },
  cancelBtnText: { color: "#374151", fontWeight: "700", fontSize: 16 },
  createBtn: { backgroundColor: "#EA580C" },
  createBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
