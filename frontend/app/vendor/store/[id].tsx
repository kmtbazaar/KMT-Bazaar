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
import { SafeAreaView } from "react-native-safe-area-context";
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
        contentContainerStyle={{ paddingBottom: 40 }}
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

            {/* Header Title with Right Top Add Button */}
            <View style={s.listHeaderRow}>
              <Text style={s.listTitle}>Products ({products.length})</Text>
              <Pressable onPress={() => setShowAddModal(true)} style={s.headerAddBtn}>
                <MaterialCommunityIcons name="plus" size={20} color="#fff" />
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
                <MaterialCommunityIcons name="pencil-outline" size={22} color="#D97706" />
              </Pressable>
              <Pressable onPress={() => handleDelete(item.id, item.name)} hitSlop={8} style={s.editBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#DC2626" />
              </Pressable>
            </View>
          </View>
        )}
      />

      {/* SHOP SETTINGS MODAL */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={s.modalOverlayCenter}>
          <View style={s.modalContentCenter}>
            <Text style={s.modalTitle}>Shop Settings</Text>
            <Pressable onPress={pickBannerImage} style={s.bannerPickerBtn}>
              {editForm.image ? (
                <Image source={{ uri: editForm.image }} style={s.previewImg} />
              ) : (
                <Text style={{ color: "#6B7280", fontSize: 13 }}>Change Banner</Text>
              )}
            </Pressable>
            <TextInput
              value={editForm.name}
              onChangeText={(t) => setEditForm({ ...editForm, name: t })}
              style={s.input}
              placeholder="Shop Name"
            />
            <TextInput
              value={editForm.address}
              onChangeText={(t) => setEditForm({ ...editForm, address: t })}
              style={s.input}
              placeholder="Address"
            />
            <View style={s.modalActions}>
              <Pressable onPress={() => setShowSettings(false)} style={{ padding: 8 }}>
                <Text style={{ color: "#374151", fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleUpdateStore} style={s.saveBtnSmall}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 13 }}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD PRODUCT MODAL (Exact Screenshot UI) */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={s.modalOverlayBottom}>
          <View style={s.modalContentBottom}>
            <View style={s.dragHandle} />
            <Text style={s.modalTitle}>Add Product</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Product Name */}
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
                  <Pressable style={s.pickBtn} onPress={() => pickProductImage(false, false)}>
                    <MaterialCommunityIcons name="image-multiple-outline" size={20} color="#EA580C" />
                    <Text style={s.pickBtnText}>Gallery</Text>
                  </Pressable>

                  <Pressable style={s.pickBtn} onPress={() => pickProductImage(false, true)}>
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
                    resetAddForm();
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

      {/* EDIT PRODUCT MODAL (Exact Screenshot UI) */}
      <Modal visible={showEditProductModal} transparent animationType="slide">
        <View style={s.modalOverlayBottom}>
          <View style={s.modalContentBottom}>
            <View style={s.dragHandle} />
            <Text style={s.modalTitle}>Edit Product</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Product Name */}
              <TextInput
                placeholder="Name"
                placeholderTextColor="#9CA3AF"
                value={editProductForm.name}
                onChangeText={(t) => setEditProductForm({ ...editProductForm, name: t })}
                style={[s.input, s.inputHighlighted]}
              />

              {/* Price & MRP Row */}
              <View style={s.row}>
                <TextInput
                  placeholder="Price"
                  placeholderTextColor="#9CA3AF"
                  value={editProductForm.price}
                  onChangeText={(t) => setEditProductForm({ ...editProductForm, price: t })}
                  style={[s.input, s.flex1]}
                  keyboardType="numeric"
                />
                <TextInput
                  placeholder="MRP"
                  placeholderTextColor="#9CA3AF"
                  value={editProductForm.mrp}
                  onChangeText={(t) => setEditProductForm({ ...editProductForm, mrp: t })}
                  style={[s.input, s.flex1]}
                  keyboardType="numeric"
                />
              </View>

              {/* Stock & Unit Row */}
              <View style={s.row}>
                <TextInput
                  placeholder="Stock"
                  placeholderTextColor="#9CA3AF"
                  value={editProductForm.stock}
                  onChangeText={(t) => setEditProductForm({ ...editProductForm, stock: t })}
                  style={[s.input, s.flex1]}
                  keyboardType="numeric"
                />
                <TextInput
                  placeholder="Unit (e.g. 1 kg)"
                  placeholderTextColor="#9CA3AF"
                  value={editProductForm.unit}
                  onChangeText={(t) => setEditProductForm({ ...editProductForm, unit: t })}
                  style={[s.input, s.flex1]}
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
                    <MaterialCommunityIcons name="image-outline" size={36} color="#9CA3AF" />
                  )}
                </View>

                <View style={s.imagePickerCol}>
                  <Pressable style={s.pickBtn} onPress={() => pickProductImage(true, false)}>
                    <MaterialCommunityIcons name="image-multiple-outline" size={20} color="#EA580C" />
                    <Text style={s.pickBtnText}>Gallery</Text>
                  </Pressable>

                  <Pressable style={s.pickBtn} onPress={() => pickProductImage(true, true)}>
                    <MaterialCommunityIcons name="camera-outline" size={20} color="#EA580C" />
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
                style={[s.input, { height: 75, textAlignVertical: "top" }]}
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
                  size={24}
                  color="#EA580C"
                />
                <Text style={s.checkboxLabel}>Mark as trending</Text>
              </Pressable>

              {/* Action Buttons Row */}
              <View style={[s.row, { marginTop: 10 }]}>
                <Pressable
                  style={[s.actionBtn, s.cancelBtn]}
                  onPress={() => setShowEditProductModal(false)}
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[s.actionBtn, s.createBtn]}
                  onPress={handleUpdateProduct}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
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

  // Floating Header
  floatingHeader: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1000,
    elevation: 20,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  bannerWrap: { width: "100%", height: 210, backgroundColor: "#E2E8F0" },
  bannerImg: { width: "100%", height: "100%" },
  storeDetailsCard: {
    backgroundColor: "#fff",
    padding: 16,
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadow.soft,
  },
  storeTitleText: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
  },
  storeAddressText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: "500",
  },

  // List Header Title Row
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  listTitle: { fontSize: 20, fontWeight: "800", color: "#000" },
  headerAddBtn: {
    backgroundColor: "#EA580C",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  // Card Design (Exact Match with Screenshot)
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  img: { width: 60, height: 60, borderRadius: 12, backgroundColor: "#F3F4F6" },
  cardDetails: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: "700", color: "#000" },
  meta: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  editBtn: { padding: 6 },

  // Center Modal (Shop Settings)
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justify: "center",
    padding: 20,
  },
  modalContentCenter: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    ...shadow.soft,
  },
  bannerPickerBtn: {
    height: 90,
    marginBottom: 12,
    borderRadius: 12,
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
    gap: 12,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnSmall: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },

  // Bottom Sheet Modal
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContentBottom: {
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

  // Form Inputs
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

  // Categories Chips
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

  // Action Buttons
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
