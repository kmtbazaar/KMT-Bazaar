import { safeGoBack } from "@/src/navigation";
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
import { getProductCategoryConfig } from "@/src/productCategoryConfig";

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
        <Pressable onPress={() => safeGoBack(router, "/admin")} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} /></Pressable>
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

const PRODUCT_COLOR_OPTIONS = ["Black", "White", "Red", "Blue", "Navy", "Green", "Yellow", "Pink", "Purple", "Orange", "Brown", "Grey", "Maroon", "Beige"];

function emptyAdminProductForm() {
  return {
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
    colors: [] as string[],
    color_images: {} as Record<string, string[]>,
    attributes: {} as Record<string, string>,
    variants: [] as any[],
  };
}

function ProductModal({ visible, onClose, onSaved, edit, categories, stores }: any) {
  const [f, setF] = useState(emptyAdminProductForm);
  const [activeProductColor, setActiveProductColor] = useState("");
  const [baseVariantDescription, setBaseVariantDescription] = useState("");
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!visible) return;
    const matchingEditStore = stores.find(
      (store: any) => String(store.id || store._id) === String(edit?.store_id || "")
    );
    const initialStore =
      matchingEditStore ||
      stores.find((store: any) => store.is_approved === true) ||
      stores[0];
    const savedVariants = Array.isArray(edit?.variants) ? edit.variants : [];
    const images = Array.isArray(edit?.images) && edit.images.length
      ? edit.images.filter((url: any) => typeof url === "string" && url.trim())
      : (edit?.image ? [String(edit.image)] : []);
    const colors = Array.isArray(edit?.colors) ? edit.colors.map((color: any) => String(color)) : [];

    if (edit) {
      setF({
        ...emptyAdminProductForm(),
        name: String(edit.name || ""),
        price: String(savedVariants[0]?.price ?? edit.price ?? ""),
        mrp: String(savedVariants[0]?.mrp ?? edit.mrp ?? edit.price ?? ""),
        stock: String(savedVariants[0]?.stock ?? edit.stock ?? 0),
        unit: String(savedVariants[0]?.unit || edit.unit || "1 pc"),
        image: String(edit.image || images[0] || ""),
        images,
        description: String(edit.description || ""),
        category_id: String(edit.category_id || initialStore?.category_id || categories[0]?.id || ""),
        store_id: String(initialStore?.id || initialStore?._id || ""),
        item_category: String(edit.item_category || ""),
        item_category_id: String(edit.item_category_id || ""),
        is_available: edit.is_available !== false,
        trending: Boolean(edit.trending),
        colors,
        color_images: edit.color_images && typeof edit.color_images === "object" ? { ...edit.color_images } : {},
        attributes: edit.attributes && typeof edit.attributes === "object" ? { ...edit.attributes } : {},
        variants: savedVariants.map((variant: any) => ({ ...variant })),
      });
      setBaseVariantDescription(String(savedVariants[0]?.description || ""));
      setActiveProductColor(colors[0] || "");
    } else {
      setF({
        ...emptyAdminProductForm(),
        category_id: String(initialStore?.category_id || categories[0]?.id || ""),
        store_id: String(initialStore?.id || initialStore?._id || ""),
      });
      setBaseVariantDescription("");
      setActiveProductColor("");
    }
  }, [edit, visible, stores, categories]);

  const selectableStores = stores.filter(
    (store: any) =>
      store.is_approved === true ||
      (!!edit && String(store.id || store._id) === String(edit.store_id || ""))
  );
  const selectedStore = selectableStores.find(
    (store: any) => String(store.id || store._id) === String(f.store_id)
  );
  const selectedCategory = categories.find(
    (category: any) => String(category.id || category._id || "") === String(f.category_id || "")
  ) || { name: "" };
  const categoryConfig = getProductCategoryConfig(selectedCategory, f.name);

  const updateVariant = (index: number, changes: Record<string, any>) => {
    setF((current: any) => ({
      ...current,
      variants: current.variants.map((variant: any, rowIndex: number) =>
        rowIndex === index ? { ...variant, ...changes } : variant
      ),
    }));
  };

  const save = async () => {
    if (saving) return;
    const name = String(f.name || "").trim();
    const priceText = String(f.price ?? "").trim();
    const price = Number(priceText);
    const mrpText = String(f.mrp ?? "").trim();
    const mrp = mrpText ? Number(mrpText) : price;
    const productId = String(edit?.id || edit?._id || "");

    if (!name) {
      Alert.alert("Product name required", "Enter a product name before saving.");
      return;
    }
    if (!priceText || !Number.isFinite(price) || price < 0 || !Number.isFinite(mrp) || mrp < 0) {
      Alert.alert("Invalid price", "Enter a valid selling price and MRP.");
      return;
    }
    if (!selectedStore?.id && !selectedStore?._id) {
      Alert.alert("Select a store", "Choose an approved store before adding a customer-visible product.");
      return;
    }
    const categoryId = String(f.category_id || "").trim();
    if (!categoryId || !categories.some((category: any) => String(category.id || category._id || "") === categoryId)) {
      Alert.alert("Shop category required", "Select the Shop Category where customers should find this product.");
      return;
    }
    const validImages = Array.isArray(f.images) ? f.images.filter((url: string) => !!String(url || "").trim()) : [];
    const unchangedColourSetup = Boolean(edit) &&
      categoryId === String(edit.category_id || "") &&
      JSON.stringify(f.colors || []) === JSON.stringify(edit.colors || []) &&
      JSON.stringify(f.color_images || {}) === JSON.stringify(edit.color_images || {});
    if (!unchangedColourSetup && categoryConfig.requiresColor && !f.colors.length) {
      Alert.alert("Select product colour", "This shop category requires at least one colour.");
      return;
    }
    const missingColorPhotos = !unchangedColourSetup && categoryConfig.requiresColorImages
      ? f.colors.filter((color: string) => {
          const key = Object.keys(f.color_images || {}).find((item) => item.toLowerCase() === color.toLowerCase());
          return !key || !Array.isArray(f.color_images[key]) || !f.color_images[key].some((url: string) => String(url || "").trim());
        })
      : [];
    if (missingColorPhotos.length) {
      Alert.alert("Colour photos required", "Upload at least one matching photo for: " + missingColorPhotos.join(", "));
      return;
    }
    const missingAttributes = categoryConfig.productAttributes
      .filter((attribute: any) => attribute.required && !String(f.attributes?.[attribute.key] || "").trim());
    if (missingAttributes.length) {
      Alert.alert("Product specifications required", "Enter: " + missingAttributes.map((item: any) => item.label).join(", "));
      return;
    }

    const stock = Math.max(0, parseInt(String(f.stock ?? 0), 10) || 0);
    let variants: any[] | undefined;
    if (categoryConfig.showVariants) {
      const existingVariants = Array.isArray(f.variants) ? f.variants : [];
      variants = [
        {
          ...(existingVariants[0]?.id ? { id: existingVariants[0].id } : {}),
          unit: String(f.unit || "1 pc").trim(),
          price,
          mrp,
          stock,
          description: baseVariantDescription,
          ...(existingVariants[0]?.colors ? { colors: existingVariants[0].colors } : {}),
          ...(existingVariants[0]?.color_images ? { color_images: existingVariants[0].color_images } : {}),
        },
        ...existingVariants.slice(1).map((variant: any) => ({
          ...variant,
          unit: String(variant.unit || "").trim(),
          price: Number(variant.price),
          mrp: Number(variant.mrp ?? variant.price),
          stock: Math.max(0, parseInt(String(variant.stock ?? 0), 10) || 0),
        })),
      ];
      if (variants.some((variant: any) =>
        !variant.unit ||
        !Number.isFinite(variant.price) || variant.price < 0 ||
        !Number.isFinite(variant.mrp) || variant.mrp < 0 ||
        !Number.isFinite(variant.stock) || variant.stock < 0
      )) {
        Alert.alert("Check size/pack options", "Every option needs a label, valid price/MRP and non-negative stock.");
        return;
      }
      const variantUnits = variants.map((variant: any) => String(variant.unit).toLowerCase());
      if (new Set(variantUnits).size !== variantUnits.length) {
        Alert.alert("Duplicate size/pack option", "Each size/pack option must have a different label.");
        return;
      }
    } else if (Array.isArray(f.variants) && f.variants.length) {
      variants = f.variants;
    }

    const payload = {
      name,
      price,
      mrp,
      stock: variants?.length
        ? variants.reduce((total: number, variant: any) => total + Math.max(0, Number(variant.stock) || 0), 0)
        : stock,
      unit: String(f.unit || "1 pc").trim() || "1 pc",
      image: f.image || validImages[0] || "",
      images: validImages,
      description: String(f.description || ""),
      category_id: categoryId,
      item_category: String(f.item_category || ""),
      item_category_id: f.item_category_id || null,
      is_available: Boolean(f.is_available),
      trending: Boolean(f.trending),
      store_id: String(selectedStore.id || selectedStore._id),
      colors: Array.isArray(f.colors) ? f.colors : [],
      color_images: f.color_images && typeof f.color_images === "object" ? f.color_images : {},
      attributes: f.attributes && typeof f.attributes === "object" ? f.attributes : {},
      ...(variants ? { variants } : {}),
    };

    setSaving(true);
    try {
      if (productId) await adminApi.updateProduct(productId, payload);
      else await adminApi.createProduct(payload);
      onSaved();
    } catch (error: any) {
      Alert.alert("Could not save product", error?.message || "Please check the store, category, photos and product details, then try again.");
    } finally {
      setSaving(false);
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
                    style={[ms.catChip, active && ms.catChipActive]}
                  >
                    <Text style={[ms.catText, active && ms.catTextActive]}>
                      {store.name || storeId}{approved ? "" : " · Pending approval"}
                    </Text>
                  </Pressable>
                );
              })}
              {selectableStores.length === 0 && (
                <Text style={ms.hint}>No approved stores are available. Create and approve a store first.</Text>
              )}
            </View>
            <Text style={ms.hint}>Choose the approved store where customers should find this product.</Text>

            <Field ph="Name" v={f.name} oc={(v: string) => setF((current: any) => ({ ...current, name: v }))} testID="pf-name" />

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
                    style={[ms.catChip, active && ms.catChipActive]}
                  >
                    <Text style={[ms.catText, active && ms.catTextActive]}>{category.name || categoryId}</Text>
                  </Pressable>
                );
              })}
              {categories.length === 0 && <Text style={ms.hint}>No shop categories found. Add a category first.</Text>}
            </View>

            {categoryConfig.showVariants && categoryConfig.variantOptions.length > 0 ? (
              <View style={ms.optionPanel} testID="pf-size-pack-options">
                <Text style={ms.label}>{categoryConfig.variantLabel}</Text>
                <View style={ms.optionChips}>
                  {categoryConfig.variantOptions.map((option: string) => {
                    const active = String(f.unit).toLowerCase() === option.toLowerCase();
                    return (
                      <Pressable key={option} onPress={() => setF((current: any) => ({ ...current, unit: option }))}
                        style={[ms.catChip, active && ms.catChipActive]}>
                        <Text style={[ms.catText, active && ms.catTextActive]}>{option}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  testID="pf-add-variant"
                  onPress={() => setF((current: any) => ({ ...current, variants: [...(current.variants || []), { unit: "", price: "", mrp: "", stock: "10", description: "" }] }))}
                  style={ms.addVariantButton}>
                  <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
                  <Text style={ms.addVariantText}>Add another size/pack</Text>
                </Pressable>
                {(f.variants || []).slice(1).map((variant: any, index: number) => (
                  <View key={`variant-${index}`} style={ms.variantCard}>
                    <View style={ms.variantHeader}>
                      <Text style={ms.variantTitle}>Option {index + 2}</Text>
                      <Pressable onPress={() => setF((current: any) => ({ ...current, variants: current.variants.filter((_: any, rowIndex: number) => rowIndex !== index + 1) }))}>
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.error} />
                      </Pressable>
                    </View>
                    <Field ph="Size / pack label" v={variant.unit} oc={(v: string) => updateVariant(index + 1, { unit: v })} />
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <View style={{ flex: 1 }}><Field ph="Price" v={String(variant.price ?? "")} oc={(v: string) => updateVariant(index + 1, { price: v })} kt="numeric" /></View>
                      <View style={{ flex: 1 }}><Field ph="MRP" v={String(variant.mrp ?? "")} oc={(v: string) => updateVariant(index + 1, { mrp: v })} kt="numeric" /></View>
                      <View style={{ flex: 1 }}><Field ph="Stock" v={String(variant.stock ?? "")} oc={(v: string) => updateVariant(index + 1, { stock: v })} kt="numeric" /></View>
                    </View>
                    <Field ph="Option description" v={String(variant.description || "")} oc={(v: string) => updateVariant(index + 1, { description: v })} multiline />
                  </View>
                ))}
              </View>
            ) : null}

            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}><Field ph="Price" v={f.price} oc={(v: string) => setF((current: any) => ({ ...current, price: v }))} kt="numeric" testID="pf-price" /></View>
              <View style={{ flex: 1 }}><Field ph="MRP" v={f.mrp} oc={(v: string) => setF((current: any) => ({ ...current, mrp: v }))} kt="numeric" testID="pf-mrp" /></View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}><Field ph="Stock" v={f.stock} oc={(v: string) => setF((current: any) => ({ ...current, stock: v }))} kt="numeric" testID="pf-stock" /></View>
              <View style={{ flex: 1 }}><Field ph="Unit" v={f.unit} oc={(v: string) => setF((current: any) => ({ ...current, unit: v }))} testID="pf-unit" /></View>
            </View>

            {categoryConfig.showColors ? (
              <View style={ms.optionPanel} testID="pf-colour-options">
                <Text style={ms.label}>{categoryConfig.colorLabel} *</Text>
                <View style={ms.optionChips}>
                  {PRODUCT_COLOR_OPTIONS.map((color) => {
                    const active = f.colors.includes(color);
                    return (
                      <Pressable key={color} onPress={() => {
                        setF((current: any) => {
                          const selected = current.colors.includes(color);
                          const colors = selected
                            ? current.colors.filter((value: string) => value !== color)
                            : [...current.colors, color];
                          const color_images = { ...(current.color_images || {}) };
                          if (selected) delete color_images[color];
                          return { ...current, colors, color_images };
                        });
                        setActiveProductColor((current) => current === color ? "" : color);
                      }} style={[ms.catChip, active && ms.catChipActive]}>
                        <Text style={[ms.catText, active && ms.catTextActive]}>{color}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {f.colors.length ? (
                  <View style={ms.optionChips}>
                    {f.colors.map((color: string) => (
                      <Pressable key={color} onPress={() => setActiveProductColor(color)}
                        style={[ms.catChip, activeProductColor === color && ms.catChipActive]}>
                        <Text style={[ms.catText, activeProductColor === color && ms.catTextActive]}>{color} photos</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                {activeProductColor && f.colors.includes(activeProductColor) ? (
                  <ProductImagesUploader
                    value={f.color_images[activeProductColor] || []}
                    onChange={(images) => setF((current: any) => ({ ...current, color_images: { ...(current.color_images || {}), [activeProductColor]: images } }))}
                    label={activeProductColor + " photos"}
                    minCount={1}
                    maxCount={6}
                    testID={"pf-colour-images-" + activeProductColor.toLowerCase()}
                  />
                ) : null}
              </View>
            ) : null}

            <Field ph="Description" v={f.description} oc={(v: string) => setF((current: any) => ({ ...current, description: v }))} multiline testID="pf-desc" />

            {categoryConfig.productAttributes.length ? (
              <View style={ms.optionPanel} testID="pf-product-attributes">
                <Text style={ms.label}>Product specifications</Text>
                {categoryConfig.productAttributes.map((attribute: any) => (
                  <Field key={attribute.key} ph={attribute.label + (attribute.required ? " *" : "")}
                    v={String(f.attributes?.[attribute.key] || "")}
                    oc={(value: string) => setF((current: any) => ({ ...current, attributes: { ...(current.attributes || {}), [attribute.key]: value } }))}
                    testID={`pf-attribute-${attribute.key}`} />
                ))}
              </View>
            ) : null}



            <Text style={ms.label}>Item Category</Text>
            <Field ph="Item Category" v={f.item_category}
              oc={(v: string) => setF((current: any) => ({ ...current, item_category: v, item_category_id: "" }))}
              testID="pf-item-category" />
            <Text style={ms.hint}>Existing vendor item category is preserved. Change only when needed.</Text>

            <Pressable testID="pf-availability" onPress={() => setF((current: any) => ({ ...current, is_available: !current.is_available }))} style={ms.checkRow}>
              <MaterialCommunityIcons name={f.is_available ? "checkbox-marked" : "checkbox-blank-outline"} size={20} color={f.is_available ? "#16A34A" : COLORS.textMuted} />
              <Text style={ms.checkText}>{f.is_available ? "Product available to customers" : "Product hidden from customers"}</Text>
            </Pressable>
            <Pressable testID="pf-trending" onPress={() => setF((current: any) => ({ ...current, trending: !current.trending }))} style={ms.checkRow}>
              <MaterialCommunityIcons name={f.trending ? "checkbox-marked" : "checkbox-blank-outline"} size={20} color={COLORS.brand} />
              <Text style={ms.checkText}>Mark as trending</Text>
            </Pressable>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <Pressable testID="pf-cancel" onPress={onClose} style={[ms.btn, ms.btnGhost]}>
                <Text style={ms.btnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable testID="pf-save" onPress={save} disabled={saving} style={[ms.btn, ms.btnPrimary, saving && { opacity: 0.65 }]}>
                <Text style={ms.btnText}>{saving ? "Saving..." : edit ? "Update" : "Create"}</Text>
              </Pressable>
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
  catChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  catTextActive: { color: "#FFFFFF" },
  optionPanel: { marginTop: 8, marginBottom: 10, padding: 10, borderRadius: RADIUS.md, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" },
  optionChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  addVariantButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: COLORS.brand, marginTop: 4 },
  addVariantText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  variantCard: { padding: 9, borderRadius: RADIUS.md, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#FED7AA", marginTop: 8 },
  variantHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  variantTitle: { color: COLORS.text, fontSize: 12, fontWeight: "800" },
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
