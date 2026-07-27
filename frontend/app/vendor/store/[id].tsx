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
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { vendorApi } from "@/src/roleApi";
import { api } from "@/src/api";
import { COLORS, RADIUS, shadow } from "@/src/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
  const [editForm, setEditForm] = useState({
    name: initialName,
    address: initialAddress,
    image: initialImage,
  });

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
    trending: false,
  });

  const load = useCallback(async () => {
    try {
      const all = await vendorApi.products();
      setProducts(all.filter((p: any) => p.store_id === id));
      setCategories(await api.categories());
    } catch (e) {
      console.log(e);
    }
  }, [id]);

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

  const pickBannerImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [2, 1],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setEditForm({
        ...editForm,
        image: `data:image/jpeg;base64,${result.assets[0].base64}`,
      });
    }
  };

  const pickProductImage = async (isEditMode: boolean, useCamera = false) => {
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
      const b64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      if (isEditMode) {
        setEditProductForm((prev) => ({ ...prev, image: b64 }));
      } else {
        setForm((prev) => ({ ...prev, image: b64 }));
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
    } catch (e) {
      Alert.alert("Error", "Update failed.");
    } finally {
      setLoading(false);
    }
  };

  const executeStoreDelete = async () => {
    try {
      if (vendorApi.deleteStore) {
        await vendorApi.deleteStore(id);
      } else {
        await vendorApi.updateStore(id, { is_deleted: true });
      }
      if (Platform.OS === "web") {
        window.alert("Store deleted successfully.");
      } else {
        Alert.alert("Deleted", "Store has been deleted successfully.");
      }
      router.replace("/vendor");
    } catch (e: any) {
      console.log("Delete Store Error:", e);
      const msg = e?.message || "Could not delete store. Please try again.";
      if (Platform.OS === "web") window.alert("Error: " + msg);
      else Alert.alert("Error", msg);
    }
  };

  const handleDeleteStore = () => {
    const warningMsg = `Are you sure you want to permanently delete '${editForm.name}'?\n\nThis action cannot be undone and all associated products will be removed.`;

    if (Platform.OS === "web") {
      const confirmed = window.confirm(`⚠️ WARNING: DELETE STORE\n\n${warningMsg}`);
      if (confirmed) {
        executeStoreDelete();
      }
    } else {
      Alert.alert("⚠️ Warning: Delete Store", warningMsg, [
        { text: "Cancel", style: "cancel" },
        { text: "Yes, Delete Store", style: "destructive", onPress: executeStoreDelete },
      ]);
    }
  };

  const resetAddForm = () => {
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
        image: form.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80",
      });
      setShowAddModal(false);
      resetAddForm();
      load();
    } catch (e) {
      Alert.alert("Error", "Could not add product.");
    } finally {
      setLoading(false);
    }
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
      trending: !!prod.trending,
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
        mrp: editProductForm.mrp
          ? parseFloat(editProductForm.mrp)
          : parseFloat(editProductForm.price),
        stock: parseInt(editProductForm.stock) || 0,
      });
      Alert.alert("Success", "Product updated!");
      setShowEditProductModal(false);
      load();
    } catch (e) {
      Alert.alert("Error", "Failed to update product.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (prodId: string, prodName: string) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Delete Product: Are you sure you want to delete ${prodName}?`)) {
        vendorApi
          .deleteProduct(prodId)
          .then(() => load())
          .catch(() => window.alert("Delete failed."));
      }
    } else {
      Alert.alert("Delete Product", `Are you sure you want to delete ${prodName}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await vendorApi.deleteProduct(prodId);
              load();
            } catch (e) {
              Alert.alert("Error", "Delete failed.");
            }
          },
        },
      ]);
    }
  };

  return (
    <View style={s.root}>
      {/* FLOATING HEADER */}
      <View style={s.floatingHeader}>
        <Pressable onPress={() => router.back()} style={s.circleBtn} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
        </Pressable>

        <View style={s.rightActions}>
          <Pressable onPress={handleDeleteStore} style={[s.circleBtn, s.deleteBtn]} hitSlop={8}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#fff" />
          </Pressable>
          <Pressable onPress={() => setShowSettings(true)} style={s.circleBtn} hitSlop={8}>
            <MaterialCommunityIcons name="cog" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 20 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
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

            {/* Header Title with Right Top Add Button */}
            <View style={s.listHeaderRow}>
              <Text style={s.listTitle}>Products ({products.length})</Text>
              <Pressable onPress={() => setShowAddModal(true)} style={s.headerAddBtn}>
                <MaterialCommunityIcons name="plus" size={18} color="#fff" />
              </Pressable>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <Image source={{ uri: item.image }} style={s.img} contentFit="cover" />
            <View style={s.cardDetails}>
              <Text style={s.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={s.meta}>
                {item.unit} · Stock: {item.stock}
              </Text>
            </View>
            <View style={s.cardActions}>
              <Pressable onPress={() => openEditProduct(item)} hitSlop={8} style={s.editBtn}>
                <MaterialCommunityIcons name="pencil-outline" size={20} color="#D97706" />
              </Pressable>
              <Pressable onPress={() => handleDelete(item.id, item.name)} hitSlop={8} style={s.editBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#DC2626" />
              </Pressable>
            </View>
          </View>
        )}
      />

      {/* SHOP SETTINGS MODAL */}
      <Modal visible={showSettings} transparent animationType="fade">
        <View style={s.modalOverlayCenter}>
          <View style={s.modalContentCenter}>
            <Text style={s.modalTitle}>Shop Settings</Text>
            <Pressable onPress={pickBannerImage} style={s.bannerPickerBtn}>
              {editForm.image ? (
                <Image source={{ uri: editForm.image }} style={s.previewImg} />
              ) : (
                <Text style={{ color: "#6B7280", fontSize: 12 }}>Change Banner</Text>
              )}
            </Pressable>
            <TextInput
              value={editForm.name}
              onChangeText={(t) => setEditForm({ ...editForm, name: t })}
              style={s.inputCompact}
              placeholder="Shop Name"
            />
            <TextInput
              value={editForm.address}
              onChangeText={(t) => setEditForm({ ...editForm, address: t })}
              style={s.inputCompact}
              placeholder="Address"
            />
            <View style={s.modalActions}>
              <Pressable onPress={() => setShowSettings(false)} style={{ padding: 6 }}>
                <Text style={{ color: "#374151", fontWeight: "600", fontSize: 13 }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleUpdateStore} style={s.saveBtnSmall}>
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD PRODUCT MODAL (Optimized Compact Layout) */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={s.modalOverlayBottom}>
          <View style={s.modalContentBottom}>
            <View style={s.dragHandle} />
            <Text style={s.modalTitle}>Add Product</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              {/* Product Name */}
              <TextInput
                placeholder="Name"
                placeholderTextColor="#9CA3AF"
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
                style={[s.inputCompact, s.inputHighlighted]}
              />

              {/* Price & MRP Row */}
              <View style={s.rowCompact}>
                <TextInput
                  placeholder="Price"
                  placeholderTextColor="#9CA3AF"
                  value={form.price}
                  onChangeText={(t) => setForm({ ...form, price: t })}
                  style={[s.inputCompact, s.flex1]}
                  keyboardType="numeric"
                />
                <TextInput
                  placeholder="MRP"
                  placeholderTextColor="#9CA3AF"
                  value={form.mrp}
                  onChangeText={(t) => setForm({ ...form, mrp: t })}
                  style={[s.inputCompact, s.flex1]}
                  keyboardType="numeric"
                />
              </View>

              {/* Stock & Unit Row */}
              <View style={s.rowCompact}>
                <TextInput
                  placeholder="Stock"
                  placeholderTextColor="#9CA3AF"
                  value={form.stock}
                  onChangeText={(t) => setForm({ ...form, stock: t })}
                  style={[s.inputCompact, s.flex1]}
                  keyboardType="numeric"
                />
                <TextInput
                  placeholder="Unit (e.g. 1 kg)"
                  placeholderTextColor="#9CA3AF"
                  value={form.unit}
                  onChangeText={(t) => setForm({ ...form, unit: t })}
                  style={[s.inputCompact, s.flex1]}
                />
              </View>

              {/* Product Image Section */}
              <Text style={s.sectionLabel}>Product Image</Text>
              <View style={s.imageSectionRow}>
                <View style={s.imageBox}>
                  {form.image ? (
                    <Image source={{ uri: form.image }} style={s.previewImg} contentFit="cover" />
                  ) : (
                    <MaterialCommunityIcons name="image-outline" size={28} color="#9CA3AF" />
                  )}
                </View>

                <View style={s.imagePickerCol}>
                  <Pressable style={s.pickBtnCompact} onPress={() => pickProductImage(false, false)}>
                    <MaterialCommunityIcons name="image-multiple-outline" size={16} color="#EA580C" />
                    <Text style={s.pickBtnText}>Gallery</Text>
                  </Pressable>

                  <Pressable style={s.pickBtnCompact} onPress={() => pickProductImage(false, true)}>
                    <MaterialCommunityIcons name="camera-outline" size={16} color="#EA580C" />
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
                style={[s.inputCompact, { height: 50, textAlignVertical: "top" }]}
                multiline
              />

              {/* Category Chips */}
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
                  size={20}
                  color="#EA580C"
                />
                <Text style={s.checkboxLabel}>Mark as trending</Text>
              </Pressable>

              {/* Action Buttons Row */}
              <View style={[s.rowCompact, { marginTop: 6 }]}>
                <Pressable
                  style={[s.actionBtnCompact, s.cancelBtn]}
                  onPress={() => {
                    setShowAddModal(false);
                    resetAddForm();
                  }}
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[s.actionBtnCompact, s.createBtn]}
                  onPress={handleAddProduct}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.createBtnText}>Create</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* EDIT PRODUCT MODAL (Optimized Compact Layout) */}
      <Modal visible={showEditProductModal} transparent animationType="slide">
        <View style={s.modalOverlayBottom}>
          <View style={s.modalContentBottom}>
            <View style={s.dragHandle} />
            <Text style={s.modalTitle}>Edit Product</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              {/* Product Name */}
              <TextInput
                placeholder="Name"
                placeholderTextColor="#9CA3AF"
                value={editProductForm.name}
                onChangeText={(t) => setEditProductForm({ ...editProductForm, name: t })}
                style={[s.inputCompact, s.inputHighlighted]}
              />

              {/* Price & MRP Row */}
              <View style={s.rowCompact}>
                <TextInput
                  placeholder="Price"
                  placeholderTextColor="#9CA3AF"
                  value={editProductForm.price}
                  onChangeText={(t) => setEditProductForm({ ...editProductForm, price: t })}
                  style={[s.inputCompact, s.flex1]}
                  keyboardType="numeric"
                />
                <TextInput
                  placeholder="MRP"
                  placeholderTextColor="#9CA3AF"
                  value={editProductForm.mrp}
                  onChangeText={(t) => setEditProductForm({ ...editProductForm, mrp: t })}
                  style={[s.inputCompact, s.flex1]}
                  keyboardType="numeric"
                />
              </View>

              {/* Stock & Unit Row */}
              <View style={s.rowCompact}>
                <TextInput
                  placeholder="Stock"
                  placeholderTextColor="#9CA3AF"
                  value={editProductForm.stock}
                  onChangeText={(t) => setEditProductForm({ ...editProductForm, stock: t })}
                  style={[s.inputCompact, s.flex1]}
                  keyboardType="numeric"
                />
                <TextInput
                  placeholder="Unit (e.g. 1 kg)"
                  placeholderTextColor="#9CA3AF"
                  value={editProductForm.unit}
                  onChangeText={(t) => setEditProductForm({ ...editProductForm, unit: t })}
                  style={[s.inputCompact, s.flex1]}
                />
              </View>

              {/* Product Image Section */}
              <Text style={s.sectionLabel}>Product Image</Text>
              <View style={s.imageSectionRow}>
                <View style={s.imageBox}>
                  {editProductForm.image ? (
                    <Image
                      source={{ uri: editProductForm.image }}
                      style={s.previewImg}
                      contentFit="cover"
                    />
                  ) : (
                    <MaterialCommunityIcons name="image-outline" size={28} color="#9CA3AF" />
                  )}
                </View>

                <View style={s.imagePickerCol}>
                  <Pressable style={s.pickBtnCompact} onPress={() => pickProductImage(true, false)}>
                    <MaterialCommunityIcons name="image-multiple-outline" size={16} color="#EA580C" />
                    <Text style={s.pickBtnText}>Gallery</Text>
                  </Pressable>

                  <Pressable style={s.pickBtnCompact} onPress={() => pickProductImage(true, true)}>
                    <MaterialCommunityIcons name="camera-outline" size={16} color="#EA580C" />
                    <Text style={s.pickBtnText}>Camera</Text>
                  </Pressable>
                </View>
              </View>

              {/* Description Input */}
              <TextInput
                placeholder="Description"
                placeholderTextColor="#9CA3AF"
                value={editProductForm.description}
                onChangeText={(t) => setEditProductForm({ ...editProductForm, description: t })}
                style={[s.inputCompact, { height: 50, textAlignVertical: "top" }]}
                multiline
              />

              {/* Category Chips */}
              <Text style={s.sectionLabel}>Category</Text>
              <View style={s.catContainer}>
                {categories.map((c) => {
                  const active = editProductForm.category_id === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      style={[s.catChip, active && s.catChipActive]}
                      onPress={() => setEditProductForm({ ...editProductForm, category_id: c.id })}
                    >
                      <Text style={[s.catChipText, active && s.catChipTextActive]}>{c.name}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Mark as Trending Checkbox */}
              <Pressable
                style={s.checkboxRow}
                onPress={() =>
                  setEditProductForm({ ...editProductForm, trending: !editProductForm.trending })
                }
              >
                <MaterialCommunityIcons
                  name={editProductForm.trending ? "checkbox-marked" : "checkbox-blank-outline"}
                  size={20}
                  color="#EA580C"
                />
                <Text style={s.checkboxLabel}>Mark as trending</Text>
              </Pressable>

              {/* Action Buttons Row */}
              <View style={[s.rowCompact, { marginTop: 6 }]}>
                <Pressable
                  style={[s.actionBtnCompact, s.cancelBtn]}
                  onPress={() => setShowEditProductModal(false)}
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[s.actionBtnCompact, s.createBtn]}
                  onPress={handleUpdateProduct}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.createBtnText}>Save Changes</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9FAFB" },

  // Header Bar
  floatingHeader: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1000,
    elevation: 20,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    ...shadow.soft,
  },
  deleteBtn: {
    backgroundColor: "#DC2626",
    borderColor: "#B91C1C",
  },

  // Store Banner & Card
  bannerWrap: { width: "100%", height: 180, backgroundColor: "#E2E8F0" },
  bannerImg: { width: "100%", height: "100%" },
  storeDetailsCard: {
    backgroundColor: "#fff",
    padding: 12,
    marginHorizontal: 14,
    marginTop: -20,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadow.soft,
  },
  storeTitleText: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
  },
  storeAddressText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: "500",
  },

  // List Header Title Row
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  listTitle: { fontSize: 18, fontWeight: "800", color: "#000" },
  headerAddBtn: {
    backgroundColor: "#EA580C",
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  // Card Design
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginHorizontal: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  img: { width: 50, height: 50, borderRadius: 10, backgroundColor: "#F3F4F6" },
  cardDetails: { flex: 1, marginLeft: 10 },
  name: { fontSize: 15, fontWeight: "700", color: "#000" },
  meta: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  editBtn: { padding: 4 },

  // Center Modal
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContentCenter: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    ...shadow.soft,
  },
  bannerPickerBtn: {
    height: 75,
    marginBottom: 8,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    alignItems: "center",
    marginTop: 6,
  },
  saveBtnSmall: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },

  // Bottom Sheet Modal
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContentBottom: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: "92%",
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#000", marginBottom: 10 },

  // Compact Form Inputs (Optimized Heights)
  rowCompact: { flexDirection: "row", gap: 8, marginBottom: 8 },
  flex1: { flex: 1 },
  inputCompact: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#000",
    marginBottom: 8,
  },
  inputHighlighted: {
    borderColor: "#000",
    borderWidth: 1.2,
  },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#000", marginBottom: 6, marginTop: 2 },

  // Image Upload Row Compact
  imageSectionRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  imageBox: {
    width: 72,
    height: 72,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  previewImg: { width: "100%", height: "100%" },
  imagePickerCol: { flex: 1, justifyContent: "space-between", height: 72 },
  pickBtnCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    height: 33,
    borderRadius: 16,
  },
  pickBtnText: { color: "#EA580C", fontWeight: "700", fontSize: 13 },

  // Categories Chips
  catContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  catChipActive: { backgroundColor: "#EA580C", borderColor: "#EA580C" },
  catChipText: { fontSize: 12, color: "#374151", fontWeight: "600" },
  catChipTextActive: { color: "#fff", fontWeight: "700" },

  // Checkbox
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 4 },
  checkboxLabel: { fontSize: 13, fontWeight: "700", color: "#000" },

  // Action Buttons Compact
  actionBtnCompact: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB" },
  cancelBtnText: { color: "#374151", fontWeight: "700", fontSize: 14 },
  createBtn: { backgroundColor: "#EA580C" },
  createBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
