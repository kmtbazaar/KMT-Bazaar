import { LocalizedText as Text, LocalizedTextInput as TextInput } from "@/src/LocalizedText";
import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { vendorApi } from "@/src/roleApi";
import { api } from "@/src/api";
import ProductImagesUploader from "@/src/components/ProductImagesUploader";
import { COLORS, IMAGE_FALLBACK_URL, RADIUS, SPACING, shadow } from "@/src/theme";

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

export default function VendorProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkKind, setBulkKind] = useState<BulkKind>("ration");
  const [bulkStores, setBulkStores] = useState<any[]>([]);
  const [bulkStoreId, setBulkStoreId] = useState("");
  const [bulkStoreLoading, setBulkStoreLoading] = useState(false);
  const [bulkForms, setBulkForms] = useState<Record<string, BulkProductEntry>>({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");

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
    images: [] as string[],
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

  const openBulkAdd = async () => {
    setShowBulkModal(true);
    setBulkStoreLoading(true);
    setBulkProgress("");
    try {
      const stats: any = await vendorApi.stats();
      const nextStores = Array.isArray(stats?.stores) ? stats.stores : [];
      setBulkStores(nextStores);
      setBulkStoreId((current) =>
        nextStores.some((store: any) => store.id === current) ? current : (nextStores[0]?.id || "")
      );
      if (!nextStores.length) {
        Alert.alert("Store not found", "Create or configure your store before bulk-adding products.");
      }
    } catch (error: any) {
      Alert.alert("Could not load stores", error?.message || "Please try again.");
    } finally {
      setBulkStoreLoading(false);
    }
  };

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

  const handleBulkAddProducts = async () => {
    const selected = selectedBulkProducts;
    if (!selected.length) {
      Alert.alert("Select products", "Select at least one ration or vegetable item first.");
      return;
    }
    const store = bulkStores.find((item) => item.id === bulkStoreId);
    if (!store) {
      Alert.alert("Select a store", "Choose the store where these products should be added.");
      return;
    }
    if (!store.category_id) {
      Alert.alert("Store category missing", "Configure the store category before adding products.");
      return;
    }

    const existingNames = new Set(
      products
        .filter((item) => item.store_id === store.id)
        .map((item) => String(item.name || "").trim().toLocaleLowerCase())
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
    setBulkProgress("Preparing ration and vegetable categories...");
    try {
      const kinds = Array.from(new Set(toCreate.map((item) => item.kind))) as BulkKind[];
      const categoryIds: Record<string, string> = {};
      let storeCategories = await vendorApi.storeItemCategories(store.id);

      for (const kind of kinds) {
        const categoryName = kind === "ration" ? "Ration" : "Vegetables";
        const categoryIcon = kind === "ration" ? "basket-outline" : "carrot";
        const categoryColor = kind === "ration" ? "#D97706" : "#16A34A";
        let category = storeCategories.find(
          (item: any) => String(item.name || "").trim().toLowerCase() === categoryName.toLowerCase()
        );

        if (category && category.active === false) {
          await vendorApi.updateStoreItemCategory(store.id, category.id, {
            name: categoryName,
            icon: categoryIcon,
            color: categoryColor,
            order: kind === "ration" ? 1 : 2,
            active: true,
          });
          storeCategories = await vendorApi.storeItemCategories(store.id);
          category = storeCategories.find(
            (item: any) => String(item.name || "").trim().toLowerCase() === categoryName.toLowerCase() && item.active !== false
          );
        }

        if (!category) {
          try {
            category = await vendorApi.createStoreItemCategory(store.id, {
              name: categoryName,
              icon: categoryIcon,
              color: categoryColor,
              order: kind === "ration" ? 1 : 2,
              active: true,
            });
          } catch (error) {
            storeCategories = await vendorApi.storeItemCategories(store.id);
            category = storeCategories.find(
              (item: any) => String(item.name || "").trim().toLowerCase() === categoryName.toLowerCase() && item.active !== false
            );
            if (!category) throw error;
          }
          storeCategories = await vendorApi.storeItemCategories(store.id);
        }

        if (!category?.id) throw new Error(`Could not prepare the ${categoryName} category.`);
        categoryIds[kind] = category.id;
      }

      let added = 0;
      let skipped = duplicates.length;
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
            store_id: store.id,
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
          skipped += 0;
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

  // Add Product Logic
  const handleAddProduct = async () => {
    if (!Array.isArray(form.images) || form.images.filter((url: string) => !!url).length < 3) {
      Alert.alert("Add product photos", "Please add at least 3 product photos before saving.");
      return;
    }
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
        image: form.image || form.images[0] || "",
        images: form.images,
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
      images: [],
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

      <View style={s.bulkToolbar}>
        <View style={s.bulkToolbarCopy}>
          <Text style={s.bulkToolbarTitle}>Quick inventory setup</Text>
          <Text style={s.bulkToolbarSubtitle}>Add multiple ration and vegetable products together.</Text>
        </View>
        <Pressable onPress={openBulkAdd} style={s.bulkLaunchBtn} testID="vendor-bulk-add-products">
          <MaterialCommunityIcons name="playlist-plus" size={18} color="#fff" />
          <Text style={s.bulkLaunchText}>Bulk Add</Text>
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

              <ProductImagesUploader value={form.images} onChange={(images) => setForm((current) => ({ ...current, images, image: images[0] || "" }))} label="Product Photos (minimum 3)" testID="vendor-product-images" />

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

      {/* Bulk Add: quick templates for ration and vegetables */}
      <Modal visible={showBulkModal} transparent animationType="slide" onRequestClose={() => !bulkSaving && setShowBulkModal(false)}>
        <View style={s.bulkOverlay}>
          <View style={s.bulkModalContent}>
            <View style={s.dragHandle} />
            <View style={s.bulkTitleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>Bulk Add Products</Text>
                <Text style={s.bulkIntro}>Select items, enter your prices and add them together.</Text>
              </View>
              <Pressable disabled={bulkSaving} onPress={() => setShowBulkModal(false)} style={s.bulkCloseBtn}>
                <MaterialCommunityIcons name="close" size={22} color="#374151" />
              </Pressable>
            </View>

            {bulkStoreLoading ? (
              <View style={s.bulkCenter}><ActivityIndicator color="#EA580C" /><Text style={s.bulkHelp}>Loading your stores...</Text></View>
            ) : bulkStores.length === 0 ? (
              <Text style={s.bulkError}>No store found. Set up your vendor store first.</Text>
            ) : (
              <>
                {bulkStores.length > 1 ? (
                  <>
                    <Text style={s.bulkSectionLabel}>Add products to store</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.bulkStoreChips}>
                      {bulkStores.map((store: any) => (
                        <Pressable key={store.id} onPress={() => setBulkStoreId(store.id)} style={[s.bulkStoreChip, store.id === bulkStoreId && s.bulkStoreChipActive]}>
                          <Text style={[s.bulkStoreChipText, store.id === bulkStoreId && s.bulkStoreChipTextActive]}>{store.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </>
                ) : (
                  <Text style={s.bulkStoreNote}>Store: {bulkStores[0]?.name || "Your store"}</Text>
                )}

                <View style={s.bulkKindTabs}>
                  <Pressable onPress={() => setBulkKind("ration")} style={[s.bulkKindTab, bulkKind === "ration" && s.bulkKindTabActive]} testID="bulk-tab-ration">
                    <MaterialCommunityIcons name="basket-outline" size={18} color={bulkKind === "ration" ? "#fff" : "#92400E"} />
                    <Text style={[s.bulkKindTabText, bulkKind === "ration" && s.bulkKindTabTextActive]}>Ration</Text>
                  </Pressable>
                  <Pressable onPress={() => setBulkKind("vegetables")} style={[s.bulkKindTab, bulkKind === "vegetables" && s.bulkKindTabActive]} testID="bulk-tab-vegetables">
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

                <Text style={s.bulkHelp}>Enter the selling price for each selected item. MRP is optional; stock starts at 10. A placeholder image is used until you add product photos.</Text>

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
                    style={[s.bulkSubmitBtn, (bulkSaving || bulkStoreLoading || selectedBulkCount === 0) && s.bulkSubmitBtnDisabled]}
                    onPress={handleBulkAddProducts}
                    disabled={bulkSaving || bulkStoreLoading || selectedBulkCount === 0}
                    testID="vendor-bulk-create"
                  >
                    {bulkSaving ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <MaterialCommunityIcons name="playlist-plus" size={19} color="#fff" />
                        <Text style={s.bulkSubmitText}>Add {selectedBulkCount} Products</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </>
            )}
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

  bulkToolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: "#FFF7ED", borderBottomWidth: 1, borderColor: "#FFEDD5" },
  bulkToolbarCopy: { flex: 1, minWidth: 0 },
  bulkToolbarTitle: { color: "#7C2D12", fontSize: 13, fontWeight: "800" },
  bulkToolbarSubtitle: { color: "#9A3412", fontSize: 11, marginTop: 2 },
  bulkLaunchBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#EA580C", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  bulkLaunchText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  bulkOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  bulkModalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, height: "94%" },
  bulkTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  bulkIntro: { color: "#6B7280", fontSize: 12, marginTop: -10, marginBottom: 10 },
  bulkCloseBtn: { padding: 5 },
  bulkCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  bulkStoreNote: { color: "#4B5563", fontSize: 12, marginBottom: 10 },
  bulkSectionLabel: { fontSize: 13, fontWeight: "800", color: "#111827", marginBottom: 7 },
  bulkStoreChips: { gap: 8, paddingBottom: 10 },
  bulkStoreChip: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fff" },
  bulkStoreChipActive: { borderColor: "#EA580C", backgroundColor: "#FFF7ED" },
  bulkStoreChipText: { color: "#374151", fontSize: 12, fontWeight: "600" },
  bulkStoreChipTextActive: { color: "#9A3412", fontWeight: "800" },
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
  bulkError: { color: "#B91C1C", paddingVertical: 20, fontSize: 13 },
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
