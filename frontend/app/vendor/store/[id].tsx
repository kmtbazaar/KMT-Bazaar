import { LocalizedText as Text, LocalizedTextInput as TextInput } from "@/src/LocalizedText";
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { vendorApi } from "@/src/roleApi";
import { api, uploadImageAsset } from "@/src/api";
import { COLORS, IMAGE_FALLBACK_URL, RADIUS, shadow } from "@/src/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type BulkKind = "ration" | "vegetables";

const BULK_PRODUCT_TEMPLATES: Record<BulkKind, Array<{ name: string; unit: string }>> = {
  ration: [
    { name: "Wheat Atta", unit: "1 kg" },
    { name: "Regular Rice", unit: "1 kg" },
    { name: "Basmati Rice", unit: "1 kg" },
    { name: "Toor / Arhar Dal", unit: "1 kg" },
    { name: "Chana Dal", unit: "1 kg" },
    { name: "Moong Dal", unit: "1 kg" },
    { name: "Masoor Dal", unit: "1 kg" },
    { name: "Urad Dal", unit: "1 kg" },
    { name: "Rajma", unit: "1 kg" },
    { name: "Kabuli Chana", unit: "1 kg" },
    { name: "Besan", unit: "1 kg" },
    { name: "Sooji / Rava", unit: "1 kg" },
    { name: "Poha", unit: "1 kg" },
    { name: "Sugar", unit: "1 kg" },
    { name: "Salt", unit: "1 kg" },
    { name: "Mustard Oil", unit: "1 L" },
    { name: "Refined Oil", unit: "1 L" },
    { name: "Turmeric Powder", unit: "100 g" },
    { name: "Red Chilli Powder", unit: "100 g" },
    { name: "Coriander Powder", unit: "100 g" },
    { name: "Cumin Seeds (Jeera)", unit: "100 g" },
    { name: "Tea Leaves", unit: "250 g" },
  ],
  vegetables: [
    { name: "Potato", unit: "1 kg" },
    { name: "Onion", unit: "1 kg" },
    { name: "Tomato", unit: "1 kg" },
    { name: "Brinjal", unit: "1 kg" },
    { name: "Cauliflower", unit: "1 pc" },
    { name: "Cabbage", unit: "1 pc" },
    { name: "Ladyfinger (Bhindi)", unit: "1 kg" },
    { name: "Green Chilli", unit: "100 g" },
    { name: "Cucumber", unit: "1 kg" },
    { name: "Carrot", unit: "1 kg" },
    { name: "Green Peas", unit: "1 kg" },
    { name: "Capsicum", unit: "1 kg" },
    { name: "Bottle Gourd (Lauki)", unit: "1 pc" },
    { name: "Bitter Gourd (Karela)", unit: "1 kg" },
    { name: "Pumpkin", unit: "1 kg" },
    { name: "Spinach (Palak)", unit: "1 bunch" },
    { name: "Coriander Leaves (Dhaniya)", unit: "1 bunch" },
    { name: "Ginger", unit: "100 g" },
    { name: "Garlic", unit: "100 g" },
    { name: "Lemon", unit: "1 dozen" },
    { name: "Green Beans", unit: "1 kg" },
    { name: "Radish (Mooli)", unit: "1 kg" },
  ],
};

type BulkProductEntry = { selected: boolean; price: string; mrp: string; stock: string };
const EMPTY_BULK_ENTRY: BulkProductEntry = { selected: false, price: "", mrp: "", stock: "10" };

export default function VendorStoreDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = params.id as string;
  const initialName = (params.name as string) || "Store Detail";
  const initialImage = (params.image as string) || "";
  const initialAddress = (params.address as string) || "";

  const [products, setProducts] = useState<any[]>([]);
  const [store, setStore] = useState<any | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [itemCategories, setItemCategories] = useState<any[]>([]);
  const [itemCategoryName, setItemCategoryName] = useState("");
  const [editingItemCategoryId, setEditingItemCategoryId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [stockOnly, setStockOnly] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkKind, setBulkKind] = useState<BulkKind>("ration");
  const [bulkForms, setBulkForms] = useState<Record<string, BulkProductEntry>>({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");

  const [showSettings, setShowSettings] = useState(false);
  const [editForm, setEditForm] = useState({
    name: initialName,
    address: initialAddress,
    image: initialImage,
    category_id: "",
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
    item_category: "",
    item_category_id: "",
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
    item_category: "",
    item_category_id: "",
  });

  const load = useCallback(async () => {
    try {
      const [all, vendorStats, categoryList] = await Promise.all([
        vendorApi.products(),
        vendorApi.stats(),
        api.categories(),
      ]);
      const currentStore = (vendorStats?.stores || []).find(
        (item: any) => String(item.id) === String(id)
      );
      const storeItemCategories = currentStore
        ? await vendorApi.storeItemCategories(id)
        : [];

      setProducts((all || []).filter((p: any) => p.store_id === id));
      setStore(currentStore || null);
      setCategories(categoryList || []);
      setItemCategories(storeItemCategories || []);
      if (currentStore?.category_id) {
        setForm((prev) => ({ ...prev, category_id: currentStore.category_id }));
        setEditForm((prev) => ({ ...prev, category_id: currentStore.category_id }));
      }
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

  const bulkEntryKey = (kind: BulkKind, name: string) => `${kind}:${name}`;
  const getBulkEntry = (kind: BulkKind, name: string): BulkProductEntry =>
    bulkForms[bulkEntryKey(kind, name)] || EMPTY_BULK_ENTRY;

  const updateBulkEntry = (kind: BulkKind, name: string, patch: Partial<BulkProductEntry>) => {
    const key = bulkEntryKey(kind, name);
    setBulkForms((previous) => ({
      ...previous,
      [key]: { ...(previous[key] || EMPTY_BULK_ENTRY), ...patch },
    }));
  };

  const selectedBulkProducts = (["ration", "vegetables"] as BulkKind[]).flatMap((kind) =>
    BULK_PRODUCT_TEMPLATES[kind]
      .filter((item) => getBulkEntry(kind, item.name).selected)
      .map((item) => ({ ...item, kind, ...getBulkEntry(kind, item.name) }))
  );
  const selectedBulkCount = selectedBulkProducts.length;

  const setCurrentBulkSelection = (selected: boolean) => {
    setBulkForms((previous) => {
      const next = { ...previous };
      BULK_PRODUCT_TEMPLATES[bulkKind].forEach((item) => {
        const key = bulkEntryKey(bulkKind, item.name);
        next[key] = { ...(previous[key] || EMPTY_BULK_ENTRY), selected };
      });
      return next;
    });
  };

  const openBulkAdd = () => {
    if (!store?.id || !store?.category_id) {
      Alert.alert("Store not ready", "Wait for the store details to load, then try again.");
      return;
    }
    setBulkProgress("");
    setShowBulkModal(true);
  };

  const handleBulkAddProducts = async () => {
    const selected = selectedBulkProducts;
    if (!selected.length) {
      Alert.alert("Select products", "Select at least one ration or vegetable item first.");
      return;
    }
    if (!store?.id || !store?.category_id) {
      Alert.alert("Store category missing", "Configure the store category before adding products.");
      return;
    }

    const existingNames = new Set(
      products.map((item) => String(item.name || "").trim().toLocaleLowerCase())
    );
    const duplicates = selected.filter((item) =>
      existingNames.has(item.name.trim().toLocaleLowerCase())
    );
    const toCreate = selected.filter((item) =>
      !existingNames.has(item.name.trim().toLocaleLowerCase())
    );

    if (!toCreate.length) {
      Alert.alert("Already added", "All selected product names already exist in this store. No duplicates were created.");
      return;
    }

    for (const item of toCreate) {
      const price = Number(item.price);
      const mrp = item.mrp.trim() ? Number(item.mrp) : price;
      const stock = Number(item.stock);
      if (!item.price.trim() || !Number.isFinite(price) || price <= 0) {
        Alert.alert("Selling price required", `Enter a valid selling price for ${item.name}.`);
        return;
      }
      if (item.mrp.trim() && (!Number.isFinite(mrp) || mrp < price)) {
        Alert.alert("Check MRP", `MRP for ${item.name} must be equal to or greater than its selling price.`);
        return;
      }
      if (!item.stock.trim() || !Number.isInteger(stock) || stock < 0) {
        Alert.alert("Check stock", `Enter a valid stock quantity for ${item.name}.`);
        return;
      }
    }

    setBulkSaving(true);
    setBulkProgress("Preparing product categories...");
    try {
      const kinds = Array.from(new Set(toCreate.map((item) => item.kind))) as BulkKind[];
      const categoryIds: Record<string, string> = {};
      let storeCategories = await vendorApi.storeItemCategories(id);

      for (const kind of kinds) {
        const categoryName = kind === "ration" ? "Ration" : "Vegetables";
        const categoryIcon = kind === "ration" ? "basket-outline" : "carrot";
        const categoryColor = kind === "ration" ? "#D97706" : "#16A34A";
        let category = storeCategories.find(
          (item: any) => String(item.name || "").trim().toLowerCase() === categoryName.toLowerCase()
        );

        if (category && category.active === false) {
          await vendorApi.updateStoreItemCategory(id, category.id, {
            name: categoryName,
            icon: categoryIcon,
            color: categoryColor,
            order: kind === "ration" ? 1 : 2,
            active: true,
          });
          storeCategories = await vendorApi.storeItemCategories(id);
          category = storeCategories.find(
            (item: any) => String(item.name || "").trim().toLowerCase() === categoryName.toLowerCase() && item.active !== false
          );
        }

        if (!category) {
          try {
            category = await vendorApi.createStoreItemCategory(id, {
              name: categoryName,
              icon: categoryIcon,
              color: categoryColor,
              order: kind === "ration" ? 1 : 2,
              active: true,
            });
          } catch (error) {
            storeCategories = await vendorApi.storeItemCategories(id);
            category = storeCategories.find(
              (item: any) => String(item.name || "").trim().toLowerCase() === categoryName.toLowerCase() && item.active !== false
            );
            if (!category) throw error;
          }
          storeCategories = await vendorApi.storeItemCategories(id);
        }

        if (!category?.id) throw new Error(`Could not prepare the ${categoryName} category.`);
        categoryIds[kind] = category.id;
      }

      let added = 0;
      const failedNames: string[] = [];
      const completedKeys = new Set<string>(
        duplicates.map((item) => bulkEntryKey(item.kind, item.name))
      );

      for (let index = 0; index < toCreate.length; index++) {
        const item = toCreate[index];
        const sellingPrice = Number(item.price);
        setBulkProgress(`Adding ${index + 1} of ${toCreate.length}: ${item.name}`);
        try {
          await vendorApi.createProduct({
            name: item.name,
            category_id: store.category_id,
            item_category_id: categoryIds[item.kind],
            item_category: item.kind === "ration" ? "Ration" : "Vegetables",
            store_id: id,
            price: sellingPrice,
            mrp: item.mrp.trim() ? Number(item.mrp) : sellingPrice,
            unit: item.unit,
            stock: Number(item.stock),
            image: IMAGE_FALLBACK_URL,
            images: [IMAGE_FALLBACK_URL],
            description: "",
            is_available: true,
            trending: false,
          });
          added += 1;
          completedKeys.add(bulkEntryKey(item.kind, item.name));
          existingNames.add(item.name.trim().toLocaleLowerCase());
        } catch (error: any) {
          console.error("Bulk product add failed", item.name, error);
          failedNames.push(item.name);
        }
      }

      await load();
      setBulkForms((previous) => {
        const next = { ...previous };
        completedKeys.forEach((key) => {
          if (next[key]) next[key] = { ...next[key], selected: false };
        });
        return next;
      });

      const summary = [
        `Added: ${added}`,
        duplicates.length ? `Skipped existing products: ${duplicates.length}` : "",
        failedNames.length ? `Could not add: ${failedNames.slice(0, 5).join(", ")}${failedNames.length > 5 ? ", ..." : ""}` : "",
      ].filter(Boolean).join("\n");

      setBulkProgress("");
      if (failedNames.length === 0) setShowBulkModal(false);
      Alert.alert(added > 0 ? "Bulk add complete" : "No new products added", summary || "No products were changed.");
    } catch (error: any) {
      console.error("Bulk add setup failed", error);
      setBulkProgress("");
      Alert.alert("Bulk add failed", error?.message || "Could not prepare categories or add products. Please try again.");
    } finally {
      setBulkSaving(false);
    }
  };

  const saveStoreItemCategory = async () => {
    const name = itemCategoryName.trim();
    if (!name) {
      Alert.alert("Required", "Enter an item category name.");
      return;
    }
    try {
      if (editingItemCategoryId) {
        await vendorApi.updateStoreItemCategory(id, editingItemCategoryId, { name });
      } else {
        await vendorApi.createStoreItemCategory(id, { name });
      }
      setItemCategoryName("");
      setEditingItemCategoryId(null);
      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save item category.");
    }
  };

  const editStoreItemCategory = (item: any) => {
    setEditingItemCategoryId(item.id);
    setItemCategoryName(item.name || "");
  };

  const removeStoreItemCategory = async (item: any) => {
    const confirmed = Platform.OS === "web"
      ? window.confirm(`Remove item category "${item.name}"?`)
      : true;
    if (!confirmed) return;
    try {
      await vendorApi.deleteStoreItemCategory(id, item.id);
      if (editingItemCategoryId === item.id) {
        setEditingItemCategoryId(null);
        setItemCategoryName("");
      }
      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not remove item category.");
    }
  };

  const visibleProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((product: any) => {
      const matchesSearch = !q || String(product.name || "").toLowerCase().includes(q);
      const matchesStock = !stockOnly || Number(product.stock || 0) <= 5;
      return matchesSearch && matchesStock;
    });
  }, [products, productSearch, stockOnly]);

  const toggleProduct = async (product: any) => {
    try {
      await vendorApi.toggleProductAvailability(product.id, product.is_available === false);
      await load();
    } catch (e) {
      Alert.alert("Error", "Could not change product availability.");
    }
  };

  const duplicateProduct = async (product: any) => {
    try {
      await vendorApi.duplicateProduct(product.id);
      await load();
    } catch (e) {
      Alert.alert("Error", "Could not duplicate product.");
    }
  };

  const pickBannerImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [2, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        setLoading(true);
        const imageUrl = await uploadImageAsset(result.assets[0]);
        setEditForm({
          ...editForm,
          image: imageUrl,
        });
      } catch (e: any) {
        Alert.alert("Upload failed", e?.message || "Could not upload banner.");
      } finally {
        setLoading(false);
      }
    }
  };

  const pickProductImage = async (isEditMode: boolean, useCamera = false) => {
    let result;
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
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

    if (!result.canceled && result.assets[0]) {
      try {
        setLoading(true);
        const imageUrl = await uploadImageAsset(result.assets[0], "product");
        if (isEditMode) {
          setEditProductForm((prev) => ({ ...prev, image: imageUrl }));
        } else {
          setForm((prev) => ({ ...prev, image: imageUrl }));
        }
      } catch (e: any) {
        Alert.alert("Upload failed", e?.message || "Could not upload product image.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUpdateStore = async () => {
    if (!editForm.name) return Alert.alert("Error", "Shop name is required");
    setLoading(true);
    try {
      await vendorApi.updateStore(id, editForm);
      Alert.alert(
        "Success",
        "Shop details updated! If the shop category changed, product item categories need to be selected again."
      );
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
      item_category: "",
      item_category_id: "",
    });
  };

  const handleAddProduct = async () => {
    if (!form.name || !form.price || !store?.category_id) {
      Alert.alert("Error", "Name, Price, and shop category are required.");
      return;
    }
    setLoading(true);
    try {
      await vendorApi.createProduct({
        ...form,
        category_id: store.category_id,
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
      item_category: prod.item_category || "",
      item_category_id:
        prod.item_category_id ||
        itemCategories.find(
          (item: any) =>
            String(item.name).toLowerCase() ===
            String(prod.item_category || "").toLowerCase()
        )?.id ||
        "",
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
        category_id: store?.category_id || editProductForm.category_id,
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
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <FlatList
        data={visibleProducts}
        keyExtractor={(p) => p.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 20 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          <>
            {/* Banner Image + Store Controls */}
            <View style={s.bannerWrap}>
              <Image source={{ uri: editForm.image }} style={s.bannerImg} contentFit="cover" />

              <Pressable onPress={() => router.back()} style={[s.bannerCircleBtn, s.bannerBackBtn]} hitSlop={8}>
                <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
              </Pressable>

              <Pressable onPress={() => setShowSettings(true)} style={[s.bannerCircleBtn, s.bannerSettingsBtn]} hitSlop={8}>
                <MaterialCommunityIcons name="cog" size={20} color="#fff" />
              </Pressable>
            </View>

            {/* Store Details Card */}
            <View style={s.storeDetailsCard}>
              <Text style={s.storeTitleText}>{editForm.name}</Text>
              {editForm.address ? (
                <Text style={s.storeAddressText}>📍 {editForm.address}</Text>
              ) : null}
            </View>

            <View style={s.itemCategoryManager}>
              <View style={s.itemCategoryManagerHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.listTitle}>Store Item Categories</Text>
                  <Text style={s.itemCategoryHint}>Write categories like Jeans, T-Shirts, Shirts. They appear on the customer's left side.</Text>
                </View>
              </View>
              <View style={s.itemCategoryInputRow}>
                <TextInput
                  value={itemCategoryName}
                  onChangeText={setItemCategoryName}
                  placeholder="e.g. Jeans"
                  placeholderTextColor="#9CA3AF"
                  style={[s.inputCompact, s.itemCategoryInput]}
                  onSubmitEditing={saveStoreItemCategory}
                />
                <Pressable onPress={saveStoreItemCategory} style={s.itemCategorySaveBtn}>
                  <MaterialCommunityIcons name={editingItemCategoryId ? "check" : "plus"} size={18} color="#fff" />
                </Pressable>
                {editingItemCategoryId ? (
                  <Pressable
                    onPress={() => { setEditingItemCategoryId(null); setItemCategoryName(""); }}
                    style={s.itemCategoryCancelBtn}
                  >
                    <MaterialCommunityIcons name="close" size={18} color="#6B7280" />
                  </Pressable>
                ) : null}
              </View>
              <View style={s.vendorItemCategoryList}>
                {itemCategories.length ? itemCategories.map((item: any) => (
                  <View key={item.id} style={s.vendorItemCategoryChip}>
                    <Text style={s.vendorItemCategoryText}>{item.name}</Text>
                    <Pressable onPress={() => editStoreItemCategory(item)} hitSlop={6}>
                      <MaterialCommunityIcons name="pencil-outline" size={15} color="#2563EB" />
                    </Pressable>
                    <Pressable onPress={() => removeStoreItemCategory(item)} hitSlop={6}>
                      <MaterialCommunityIcons name="close-circle-outline" size={16} color="#DC2626" />
                    </Pressable>
                  </View>
                )) : (
                  <Text style={s.itemCategoryEmpty}>No item categories yet. Add your first one above.</Text>
                )}
              </View>
            </View>

            {/* Header Title with Right Top Add Button */}
            <View style={s.listHeaderRow}>
              <Text style={s.listTitle}>Products ({products.length})</Text>
              <View style={s.listHeaderActions}>
                <Pressable
                  onPress={openBulkAdd}
                  style={s.bulkHeaderBtn}
                  testID="vendor-store-bulk-add"
                >
                  <MaterialCommunityIcons name="playlist-plus" size={17} color="#fff" />
                  <Text style={s.bulkHeaderBtnText}>Bulk Add</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    resetAddForm();
                    setShowAddModal(true);
                  }}
                  style={s.headerAddBtn}
                  accessibilityLabel="Add one product"
                >
                  <MaterialCommunityIcons name="plus" size={18} color="#fff" />
                </Pressable>
              </View>
            </View>

            <View style={s.productTools}>
              <TextInput
                value={productSearch}
                onChangeText={setProductSearch}
                placeholder="Search products"
                placeholderTextColor="#9CA3AF"
                style={s.productSearch}
              />
              <Pressable
                onPress={() => setStockOnly((v) => !v)}
                style={[s.stockFilter, stockOnly && s.stockFilterActive]}
              >
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={stockOnly ? "#fff" : "#D97706"} />
                <Text style={[s.stockFilterText, stockOnly && s.stockFilterTextActive]}>Low stock</Text>
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
              <Pressable onPress={() => toggleProduct(item)} hitSlop={8} style={s.editBtn}>
                <MaterialCommunityIcons name={item.is_available === false ? "eye-off-outline" : "eye-outline"} size={19} color={item.is_available === false ? "#9CA3AF" : "#16A34A"} />
              </Pressable>
              <Pressable onPress={() => duplicateProduct(item)} hitSlop={8} style={s.editBtn}>
                <MaterialCommunityIcons name="content-copy" size={18} color="#2563EB" />
              </Pressable>
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

      {/* BULK ADD PRODUCTS MODAL — shown on the actual vendor store-detail route */}
      <Modal visible={showBulkModal} transparent animationType="slide" onRequestClose={() => !bulkSaving && setShowBulkModal(false)}>
        <View style={s.bulkOverlay}>
          <View style={s.bulkModalContent}>
            <View style={s.dragHandle} />
            <View style={s.bulkTitleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>Bulk Add Products</Text>
                <Text style={s.bulkIntro}>Select ration or vegetable items and set your prices.</Text>
              </View>
              <Pressable disabled={bulkSaving} onPress={() => setShowBulkModal(false)} style={s.bulkCloseBtn}>
                <MaterialCommunityIcons name="close" size={22} color="#374151" />
              </Pressable>
            </View>

            <Text style={s.bulkStoreNote}>Store: {store?.name || editForm.name || initialName}</Text>

            <View style={s.bulkKindTabs}>
              <Pressable onPress={() => setBulkKind("ration")} style={[s.bulkKindTab, bulkKind === "ration" && s.bulkKindTabActive]} testID="store-bulk-tab-ration">
                <MaterialCommunityIcons name="basket-outline" size={18} color={bulkKind === "ration" ? "#fff" : "#92400E"} />
                <Text style={[s.bulkKindTabText, bulkKind === "ration" && s.bulkKindTabTextActive]}>Ration</Text>
              </Pressable>
              <Pressable onPress={() => setBulkKind("vegetables")} style={[s.bulkKindTab, bulkKind === "vegetables" && s.bulkKindTabActive]} testID="store-bulk-tab-vegetables">
                <MaterialCommunityIcons name="carrot" size={18} color={bulkKind === "vegetables" ? "#fff" : "#166534"} />
                <Text style={[s.bulkKindTabText, bulkKind === "vegetables" && s.bulkKindTabTextActive]}>Vegetables</Text>
              </Pressable>
            </View>

            <View style={s.bulkListTools}>
              <Text style={s.bulkSectionLabel}>{BULK_PRODUCT_TEMPLATES[bulkKind].length} common items</Text>
              <View style={s.bulkListActions}>
                <Pressable onPress={() => setCurrentBulkSelection(true)} disabled={bulkSaving} hitSlop={6}>
                  <Text style={s.bulkActionLink}>Select all</Text>
                </Pressable>
                <Text style={s.bulkActionSeparator}>·</Text>
                <Pressable onPress={() => setCurrentBulkSelection(false)} disabled={bulkSaving} hitSlop={6}>
                  <Text style={s.bulkActionLink}>Clear</Text>
                </Pressable>
              </View>
            </View>

            <Text style={s.bulkHelp}>Selling price is required. MRP is optional; stock starts at 10. Bulk items use a placeholder photo that you can replace later.</Text>

            <ScrollView style={s.bulkItemList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
              {BULK_PRODUCT_TEMPLATES[bulkKind].map((item) => {
                const entry = getBulkEntry(bulkKind, item.name);
                return (
                  <View key={item.name} style={[s.bulkItemCard, entry.selected && s.bulkItemCardSelected]}>
                    <Pressable
                      style={s.bulkItemTitleRow}
                      onPress={() => updateBulkEntry(bulkKind, item.name, { selected: !entry.selected })}
                      disabled={bulkSaving}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: entry.selected }}
                    >
                      <MaterialCommunityIcons name={entry.selected ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={entry.selected ? "#EA580C" : "#9CA3AF"} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.bulkItemName}>{item.name}</Text>
                        <Text style={s.bulkItemUnit}>{item.unit}</Text>
                      </View>
                    </Pressable>
                    <View style={s.bulkItemInputs}>
                      <View style={s.bulkInputWrap}>
                        <Text style={s.bulkInputLabel}>Price ₹ *</Text>
                        <TextInput
                          value={entry.price}
                          onChangeText={(value) => updateBulkEntry(bulkKind, item.name, { price: value, selected: entry.selected || !!value.trim() })}
                          placeholder="0.00"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="decimal-pad"
                          editable={!bulkSaving}
                          style={s.bulkInput}
                        />
                      </View>
                      <View style={s.bulkInputWrap}>
                        <Text style={s.bulkInputLabel}>MRP ₹</Text>
                        <TextInput
                          value={entry.mrp}
                          onChangeText={(value) => updateBulkEntry(bulkKind, item.name, { mrp: value })}
                          placeholder="Optional"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="decimal-pad"
                          editable={!bulkSaving}
                          style={s.bulkInput}
                        />
                      </View>
                      <View style={[s.bulkInputWrap, s.bulkStockWrap]}>
                        <Text style={s.bulkInputLabel}>Stock</Text>
                        <TextInput
                          value={entry.stock}
                          onChangeText={(value) => updateBulkEntry(bulkKind, item.name, { stock: value })}
                          placeholder="10"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="number-pad"
                          editable={!bulkSaving}
                          style={s.bulkInput}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {!!bulkProgress && <Text style={s.bulkProgress}>{bulkProgress}</Text>}

            <View style={s.bulkFooter}>
              <Text style={s.bulkSelectedText}>{selectedBulkCount} selected across both tabs</Text>
              <Pressable
                style={[s.bulkSubmitBtn, (bulkSaving || selectedBulkCount === 0) && s.bulkSubmitBtnDisabled]}
                onPress={handleBulkAddProducts}
                disabled={bulkSaving || selectedBulkCount === 0}
                testID="store-bulk-create"
              >
                {bulkSaving ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <MaterialCommunityIcons name="playlist-plus" size={19} color="#fff" />
                    <Text style={s.bulkSubmitText}>Add {selectedBulkCount} Products</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
            <Text style={s.fieldLabel}>Shop Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.itemCategoryRow}>
              {categories.map((category: any) => {
                const active = editForm.category_id === category.id;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => setEditForm({ ...editForm, category_id: category.id })}
                    style={[s.itemCategoryChip, active && s.itemCategoryChipActive]}
                  >
                    <Text style={[s.itemCategoryChipText, active && s.itemCategoryChipTextActive]}>
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
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

            <Pressable onPress={handleDeleteStore} style={s.deleteStoreAction}>
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#DC2626" />
              <Text style={s.deleteStoreActionText}>Delete Store</Text>
            </Pressable>
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

              {store?.category_id ? (
                <View style={s.itemCategorySection}>
                  <Text style={s.fieldLabel}>
                    Shop Category: {categories.find((item: any) => item.id === store.category_id)?.name || store.category_id}
                  </Text>
                  <Text style={s.fieldLabel}>Item Category</Text>
                  {itemCategories.length ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.itemCategoryRow}>
                      {itemCategories.map((item: any) => {
                        const active = form.item_category_id === item.id;
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() => setForm((prev) => ({ ...prev, item_category: item.name, item_category_id: item.id }))}
                            style={[s.itemCategoryChip, active && s.itemCategoryChipActive]}
                          >
                            <Text style={[s.itemCategoryChipText, active && s.itemCategoryChipTextActive]}>{item.name}</Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>
                      Add an item category above first.
                    </Text>
                  )}
                </View>
              ) : null}

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

              <View style={{ marginTop: 3, marginBottom: 5 }}>
                <Text style={s.sectionLabel}>Store Category</Text>
                <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: "800" }}>
                  {categories.find((c: any) => c.id === store?.category_id)?.name || store?.category_id || "Not set"}
                </Text>
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

              {store?.category_id ? (
                <View style={s.itemCategorySection}>
                  <Text style={s.fieldLabel}>
                    Shop Category: {categories.find((item: any) => item.id === store.category_id)?.name || store.category_id}
                  </Text>
                  <Text style={s.fieldLabel}>Item Category</Text>
                  {itemCategories.length ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.itemCategoryRow}>
                      {itemCategories.map((item: any) => {
                        const active = editProductForm.item_category_id === item.id;
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() =>
                              setEditProductForm((prev) => ({
                                ...prev,
                                item_category: item.name,
                                item_category_id: item.id,
                              }))
                            }
                            style={[s.itemCategoryChip, active && s.itemCategoryChipActive]}
                          >
                            <Text style={[s.itemCategoryChipText, active && s.itemCategoryChipTextActive]}>
                              {item.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>
                      No item categories configured by admin for this shop category.
                    </Text>
                  )}
                </View>
              ) : null}

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

              <View style={{ marginTop: 3, marginBottom: 5 }}>
                <Text style={s.sectionLabel}>Store Category</Text>
                <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: "800" }}>
                  {categories.find((c: any) => c.id === store?.category_id)?.name || store?.category_id || "Not set"}
                </Text>
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9FAFB" },

  // Store Banner & Controls
  bannerWrap: {
    width: "100%",
    height: 180,
    backgroundColor: "#E2E8F0",
    position: "relative",
  },
  bannerCircleBtn: {
    position: "absolute",
    top: 28,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.48)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    ...shadow.soft,
  },
  bannerBackBtn: {
    left: 12,
  },
  bannerSettingsBtn: {
    right: 12,
  },
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

  listHeaderActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  bulkHeaderBtn: { minHeight: 32, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "#EA580C" },
  bulkHeaderBtnText: { color: "#fff", fontSize: 12, fontWeight: "800" },

  bulkOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  bulkModalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, height: "94%" },
  bulkTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  bulkIntro: { color: "#6B7280", fontSize: 12, marginTop: -10, marginBottom: 10 },
  bulkCloseBtn: { padding: 5 },
  bulkStoreNote: { color: "#4B5563", fontSize: 12, marginBottom: 10 },
  bulkSectionLabel: { fontSize: 13, fontWeight: "800", color: "#111827", marginBottom: 7 },
  bulkKindTabs: { flexDirection: "row", gap: 8, marginBottom: 10 },
  bulkKindTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, borderWidth: 1, borderColor: "#FED7AA", backgroundColor: "#FFF7ED", paddingVertical: 10 },
  bulkKindTabActive: { backgroundColor: "#EA580C", borderColor: "#EA580C" },
  bulkKindTabText: { color: "#92400E", fontSize: 13, fontWeight: "800" },
  bulkKindTabTextActive: { color: "#fff" },
  bulkListTools: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  bulkListActions: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 },
  bulkActionLink: { color: "#EA580C", fontSize: 12, fontWeight: "800" },
  bulkActionSeparator: { color: "#9CA3AF" },
  bulkHelp: { color: "#6B7280", fontSize: 11, lineHeight: 15, marginBottom: 8 },
  bulkItemList: { flex: 1, minHeight: 120 },
  bulkItemCard: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 9, marginBottom: 8, backgroundColor: "#fff" },
  bulkItemCardSelected: { borderColor: "#FDBA74", backgroundColor: "#FFFBF5" },
  bulkItemTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 },
  bulkItemName: { color: "#111827", fontSize: 13, fontWeight: "700" },
  bulkItemUnit: { color: "#6B7280", fontSize: 10, marginTop: 2 },
  bulkItemInputs: { flexDirection: "row", gap: 7 },
  bulkInputWrap: { flex: 1, minWidth: 0 },
  bulkStockWrap: { maxWidth: 68 },
  bulkInputLabel: { fontSize: 10, color: "#6B7280", marginBottom: 3, fontWeight: "600" },
  bulkInput: { borderWidth: 1, borderColor: "#D1D5DB", backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 7, color: "#111827", fontSize: 12, minHeight: 34 },
  bulkProgress: { color: "#92400E", fontSize: 11, paddingVertical: 6 },
  bulkFooter: { borderTopWidth: 1, borderColor: "#E5E7EB", paddingTop: 10, marginTop: 8, gap: 8 },
  bulkSelectedText: { fontSize: 12, color: "#4B5563", fontWeight: "700" },
  bulkSubmitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#EA580C", minHeight: 46, borderRadius: 14, paddingHorizontal: 12 },
  bulkSubmitBtnDisabled: { opacity: 0.45 },
  bulkSubmitText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  // List Header Title Row
  itemCategoryManager: {
    marginHorizontal: 10,
    marginBottom: 10,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  itemCategoryManagerHeader: { flexDirection: "row", alignItems: "center" },
  itemCategoryHint: { color: "#6B7280", fontSize: 10, lineHeight: 14, marginTop: 3 },
  itemCategoryInputRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 8 },
  itemCategoryInput: { flex: 1, marginBottom: 0 },
  itemCategorySaveBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#EA580C", alignItems: "center", justifyContent: "center" },
  itemCategoryCancelBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  vendorItemCategoryList: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 9 },
  vendorItemCategoryChip: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" },
  vendorItemCategoryText: { color: "#374151", fontSize: 11, fontWeight: "800" },
  itemCategoryEmpty: { color: "#9CA3AF", fontSize: 11, paddingVertical: 4 },
  productTools: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  productSearch: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    color: "#111827",
  },
  stockFilter: {
    height: 42,
    paddingHorizontal: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  stockFilterActive: {
    backgroundColor: "#D97706",
    borderColor: "#D97706",
  },
  stockFilterText: {
    color: "#D97706",
    fontSize: 12,
    fontWeight: "800",
  },
  stockFilterTextActive: {
    color: "#fff",
  },

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
  deleteStoreAction: {
    marginTop: 10,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  deleteStoreActionText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "800",
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

  itemCategorySection: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 6,
  },
  itemCategoryRow: {
    gap: 6,
    paddingBottom: 2,
  },
  itemCategoryChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  itemCategoryChipActive: {
    backgroundColor: "#EA580C",
    borderColor: "#EA580C",
  },
  itemCategoryChipText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "700",
  },
  itemCategoryChipTextActive: {
    color: "#fff",
    fontWeight: "800",
  },

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
