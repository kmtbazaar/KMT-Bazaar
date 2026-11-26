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
import { getProductCategoryConfig } from "@/src/productCategoryConfig";

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80";


type ProductVariantDraft = {
  id: string;
  unit: string;
  price: string;
  mrp: string;
  stock: string;
  description: string;
  colors?: string[];
  color_images?: Record<string, string[]>;
};
const PRODUCT_COLOR_OPTIONS = [
  "Black", "White", "Red", "Blue", "Navy", "Light Blue", "Dark Blue",
  "Charcoal", "Olive", "Cream", "Green", "Yellow", "Pink", "Purple",
  "Orange", "Brown", "Grey", "Maroon", "Beige",
];

const buildVariantPayload = (base: any, extras: ProductVariantDraft[], baseVariantId = "", baseColors: string[] = []) => {
  const availableColors = Array.from(new Set((baseColors || []).map((color) => String(color || "").trim()).filter(Boolean)));
  return [
    {
      ...(baseVariantId ? { id: baseVariantId } : {}),
      unit: String(base.unit || "").trim(),
      price: Number.parseFloat(String(base.price)),
      mrp: base.mrp ? Number.parseFloat(String(base.mrp)) : Number.parseFloat(String(base.price)),
      stock: Number.parseInt(String(base.stock), 10),
      description: "",
      colors: availableColors,
    },
    ...extras.map((variant) => {
      const optionColors = Array.isArray(variant.colors) ? variant.colors : availableColors;
      const selectedOptionColors = Array.from(new Map(
        optionColors
          .map((color) => String(color || "").trim())
          .filter(Boolean)
          .map((color) => [color.toLowerCase(), color])
      ).values());
      const optionColorImages = Object.fromEntries(
        Object.entries(variant.color_images || {})
          .filter(([color, images]) =>
            selectedOptionColors.some((selected) => selected.toLowerCase() === color.toLowerCase()) &&
            Array.isArray(images)
          )
          .map(([color, images]) => {
            const selectedColor = selectedOptionColors.find((selected) => selected.toLowerCase() === color.toLowerCase()) || color;
            return [selectedColor, (images as string[]).filter((url) => typeof url === "string" && url.trim())];
          })
      );
      return {
        ...(variant.id ? { id: variant.id } : {}),
        unit: String(variant.unit || "").trim(),
        price: Number.parseFloat(String(variant.price)),
        mrp: variant.mrp ? Number.parseFloat(String(variant.mrp)) : Number.parseFloat(String(variant.price)),
        stock: Number.parseInt(String(variant.stock), 10),
        description: String(variant.description || "").trim(),
        colors: selectedOptionColors,
        color_images: optionColorImages,
      };
    }),
  ];
};

const findDuplicateVariantSizeColorIndex = (variants: any[]) => {
  for (let index = 0; index < variants.length; index += 1) {
    const current = variants[index];
    const currentUnit = String(current.unit || "").trim().toLowerCase();
    const currentColors = new Set(
      (Array.isArray(current.colors) ? current.colors : [])
        .map((color: any) => String(color || "").trim().toLowerCase())
        .filter(Boolean)
    );
    for (let previousIndex = 0; previousIndex < index; previousIndex += 1) {
      const previous = variants[previousIndex];
      if (String(previous.unit || "").trim().toLowerCase() !== currentUnit) continue;
      const previousColors = new Set(
        (Array.isArray(previous.colors) ? previous.colors : [])
          .map((color: any) => String(color || "").trim().toLowerCase())
          .filter(Boolean)
      );
      const sameColorGroup = currentColors.size === previousColors.size &&
        [...currentColors].every((color) => previousColors.has(color));
      if (!currentColors.size || !previousColors.size || sameColorGroup) return index;
    }
  }
  return -1;
};

const validateVariantDrafts = (variants: any[], requireDescriptions = false, requireColors = false) => {
  if (variants.some((variant) =>
    !variant.unit ||
    !Number.isFinite(variant.price) || variant.price < 0 ||
    !Number.isFinite(variant.mrp) || variant.mrp < 0 ||
    !Number.isFinite(variant.stock) || variant.stock < 0
  )) {
    return "Every size/pack option needs a label, valid price/MRP, and non-negative stock.";
  }
  if (requireDescriptions && variants.slice(1).some((variant) => !String(variant.description || "").trim())) {
    return "Add a description for every added size/pack option.";
  }
  if (requireColors && variants.some((variant) => !Array.isArray(variant.colors) || variant.colors.length === 0)) {
    return "Select at least one colour for every size/pack option.";
  }
  if (findDuplicateVariantSizeColorIndex(variants) >= 0) {
    return "For the same RAM / Storage or size, choose different colours for each option.";
  }
  return "";
};

const validateRequiredColors = (config: any, colors: string[], imagesByColor: Record<string, string[]>) => {
  if (config.requiresColor && !colors.length) return "Select at least one colour for this product category.";
  if (config.requiresColorImages) {
    const missing = colors.filter((color) => {
      const key = Object.keys(imagesByColor || {}).find((item) => item.toLowerCase() === color.toLowerCase());
      return !key || !Array.isArray(imagesByColor[key]) || !imagesByColor[key].some((url) => String(url || "").trim());
    });
    if (missing.length) return "Upload at least one matching photo for each selected colour: " + missing.join(", ");
  }
  return "";
};

function AdminVariantColorChoices({
  value,
  availableColors,
  onChange,
  testID,
  variantLabel,
  imagesByColor = {},
  onImagesChange,
}: {
  value?: string[];
  availableColors: string[];
  onChange: (colors: string[]) => void;
  testID: string;
  variantLabel: string;
  imagesByColor?: Record<string, string[]>;
  onImagesChange: (images: Record<string, string[]>) => void;
}) {
  const selectedColors = Array.isArray(value) ? value : [];
  const [activeImageColor, setActiveImageColor] = useState(selectedColors[0] || "");
  const colorOptions = Array.from(new Set([
    ...availableColors,
    ...PRODUCT_COLOR_OPTIONS,
    ...selectedColors,
  ]));
  const activeImageKey = Object.keys(imagesByColor).find(
    (key) => key.toLowerCase() === activeImageColor.toLowerCase()
  );

  React.useEffect(() => {
    if (!selectedColors.some((color) => color.toLowerCase() === activeImageColor.toLowerCase())) {
      setActiveImageColor(selectedColors[0] || "");
    }
  }, [selectedColors.join("|"), activeImageColor]);

  const toggleColor = (color: string) => {
    const exists = selectedColors.some((item) => item.toLowerCase() === color.toLowerCase());
    const next = exists
      ? selectedColors.filter((item) => item.toLowerCase() !== color.toLowerCase())
      : [...selectedColors, color];
    const nextImages = { ...imagesByColor };
    const imageKey = Object.keys(nextImages).find((key) => key.toLowerCase() === color.toLowerCase());
    if (exists && imageKey) delete nextImages[imageKey];
    onChange(next);
    onImagesChange(nextImages);
    if (exists && activeImageColor.toLowerCase() === color.toLowerCase()) {
      setActiveImageColor(next[0] || "");
    } else if (!exists) {
      setActiveImageColor(color);
    }
  };

  return (
    <View style={styles.variantColorPanel} testID={testID}>
      <Text style={styles.variantColorTitle}>Choose colours for this {variantLabel} option</Text>
      <Text style={styles.variantColorHint}>A size can have its own colour group, separate from the main product colour selection.</Text>
      <View style={styles.unitChipContainer}>
        {colorOptions.map((color) => {
          const active = selectedColors.some((item) => item.toLowerCase() === color.toLowerCase());
          return (
            <Pressable
              key={color}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => toggleColor(color)}
              style={[styles.unitChip, active && styles.unitChipActive]}
            >
              <Text style={[styles.unitChipText, active && styles.unitChipTextActive]}>{color}</Text>
            </Pressable>
          );
        })}
      </View>
      {selectedColors.length ? (
        <>
          <Text style={styles.variantColorHint}>Optional photos for each selected colour</Text>
          <View style={styles.unitChipContainer}>
            {selectedColors.map((color) => (
              <Pressable
                key={color}
                accessibilityRole="button"
                accessibilityState={{ selected: activeImageColor === color }}
                onPress={() => setActiveImageColor(color)}
                style={[styles.unitChip, activeImageColor === color && styles.unitChipActive]}
              >
                <Text style={[styles.unitChipText, activeImageColor === color && styles.unitChipTextActive]}>{color} photos</Text>
              </Pressable>
            ))}
          </View>
          {activeImageColor ? (
            <ProductImagesUploader
              value={activeImageKey ? imagesByColor[activeImageKey] || [] : []}
              onChange={(images) => onImagesChange({ ...imagesByColor, [activeImageColor]: images })}
              label={"Upload photos for each selected colour"}
              minCount={1}
              maxCount={6}
              testID={testID + "-images-" + activeImageColor.toLowerCase().replace(/\s+/g, "-")}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const emptyProductForm = () => ({
  name: "",
  price: "",
  mrp: "",
  unit: "1 pc",
  stock: "10",
  image: "",
  images: [] as string[],
  colors: [] as string[],
  color_images: {} as Record<string, string[]>,
  attributes: {} as Record<string, string>,
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
  const [variantDrafts, setVariantDrafts] = useState<ProductVariantDraft[]>([]);
  const [baseVariantId, setBaseVariantId] = useState("");
  const [activeProductColor, setActiveProductColor] = useState("");
  const [customProductColor, setCustomProductColor] = useState("");
  const [productItemCategoryName, setProductItemCategoryName] = useState("");
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

  const shopCategory = shopCategories.find((item: any) => String(item.id) === String(selectedStore?.category_id)) || { name: selectedStore?.category_name || selectedStore?.category_id || "" };
  const categoryConfig = getProductCategoryConfig(shopCategory, `${form.name} ${form.item_category}`);
  const shopCategoryName = shopCategory.name || selectedStore?.category_name || selectedStore?.category_id || "Not set";

  const resetProductForm = () => {
    setEditingProductId("");
    setBaseVariantId("");
    setVariantDrafts([]);
    setActiveProductColor("");
    setCustomProductColor("");
    setProductItemCategoryName("");
    setForm(emptyProductForm());
  };

  const openAddProduct = () => {
    resetProductForm();
    setNotice("");
    setModalVisible(true);
  };

  const openEditProduct = (product: any) => {
    const savedVariants = Array.isArray(product.variants) ? product.variants : [];
    const primaryVariant = savedVariants[0];
    setEditingProductId(String(product.id || product._id || ""));
    setBaseVariantId(String(primaryVariant?.id || ""));
    setVariantDrafts(savedVariants.slice(1).map((variant: any) => ({
      id: String(variant.id || ""),
      unit: String(variant.unit || ""),
      price: String(variant.price ?? ""),
      mrp: String(variant.mrp ?? variant.price ?? ""),
      stock: String(variant.stock ?? 0),
      description: String(variant.description || ""),
      colors: Array.isArray(variant.colors) ? variant.colors.map((color: any) => String(color)) : undefined,
      color_images: variant.color_images && typeof variant.color_images === "object" ? { ...variant.color_images } : {},
    })));
    setForm({
      name: String(product.name || ""),
      price: String(primaryVariant?.price ?? product.price ?? ""),
      mrp: String(primaryVariant?.mrp ?? product.mrp ?? product.price ?? ""),
      unit: String(primaryVariant?.unit || product.unit || "1 pc"),
      stock: String(primaryVariant?.stock ?? product.stock ?? 0),
      image: String(product.image || product.images?.[0] || ""),
      images: Array.isArray(product.images) && product.images.length ? product.images : (product.image ? [product.image] : []),
      colors: Array.isArray(product.colors) ? product.colors.map((color: any) => String(color)) : [],
      color_images: product.color_images && typeof product.color_images === "object" ? { ...product.color_images } : {},
      attributes: product.attributes && typeof product.attributes === "object" ? { ...product.attributes } : {},
      description: String(product.description || ""),
      trending: Boolean(product.trending),
      item_category: String(product.item_category || ""),
      item_category_id: String(product.item_category_id || ""),
    });
    setProductItemCategoryName("");
    setCustomProductColor("");
    setActiveProductColor("");
    setNotice("");
    setModalVisible(true);
  };

  const addCustomProductColor = () => {
    const color = customProductColor.trim().replace(/\s+/g, " ");
    if (!color || form.colors.some((item: string) => item.toLowerCase() === color.toLowerCase())) return;
    setForm((current) => ({ ...current, colors: [...current.colors, color] }));
    setActiveProductColor(color);
    setCustomProductColor("");
  };

  const payloadFor = (item: any, available: boolean, variants?: any[]) => ({
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
    colors: Array.isArray(item.colors) ? item.colors : [],
    color_images: item.color_images && typeof item.color_images === "object" ? item.color_images : {},
    attributes: item.attributes && typeof item.attributes === "object" ? item.attributes : {},
    ...(Array.isArray(variants) ? { variants } : Array.isArray(item.variants) ? { variants: item.variants } : {}),
  });

  const saveProduct = async () => {
    if (!selectedStoreId || !selectedStore?.category_id) {
      setNotice("This store needs a shop category before products can be added.");
      return;
    }
    if (!String(form.name).trim() || !String(form.price).trim() || !Number.isFinite(Number(form.price)) || Number(form.price) <= 0) {
      setNotice("Enter a product name and a valid selling price.");
      return;
    }
    if (form.mrp && (!Number.isFinite(Number(form.mrp)) || Number(form.mrp) < 0)) {
      setNotice("Enter a valid MRP.");
      return;
    }
    if (!String(form.stock || "").trim() || !Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) {
      setNotice("Enter a valid stock quantity.");
      return;
    }
    if (
      categoryConfig.variantLabel === "RAM / Storage" &&
      !categoryConfig.variantOptions.some((option: string) => option.toLowerCase() === String(form.unit || "").trim().toLowerCase())
    ) {
      setNotice("Choose RAM / Storage for the main product before adding it.");
      return;
    }
    const existingProduct = products.find(
      (product: any) => String(product.id || product._id) === String(editingProductId)
    );
    const unchangedColorSetup = Boolean(existingProduct) &&
      String(existingProduct.category_id || selectedStore?.category_id || "") === String(selectedStore?.category_id || "") &&
      JSON.stringify(form.colors || []) === JSON.stringify(existingProduct.colors || []) &&
      JSON.stringify(form.color_images || {}) === JSON.stringify(existingProduct.color_images || {});
    const colorError = unchangedColorSetup
      ? ""
      : validateRequiredColors(categoryConfig, form.colors, form.color_images);
    if (colorError) {
      setNotice(colorError);
      return;
    }
    const variants = categoryConfig.showVariants
      ? buildVariantPayload(form, variantDrafts, baseVariantId, form.colors)
      : undefined;
    const variantError = variants
      ? validateVariantDrafts(variants, variants.length > 1, categoryConfig.showColors)
      : "";
    if (variantError) {
      setNotice(variantError);
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const payload = payloadFor(form, existingProduct ? existingProduct.is_available !== false : true, variants);
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
        payloadFor(product, product.is_available === false, product.variants)
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
        ...payloadFor(product, true, product.variants),
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

  const createItemCategoryForProduct = async () => {
    const name = productItemCategoryName.trim();
    if (!selectedStoreId || !name) {
      setNotice("Enter an item category name first.");
      return;
    }
    const existing = activeItemCategories.find(
      (item: any) => String(item.name || "").trim().toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      setForm((current) => ({ ...current, item_category: existing.name, item_category_id: String(existing.id) }));
      setProductItemCategoryName("");
      return;
    }
    try {
      await adminApi.createStoreItemCategory(selectedStoreId, {
        name, icon: "tag-outline", color: "#F97316", order: 99, active: true,
      });
      const refreshed = await adminApi.storeItemCategories(selectedStoreId);
      const nextCategories = Array.isArray(refreshed)
        ? refreshed.filter((item: any) => item.active !== false)
        : [];
      setItemCategories(nextCategories);
      const created = nextCategories.find(
        (item: any) => String(item.name || "").trim().toLowerCase() === name.toLowerCase()
      );
      if (created) {
        setForm((current) => ({ ...current, item_category: created.name, item_category_id: String(created.id) }));
      }
      setProductItemCategoryName("");
      setNotice(created ? "Item category added and selected." : "Item category added. Select it from the choices.");
    } catch (error: any) {
      setNotice(error?.message || "Could not create the item category.");
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
          <Text style={styles.sectionSubtitle}>Admin can manage products for this vendor&apos;s store.</Text>
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
                testID="admin-vendor-product-name"
                value={form.name}
                onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
                placeholder="Product name (enter full name) *"
                placeholderTextColor="#9CA3AF"
                multiline
                style={[styles.input, styles.productNameInput]}
              />
              {categoryConfig.showVariants && categoryConfig.variantOptions.length > 0 ? (
                <View style={styles.unitPickerPanel} testID="admin-vendor-product-size-pack-picker">
                  <Text style={styles.sectionLabel}>Choose {categoryConfig.variantLabel}</Text>
                  <Text style={styles.unitPickerHint}>Only options configured for this shop category are shown.</Text>
                  <View style={styles.unitChipContainer}>
                    {categoryConfig.variantOptions.map((option) => {
                      const active = form.unit.trim().toLowerCase() === option.toLowerCase();
                      return <Pressable key={option} accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        onPress={() => setForm((current) => ({ ...current, unit: option }))}
                        style={[styles.unitChip, active && styles.unitChipActive]}>
                        <Text style={[styles.unitChipText, active && styles.unitChipTextActive]}>{option}</Text>
                      </Pressable>;
                    })}
                  </View>
                </View>
              ) : null}
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
                {editingProductId ? (
                  <View style={styles.productCategoryCreateRow}>
                    <TextInput
                      value={productItemCategoryName}
                      onChangeText={setProductItemCategoryName}
                      placeholder="New item category (e.g. Shoes)"
                      placeholderTextColor="#047857"
                      style={[styles.input, styles.productCategoryInput]}
                      onSubmitEditing={() => { void createItemCategoryForProduct(); }}
                      returnKeyType="done"
                    />
                    <Pressable
                      disabled={!productItemCategoryName.trim()}
                      onPress={() => { void createItemCategoryForProduct(); }}
                      style={[styles.productCategoryButton, !productItemCategoryName.trim() && { opacity: 0.55 }]}
                      accessibilityLabel="Create and select item category"
                    >
                      <MaterialCommunityIcons name="plus" size={19} color="#fff" />
                    </Pressable>
                  </View>
                ) : null}
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
                  placeholder={categoryConfig.showVariants ? categoryConfig.variantLabel : "Unit (e.g. 1 pc)"}
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, styles.flexInput]}
                />
              </View>
              {categoryConfig.showVariants ? (
              <View style={styles.variantManagerPanel} testID="admin-vendor-product-variants">
                <View style={styles.variantManagerHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.variantManagerTitle}>Sell in more sizes</Text>
                    <Text style={styles.variantManagerHint}>Add each size/pack with its own label, price, MRP and stock.</Text>
                  </View>
                  <Pressable
                    testID="admin-vendor-product-add-variant"
                    accessibilityRole="button"
                    onPress={() => setVariantDrafts((current) => [...current, {
                      id: "",
                      unit: "",
                      price: "",
                      mrp: "",
                      stock: "10",
                      description: "",
                      colors: [...form.colors],
                      color_images: {},
                    }])}
                    style={styles.addVariantButton}
                  >
                    <MaterialCommunityIcons name="plus" size={17} color="#FFFFFF" />
                    <Text style={styles.addVariantButtonText}>Add size</Text>
                  </Pressable>
                </View>
                {variantDrafts.map((variant, index) => (
                  <View key={`${variant.id || "new"}-${index}`} style={styles.variantDraftCard}>
                    <View style={styles.variantDraftTopRow}>
                      <Text style={styles.variantDraftLabel}>Option {index + 2}</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove size option ${index + 2}`}
                        onPress={() => setVariantDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        style={styles.removeVariantButton}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={17} color="#B91C1C" />
                      </Pressable>
                    </View>
                    {categoryConfig.variantOptions.length ? (
                      <View style={styles.unitChipContainer}>
                        {categoryConfig.variantOptions.map((option: string) => {
                          const active = variant.unit.trim().toLowerCase() === option.toLowerCase();
                          return (
                            <Pressable
                              key={option}
                              accessibilityRole="button"
                              accessibilityState={{ selected: active }}
                              onPress={() => setVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unit: option } : item))}
                              style={[styles.unitChip, active && styles.unitChipActive]}
                            >
                              <Text style={[styles.unitChipText, active && styles.unitChipTextActive]}>{option}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                    <TextInput
                      placeholder={`Or enter custom ${categoryConfig.variantLabel}`}
                      placeholderTextColor="#64748B"
                      value={variant.unit}
                      onChangeText={(value) => setVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unit: value } : item))}
                      style={styles.input}
                    />
                    <AdminVariantColorChoices
                      value={variant.colors ?? form.colors}
                      availableColors={form.colors}
                      variantLabel={categoryConfig.variantLabel}
                      imagesByColor={variant.color_images || {}}
                      onChange={(colors) => setVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, colors } : item))}
                      onImagesChange={(color_images) => setVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, color_images } : item))}
                      testID={`admin-vendor-product-add-variant-colours-${index}`}
                    />
                    <TextInput value={variant.description}
                      onChangeText={(value) => setVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, description: value } : item))}
                      placeholder="Description for this option" placeholderTextColor="#64748B"
                      style={[styles.input, styles.descriptionInput]} multiline />
                    <View style={styles.formRow}>
                      <TextInput
                        placeholder="Price"
                        placeholderTextColor="#64748B"
                        value={variant.price}
                        onChangeText={(value) => setVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, price: value } : item))}
                        style={[styles.input, styles.flexInput]}
                        keyboardType="decimal-pad"
                      />
                      <TextInput
                        placeholder="MRP"
                        placeholderTextColor="#64748B"
                        value={variant.mrp}
                        onChangeText={(value) => setVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, mrp: value } : item))}
                        style={[styles.input, styles.flexInput]}
                        keyboardType="decimal-pad"
                      />
                      <TextInput
                        placeholder="Stock"
                        placeholderTextColor="#64748B"
                        value={variant.stock}
                        onChangeText={(value) => setVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, stock: value } : item))}
                        style={[styles.input, styles.flexInput]}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                ))}
              </View>
              ) : null}
              {categoryConfig.showColors ? (
                <View style={styles.variantManagerPanel} testID="admin-vendor-product-colours">
                  <Text style={styles.variantManagerTitle}>{categoryConfig.colorLabel} options</Text>
                  <Text style={styles.variantManagerHint}>Select colours, then attach a matching photo gallery to each.</Text>
                  <View style={styles.unitChipContainer}>
                    {PRODUCT_COLOR_OPTIONS.map((color) => {
                      const active = form.colors.some((item: string) => item.toLowerCase() === color.toLowerCase());
                      return <Pressable key={color} onPress={() => {
                        setForm((current) => {
                          const selected = current.colors.some((value: string) => value.toLowerCase() === color.toLowerCase());
                          const colors = selected
                            ? current.colors.filter((value: string) => value.toLowerCase() !== color.toLowerCase())
                            : [...current.colors, color];
                          const color_images = { ...(current.color_images || {}) };
                          const imageKey = Object.keys(color_images).find((key) => key.toLowerCase() === color.toLowerCase());
                          if (selected && imageKey) delete color_images[imageKey];
                          return { ...current, colors, color_images };
                        });
                        setActiveProductColor((current) => current.toLowerCase() === color.toLowerCase() ? "" : color);
                      }} style={[styles.unitChip, active && styles.unitChipActive]}>
                        <Text style={[styles.unitChipText, active && styles.unitChipTextActive]}>{color}</Text>
                      </Pressable>;
                    })}
                    {form.colors.filter((color: string) => !PRODUCT_COLOR_OPTIONS.some((item) => item.toLowerCase() === color.toLowerCase())).map((color: string) => (
                      <Pressable key={color} onPress={() => setActiveProductColor(color)} style={[styles.unitChip, styles.unitChipActive]}>
                        <Text style={[styles.unitChipText, styles.unitChipTextActive]}>{color}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.customColorRow}>
                    <TextInput
                      value={customProductColor}
                      onChangeText={setCustomProductColor}
                      placeholder={"Add another " + categoryConfig.colorLabel.toLowerCase()}
                      placeholderTextColor="#64748B"
                      style={[styles.input, styles.customColorInput]}
                      onSubmitEditing={addCustomProductColor}
                      returnKeyType="done"
                    />
                    <Pressable
                      disabled={!customProductColor.trim()}
                      onPress={addCustomProductColor}
                      style={[styles.smallPrimaryButton, !customProductColor.trim() && { opacity: 0.5 }]}
                      accessibilityLabel="Add custom product colour"
                    >
                      <MaterialCommunityIcons name="plus" size={19} color="#FFFFFF" />
                    </Pressable>
                  </View>
                  {form.colors.length ? (
                    <View style={styles.unitChipContainer}>
                      {form.colors.map((color: string) => <Pressable key={color} onPress={() => setActiveProductColor(color)}
                        style={[styles.unitChip, activeProductColor === color && styles.unitChipActive]}>
                        <Text style={[styles.unitChipText, activeProductColor === color && styles.unitChipTextActive]}>{color} photos</Text>
                      </Pressable>)}
                    </View>
                  ) : null}
                  {activeProductColor && form.colors.some((color: string) => color.toLowerCase() === activeProductColor.toLowerCase()) ? (
                    <ProductImagesUploader
                      value={form.color_images[Object.keys(form.color_images).find((key) => key.toLowerCase() === activeProductColor.toLowerCase()) || activeProductColor] || []}
                      onChange={(images) => setForm((current) => ({ ...current, color_images: { ...(current.color_images || {}), [activeProductColor]: images } }))}
                      label={activeProductColor + " photos"}
                      minCount={1}
                      maxCount={6}
                      allowMultipleSelection
                      testID={"admin-vendor-product-colour-images-" + activeProductColor.toLowerCase().replace(/\s+/g, "-")}
                    />
                  ) : null}
                </View>
              ) : null}
              <TextInput
                testID="admin-vendor-product-description"
                value={form.description}
                onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
                placeholder="Product description"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                style={[styles.input, styles.descriptionInput]}
              />

              {categoryConfig.productAttributes.length ? (
                <View style={styles.shopCategoryBlock} testID="admin-vendor-product-attributes">
                  <Text style={styles.formLabel}>Category-specific specifications</Text>
                  {categoryConfig.productAttributes.map((attribute) => (
                    <TextInput key={attribute.key} value={form.attributes?.[attribute.key] || ""}
                      onChangeText={(value) => setForm((current) => ({ ...current, attributes: { ...(current.attributes || {}), [attribute.key]: value } }))}
                      placeholder={attribute.label + (attribute.required ? " *" : "")}
                      placeholderTextColor="#9CA3AF" style={styles.input} />
                  ))}
                </View>
              ) : null}


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
  sectionLabel: { fontSize: 13, fontWeight: "800", color: "#7C2D12", marginBottom: 7 },
  unitPickerPanel: { backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FDBA74", borderRadius: 14, padding: 10, marginBottom: 10 },
  unitPickerHint: { fontSize: 11, lineHeight: 15, color: "#7C2D12", marginBottom: 8 },
  unitChipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  unitChip: { minHeight: 36, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#EA580C", borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  unitChipActive: { backgroundColor: "#EA580C", borderColor: "#EA580C" },
  unitChipText: { color: "#9A3412", fontSize: 12, fontWeight: "700" },
  unitChipTextActive: { color: "#FFFFFF", fontWeight: "800" },
  variantManagerPanel: { borderWidth: 1, borderColor: "#FDBA74", backgroundColor: "#FFF7ED", borderRadius: 14, padding: 12, marginTop: 2, marginBottom: 12, gap: 9 },
  variantManagerHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  variantManagerTitle: { color: "#7C2D12", fontSize: 14, fontWeight: "900" },
  variantManagerHint: { color: "#9A3412", fontSize: 11, lineHeight: 15, marginTop: 3 },
  addVariantButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#EA580C", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  addVariantButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  variantDraftCard: { borderWidth: 1, borderColor: "#FED7AA", backgroundColor: "#FFFFFF", borderRadius: 10, padding: 9, gap: 7 },
  variantDraftTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  variantDraftLabel: { color: "#7C2D12", fontSize: 12, fontWeight: "900" },
  removeVariantButton: { width: 30, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "#FEF2F2" },
  productCategoryCreateRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 9 },
  productCategoryInput: { flex: 1, minWidth: 0, marginBottom: 0, borderColor: "#6EE7B7", backgroundColor: "#FFFFFF", color: "#064E3B" },
  productCategoryButton: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#047857" },
  formRow: { flexDirection: "row", gap: 8 },
  flexInput: { flex: 1, minWidth: 0 },
  imageRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 9 },
  imagePreviewBox: { width: 78, height: 78, borderRadius: 12, borderWidth: 1, borderColor: "#FED7AA", backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  imagePreview: { width: "100%", height: "100%" },
  imageButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 34, borderRadius: 17, borderWidth: 1, borderColor: "#FED7AA", backgroundColor: "#FFF7ED" },
  imageButtonText: { color: "#9A3412", fontWeight: "800", fontSize: 12 },
  descriptionInput: { height: 76, textAlignVertical: "top" },
  productNameInput: { minHeight: 48, textAlignVertical: "top" },
  customColorRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 8 },
  customColorInput: { flex: 1, minWidth: 0, marginBottom: 0 },
  variantColorPanel: { borderWidth: 1, borderColor: "#FED7AA", backgroundColor: "#FFFBF5", borderRadius: 10, padding: 9, gap: 8 },
  variantColorTitle: { color: "#7C2D12", fontSize: 12, fontWeight: "900" },
  variantColorHint: { color: "#9A3412", fontSize: 10, lineHeight: 14 },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
  checkboxText: { fontSize: 13, fontWeight: "800", color: "#111827" },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 2 },
  cancelButton: { flex: 1, height: 44, borderRadius: 22, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  cancelButtonText: { color: "#475569", fontSize: 13, fontWeight: "800" },
  saveButton: { flex: 1.3, height: 44, borderRadius: 22, backgroundColor: "#EA580C", alignItems: "center", justifyContent: "center" },
  saveButtonText: { color: "#fff", fontSize: 13, fontWeight: "900" },
});
