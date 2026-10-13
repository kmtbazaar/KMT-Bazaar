import { LocalizedText as Text, LocalizedTextInput as TextInput } from "@/src/LocalizedText";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { adminApi } from "@/src/roleApi";
import { api, uploadImageAsset } from "@/src/api";
import { COLORS, RADIUS, SPACING } from "@/src/theme";
import ProductImagesUploader from "@/src/components/ProductImagesUploader";

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80";

const emptyProductForm = () => ({
  name: "",
  price: "",
  mrp: "",
  unit: "1 pc",
  stock: "10",
  image: "",
  images: [] as string[],
  description: "",
  trending: false,
  item_category: "",
  item_category_id: "",
});

export default function AdminVendorProducts({ vendorId, selectedStoreId: externalStoreId, showStoreSelector = true }: { vendorId: string; selectedStoreId?: string; showStoreSelector?: boolean }) {
  const [stores, setStores] = useState<any[]>([]);
  const [internalSelectedStoreId, setInternalSelectedStoreId] = useState("");
  const selectedStoreId = externalStoreId !== undefined ? externalStoreId : internalSelectedStoreId;
  const [products, setProducts] = useState<any[]>([]);
  const [itemCategories, setItemCategories] = useState<any[]>([]);
  const [shopCategories, setShopCategories] = useState<any[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [notice, setNotice] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProductId, setEditingProductId] = useState("");
  const [form, setForm] = useState(emptyProductForm);
  const [itemCategoryName, setItemCategoryName] = useState("");
  const [editingItemCategoryId, setEditingItemCategoryId] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingStores(true);
      try {
        const [vendorStoreResponse, categoryList] = await Promise.all([
          adminApi.vendorStores(String(vendorId)),
          api.categories(),
        ]);
        if (!active) return;
        const storeList = Array.isArray(vendorStoreResponse)
          ? vendorStoreResponse
          : Array.isArray((vendorStoreResponse as any)?.stores)
            ? (vendorStoreResponse as any).stores
            : [];
        setStores(storeList);
        setShopCategories(categoryList || []);
        if (externalStoreId === undefined) {
          setInternalSelectedStoreId((current) =>
            storeList.some((store: any) => String(store.id || store._id) === current)
              ? current
              : String(storeList[0]?.id || storeList[0]?._id || "")
          );
        }
        if (!storeList.length) setNotice("No store is linked to this vendor yet.");
      } catch (error: any) {
        if (active) setNotice(error?.message || "Could not load this vendor's stores.");
      } finally {
        if (active) setLoadingStores(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [vendorId]);

  const selectedStore = useMemo(
    () => stores.find((store) => String(store.id || store._id) === String(selectedStoreId)),
    [stores, selectedStoreId]
  );

  const loadStoreData = useCallback(async () => {
    if (!selectedStoreId) {
      setProducts([]);
      setItemCategories([]);
      return;
    }
    setLoadingProducts(true);
    try {
      const [allProducts, categories] = await Promise.all([
        adminApi.products(),
        adminApi.storeItemCategories(selectedStoreId),
      ]);
      const list = (allProducts || []) as any[];
      setProducts(
        list.filter((product: any) =>
          String(product.store_id || product.store?.id || product.store?._id || "") ===
          String(selectedStoreId)
        )
      );
      setItemCategories(
        ((categories || []) as any[]).filter((item: any) => item.active !== false)
      );
    } catch (error: any) {
      setNotice(error?.message || "Could not load the store's products.");
    } finally {
      setLoadingProducts(false);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    loadStoreData();
  }, [loadStoreData]);

  const shopCategoryName =
    shopCategories.find((item: any) => item.id === selectedStore?.category_id)?.name ||
    selectedStore?.category_name ||
    selectedStore?.category_id ||
    "Not set";

  const resetProductForm = () => {
    setEditingProductId("");
    setForm(emptyProductForm());
  };

  const openAddProduct = () => {
    resetProductForm();
    setNotice("");
    setModalVisible(true);
  };

  const openEditProduct = (product: any) => {
    setEditingProductId(String(product.id || product._id || ""));
    setForm({
      name: String(product.name || ""),
      price: String(product.price ?? ""),
      mrp: String(product.mrp ?? product.price ?? ""),
      unit: String(product.unit || "1 pc"),
      stock: String(product.stock ?? 0),
      image: String(product.image || product.images?.[0] || ""),
      images: Array.isArray(product.images) && product.images.length ? product.images : (product.image ? [product.image] : []),
      description: String(product.description || ""),
      trending: Boolean(product.trending),
      item_category: String(product.item_category || ""),
      item_category_id: String(product.item_category_id || ""),
    });
    setNotice("");
    setModalVisible(true);
  };

  const pickImage = async (useCamera = false) => {
    let result: ImagePicker.ImagePickerResult;
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    };
    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setNotice("Please allow camera access to take a product photo.");
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }
    if (result.canceled || !result.assets?.[0]) return;
    setUploadingImage(true);
    try {
      const imageUrl = await uploadImageAsset(result.assets[0], "product");
      setForm((current) => ({ ...current, image: imageUrl, images: [...(current.images || []).filter((url: string) => url && url !== current.image), imageUrl] }));
      setNotice("Product image uploaded.");
    } catch (error: any) {
      setNotice(error?.message || "Product image upload failed.");
    } finally {
      setUploadingImage(false);
    }
  };

  const payloadFor = (item: any, available: boolean) => ({
    name: String(item.name || "").trim(),
    category_id: String(selectedStore?.category_id || item.category_id || ""),
    store_id: String(selectedStoreId),
    item_category: String(item.item_category || ""),
    item_category_id: item.item_category_id ? String(item.item_category_id) : null,
    price: Number(item.price || 0),
    mrp: Number(item.mrp !== "" && item.mrp !== undefined && item.mrp !== null ? item.mrp : item.price || 0),
    unit: String(item.unit || "1 pc").trim() || "1 pc",
    stock: Math.max(0, parseInt(String(item.stock ?? 0), 10) || 0),
    image: String(item.image || item.images?.[0] || FALLBACK_PRODUCT_IMAGE),
    images: Array.isArray(item.images) ? item.images : (item.image ? [item.image] : []),
    description: String(item.description || ""),
    is_available: available,
    trending: Boolean(item.trending),
  });

  const saveProduct = async () => {
    if (!selectedStoreId || !selectedStore?.category_id) {
      setNotice("This store needs a shop category before products can be added.");
      return;
    }
    if (!String(form.name).trim() || !String(form.price).trim() || !Number.isFinite(Number(form.price)) || Number(form.price) < 0) {
      setNotice("Enter a product name and a valid selling price.");
      return;
    }
    if (form.mrp && (!Number.isFinite(Number(form.mrp)) || Number(form.mrp) < 0)) {
      setNotice("Enter a valid MRP.");
      return;
    }
    if (!Array.isArray(form.images) || form.images.filter((url: string) => !!url).length < 3) {
      setNotice("Please add at least 3 product photos before saving.");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const existing = products.find(
        (product: any) => String(product.id || product._id) === String(editingProductId)
      );
      const payload = payloadFor(form, existing ? existing.is_available !== false : true);
      if (editingProductId) {
        await adminApi.updateProduct(editingProductId, payload);
        setNotice("Product updated successfully.");
      } else {
        await adminApi.createProduct(payload);
        setNotice("Product added to this store successfully.");
      }
      setModalVisible(false);
      resetProductForm();
      await loadStoreData();
    } catch (error: any) {
      setNotice(error?.message || "Could not save this product.");
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (product: any) => {
    const productId = String(product.id || product._id || "");
    if (!productId) return;
    try {
      await adminApi.updateProduct(
        productId,
        payloadFor(product, product.is_available === false)
      );
      setNotice(product.is_available === false ? "Product is now available." : "Product is now unavailable.");
      await loadStoreData();
    } catch (error: any) {
      setNotice(error?.message || "Could not update product availability.");
    }
  };

  const duplicateProduct = async (product: any) => {
    try {
      await adminApi.createProduct({
        ...payloadFor(product, true),
        name: `${String(product.name || "Product").trim()} Copy`,
      });
      setNotice("Product duplicated successfully.");
      await loadStoreData();
    } catch (error: any) {
      setNotice(error?.message || "Could not duplicate this product.");
    }
  };

  const deleteProduct = async (product: any) => {
    const productId = String(product.id || product._id || "");
    if (!productId) return;
    const remove = async () => {
      try {
        await adminApi.deleteProduct(productId);
        setNotice("Product deleted.");
        await loadStoreData();
      } catch (error: any) {
        setNotice(error?.message || "Could not delete this product.");
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${product.name || "this product"}" from this store?`)) await remove();
    } else {
      Alert.alert("Delete product", `Delete "${product.name || "this product"}" from this store?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => { void remove(); } },
      ]);
    }
  };

  const saveItemCategory = async () => {
    const name = itemCategoryName.trim();
    if (!selectedStoreId || !name) {
      setNotice("Enter an item category name first.");
      return;
    }
    try {
      const data = { name, icon: "tag-outline", color: "#F97316", order: 99, active: true };
      if (editingItemCategoryId) {
        await adminApi.updateStoreItemCategory(selectedStoreId, editingItemCategoryId, data);
        setNotice("Item category updated.");
      } else {
        await adminApi.createStoreItemCategory(selectedStoreId, data);
        setNotice("Item category added.");
      }
      setItemCategoryName("");
      setEditingItemCategoryId("");
      await loadStoreData();
    } catch (error: any) {
      setNotice(error?.message || "Could not save the item category.");
    }
  };

  const removeItemCategory = async (item: any) => {
    const remove = async () => {
      try {
        await adminApi.deleteStoreItemCategory(selectedStoreId, String(item.id));
        if (editingItemCategoryId === String(item.id)) {
          setEditingItemCategoryId("");
          setItemCategoryName("");
        }
        setNotice("Item category removed.");
        await loadStoreData();
      } catch (error: any) {
        setNotice(error?.message || "Could not remove the item category.");
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Remove item category "${item.name}"? Products using it will have the category cleared.`)) await remove();
    } else {
      Alert.alert("Remove item category", `Remove "${item.name}"? Products using it will have the category cleared.`, [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => { void remove(); } },
      ]);
    }
  };

  const activeItemCategories = itemCategories.filter((item: any) => item.active !== false);

  return (
    <View style={styles.wrapper}>
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Store Products</Text>
          <Text style={styles.sectionSubtitle}>Admin can manage products for this vendor's store.</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{products.length}</Text>
        </View>
      </View>

      {loadingStores ? (
        <View style={styles.loadingRow}><ActivityIndicator color="#EA580C" /><Text style={styles.muted}>Loading vendor stores…</Text></View>
      ) : stores.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="store-off-outline" size={28} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No store found</Text>
          <Text style={styles.muted}>This vendor does not have a linked store yet.</Text>
        </View>
      ) : (
        <>
          {showStoreSelector ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storeChips}>
            {stores.map((store: any) => {
              const storeId = String(store.id || store._id);
              const selected = selectedStoreId === storeId;
              return (
                <Pressable
                  key={storeId}
                  onPress={() => { if (externalStoreId === undefined) setInternalSelectedStoreId(storeId); setNotice(""); setEditingItemCategoryId(""); setItemCategoryName(""); }}
                  style={[styles.storeChip, selected && styles.storeChipActive]}
                >
                  <MaterialCommunityIcons name="store-outline" size={16} color={selected ? "#fff" : "#C2410C"} />
                  <Text numberOfLines={1} style={[styles.storeChipText, selected && styles.storeChipTextActive]}>
                    {store.name || "Store"}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          ) : null}

          <View style={styles.storeMeta}>
            <Text style={styles.storeMetaLabel}>Shop category</Text>
            <Text style={styles.storeMetaValue}>{shopCategoryName}</Text>
          </View>

          <View style={styles.categoryPanel}>
            <Text style={styles.panelTitle}>Store Item Categories</Text>
            <Text style={styles.muted}>Examples: Jeans, T-Shirts, Snacks. These categories appear inside this store.</Text>
            <View style={styles.categoryInputRow}>
              <TextInput
                value={itemCategoryName}
                onChangeText={setItemCategoryName}
                placeholder="New item category"
                placeholderTextColor="#9CA3AF"
                style={styles.categoryInput}
                returnKeyType="done"
                onSubmitEditing={saveItemCategory}
              />
              <Pressable onPress={saveItemCategory} style={styles.smallPrimaryButton}>
                <MaterialCommunityIcons name={editingItemCategoryId ? "check" : "plus"} size={18} color="#fff" />
              </Pressable>
              {editingItemCategoryId ? (
                <Pressable onPress={() => { setEditingItemCategoryId(""); setItemCategoryName(""); }} style={styles.cancelIconButton}>
                  <MaterialCommunityIcons name="close" size={18} color="#64748B" />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.categoryChips}>
              {activeItemCategories.map((item: any) => (
                <View key={String(item.id)} style={styles.itemCategoryChip}>
                  <Text style={styles.itemCategoryText}>{item.name}</Text>
                  <Pressable onPress={() => { setEditingItemCategoryId(String(item.id)); setItemCategoryName(String(item.name || "")); }} hitSlop={6}>
                    <MaterialCommunityIcons name="pencil-outline" size={15} color="#2563EB" />
                  </Pressable>
                  <Pressable onPress={() => { void removeItemCategory(item); }} hitSlop={6}>
                    <MaterialCommunityIcons name="close-circle-outline" size={16} color="#DC2626" />
                  </Pressable>
                </View>
              ))}
              {activeItemCategories.length === 0 ? <Text style={styles.muted}>No item categories added yet.</Text> : null}
            </View>
          </View>

          <View style={styles.productsHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.panelTitle}>Products</Text>
              <Text style={styles.muted}>{products.length} products in {selectedStore?.name || "this store"}</Text>
            </View>
            <Pressable onPress={openAddProduct} style={styles.addButton}>
              <MaterialCommunityIcons name="plus" size={18} color="#fff" />
              <Text style={styles.addButtonText}>Add Product</Text>
            </Pressable>
          </View>

          {loadingProducts ? (
            <View style={styles.loadingRow}><ActivityIndicator color="#EA580C" /><Text style={styles.muted}>Loading products…</Text></View>
          ) : products.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="package-variant-closed" size={28} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No products yet</Text>
              <Text style={styles.muted}>Use Add Product to create the first listing for this store.</Text>
            </View>
          ) : (
            products.map((product: any) => {
              const productId = String(product.id || product._id);
              const available = product.is_available !== false;
              return (
                <View key={productId} style={styles.productCard}>
                  <Image source={{ uri: product.image || FALLBACK_PRODUCT_IMAGE }} style={styles.productImage} contentFit="cover" />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>{product.name || "Unnamed product"}</Text>
                    <Text style={styles.productPrice}>₹{Number(product.price || 0).toFixed(2)} <Text style={styles.productMrp}>MRP ₹{Number(product.mrp ?? product.price ?? 0).toFixed(2)}</Text></Text>
                    <Text style={styles.productMeta}>{product.unit || "1 pc"} · Stock: {Number(product.stock || 0)}</Text>
                    {product.item_category ? <Text style={styles.productCategory}>{product.item_category}</Text> : null}
                    <Text style={[styles.availability, { color: available ? "#15803D" : "#B91C1C" }]}>{available ? "Available" : "Unavailable"}</Text>
                  </View>
                  <View style={styles.actions}>
                    <Pressable onPress={() => { void toggleAvailability(product); }} style={styles.actionButton} accessibilityLabel="Toggle product availability">
                      <MaterialCommunityIcons name={available ? "eye-outline" : "eye-off-outline"} size={18} color={available ? "#16A34A" : "#94A3B8"} />
                    </Pressable>
                    <Pressable onPress={() => { void duplicateProduct(product); }} style={styles.actionButton} accessibilityLabel="Duplicate product">
                      <MaterialCommunityIcons name="content-copy" size={17} color="#2563EB" />
                    </Pressable>
                    <Pressable onPress={() => openEditProduct(product)} style={styles.actionButton} accessibilityLabel="Edit product">
                      <MaterialCommunityIcons name="pencil-outline" size={18} color="#D97706" />
                    </Pressable>
                    <Pressable onPress={() => { void deleteProduct(product); }} style={styles.actionButton} accessibilityLabel="Delete product">
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color="#DC2626" />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </>
      )}

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProductId ? "Edit Product" : "Add Product"}</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
              <TextInput
                value={form.name}
                onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
                placeholder="Product name *"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
              <View style={styles.shopCategoryBlock}>
                <Text style={styles.formLabel}>Shop Category</Text>
                <Text style={styles.shopCategoryText}>{shopCategoryName}</Text>
                <Text style={[styles.formLabel, { marginTop: 10 }]}>Item Category</Text>
                <View style={styles.formCategoryChips}>
                  {activeItemCategories.map((item: any) => {
                    const selected = form.item_category_id === String(item.id);
                    return (
                      <Pressable
                        key={String(item.id)}
                        onPress={() => setForm((current) => ({
                          ...current,
                          item_category: selected ? "" : String(item.name || ""),
                          item_category_id: selected ? "" : String(item.id),
                        }))}
                        style={[styles.formCategoryChip, selected && styles.formCategoryChipActive]}
                      >
                        <Text style={[styles.formCategoryChipText, selected && styles.formCategoryChipTextActive]}>{item.name}</Text>
                      </Pressable>
                    );
                  })}
                  {activeItemCategories.length === 0 ? <Text style={styles.muted}>Add a store item category above first; selecting a category is optional.</Text> : null}
                </View>
              </View>
              <View style={styles.formRow}>
                <TextInput
                  value={form.price}
                  onChangeText={(value) => setForm((current) => ({ ...current, price: value }))}
                  placeholder="Selling Price *"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.flexInput]}
                />
                <TextInput
                  value={form.mrp}
                  onChangeText={(value) => setForm((current) => ({ ...current, mrp: value }))}
                  placeholder="MRP"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.flexInput]}
                />
              </View>
              <View style={styles.formRow}>
                <TextInput
                  value={form.stock}
                  onChangeText={(value) => setForm((current) => ({ ...current, stock: value }))}
                  placeholder="Stock"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  style={[styles.input, styles.flexInput]}
                />
                <TextInput
                  value={form.unit}
                  onChangeText={(value) => setForm((current) => ({ ...current, unit: value }))}
                  placeholder="Unit (e.g. 1 kg)"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, styles.flexInput]}
                />
              </View>
              <ProductImagesUploader value={form.images} onChange={(images) => setForm((current) => ({ ...current, images, image: images[0] || "" }))} label="Product Photos (minimum 3)" testID="admin-vendor-product-images" />
              <TextInput
                value={form.description}
                onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
                placeholder="Product description"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                style={[styles.input, styles.descriptionInput]}
              />
              <Pressable onPress={() => setForm((current) => ({ ...current, trending: !current.trending }))} style={styles.checkboxRow}>
                <MaterialCommunityIcons name={form.trending ? "checkbox-marked" : "checkbox-blank-outline"} size={21} color="#EA580C" />
                <Text style={styles.checkboxText}>Mark as trending</Text>
              </Pressable>
              <View style={styles.modalActions}>
                <Pressable onPress={() => setModalVisible(false)} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable disabled={saving || uploadingImage} onPress={() => { void saveProduct(); }} style={[styles.saveButton, (saving || uploadingImage) && { opacity: 0.65 }]}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>{editingProductId ? "Save Changes" : "Create Product"}</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: "#fff", borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: 18 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 19, fontWeight: "900", color: COLORS.text },
  sectionSubtitle: { marginTop: 3, fontSize: 12, color: COLORS.textMuted },
  countPill: { minWidth: 34, height: 34, borderRadius: 17, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center" },
  countText: { color: "#C2410C", fontWeight: "900" },
  loadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, padding: 18 },
  muted: { color: "#64748B", fontSize: 12, lineHeight: 18 },
  emptyBox: { alignItems: "center", padding: 18, borderRadius: 12, backgroundColor: "#F8FAFC", gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: "800", color: "#334155" },
  storeChips: { gap: 8, paddingVertical: 2, paddingBottom: 12 },
  storeChip: { maxWidth: 220, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, borderWidth: 1, borderColor: "#FED7AA", backgroundColor: "#FFF7ED", paddingHorizontal: 12, paddingVertical: 9 },
  storeChipActive: { borderColor: "#EA580C", backgroundColor: "#EA580C" },
  storeChipText: { color: "#9A3412", fontSize: 12, fontWeight: "800", maxWidth: 170 },
  storeChipTextActive: { color: "#fff" },
  storeMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, padding: 11, marginBottom: 12, backgroundColor: "#F8FAFC", borderRadius: 10 },
  storeMetaLabel: { fontSize: 12, color: "#64748B" },
  storeMetaValue: { flex: 1, textAlign: "right", fontSize: 12, fontWeight: "800", color: "#334155" },
  categoryPanel: { padding: 12, backgroundColor: "#FFFBF5", borderWidth: 1, borderColor: "#FED7AA", borderRadius: 13, marginBottom: 15 },
  panelTitle: { fontSize: 15, fontWeight: "900", color: "#111827", marginBottom: 4 },
  categoryInputRow: { flexDirection: "row", gap: 7, alignItems: "center", marginTop: 9 },
  categoryInput: { flex: 1, minWidth: 0, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, fontSize: 13, color: "#111827" },
  smallPrimaryButton: { height: 40, width: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#EA580C" },
  cancelIconButton: { height: 40, width: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  categoryChips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 10 },
  itemCategoryChip: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 9, paddingVertical: 7, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", borderRadius: 16 },
  itemCategoryText: { color: "#374151", fontSize: 11, fontWeight: "800" },
  productsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  addButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#EA580C", borderRadius: 19, paddingHorizontal: 12, paddingVertical: 10 },
  addButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  productCard: { flexDirection: "row", alignItems: "center", gap: 9, padding: 10, marginBottom: 8, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12 },
  productImage: { width: 54, height: 54, borderRadius: 10, backgroundColor: "#E2E8F0" },
  productInfo: { flex: 1, minWidth: 0 },
  productName: { color: "#111827", fontSize: 13, fontWeight: "800" },
  productPrice: { marginTop: 3, color: "#111827", fontSize: 12, fontWeight: "900" },
  productMrp: { color: "#64748B", fontSize: 10, fontWeight: "500" },
  productMeta: { marginTop: 2, color: "#64748B", fontSize: 11 },
  productCategory: { marginTop: 3, color: "#9A3412", fontSize: 10, fontWeight: "800" },
  availability: { marginTop: 2, fontSize: 10, fontWeight: "800" },
  actions: { alignItems: "center", justifyContent: "center", gap: 1 },
  actionButton: { width: 28, height: 30, alignItems: "center", justifyContent: "center" },
  notice: { color: "#475569", fontSize: 12, lineHeight: 18, marginTop: 8, padding: 9, backgroundColor: "#F8FAFC", borderRadius: 9 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.48)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 9, maxHeight: "92%" },
  modalHandle: { width: 38, height: 4, backgroundColor: "#CBD5E1", borderRadius: 3, alignSelf: "center", marginBottom: 10 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  modalTitle: { fontSize: 19, fontWeight: "900", color: "#111827" },
  input: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111827", marginBottom: 9 },
  shopCategoryBlock: { padding: 11, marginBottom: 9, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 11 },
  formLabel: { color: "#475569", fontSize: 11, fontWeight: "900", marginBottom: 5 },
  shopCategoryText: { color: "#111827", fontSize: 13, fontWeight: "800" },
  formCategoryChips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 2 },
  formCategoryChip: { borderWidth: 1, borderColor: "#FED7AA", backgroundColor: "#FFF7ED", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7 },
  formCategoryChipActive: { backgroundColor: "#EA580C", borderColor: "#EA580C" },
  formCategoryChipText: { color: "#9A3412", fontSize: 11, fontWeight: "800" },
  formCategoryChipTextActive: { color: "#fff" },
  formRow: { flexDirection: "row", gap: 8 },
  flexInput: { flex: 1, minWidth: 0 },
  imageRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 9 },
  imagePreviewBox: { width: 78, height: 78, borderRadius: 12, borderWidth: 1, borderColor: "#FED7AA", backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  imagePreview: { width: "100%", height: "100%" },
  imageButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 34, borderRadius: 17, borderWidth: 1, borderColor: "#FED7AA", backgroundColor: "#FFF7ED" },
  imageButtonText: { color: "#9A3412", fontWeight: "800", fontSize: 12 },
  descriptionInput: { height: 76, textAlignVertical: "top" },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
  checkboxText: { fontSize: 13, fontWeight: "800", color: "#111827" },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 2 },
  cancelButton: { flex: 1, height: 44, borderRadius: 22, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  cancelButtonText: { color: "#475569", fontSize: 13, fontWeight: "800" },
  saveButton: { flex: 1.3, height: 44, borderRadius: 22, backgroundColor: "#EA580C", alignItems: "center", justifyContent: "center" },
  saveButtonText: { color: "#fff", fontSize: 13, fontWeight: "900" },
});
