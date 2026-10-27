import { LocalizedText as Text, LocalizedTextInput as TextInput } from "@/src/LocalizedText";
import React, { useCallback, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Modal, ScrollView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { adminApi } from "@/src/roleApi";
import { api } from "@/src/api";
import { COLORS, RADIUS, SPACING } from "@/src/theme";
import ProductImagesUploader from "@/src/components/ProductImagesUploader";

export default function AdminProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const [p, c, storeList] = await Promise.all([adminApi.products(), api.categories(), adminApi.stores()]);
      setProducts(p);
      setCats(c);
      setStores(Array.isArray(storeList) ? storeList : []);
    } catch {}
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onDelete = async (id: string) => {
    await adminApi.deleteProduct(id); load();
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="admin-products-screen">
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} /></Pressable>
        <Text style={s.title}>Products ({products.length})</Text>
        <Pressable testID="add-product-btn" onPress={() => { setEdit(null); setModal(true); }} hitSlop={10}>
          <MaterialCommunityIcons name="plus-circle" size={26} color={COLORS.brand} />
        </Pressable>
      </View>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: SPACING.lg }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Image source={{ uri: item.image }} style={s.img} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={s.name} numberOfLines={2}>{item.name}</Text>
              <Text style={s.meta}>{item.unit} · Stock: {item.stock}</Text>
              <Text style={s.meta} numberOfLines={1}>
                Store: {stores.find((store: any) => String(store.id || store._id) === String(item.store_id))?.name || item.store_id || "No store assigned"}
              </Text>
              <Text style={s.price}>₹{item.price} <Text style={s.mrp}>₹{item.mrp}</Text></Text>
            </View>
            <View style={{ gap: 8 }}>
              <Pressable testID={`edit-${item.id}`} onPress={() => { setEdit(item); setModal(true); }} hitSlop={6} style={s.iconBtn}>
                <MaterialCommunityIcons name="pencil" size={18} color={COLORS.brand} />
              </Pressable>
              <Pressable testID={`del-${item.id}`} onPress={() => onDelete(item.id)} hitSlop={6} style={s.iconBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.error} />
              </Pressable>
            </View>
          </View>
        )}
      />
      <ProductModal visible={modal} onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} edit={edit} categories={cats} stores={stores} />
    </SafeAreaView>
  );
}

function ProductModal({ visible, onClose, onSaved, edit, categories, stores }: any) {
  const [f, setF] = useState({
    name: "",
    price: "",
    mrp: "",
    stock: "10",
    unit: "1 pc",
    image: "",
    images: [] as string[],
    description: "",
    category_id: "",
    store_id: "",
    item_category: "",
    item_category_id: "",
    is_available: true,
    trending: false,
  });
  React.useEffect(() => {
    const matchingEditStore = stores.find(
      (store: any) => String(store.id || store._id) === String(edit?.store_id || "")
    );
    const initialStore =
      matchingEditStore ||
      stores.find((store: any) => store.is_approved === true) ||
      stores[0];

    if (edit) setF({
      name: edit.name || "", price: String(edit.price ?? ""), mrp: String(edit.mrp ?? edit.price ?? ""),
      stock: String(edit.stock ?? 0), unit: edit.unit || "1 pc", image: edit.image || edit.images?.[0] || "",
      images: Array.isArray(edit.images) && edit.images.length ? edit.images : (edit.image ? [edit.image] : []),
      description: edit.description || "",
      category_id: edit.category_id || initialStore?.category_id || categories[0]?.id || "",
      store_id: String(initialStore?.id || initialStore?._id || ""),
      item_category: edit.item_category || "",
      item_category_id: edit.item_category_id || "",
      is_available: edit.is_available !== false,
      trending: !!edit.trending,
    });
    else setF({
      name: "",
      price: "",
      mrp: "",
      stock: "10",
      unit: "1 pc",
      image: "",
      images: [] as string[],
      description: "",
      category_id: initialStore?.category_id || categories[0]?.id || "",
      store_id: String(initialStore?.id || initialStore?._id || ""),
      item_category: "",
      item_category_id: "",
      is_available: true,
      trending: false,
    });
  }, [edit, visible, stores, categories]);

  const selectableStores = stores.filter(
    (store: any) =>
      store.is_approved === true ||
      (!!edit && String(store.id || store._id) === String(edit.store_id || ""))
  );
  const selectedStore = selectableStores.find(
    (store: any) => String(store.id || store._id) === String(f.store_id)
  );

  const save = async () => {
    const name = String(f.name || "").trim();
    const priceText = String(f.price ?? "").trim();
    const price = Number(priceText);

    if (!name) {
      Alert.alert("Product name required", "Enter a product name before saving.");
      return;
    }
    if (!priceText || !Number.isFinite(price) || price < 0) {
      Alert.alert("Invalid price", "Enter a valid selling price.");
      return;
    }
    if (!selectedStore?.id && !selectedStore?._id) {
      Alert.alert("Select a store", "Choose an approved store before adding a customer-visible product.");
      return;
    }
    if (!String(f.category_id || "").trim() || !categories.some((category: any) => String(category.id) === String(f.category_id))) {
      Alert.alert("Shop category required", "Select the Shop Category where customers should find this product.");
      return;
    }
    if (!Array.isArray(f.images) || f.images.filter((url: string) => !!url).length < 3) {
      Alert.alert("Add product photos", "Please add at least 3 product photos before saving.");
      return;
    }

    const payload = {
      name,
      price,
      mrp: String(f.mrp ?? "").trim() && Number.isFinite(Number(f.mrp)) ? Number(f.mrp) : price,
      stock: Math.max(0, parseInt(String(f.stock ?? 0), 10) || 0),
      unit: String(f.unit || "1 pc").trim() || "1 pc",
      image: f.image || f.images?.[0] || "",
      images: f.images,
      description: f.description,
      category_id: String(f.category_id || "").trim(),
      item_category: f.item_category,
      item_category_id: f.item_category_id || null,
      is_available: f.is_available,
      trending: f.trending,
      store_id: String(selectedStore.id || selectedStore._id),
    };
    try {
      if (edit) await adminApi.updateProduct(edit.id, payload);
      else await adminApi.createProduct(payload);
      onSaved();
    } catch (error: any) {
      Alert.alert("Could not save product", error?.message || "Please check the store, photos and product details, then try again.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ms.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={ms.sheet}>
          <View style={ms.handle} />
          <Text style={ms.title}>{edit ? "Edit Product" : "Add Product"}</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={ms.label}>Store *</Text>
            <View style={ms.storeChoices}>
              {selectableStores.map((store: any) => {
                const storeId = String(store.id || store._id);
                const active = String(f.store_id) === storeId;
                const approved = store.is_approved === true;
                return (
                  <Pressable
                    key={storeId}
                    testID={`pf-store-${storeId}`}
                    onPress={() => setF((current: any) => ({
                      ...current,
                      store_id: storeId,
                      category_id: String(store.category_id || ""),
                      item_category: "",
                      item_category_id: "",
                    }))}
                    style={[
                      ms.catChip,
                      active && { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
                    ]}
                  >
                    <Text style={[ms.catText, active && { color: "#fff" }]}>
                      {store.name || storeId}{approved ? "" : " · Pending approval"}
                    </Text>
                  </Pressable>
                );
              })}
              {selectableStores.length === 0 && (
                <Text style={ms.hint}>No approved stores are available. Create and approve a store first.</Text>
              )}
            </View>
            {selectedStore && selectedStore.is_approved !== true ? (
              <Text style={ms.hint}>This store is awaiting approval. Its products will appear to customers after the store is approved.</Text>
            ) : (
              <Text style={ms.hint}>Choose the approved store where customers should find this product.</Text>
            )}
            <Field ph="Name" v={f.name} oc={(v: string) => setF({ ...f, name: v })} testID="pf-name" />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}><Field ph="Price" v={f.price} oc={(v: string) => setF({ ...f, price: v })} kt="numeric" testID="pf-price" /></View>
              <View style={{ flex: 1 }}><Field ph="MRP" v={f.mrp} oc={(v: string) => setF({ ...f, mrp: v })} kt="numeric" testID="pf-mrp" /></View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}><Field ph="Stock" v={f.stock} oc={(v: string) => setF({ ...f, stock: v })} kt="numeric" testID="pf-stock" /></View>
              <View style={{ flex: 1 }}><Field ph="Unit (e.g. 1 kg)" v={f.unit} oc={(v: string) => setF({ ...f, unit: v })} testID="pf-unit" /></View>
            </View>
            <ProductImagesUploader value={f.images} onChange={(images) => setF((current) => ({ ...current, images, image: images[0] || "" }))} label="Product Photos (minimum 3)" testID="pf-images" />
            <Field ph="Description" v={f.description} oc={(v: string) => setF({ ...f, description: v })} multiline testID="pf-desc" />
            {!!edit?.store_id && (
              <Text style={ms.storeInfo}>
                Store: {edit.store_name || edit.store_id}
              </Text>
            )}
            <Text style={ms.label}>Item Category</Text>
            <Field
              ph="Item Category"
              v={f.item_category}
              oc={(v: string) => setF({ ...f, item_category: v })}
              testID="pf-item-category"
            />
            <Text style={ms.hint}>Existing vendor item category is preserved. Change only when needed.</Text>
            <Text style={ms.label}>Shop Category *</Text>
            <View style={ms.storeChoices}>
              {categories.map((category: any) => {
                const categoryId = String(category.id || category._id || "");
                const active = categoryId === String(f.category_id || "");
                if (!categoryId) return null;
                return (
                  <Pressable
                    key={categoryId}
                    testID={`pf-shop-category-${categoryId}`}
                    onPress={() => setF((current: any) => ({ ...current, category_id: categoryId }))}
                    style={[ms.catChip, active && { backgroundColor: COLORS.brand, borderColor: COLORS.brand }]}
                  >
                    <Text style={[ms.catText, active && { color: "#fff" }]}>{category.name || categoryId}</Text>
                  </Pressable>
                );
              })}
              {categories.length === 0 && <Text style={ms.hint}>No shop categories found. Add a category first.</Text>}
            </View>
            <Text style={ms.hint}>This category controls which Shop by Category section displays the product.</Text>
            <Pressable testID="pf-availability" onPress={() => setF({ ...f, is_available: !f.is_available })} style={ms.checkRow}>
              <MaterialCommunityIcons name={f.is_available ? "checkbox-marked" : "checkbox-blank-outline"} size={20} color={f.is_available ? "#16A34A" : COLORS.textMuted} />
              <Text style={ms.checkText}>{f.is_available ? "Product available to customers" : "Product hidden from customers"}</Text>
            </Pressable>
            <Pressable testID="pf-trending" onPress={() => setF({ ...f, trending: !f.trending })} style={ms.checkRow}>
              <MaterialCommunityIcons name={f.trending ? "checkbox-marked" : "checkbox-blank-outline"} size={20} color={COLORS.brand} />
              <Text style={ms.checkText}>Mark as trending</Text>
            </Pressable>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <Pressable testID="pf-cancel" onPress={onClose} style={[ms.btn, ms.btnGhost]}><Text style={ms.btnGhostText}>Cancel</Text></Pressable>
              <Pressable testID="pf-save" onPress={save} style={[ms.btn, ms.btnPrimary]}><Text style={ms.btnText}>{edit ? "Update" : "Create"}</Text></Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Field({ ph, v, oc, kt, multiline, testID }: any) {
  return <TextInput testID={testID} placeholder={ph} value={v} onChangeText={oc} keyboardType={kt} multiline={multiline} placeholderTextColor={COLORS.textMuted} style={[ms.input, multiline && { minHeight: 60 }]} />;
}

const ms = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", padding: SPACING.lg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92%" },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, alignSelf: "center", borderRadius: 2, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text, marginBottom: 12 },
  label: { fontWeight: "700", color: COLORS.text, marginTop: 8, marginBottom: 6 },
  storeInfo: { color: COLORS.textSecondary, fontSize: 11, fontWeight: "700", marginBottom: 5 },
  hint: { color: COLORS.textMuted, fontSize: 10, marginBottom: 6, lineHeight: 14 },
  storeChoices: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  input: { width: "100%", maxWidth: "100%", minWidth: 0, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, fontSize: 14 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border },
  catText: { color: COLORS.textSecondary, fontWeight: "600", fontSize: 12 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  checkText: { fontWeight: "600", color: COLORS.text },
  btn: { flex: 1, padding: 14, borderRadius: RADIUS.pill, alignItems: "center" },
  btnPrimary: { backgroundColor: COLORS.brand },
  btnText: { color: "#fff", fontWeight: "800" },
  btnGhost: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#fff" },
  btnGhostText: { color: COLORS.textSecondary, fontWeight: "700" },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  card: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, backgroundColor: "#fff", borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  img: { width: 60, height: 60, borderRadius: 8, backgroundColor: COLORS.surfaceTertiary },
  name: { flexShrink: 1, fontWeight: "700", color: COLORS.text, fontSize: 13 },
  meta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  price: { color: COLORS.text, fontWeight: "800", marginTop: 4 },
  mrp: { color: COLORS.textMuted, textDecorationLine: "line-through", fontWeight: "500", fontSize: 11 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceSecondary },
});
