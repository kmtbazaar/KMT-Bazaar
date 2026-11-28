import { LocalizedText as Text, LocalizedTextInput as TextInput } from "@/src/LocalizedText";
import React, { useCallback, useMemo, useRef, useState } from "react";
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
import { COLORS, RADIUS, shadow } from "@/src/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ProductImagesUploader from "@/src/components/ProductImagesUploader";
import { getProductCategoryConfig } from "@/src/productCategoryConfig";

const PRODUCT_COLOR_OPTIONS = [
  { label: "Black", hex: "#171717" },
  { label: "White", hex: "#FFFFFF" },
  { label: "Red", hex: "#DC2626" },
  { label: "Blue", hex: "#2563EB" },
  { label: "Navy", hex: "#1E3A8A" },
  { label: "Light Blue", hex: "#93C5FD" },
  { label: "Dark Blue", hex: "#1D4ED8" },
  { label: "Charcoal", hex: "#36454F" },
  { label: "Olive", hex: "#556B2F" },
  { label: "Cream", hex: "#FFFDD0" },
  { label: "Green", hex: "#16A34A" },
  { label: "Yellow", hex: "#FACC15" },
  { label: "Pink", hex: "#EC4899" },
  { label: "Purple", hex: "#8B5CF6" },
  { label: "Orange", hex: "#F97316" },
  { label: "Brown", hex: "#92400E" },
  { label: "Grey", hex: "#9CA3AF" },
  { label: "Maroon", hex: "#7F1D1D" },
  { label: "Beige", hex: "#D6C1A1" },
];

type ProductVariantDraft = { id: string; unit: string; price: string; mrp: string; stock: string; description: string; colors?: string[]; color_images?: Record<string, string[]> };

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
      ...(availableColors.length ? { colors: availableColors } : {}),
    },
    ...extras.map((variant) => {
      const optionColors = Array.isArray(variant.colors) ? variant.colors : availableColors;
      const selectedOptionColors = Array.from(new Map(
        optionColors.map((color) => String(color || "").trim()).filter(Boolean).map((color) => [color.toLowerCase(), color])
      ).values());
      const optionColorImages = Object.fromEntries(
        Object.entries(variant.color_images || {})
          .filter(([color, images]) => selectedOptionColors.some((selected) => selected.toLowerCase() === color.toLowerCase()) && Array.isArray(images))
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
        ...(selectedOptionColors.length ? { colors: selectedOptionColors } : {}),
        ...(Object.keys(optionColorImages).length ? { color_images: optionColorImages } : {}),
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
      // Repeated sizes are valid when the selected colour group is different.
      const sameColorGroup = currentColors.size === previousColors.size &&
        [...currentColors].every((color) => previousColors.has(color));
      if (!currentColors.size || !previousColors.size || sameColorGroup) {
        return index;
      }
    }
  }
  return -1;
};

const createFashionVariantDraft = (unit: string, values: any = {}, colors: string[] = []): ProductVariantDraft => ({
  id: String(values.id || ""),
  unit,
  price: String(values.price ?? ""),
  mrp: String(values.mrp ?? values.price ?? ""),
  stock: String(values.stock ?? "0"),
  description: String(values.description || ""),
  ...(Array.isArray(values.colors) ? { colors: values.colors.map((color: any) => String(color)) } : colors.length ? { colors: [...colors] } : {}),
  color_images: values.color_images && typeof values.color_images === "object" ? { ...values.color_images } : {},
});

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

function ProductColorPicker({ value, onChange, testID, colorLabel = "Colour", imagesByColor = {}, onImagesChange, showImageUploads = true }: {
  value: string[];
  onChange: (colors: string[]) => void;
  testID: string;
  colorLabel?: string;
  imagesByColor?: Record<string, string[]>;
  onImagesChange: (images: Record<string, string[]>) => void;
  showImageUploads?: boolean;
}) {
  const [customColor,setCustomColor]=useState("");
  const [activeColor,setActiveColor]=useState(value[0]||"");
  React.useEffect(()=>{if(!value.some(item=>item.toLowerCase()===activeColor.toLowerCase()))setActiveColor(value[0]||"");},[value,activeColor]);
  const toggleColor=(color:string)=>{
    const exists=value.some(item=>item.toLowerCase()===color.toLowerCase());
    if(exists){
      const next=value.filter(item=>item.toLowerCase()!==color.toLowerCase());
      const nextImages={...imagesByColor};
      const imageKey=Object.keys(nextImages).find(key=>key.toLowerCase()===color.toLowerCase());
      if(imageKey)delete nextImages[imageKey];
      onChange(next);
      onImagesChange(nextImages);
      if(activeColor.toLowerCase()===color.toLowerCase())setActiveColor(next[0]||"");
    }else{onChange([...value,color]);setActiveColor(color);}
  };
  const addCustomColor=()=>{
    const color=customColor.trim().replace(/\s+/g," ");
    if(!color||value.some(item=>item.toLowerCase()===color.toLowerCase()))return;
    onChange([...value,color]);setActiveColor(color);setCustomColor("");
  };
  return (
    <View style={s.productColorPanel} testID={testID}>
      <Text style={s.productColorTitle}>Available {colorLabel.toLowerCase()}s</Text>
      <Text style={s.productColorHint}>Select the {colorLabel.toLowerCase()} options customers can choose.</Text>
      <View style={s.productColorOptions}>
        {PRODUCT_COLOR_OPTIONS.map(color=>{
          const active=value.some(item=>item.toLowerCase()===color.label.toLowerCase());
          return <Pressable key={color.label} accessibilityRole="button" accessibilityLabel={color.label+" colour"}
            accessibilityState={{selected:active}} testID={testID+"-"+color.label.toLowerCase()}
            onPress={()=>toggleColor(color.label)} style={[s.productColorOption,active&&s.productColorOptionActive]}>
            <View style={[s.productColorDot,{backgroundColor:color.hex},color.label==="White"&&s.productColorDotWhite,active&&s.productColorDotSelected]}>
              {active?<MaterialCommunityIcons name="check" size={11} color={color.label==="White"?"#111827":"#FFFFFF"}/>:null}
            </View>
            <Text style={[s.productColorOptionText,active&&s.productColorOptionTextActive]}>{color.label}</Text>
          </Pressable>;
        })}
      </View>
      <View style={s.addCustomColorRow}>
        <TextInput value={customColor} onChangeText={setCustomColor} placeholder={"Add another " + colorLabel.toLowerCase()}
          placeholderTextColor="#64748B" style={[s.inputCompact,s.addCustomColorInput]} onSubmitEditing={addCustomColor} returnKeyType="done"/>
        <Pressable testID={testID+"-add-custom"} accessibilityRole="button" accessibilityLabel="Add custom colour"
          onPress={addCustomColor} disabled={!customColor.trim()} style={[s.addCustomColorButton,!customColor.trim()&&{opacity:0.45}]}>
          <MaterialCommunityIcons name="plus" size={19} color="#FFFFFF"/>
        </Pressable>
      </View>
      <Text style={s.productColorSelectedCount}>{value.length?value.length+" colour option(s) selected":"No colour options selected"}</Text>
      {value.length>0 && showImageUploads?(
        <View style={s.productColorImagePanel}>
          <Text style={s.productColorTitle}>Attach photos to each colour</Text>
          <Text style={s.productColorHint}>Choose a colour, then upload its matching product photos.</Text>
          <View style={s.productColorOptions}>
            {value.map(color=><Pressable key={color} accessibilityRole="button" accessibilityLabel={"Manage photos for "+color}
              accessibilityState={{selected:activeColor===color}} onPress={()=>setActiveColor(color)}
              style={[s.productColorOption,activeColor===color&&s.productColorOptionActive]}>
              <Text style={[s.productColorOptionText,activeColor===color&&s.productColorOptionTextActive]}>{color}</Text>
            </Pressable>)}
          </View>
          {activeColor?<ProductImagesUploader value={imagesByColor[activeColor]||[]}
            onChange={images=>onImagesChange({...imagesByColor,[activeColor]:images})}
            label={activeColor+" photos shown when this colour is selected"} minCount={1} maxCount={6}
            allowMultipleSelection
            testID={testID+"-images-"+activeColor.toLowerCase().replace(/\s+/g,"-")}/>:null}
        </View>
      ):null}
    </View>
  );
}
function VariantColorChoices({ value, availableColors, onChange, testID, variantLabel, imagesByColor = {}, onImagesChange, showImageUploads = true, colorsRequired = true }: {
  value?: string[];
  availableColors: string[];
  onChange: (colors: string[]) => void;
  testID: string;
  variantLabel: string;
  imagesByColor?: Record<string, string[]>;
  onImagesChange: (images: Record<string, string[]>) => void;
  showImageUploads?: boolean;
  colorsRequired?: boolean;
}) {
  const selectedColors = Array.isArray(value) ? value : [];
  const [activeImageColor, setActiveImageColor] = useState(selectedColors[0] || "");
  React.useEffect(() => {
    if (!selectedColors.some((item) => item.toLowerCase() === activeImageColor.toLowerCase())) {
      setActiveImageColor(selectedColors[0] || "");
    }
  }, [selectedColors.join("|"), activeImageColor]);
  const colorOptions = Array.from(new Set([
    ...PRODUCT_COLOR_OPTIONS.map((color) => color.label),
    ...availableColors.filter((color) => !PRODUCT_COLOR_OPTIONS.some((option) => option.label.toLowerCase() === color.toLowerCase())),
  ]));
  const activeImageKey = Object.keys(imagesByColor).find((key) => key.toLowerCase() === activeImageColor.toLowerCase());
  return (
    <View style={{ marginTop: 8, marginBottom: 8 }} testID={testID}>
      <Text style={s.variantManagerHint}>Choose colours for this {variantLabel} option</Text>
      <View style={s.productColorOptions}>
        {colorOptions.map((color) => {
          const active = selectedColors.some((item) => item.toLowerCase() === color.toLowerCase());
          const swatch = PRODUCT_COLOR_OPTIONS.find((item) => item.label.toLowerCase() === color.toLowerCase())?.hex || "#94A3B8";
          return (
            <Pressable key={color} accessibilityRole="button"
              accessibilityLabel={color + " colour for this option"}
              accessibilityState={{ selected: active }}
              testID={testID + "-" + color.toLowerCase().replace(/\s+/g, "-")}
              onPress={() => {
                const next = active
                  ? selectedColors.filter((item) => item.toLowerCase() !== color.toLowerCase())
                  : [...selectedColors, color];
                if (active) {
                  const nextImages = { ...imagesByColor };
                  const imageKey = Object.keys(nextImages).find((key) => key.toLowerCase() === color.toLowerCase());
                  if (imageKey) delete nextImages[imageKey];
                  onImagesChange(nextImages);
                  if (activeImageColor.toLowerCase() === color.toLowerCase()) setActiveImageColor(next[0] || "");
                } else {
                  setActiveImageColor(color);
                }
                onChange(next);
              }}
              style={[s.productColorOption, active && s.productColorOptionActive]}>
              <View style={[s.productColorDot, { backgroundColor: swatch }, color.toLowerCase() === "white" && s.productColorDotWhite, active && s.productColorDotSelected]}>
                {active ? <MaterialCommunityIcons name="check" size={11} color={color.toLowerCase() === "white" ? "#111827" : "#FFFFFF"} /> : null}
              </View>
              <Text style={[s.productColorOptionText, active && s.productColorOptionTextActive]}>{color}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={s.productColorSelectedCount}>{selectedColors.length ? selectedColors.length + " colour(s) selected" : colorsRequired ? "Select at least one colour for this size" : "Colour is optional for this size"}</Text>
      {selectedColors.length > 0 && showImageUploads ? (
        <View style={s.productColorImagePanel} testID={testID + "-color-images"}>
          <Text style={s.productColorTitle}>Upload photos for each selected colour</Text>
          <Text style={s.productColorHint}>These photos belong only to this size/pack option.</Text>
          <View style={s.productColorOptions}>
            {selectedColors.map((color) => (
              <Pressable key={color} accessibilityRole="button" accessibilityLabel={"Upload photos for " + color}
                accessibilityState={{ selected: activeImageColor.toLowerCase() === color.toLowerCase() }}
                onPress={() => setActiveImageColor(color)}
                style={[s.productColorOption, activeImageColor.toLowerCase() === color.toLowerCase() && s.productColorOptionActive]}>
                <Text style={[s.productColorOptionText, activeImageColor.toLowerCase() === color.toLowerCase() && s.productColorOptionTextActive]}>{color}</Text>
              </Pressable>
            ))}
          </View>
          {activeImageColor ? (
            <ProductImagesUploader
              value={activeImageKey ? imagesByColor[activeImageKey] || [] : []}
              onChange={(images) => onImagesChange({ ...imagesByColor, [activeImageColor]: images })}
              label={activeImageColor + " photos for " + variantLabel}
              minCount={1}
              maxCount={6}
              allowMultipleSelection
              testID={testID + "-images-" + activeImageColor.toLowerCase().replace(/\s+/g, "-")}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

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
  const [productItemCategoryName, setProductItemCategoryName] = useState("");
  const [savingProductItemCategory, setSavingProductItemCategory] = useState(false);
  const [editingItemCategoryId, setEditingItemCategoryId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [stockOnly, setStockOnly] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [editForm, setEditForm] = useState({
    name: initialName,
    address: initialAddress,
    image: initialImage,
    category_id: "",
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [addValidationError, setAddValidationError] = useState<{ field: string; message: string } | null>(null);
  const addProductScrollRef = useRef<ScrollView | null>(null);
  const addFieldPositions = useRef<Record<string, number>>({});
  const [addVariantDrafts, setAddVariantDrafts] = useState<ProductVariantDraft[]>([]);
  const [editVariantDrafts, setEditVariantDrafts] = useState<ProductVariantDraft[]>([]);
  const [addFashionSelectedSizes, setAddFashionSelectedSizes] = useState<string[]>([]);
  const [editFashionSelectedSizes, setEditFashionSelectedSizes] = useState<string[]>([]);
  const [editBaseVariantId, setEditBaseVariantId] = useState("");
  const [form, setForm] = useState({
    name: "",
    category_id: "",
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

  const categoryConfig = useMemo(
    () => getProductCategoryConfig(
      categories.find((item: any) => String(item.id) === String(store?.category_id)),
      `${form.name} ${form.item_category}`
    ),
    [categories, store?.category_id, form.name, form.item_category]
  );

  React.useEffect(() => {
    if (!categoryConfig.showVariants || !categoryConfig.variantOptions.length) return;
    setForm((current) => {
      const selected = String(current.unit || "").trim().toLowerCase();
      const isAvailable = categoryConfig.variantOptions.some((option) => option.toLowerCase() === selected);
      return isAvailable ? current : { ...current, unit: categoryConfig.variantOptions[0] };
    });
  }, [categoryConfig]);

  const storeCategoryName = String(
    categories.find((item: any) => String(item.id) === String(store?.category_id))?.name || store?.category_id || ""
  );
  const isFoodCategory = categoryConfig.variantLabel === "Portion / Serving" ||
    /(restaurant|food|cafe|bakery|sweet|snack|meal|fast food)/i.test(storeCategoryName);
  const isFashionCategory = /(clothing|fashion|apparel|garment|wear|shirt|jeans|textile|kurta|dress)/i.test(storeCategoryName);
  const showColorOptions = !isFoodCategory && categoryConfig.showColors;

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
    images: [] as string[],
    colors: [] as string[],
    color_images: {} as Record<string, string[]>,
    attributes: {} as Record<string, string>,
    description: "",
    trending: false,
    item_category: "",
    item_category_id: "",
  });
  const editCategoryConfig = useMemo(
    () => getProductCategoryConfig(
      categories.find((item: any) => String(item.id) === String(store?.category_id)),
      `${editProductForm.name} ${editProductForm.item_category}`
    ),
    [categories, store?.category_id, editProductForm.name, editProductForm.item_category]
  );
  const isEditFoodCategory = editCategoryConfig.variantLabel === "Portion / Serving" ||
    /(restaurant|food|cafe|bakery|sweet|snack|meal|fast food)/i.test(storeCategoryName);
  const isEditFashionCategory = /(clothing|fashion|apparel|garment|wear|shirt|jeans|textile|kurta|dress)/i.test(storeCategoryName);
  const showEditColorOptions = !isEditFoodCategory && editCategoryConfig.showColors;

  const toggleAddFashionSize = (option: string) => {
    const exists = addFashionSelectedSizes.some((size) => size.toLowerCase() === option.toLowerCase());
    if (exists) {
      if (addFashionSelectedSizes[0]?.toLowerCase() === option.toLowerCase()) {
        if (addFashionSelectedSizes.length > 1) return;
        setAddFashionSelectedSizes([]);
        setAddVariantDrafts([]);
        setForm((current) => ({ ...current, unit: "" }));
        return;
      }
      setAddFashionSelectedSizes((current) => current.filter((size) => size.toLowerCase() !== option.toLowerCase()));
      setAddVariantDrafts((current) => current.filter((variant) => variant.unit.toLowerCase() !== option.toLowerCase()));
      return;
    }
    setAddFashionSelectedSizes((current) => [...current, option]);
    if (addFashionSelectedSizes.length === 0) {
      setForm((current) => ({ ...current, unit: option }));
      return;
    }
    setAddVariantDrafts((current) => [
      ...current,
      createFashionVariantDraft(option, {
        price: form.price,
        mrp: form.mrp || form.price,
        stock: form.stock || "10",
      }, form.colors),
    ]);
  };

  const toggleEditFashionSize = (option: string) => {
    const exists = editFashionSelectedSizes.some((size) => size.toLowerCase() === option.toLowerCase());
    if (exists) {
      if (String(editProductForm.unit || "").toLowerCase() === option.toLowerCase()) return;
      setEditFashionSelectedSizes((current) => current.filter((size) => size.toLowerCase() !== option.toLowerCase()));
      setEditVariantDrafts((current) => current.filter((variant) => variant.unit.toLowerCase() !== option.toLowerCase()));
      return;
    }
    setEditFashionSelectedSizes((current) => [...current, option]);
    setEditVariantDrafts((current) => [
      ...current,
      createFashionVariantDraft(option, {
        price: editProductForm.price,
        mrp: editProductForm.mrp || editProductForm.price,
        stock: "0",
      }, editProductForm.colors),
    ]);
  };

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
        const storeCategoryConfig = getProductCategoryConfig((categoryList || []).find((item: any) => String(item.id) === String(currentStore.category_id)));
        setForm((prev) => ({
          ...prev,
          category_id: currentStore.category_id,
          ...(storeCategoryConfig.variantLabel === "RAM / Storage" && prev.unit === "1 pc" ? { unit: "" } : {}),
        }));
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

  const createItemCategoryForProduct = async (target: "add" | "edit") => {
    const name = productItemCategoryName.trim();
    if (!name) {
      Alert.alert("Required", "Enter a new item category name.");
      return;
    }

    const existing = itemCategories.find(
      (item: any) => String(item.name || "").trim().toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      if (target === "add") {
        setForm((prev) => ({ ...prev, item_category: existing.name, item_category_id: existing.id }));
      } else {
        setEditProductForm((prev) => ({ ...prev, item_category: existing.name, item_category_id: existing.id }));
      }
      setProductItemCategoryName("");
      return;
    }

    setSavingProductItemCategory(true);
    try {
      await vendorApi.createStoreItemCategory(id, { name });
      const refreshed = await vendorApi.storeItemCategories(id);
      const nextCategories = Array.isArray(refreshed) ? refreshed : [];
      setItemCategories(nextCategories);
      const created = nextCategories.find(
        (item: any) => String(item.name || "").trim().toLowerCase() === name.toLowerCase()
      );
      if (!created) {
        Alert.alert("Saved", "Category was created. Please select it from the category choices.");
        setProductItemCategoryName("");
        return;
      }
      if (target === "add") {
        setForm((prev) => ({ ...prev, item_category: created.name, item_category_id: created.id }));
      } else {
        setEditProductForm((prev) => ({ ...prev, item_category: created.name, item_category_id: created.id }));
      }
      setProductItemCategoryName("");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not create item category.");
    } finally {
      setSavingProductItemCategory(false);
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
      unit: categoryConfig.variantLabel === "RAM / Storage" ? "" : "1 pc",
      stock: "10",
      image: "",
      images: [],
      colors: [],
      color_images: {},
      attributes: {},
      description: "",
      trending: false,
      item_category: "",
      item_category_id: "",
    });
    setAddVariantDrafts([]);
    setAddFashionSelectedSizes([]);
    setAddValidationError(null);
    addFieldPositions.current = {};
  };

  const rememberAddFieldPosition = (field: string, y: number) => {
    addFieldPositions.current[field] = y;
  };

  const clearAddValidationError = (field?: string) => {
    setAddValidationError((current) => {
      if (!current) return null;
      if (!field || current.field === field || (field === "variant" && current.field.startsWith("variant-"))) return null;
      return current;
    });
  };

  const guideAddFormToField = (field: string, message: string) => {
    setAddValidationError({ field, message });
    const fallbackField = field.startsWith("variant-") ? "variants" : field;
    const y = addFieldPositions.current[field] ?? addFieldPositions.current[fallbackField] ?? 0;
    setTimeout(() => addProductScrollRef.current?.scrollTo({ y: Math.max(0, y - 18), animated: true }), 60);
  };

  const handleAddProduct = async () => {
    clearAddValidationError();
    const productName = String(form.name || "").trim();
    if (!productName) {
      guideAddFormToField("name", "Fill in the product name to continue.");
      return;
    }
    if (!store?.category_id) {
      Alert.alert("Shop category missing", "Set this store's shop category before adding a product.");
      return;
    }

    const productPrice = Number.parseFloat(String(form.price || ""));
    if (!String(form.price || "").trim() || !Number.isFinite(productPrice) || productPrice <= 0) {
      guideAddFormToField("price", "Enter a valid selling price to continue.");
      return;
    }
    const productMrp = String(form.mrp || "").trim();
    if (productMrp && (!Number.isFinite(Number.parseFloat(productMrp)) || Number.parseFloat(productMrp) < 0)) {
      guideAddFormToField("mrp", "Enter a valid MRP, or leave it blank to use the selling price.");
      return;
    }
    const productStock = String(form.stock || "").trim();
    if (!productStock || !Number.isInteger(Number(productStock)) || Number(productStock) < 0) {
      guideAddFormToField("stock", "Enter a valid stock quantity.");
      return;
    }
    if (isFoodCategory && (form.images || []).filter((image) => typeof image === "string" && image.trim()).length !== 2) {
      guideAddFormToField("photos", "Add exactly two product photos before creating this food item.");
      return;
    }
    if (isFashionCategory && !(form.images || []).some((image) => typeof image === "string" && image.trim())) {
      guideAddFormToField("photos", "Upload at least one product photo. The same gallery will be used for every selected size.");
      return;
    }
    if (isFashionCategory && addFashionSelectedSizes.length === 0) {
      guideAddFormToField("baseSize", "Select one or more clothing sizes before creating this product.");
      return;
    }

    if (
      categoryConfig.variantLabel === "RAM / Storage" &&
      !categoryConfig.variantOptions.some((option: string) => option.toLowerCase() === String(form.unit || "").trim().toLowerCase())
    ) {
      guideAddFormToField("baseSize", "Choose RAM / Storage for the main product before adding it.");
      return;
    }

    const colorError = showColorOptions ? validateRequiredColors(categoryConfig, form.colors, form.color_images) : "";
    if (colorError) {
      guideAddFormToField("colors", colorError);
      return;
    }

    const addDraftsForSave = isFashionCategory
      ? addVariantDrafts.map((variant) => ({
          ...variant,
          price: String(variant.price || form.price),
          mrp: String(variant.mrp || form.mrp || form.price),
        }))
      : addVariantDrafts;
    const variants = categoryConfig.showVariants
      ? buildVariantPayload(form, addDraftsForSave, "", form.colors)
      : undefined;
    if (variants) {
      const invalidIndex = variants.findIndex((variant) =>
        !variant.unit ||
        !Number.isFinite(variant.price) || variant.price <= 0 ||
        !Number.isFinite(variant.mrp) || variant.mrp < 0 ||
        !Number.isInteger(variant.stock) || variant.stock < 0
      );
      if (invalidIndex >= 0) {
        const target = invalidIndex === 0 ? "baseSize" : `variant-${invalidIndex - 1}`;
        guideAddFormToField(target, `Fill the size, price, MRP and stock for option ${invalidIndex + 1}.`);
        return;
      }
      const emptyDescriptionIndex = (isFoodCategory || isFashionCategory) ? -1 : variants.findIndex((variant, index) =>
        index > 0 && variants.length > 1 && !String(variant.description || "").trim()
      );
      if (emptyDescriptionIndex >= 0) {
        guideAddFormToField(`variant-${emptyDescriptionIndex - 1}`, `Add a description for size option ${emptyDescriptionIndex + 1}.`);
        return;
      }
      const emptyColorIndex = categoryConfig.requiresColor
        ? variants.findIndex((variant) => !Array.isArray(variant.colors) || variant.colors.length === 0)
        : -1;
      if (emptyColorIndex >= 0) {
        const target = emptyColorIndex === 0 ? "colors" : `variant-${emptyColorIndex - 1}`;
        guideAddFormToField(target, `Choose at least one colour for size option ${emptyColorIndex + 1}.`);
        return;
      }
      const duplicateIndex = findDuplicateVariantSizeColorIndex(variants);
      if (duplicateIndex >= 0) {
        const target = duplicateIndex === 0 ? "baseSize" : `variant-${duplicateIndex - 1}`;
        guideAddFormToField(target, "For the same RAM / Storage or size, choose different colours for each option.");
        return;
      }
    }

    setLoading(true);
    try {
      await vendorApi.createProduct({
        ...form,
        ...(variants ? { variants } : {}),
        attributes: form.attributes || {},
        colors: showColorOptions ? form.colors : [],
        color_images: categoryConfig.showColors ? form.color_images : {},
        category_id: store.category_id,
        store_id: id,
        price: parseFloat(form.price),
        mrp: form.mrp ? parseFloat(form.mrp) : parseFloat(form.price),
        stock: parseInt(form.stock) || 0,
        image: form.images[0] || form.image || "",
        images: form.images,
      });
      setShowAddModal(false);
      resetAddForm();
      load();
    } catch (e: any) {
      const message = e?.message || "Could not add product.";
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert("Could not add product: " + message);
      } else {
        Alert.alert("Could not add product", message);
      }
    } finally {
      setLoading(false);
    }
  };

  const openEditProduct = (prod: any) => {
    setSelectedProductId(prod.id);
    const savedVariants = Array.isArray(prod.variants) ? prod.variants : [];
    const primaryVariant = savedVariants[0];
    const savedProductImages = Array.from(new Set([...(Array.isArray(prod.images) ? prod.images : []), prod.image]
      .filter((url: any) => typeof url === "string" && url.trim())));
    const selectedCategoryConfig = getProductCategoryConfig(
      categories.find((item: any) => String(item.id) === String(store?.category_id)),
      `${prod.name || ""} ${prod.item_category || ""}`
    );
    const productIsFood = selectedCategoryConfig.variantLabel === "Portion / Serving" ||
      /(restaurant|food|cafe|bakery|sweet|snack|meal|fast food)/i.test(storeCategoryName);
    const productIsFashion = /(clothing|fashion|apparel|garment|wear|shirt|jeans|textile|kurta|dress)/i.test(storeCategoryName);
    const editProductImages = productIsFood ? savedProductImages.slice(0, 2) : savedProductImages;
    const savedFashionSizes = (savedVariants.length ? savedVariants : [primaryVariant || { unit: prod.unit }])
      .map((variant: any) => String(variant?.unit || "").trim()).filter(Boolean);
    setEditFashionSelectedSizes(productIsFashion ? savedFashionSizes : []);
    setEditBaseVariantId(primaryVariant?.id || "");
    setEditVariantDrafts(savedVariants.slice(1).map((variant: any) => ({
      id: String(variant.id || ""),
      unit: String(variant.unit || ""),
      price: String(variant.price ?? ""),
      mrp: String(variant.mrp ?? variant.price ?? ""),
      stock: String(variant.stock ?? 0),
      description: String(variant.description || ""),
      colors: Array.isArray(variant.colors) ? variant.colors.map((color: any) => String(color)) : undefined,
      color_images: variant.color_images && typeof variant.color_images === "object" ? variant.color_images : {},
    })));
    setEditProductForm({
      name: prod.name,
      category_id: prod.category_id || "",
      price: String(primaryVariant?.price ?? prod.price),
      mrp: String(primaryVariant?.mrp ?? prod.mrp ?? prod.price),
      unit: primaryVariant?.unit || prod.unit || "1 pc",
      stock: String(primaryVariant?.stock ?? prod.stock ?? 0),
      image: editProductImages[0] || prod.image || "",
      images: editProductImages,
      colors: Array.isArray(prod.colors) ? prod.colors.map((color: any) => String(color)) : [],
      color_images: prod.color_images && typeof prod.color_images === "object" ? prod.color_images : {},
      attributes: prod.attributes && typeof prod.attributes === "object" ? { ...prod.attributes } : {},
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
    const existingProduct = products.find(
      (product: any) => String(product.id || product._id || "") === String(selectedProductId)
    );
    if (!editProductForm.name || !editProductForm.price) {
      Alert.alert("Error", "Name and Price are required.");
      return;
    }
    if (isEditFoodCategory && (editProductForm.images || []).filter((image) => typeof image === "string" && image.trim()).length !== 2) {
      const message = "Add exactly two product photos before saving this food item.";
      if (Platform.OS === "web" && typeof window !== "undefined") window.alert(message);
      else Alert.alert("Product photos required", message);
      return;
    }
    if (isEditFashionCategory && !(editProductForm.images || []).some((image) => typeof image === "string" && image.trim())) {
      const message = "Upload at least one product photo. The same gallery will be used for every selected size.";
      if (Platform.OS === "web" && typeof window !== "undefined") window.alert(message);
      else Alert.alert("Product photo required", message);
      return;
    }
    if (isEditFashionCategory && editFashionSelectedSizes.length === 0) {
      const message = "Keep at least one clothing size selected.";
      if (Platform.OS === "web" && typeof window !== "undefined") window.alert(message);
      else Alert.alert("Product size required", message);
      return;
    }
    const unchangedColorSetup = Boolean(existingProduct) &&
      JSON.stringify(editProductForm.colors || []) === JSON.stringify(existingProduct.colors || []) &&
      JSON.stringify(editProductForm.color_images || {}) === JSON.stringify(existingProduct.color_images || {});
    const colorError = unchangedColorSetup || !showEditColorOptions
      ? ""
      : validateRequiredColors(editCategoryConfig, editProductForm.colors, editProductForm.color_images);
    if (colorError) {
      Alert.alert("Select product colour", colorError);
      return;
    }
    const editDraftsForSave = isEditFashionCategory
      ? editVariantDrafts.map((variant) => ({
          ...variant,
          price: String(variant.price || editProductForm.price),
          mrp: String(variant.mrp || editProductForm.mrp || editProductForm.price),
        }))
      : editVariantDrafts;
    const variants = editCategoryConfig.showVariants
      ? buildVariantPayload(editProductForm, editDraftsForSave, editBaseVariantId, editProductForm.colors)
      : undefined;
    const variantError = variants
      ? validateVariantDrafts(
          variants,
          variants.length > 1 && !isEditFoodCategory && !isEditFashionCategory,
          editCategoryConfig.requiresColor
        )
      : "";
    if (variantError) {
      Alert.alert("Check product sizes", variantError);
      return;
    }
    setLoading(true);
    try {
      await vendorApi.updateProduct(selectedProductId, {
        ...editProductForm,
        ...(variants ? { variants } : {}),
        attributes: editProductForm.attributes || {},
        colors: showEditColorOptions ? editProductForm.colors : [],
        color_images: showEditColorOptions ? editProductForm.color_images : {},
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
    } catch (e: any) {
      const message = e?.message || "Failed to update product.";
      if (Platform.OS === "web" && typeof window !== "undefined") window.alert("Could not update product: " + message);
      else Alert.alert("Could not update product", message);
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
                  <Text style={s.itemCategoryHint}>Write categories like Jeans, T-Shirts, Shirts. They appear on the customer&apos;s left side.</Text>
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
              <Pressable
                onPress={() => {
                  resetAddForm();
                  setShowAddModal(true);
                }}
                style={s.headerAddBtn}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#fff" />
              </Pressable>
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
              <Text style={[
                s.meta,
                Number(item.stock ?? 0) <= 0 && { color: COLORS.error, fontWeight: "900", fontSize: 14 },
              ]}>
                {item.unit ? `${item.unit} · ` : ""}Stock: {Math.max(0, Number(item.stock ?? 0))}
                {Number(item.stock ?? 0) <= 0 ? " · OUT OF STOCK" : Number(item.stock ?? 0) <= 5 ? " · LOW STOCK" : ""}
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
            <View style={s.modalHeaderRow}>
              <Text style={[s.modalTitle, s.modalTitleInHeader]}>Add Product</Text>
              <View style={s.shopCategoryBadge} testID="vendor-store-add-product-shop-category">
                <Text style={s.shopCategoryBadgeLabel}>SHOP CATEGORY</Text>
                <Text style={s.shopCategoryBadgeValue} numberOfLines={1}>
                  {categories.find((item: any) => item.id === store?.category_id)?.name || store?.category_id || "Not set"}
                </Text>
              </View>
            </View>

            {addValidationError ? (
              <View style={s.addValidationBanner} accessibilityRole="alert">
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#B91C1C" />
                <Text style={s.addValidationBannerText}>{addValidationError.message}</Text>
              </View>
            ) : null}

            <ScrollView ref={addProductScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              {/* Product Name */}
              <View onLayout={(event) => rememberAddFieldPosition("name", event.nativeEvent.layout.y)}>
              <TextInput
                testID="vendor-store-add-product-name"
                placeholder="Product name (enter full name)"
                placeholderTextColor="#9CA3AF"
                value={form.name}
                onChangeText={(t) => {
                  setForm((current) => ({ ...current, name: t }));
                  clearAddValidationError("name");
                }}
                style={[s.inputCompact, s.inputHighlighted, s.productNameInput, addValidationError?.field === "name" && s.inputError]}
                multiline
                textAlignVertical="top"
              />
              </View>

                <View style={s.itemCategoryPanel} testID="vendor-store-add-product-item-category-picker">
                  <Text style={s.itemCategoryTitle}>Choose item category</Text>
                  <Text style={s.itemCategoryPickerHint}>Choose the category that best matches this product.</Text>
                  {itemCategories.length ? (
                    <View style={s.itemCategoryRow}>
                      {itemCategories.map((item: any) => {
                        const active = form.item_category_id === item.id;
                        return (
                          <Pressable
                            key={item.id}
                            accessibilityRole="button"
                            accessibilityLabel={`Select item category ${item.name}`}
                            accessibilityState={{ selected: active }}
                            onPress={() => setForm((prev) => ({ ...prev, item_category: item.name, item_category_id: item.id }))}
                            style={[s.itemCategoryChip, active && s.itemCategoryChipActive]}
                          >
                            <Text style={[s.itemCategoryChipText, active && s.itemCategoryChipTextActive]}>{item.name}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={s.itemCategoryPickerEmpty}>
                      No item categories are configured for this shop category yet. Add them in Store Item Categories first.
                    </Text>
                  )}
                </View>

              {isFoodCategory ? (
                <View
                  onLayout={(event) => rememberAddFieldPosition("photos", event.nativeEvent.layout.y)}
                  testID="vendor-store-add-product-food-photo-section"
                >
                  <ProductImagesUploader
                    value={form.images}
                    onChange={(images) => {
                      setForm((current) => ({ ...current, images, image: images[0] || "" }));
                      clearAddValidationError("photos");
                    }}
                    label="Food photos"
                    minCount={2}
                    maxCount={2}
                    allowMultipleSelection
                    testID="vendor-store-add-product-food-photos"
                  />
                </View>
              ) : null}

              {isFashionCategory ? (
                <View
                  onLayout={(event) => rememberAddFieldPosition("photos", event.nativeEvent.layout.y)}
                  testID="vendor-store-add-product-fashion-photo-section"
                >
                  <ProductImagesUploader
                    value={form.images}
                    onChange={(images) => {
                      setForm((current) => ({ ...current, images, image: images[0] || "" }));
                      clearAddValidationError("photos");
                    }}
                    label="Fashion product photos"
                    minCount={1}
                    maxCount={6}
                    allowMultipleSelection
                    testID="vendor-store-add-product-fashion-photos"
                  />
                </View>
              ) : null}

              {categoryConfig.showVariants && categoryConfig.variantOptions.length > 0 ? (
                <View
                  style={[s.unitPickerPanel, addValidationError?.field === "baseSize" && s.fieldPanelError]}
                  testID="vendor-store-add-product-size-pack-picker"
                  onLayout={(event) => rememberAddFieldPosition("baseSize", event.nativeEvent.layout.y)}
                >
                  <Text style={s.sectionLabel}>Choose {categoryConfig.variantLabel}</Text>
                  <Text style={s.unitPickerHint}>Select every size available for this product. You can choose several sizes together.</Text>
                  <View style={s.unitChipContainer}>
                    {categoryConfig.variantOptions.map((option) => {
                      const active = isFashionCategory
                        ? addFashionSelectedSizes.some((size) => size.toLowerCase() === option.toLowerCase())
                        : form.unit.trim().toLowerCase() === option.toLowerCase();
                      return (
                        <Pressable key={option} accessibilityRole="button"
                          accessibilityLabel={"Select " + categoryConfig.variantLabel + " " + option}
                          accessibilityState={{ selected: active }}
                          testID={"vendor-store-add-product-unit-" + option.toLowerCase().replace(/\s+/g, "-")}
                          style={[s.catChip, s.unitChip, active && s.catChipActive]}
                          onPress={() => {
                            if (isFashionCategory) toggleAddFashionSize(option);
                            else setForm((current) => ({ ...current, unit: option }));
                            clearAddValidationError("baseSize");
                          }}>
                          <Text style={[s.catChipText, active && s.catChipTextActive]}>{option}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {categoryConfig.showColors ? (
                showColorOptions ? (
                  <View
                    onLayout={(event) => rememberAddFieldPosition("colors", event.nativeEvent.layout.y)}
                    style={addValidationError?.field === "colors" ? s.fieldErrorWrap : undefined}
                  >
                    <ProductColorPicker value={form.colors} colorLabel={categoryConfig.colorLabel}
                      onChange={(colors) => {
                        setForm((current) => ({ ...current, colors }));
                        clearAddValidationError("colors");
                      }}
                      imagesByColor={form.color_images}
                      onImagesChange={(color_images) => setForm((current) => ({ ...current, color_images }))}
                      showImageUploads={!isFashionCategory}
                      testID="vendor-store-add-product-colours" />
                  </View>
                ) : null
              ) : null}

              {/* Product description is available for every store category. */}
              <View style={s.productDescriptionPanel} testID="vendor-store-add-product-description">
                <Text style={s.sectionLabel}>{categoryConfig.descriptionLabel || "Product description"}</Text>
                <TextInput testID="vendor-store-add-product-description-input"
                  placeholder={categoryConfig.descriptionPlaceholder || "Add clear details about this product"}
                  placeholderTextColor="#9CA3AF"
                  value={form.description} onChangeText={(t) => setForm({ ...form, description: t })}
                  style={[s.inputCompact, { height: 70, textAlignVertical: "top" }]} multiline />
              </View>


              {/* Price & MRP Row */}
              <View style={s.rowCompact} onLayout={(event) => rememberAddFieldPosition("pricing", event.nativeEvent.layout.y)}>
                <TextInput
                  placeholder="Price"
                  placeholderTextColor="#9CA3AF"
                  value={form.price}
                  onChangeText={(t) => {
                    setForm((current) => ({ ...current, price: t }));
                    clearAddValidationError("price");
                  }}
                  onLayout={(event) => rememberAddFieldPosition("price", (addFieldPositions.current.pricing || 0) + event.nativeEvent.layout.y)}
                  style={[s.inputCompact, s.flex1, addValidationError?.field === "price" && s.inputError]}
                  keyboardType="numeric"
                />
                <TextInput
                  placeholder="MRP"
                  placeholderTextColor="#9CA3AF"
                  value={form.mrp}
                  onChangeText={(t) => {
                    setForm((current) => ({ ...current, mrp: t }));
                    clearAddValidationError("mrp");
                  }}
                  onLayout={(event) => rememberAddFieldPosition("mrp", (addFieldPositions.current.pricing || 0) + event.nativeEvent.layout.y)}
                  style={[s.inputCompact, s.flex1, addValidationError?.field === "mrp" && s.inputError]}
                  keyboardType="numeric"
                />
              </View>

              {/* Stock & Unit Row */}
              <View style={s.rowCompact} onLayout={(event) => rememberAddFieldPosition("stockRow", event.nativeEvent.layout.y)}>
                <TextInput
                  placeholder="Stock"
                  placeholderTextColor="#9CA3AF"
                  value={form.stock}
                  onChangeText={(t) => {
                    setForm((current) => ({ ...current, stock: t }));
                    clearAddValidationError("stock");
                  }}
                  onLayout={(event) => rememberAddFieldPosition("stock", (addFieldPositions.current.stockRow || 0) + event.nativeEvent.layout.y)}
                  style={[s.inputCompact, s.flex1, addValidationError?.field === "stock" && s.inputError]}
                  keyboardType="numeric"
                />
                {!isFoodCategory && !isFashionCategory ? (
                  <TextInput placeholder={categoryConfig.showVariants ? categoryConfig.variantLabel : "Unit (e.g. 1 pc)"} placeholderTextColor="#9CA3AF"
                    value={form.unit} onChangeText={(t) => setForm({ ...form, unit: t })}
                    style={[s.inputCompact, s.flex1]} />
                ) : null}
              </View>

              {categoryConfig.showVariants ? (
              <View
                style={[s.variantManagerPanel, addValidationError?.field.startsWith("variant-") && s.fieldPanelError]}
                testID="vendor-store-add-product-variants"
                onLayout={(event) => rememberAddFieldPosition("variants", event.nativeEvent.layout.y)}
              >
                              <View style={s.variantManagerHeader}>
                                <View style={{ flex: 1 }}>
                                  <Text style={s.variantManagerTitle}>Sell in more sizes</Text>
                                  {isFashionCategory ? (
                                    <Text style={s.variantManagerHint}>Selected sizes share these product photos. Set price, MRP and stock for each size.</Text>
                                  ) : (
                                    {isEditFashionCategory ? (
                                    <Text style={s.variantManagerHint}>Selected sizes share these product photos. Set price, MRP and stock for each size.</Text>
                                  ) : (
                                    <Text style={s.variantManagerHint}>Add each size/pack with its own label, price, MRP and stock.</Text>
                                  )}
                                  )}
                                </View>
                                {!isFashionCategory ? (
                                  <Pressable testID="vendor-store-add-variant" accessibilityRole="button"
                                    onPress={() => setAddVariantDrafts((current) => [...current, { id: "", unit: "", price: "", mrp: "", stock: "10", description: "", colors: [...form.colors], color_images: {} }])}
                                    style={s.addVariantButton}>
                                    <MaterialCommunityIcons name="plus" size={17} color="#FFFFFF" />
                                    <Text style={s.addVariantButtonText}>Add size</Text>
                                  </Pressable>
                                ) : (
                                  <Text style={s.variantManagerHint}>{addFashionSelectedSizes.length} sizes selected</Text>
                                )}
                              </View>
                              {addVariantDrafts.map((variant, index) => (
                                <View
                                  key={`${variant.id || "new"}-${index}`}
                                  style={[s.variantDraftCard, addValidationError?.field === `variant-${index}` && s.variantDraftError]}
                                  onLayout={(event) => rememberAddFieldPosition(`variant-${index}`, (addFieldPositions.current.variants || 0) + event.nativeEvent.layout.y)}
                                >
                                  <View style={s.variantDraftTopRow}>
                                    <Text style={s.variantDraftLabel}>{isFashionCategory ? variant.unit : "Option " + (index + 2)}</Text>
                                    <Pressable accessibilityRole="button" accessibilityLabel={`Remove size option ${index + 2}`}
                                      onPress={() => {
                                        const removedUnit = addVariantDrafts[index]?.unit || "";
                                        setAddVariantDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index));
                                        if (isFashionCategory) setAddFashionSelectedSizes((current) => current.filter((size) => size.toLowerCase() !== removedUnit.toLowerCase()));
                                      }}
                                      style={s.removeVariantButton}>
                                      <MaterialCommunityIcons name="trash-can-outline" size={17} color="#B91C1C" />
                                    </Pressable>
                                  </View>
                                  {!isFashionCategory ? (
                                    <>
                                      <Text style={s.variantManagerHint}>Choose {categoryConfig.variantLabel}</Text>
                                      <View style={s.unitChipContainer}>
                                        {categoryConfig.variantOptions.map((option) => {
                                          const active = String(variant.unit || "").trim().toLowerCase() === option.toLowerCase();
                                          return (
                                            <Pressable key={option} accessibilityRole="button"
                                              accessibilityLabel={`Select ${categoryConfig.variantLabel} ${option} for option ${index + 2}`}
                                              accessibilityState={{ selected: active }}
                                              testID={`vendor-store-add-variant-size-${index + 2}-${option.toLowerCase().replace(/\s+/g, "-")}`}
                                              style={[s.catChip, s.unitChip, active && s.catChipActive]}
                                              onPress={() => {
                                                setAddVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unit: option } : item));
                                                clearAddValidationError(`variant-${index}`);
                                              }}>
                                              <Text style={[s.catChipText, active && s.catChipTextActive]}>{option}</Text>
                                            </Pressable>
                                          );
                                        })}
                                      </View>
                                    </>
                                  ) : (
                                    <Text style={s.variantManagerHint}>Shared product photos and colour selection apply to this size.</Text>
                                  )}
{!isFoodCategory && !isFashionCategory ? (
                                  <TextInput placeholder={`Or enter custom ${categoryConfig.variantLabel}`} placeholderTextColor="#64748B"
                                    value={variant.unit}
                                    onChangeText={(value) => {
                                      setAddVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unit: value } : item));
                                      clearAddValidationError(`variant-${index}`);
                                    }}
                                    style={s.inputCompact} />
                                  ) : null}
                                  {showColorOptions ? (
                                    <VariantColorChoices value={variant.colors ?? form.colors} availableColors={form.colors} variantLabel={categoryConfig.variantLabel}
                                      onChange={(colors) => {
                                        setAddVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, colors } : item));
                                        clearAddValidationError(`variant-${index}`);
                                      }}
                                      imagesByColor={variant.color_images || {}}
                                      onImagesChange={(color_images) => {
                                        setAddVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, color_images } : item));
                                      }}
                                      showImageUploads={!isFashionCategory}
                                      colorsRequired={categoryConfig.requiresColor}
                                      testID={`vendor-store-add-variant-colours-${index + 2}`} />
                                  ) : null}
                                  {!isFoodCategory && !isFashionCategory ? (
                                    <>
                                  <Text style={s.variantManagerHint}>Description for this option</Text>
                                  <TextInput placeholder="Describe the differences for this option" placeholderTextColor="#64748B"
                                    value={variant.description}
                                    onChangeText={(value) => {
                                      setAddVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, description: value } : item));
                                      clearAddValidationError(`variant-${index}`);
                                    }}
                                    style={[s.inputCompact, { minHeight: 64, textAlignVertical: "top" }]} multiline />
                                    </>
                                  ) : null}
                                  <View style={s.rowCompact}>
                                    <TextInput placeholder="Price" placeholderTextColor="#64748B" value={variant.price}
                                      onChangeText={(value) => {
                                        setAddVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, price: value } : item));
                                        clearAddValidationError(`variant-${index}`);
                                      }}
                                      style={[s.inputCompact, s.flex1]} keyboardType="numeric" />
                                    <TextInput placeholder="MRP" placeholderTextColor="#64748B" value={variant.mrp}
                                      onChangeText={(value) => {
                                        setAddVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, mrp: value } : item));
                                        clearAddValidationError(`variant-${index}`);
                                      }}
                                      style={[s.inputCompact, s.flex1]} keyboardType="numeric" />
                                    <TextInput placeholder="Stock" placeholderTextColor="#64748B" value={variant.stock}
                                      onChangeText={(value) => {
                                        setAddVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, stock: value } : item));
                                        clearAddValidationError(`variant-${index}`);
                                      }}
                                      style={[s.inputCompact, s.flex1]} keyboardType="numeric" />
                                  </View>
                                </View>
                              ))}
                            </View>
              ) : null}

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
            <View style={s.modalHeaderRow}>
              <Text style={[s.modalTitle, s.modalTitleInHeader]}>Edit Product</Text>
              <View style={s.shopCategoryBadge} testID="vendor-store-edit-product-shop-category">
                <Text style={s.shopCategoryBadgeLabel}>SHOP CATEGORY</Text>
                <Text style={s.shopCategoryBadgeValue} numberOfLines={1}>
                  {categories.find((item: any) => item.id === store?.category_id)?.name || store?.category_id || "Not set"}
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              {/* Product Name */}
              <TextInput
                testID="vendor-store-edit-product-name"
                placeholder="Product name (enter full name)"
                placeholderTextColor="#9CA3AF"
                value={editProductForm.name}
                onChangeText={(t) => setEditProductForm({ ...editProductForm, name: t })}
                style={[s.inputCompact, s.inputHighlighted, s.productNameInput]}
                multiline
                textAlignVertical="top"
              />

              {editCategoryConfig.showVariants && editCategoryConfig.variantOptions.length > 0 ? (
                <View style={s.unitPickerPanel} testID="vendor-store-edit-product-size-pack-picker">
                  <Text style={s.sectionLabel}>Choose {editCategoryConfig.variantLabel}</Text>
                  <Text style={s.unitPickerHint}>Select every size available for this product. The shared photo gallery applies to all selected sizes.</Text>
                  <View style={s.unitChipContainer}>
                    {editCategoryConfig.variantOptions.map((option) => {
                      const active = isEditFashionCategory
                        ? editFashionSelectedSizes.some((size) => size.toLowerCase() === option.toLowerCase())
                        : editProductForm.unit.trim().toLowerCase() === option.toLowerCase();
                      return (
                        <Pressable key={option} accessibilityRole="button"
                          accessibilityLabel={"Select " + editCategoryConfig.variantLabel + " " + option}
                          accessibilityState={{ selected: active }}
                          testID={"vendor-store-edit-product-unit-" + option.toLowerCase().replace(/\s+/g, "-")}
                          style={[s.catChip, s.unitChip, active && s.catChipActive]}
                          onPress={() => {
                            if (isEditFashionCategory) toggleEditFashionSize(option);
                            else setEditProductForm((current) => ({ ...current, unit: option }));
                          }}>
                          <Text style={[s.catChipText, active && s.catChipTextActive]}>{option}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {editCategoryConfig.showColors ? (
                showEditColorOptions ? (
                  <ProductColorPicker value={editProductForm.colors} colorLabel={editCategoryConfig.colorLabel}
                    onChange={(colors) => setEditProductForm((current) => ({ ...current, colors }))}
                    imagesByColor={editProductForm.color_images}
                    onImagesChange={(color_images) => setEditProductForm((current) => ({ ...current, color_images }))}
                    showImageUploads={!isEditFashionCategory}
                    testID="vendor-store-edit-product-colours" />
                ) : null
              ) : null}

              {/* Product description is available for every store category. */}
              <View style={s.productDescriptionPanel} testID="vendor-store-edit-product-description">
                <Text style={s.sectionLabel}>{editCategoryConfig.descriptionLabel || "Product description"}</Text>
                <TextInput testID="vendor-store-edit-product-description-input"
                  placeholder={editCategoryConfig.descriptionPlaceholder || "Add clear details about this product"}
                  placeholderTextColor="#9CA3AF"
                  value={editProductForm.description} onChangeText={(t) => setEditProductForm({ ...editProductForm, description: t })}
                  style={[s.inputCompact, { height: 70, textAlignVertical: "top" }]} multiline />
              </View>


                <View style={s.itemCategoryPanel} testID="vendor-store-edit-product-item-category-picker">
                  <Text style={s.itemCategoryTitle}>Choose item category</Text>
                  <Text style={s.itemCategoryPickerHint}>Choose the category that best matches this product.</Text>
                  {itemCategories.length ? (
                    <View style={s.itemCategoryRow}>
                      {itemCategories.map((item: any) => {
                        const active = editProductForm.item_category_id === item.id;
                        return (
                          <Pressable
                            key={item.id}
                            accessibilityRole="button"
                            accessibilityLabel={`Select item category ${item.name}`}
                            accessibilityState={{ selected: active }}
                            onPress={() => setEditProductForm((prev) => ({
                              ...prev,
                              item_category: item.name,
                              item_category_id: item.id,
                            }))}
                            style={[s.itemCategoryChip, active && s.itemCategoryChipActive]}
                          >
                            <Text style={[s.itemCategoryChipText, active && s.itemCategoryChipTextActive]}>
                              {item.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={s.itemCategoryPickerEmpty}>
                      No item categories are configured for this shop category yet. Add them in Store Item Categories first.
                    </Text>
                  )}
                  <View style={s.createItemCategoryRow}>
                    <TextInput
                      testID="vendor-store-edit-new-item-category-name"
                      placeholder="New item category (e.g. Jeans)"
                      placeholderTextColor="#047857"
                      value={productItemCategoryName}
                      onChangeText={setProductItemCategoryName}
                      style={[s.inputCompact, s.createItemCategoryInput]}
                      onSubmitEditing={() => createItemCategoryForProduct("edit")}
                      returnKeyType="done"
                    />
                    <Pressable
                      testID="vendor-store-edit-new-item-category"
                      accessibilityRole="button"
                      accessibilityLabel="Create and select new item category"
                      style={[s.createItemCategoryButton, savingProductItemCategory && { opacity: 0.65 }]}
                      onPress={() => createItemCategoryForProduct("edit")}
                      disabled={savingProductItemCategory}
                    >
                      {savingProductItemCategory ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
                      )}
                    </Pressable>
                  </View>
                </View>

              {isEditFoodCategory ? (
                <View testID="vendor-store-edit-product-food-photo-section">
                  <ProductImagesUploader
                    value={editProductForm.images}
                    onChange={(images) => setEditProductForm((current) => ({ ...current, images, image: images[0] || "" }))}
                    label="Food photos"
                    minCount={2}
                    maxCount={2}
                    allowMultipleSelection
                    testID="vendor-store-edit-product-food-photos"
                  />
                </View>
              ) : null}

              {isEditFashionCategory ? (
                <View testID="vendor-store-edit-product-fashion-photo-section">
                  <ProductImagesUploader
                    value={editProductForm.images}
                    onChange={(images) => setEditProductForm((current) => ({ ...current, images, image: images[0] || "" }))}
                    label="Fashion product photos"
                    minCount={1}
                    maxCount={6}
                    allowMultipleSelection
                    testID="vendor-store-edit-product-fashion-photos"
                  />
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
                {!isEditFoodCategory && !isEditFashionCategory ? (
                  <TextInput placeholder={editCategoryConfig.showVariants ? editCategoryConfig.variantLabel : "Unit (e.g. 1 pc)"} placeholderTextColor="#9CA3AF"
                    value={editProductForm.unit} onChangeText={(t) => setEditProductForm({ ...editProductForm, unit: t })}
                    style={[s.inputCompact, s.flex1]} />
                ) : null}
              </View>

              {editCategoryConfig.showVariants ? (
              <View style={s.variantManagerPanel} testID="vendor-store-edit-product-variants">
                              <View style={s.variantManagerHeader}>
                                <View style={{ flex: 1 }}>
                                  <Text style={s.variantManagerTitle}>Sell in more sizes</Text>
                                  <Text style={s.variantManagerHint}>Add each size/pack with its own label, price, MRP and stock.</Text>
                                </View>
                                {!isEditFashionCategory ? (
                                  <Pressable testID="vendor-store-edit-variant" accessibilityRole="button"
                                    onPress={() => setEditVariantDrafts((current) => [...current, { id: "", unit: "", price: "", mrp: "", stock: "10", description: "", colors: [...editProductForm.colors], color_images: {} }])}
                                    style={s.addVariantButton}>
                                    <MaterialCommunityIcons name="plus" size={17} color="#FFFFFF" />
                                    <Text style={s.addVariantButtonText}>Add size</Text>
                                  </Pressable>
                                ) : (
                                  <Text style={s.variantManagerHint}>{editFashionSelectedSizes.length} sizes selected</Text>
                                )}
                              </View>
                              {editVariantDrafts.map((variant, index) => (
                                <View key={`${variant.id || "new"}-${index}`} style={s.variantDraftCard}>
                                  <View style={s.variantDraftTopRow}>
                                    <Text style={s.variantDraftLabel}>{isEditFashionCategory ? variant.unit : "Option " + (index + 2)}</Text>
                                    <Pressable accessibilityRole="button" accessibilityLabel={`Remove size option ${index + 2}`}
                                      onPress={() => {
                                        const removedUnit = editVariantDrafts[index]?.unit || "";
                                        setEditVariantDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index));
                                        if (isEditFashionCategory) setEditFashionSelectedSizes((current) => current.filter((size) => size.toLowerCase() !== removedUnit.toLowerCase()));
                                      }}
                                      style={s.removeVariantButton}>
                                      <MaterialCommunityIcons name="trash-can-outline" size={17} color="#B91C1C" />
                                    </Pressable>
                                  </View>
                                  {!isEditFashionCategory ? (
                                    <>
                                      <Text style={s.variantManagerHint}>Choose {editCategoryConfig.variantLabel}</Text>
                                      <View style={s.unitChipContainer}>
                                        {editCategoryConfig.variantOptions.map((option) => {
                                          const active = String(variant.unit || "").trim().toLowerCase() === option.toLowerCase();
                                          return (
                                            <Pressable key={option} accessibilityRole="button"
                                              accessibilityLabel={`Select ${editCategoryConfig.variantLabel} ${option} for option ${index + 2}`}
                                              accessibilityState={{ selected: active }}
                                              testID={`vendor-store-edit-variant-size-${index + 2}-${option.toLowerCase().replace(/\s+/g, "-")}`}
                                              style={[s.catChip, s.unitChip, active && s.catChipActive]}
                                              onPress={() => setEditVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unit: option } : item))}>
                                              <Text style={[s.catChipText, active && s.catChipTextActive]}>{option}</Text>
                                            </Pressable>
                                          );
                                        })}
                                      </View>
                                    </>
                                  ) : (
                                    <Text style={s.variantManagerHint}>Shared product photos and colour selection apply to this size.</Text>
                                  )}
{!isEditFoodCategory && !isEditFashionCategory ? (
                                  <TextInput placeholder={`Or enter custom ${editCategoryConfig.variantLabel}`} placeholderTextColor="#64748B"
                                    value={variant.unit}
                                    onChangeText={(value) => setEditVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unit: value } : item))}
                                    style={s.inputCompact} />
                                  ) : null}
                                  {showEditColorOptions ? (
                                    <VariantColorChoices value={variant.colors ?? editProductForm.colors} availableColors={editProductForm.colors} variantLabel={editCategoryConfig.variantLabel}
                                      onChange={(colors) => {
                                        setEditVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, colors } : item));
                                      }}
                                      imagesByColor={variant.color_images || {}}
                                      onImagesChange={(color_images) => {
                                        setEditVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, color_images } : item));
                                      }}
                                      showImageUploads={!isEditFashionCategory}
                                      colorsRequired={editCategoryConfig.requiresColor}
                                      testID={`vendor-store-edit-variant-colours-${index + 2}`} />
                                  ) : null}
                                  {!isEditFoodCategory && !isEditFashionCategory ? (
                                    <>
                                  <Text style={s.variantManagerHint}>Description for this option</Text>
                                  <TextInput placeholder="Describe the differences for this option" placeholderTextColor="#64748B"
                                    value={variant.description}
                                    onChangeText={(value) => setEditVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, description: value } : item))}
                                    style={[s.inputCompact, { minHeight: 64, textAlignVertical: "top" }]} multiline />
                                    </>
                                  ) : null}
                                  <View style={s.rowCompact}>
                                    <TextInput placeholder="Price" placeholderTextColor="#64748B" value={variant.price}
                                      onChangeText={(value) => setEditVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, price: value } : item))}
                                      style={[s.inputCompact, s.flex1]} keyboardType="numeric" />
                                    <TextInput placeholder="MRP" placeholderTextColor="#64748B" value={variant.mrp}
                                      onChangeText={(value) => setEditVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, mrp: value } : item))}
                                      style={[s.inputCompact, s.flex1]} keyboardType="numeric" />
                                    <TextInput placeholder="Stock" placeholderTextColor="#64748B" value={variant.stock}
                                      onChangeText={(value) => setEditVariantDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, stock: value } : item))}
                                      style={[s.inputCompact, s.flex1]} keyboardType="numeric" />
                                  </View>
                                </View>
                              ))}
                            </View>
              ) : null}

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
  cardDetails: { flex: 1, minWidth: 0, marginLeft: 10 },
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
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  modalTitleInHeader: { flex: 1, minWidth: 0, marginBottom: 0, paddingTop: 2 },
  shopCategoryBadge: {
    maxWidth: "58%",
    minWidth: 104,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#D8B4FE",
    alignItems: "flex-end",
  },
  shopCategoryBadgeLabel: {
    fontSize: 8,
    lineHeight: 10,
    letterSpacing: 0.5,
    fontWeight: "900",
    color: "#7E22CE",
    marginBottom: 2,
  },
  shopCategoryBadgeValue: {
    maxWidth: "100%",
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "800",
    color: "#581C87",
    textAlign: "right",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#000", marginBottom: 10 },

  // Compact Form Inputs (Optimized Heights)
  rowCompact: { width: "100%", minWidth: 0, flexDirection: "row", gap: 8, marginBottom: 8, alignItems: "stretch" },
  flex1: { flex: 1, minWidth: 0, width: 0, flexShrink: 1 },
  inputCompact: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    flexShrink: 1,
    height: 44,
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
  variantManagerPanel: { borderWidth: 1, borderColor: "#FDBA74", backgroundColor: "#FFF7ED", borderRadius: 14, padding: 12, marginTop: 10, marginBottom: 12, gap: 9 },
  variantManagerHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  variantManagerTitle: { color: "#7C2D12", fontSize: 14, fontWeight: "900" },
  variantManagerHint: { color: "#9A3412", fontSize: 11, lineHeight: 15, marginTop: 3 },
  addVariantButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#EA580C", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  addVariantButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  variantDraftCard: { borderWidth: 1, borderColor: "#FED7AA", backgroundColor: "#FFFFFF", borderRadius: 10, padding: 9, gap: 7 },
  variantDraftTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  variantDraftLabel: { color: "#7C2D12", fontSize: 12, fontWeight: "900" },
  removeVariantButton: { width: 30, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "#FEF2F2" },
  productNameInput: {
    minHeight: 58,
    height: 64,
    paddingTop: 11,
    paddingBottom: 10,
    lineHeight: 19,
    marginBottom: 10,
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

  // Product size/pack picker shown at the top of both add/edit forms.
  addValidationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginHorizontal: 14,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  addValidationBannerText: { color: "#991B1B", fontSize: 12, fontWeight: "700", flex: 1 },
  inputError: { borderColor: "#DC2626", borderWidth: 1.8, backgroundColor: "#FFF7F7" },
  fieldPanelError: { borderColor: "#DC2626", borderWidth: 2 },
  fieldErrorWrap: { borderWidth: 2, borderColor: "#DC2626", borderRadius: 14, padding: 3 },
  variantDraftError: { borderColor: "#DC2626", borderWidth: 2, backgroundColor: "#FFF7F7" },
  unitPickerPanel: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },
  productColorPanel: { backgroundColor: "#F0F9FF", borderWidth: 1, borderColor: "#BAE6FD", borderRadius: 14, padding: 10, marginBottom: 10 },
  productColorTitle: { color: "#0C4A6E", fontSize: 13, fontWeight: "900" },
  productColorHint: { color: "#0369A1", fontSize: 11, marginTop: 3, marginBottom: 8 },
  productColorOptions: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  productColorOption: { minWidth: 68, minHeight: 34, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  productColorOptionActive: { borderColor: "#0284C7", backgroundColor: "#E0F2FE" },
  productColorDot: { width: 17, height: 17, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(15,23,42,0.12)" },
  productColorDotWhite: { borderColor: "#94A3B8" },
  productColorDotSelected: { borderWidth: 1.5, borderColor: "#0C4A6E" },
  productColorOptionText: { color: "#334155", fontSize: 11, fontWeight: "700" },
  productColorOptionTextActive: { color: "#075985" },
  addCustomColorRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 8 },
  addCustomColorInput: { flex: 1, minWidth: 0, width: 0, height: 38, marginBottom: 0, backgroundColor: "#FFFFFF", borderColor: "#BAE6FD" },
  addCustomColorButton: { width: 40, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#0284C7" },
  productColorSelectedCount: { color: "#0369A1", fontSize: 10, fontWeight: "700", marginTop: 5 },
  productColorImagePanel: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#BAE6FD", borderRadius: 12, padding: 9, marginTop: 10, gap: 7 },
  productDescriptionPanel: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, padding: 10, marginTop: 8, gap: 7 },
  unitPickerHint: { fontSize: 11, lineHeight: 15, color: "#7C2D12", marginTop: -3, marginBottom: 8 },
  unitChipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  unitChip: {
    minHeight: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#EA580C",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

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

  // Green/teal item-category panel differentiates it from orange size/pack controls.
  itemCategoryPanel: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#6EE7B7",
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },
  itemCategoryTitle: { fontSize: 13, fontWeight: "900", color: "#065F46", marginBottom: 4 },
  itemCategoryPickerHint: { fontSize: 11, lineHeight: 15, color: "#047857", marginBottom: 8 },
  itemCategoryPickerEmpty: { fontSize: 11, lineHeight: 15, color: "#065F46" },
  createItemCategoryRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 9 },
  createItemCategoryInput: {
    flex: 1,
    minWidth: 0,
    width: 0,
    height: 40,
    marginBottom: 0,
    borderColor: "#6EE7B7",
    backgroundColor: "#FFFFFF",
    color: "#064E3B",
  },
  createItemCategoryButton: {
    width: 42,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#047857",
  },
  itemCategoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingBottom: 2,
  },
  itemCategoryChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  itemCategoryChipActive: {
    backgroundColor: "#047857",
    borderColor: "#047857",
  },
  itemCategoryChipText: {
    fontSize: 11,
    color: "#065F46",
    fontWeight: "800",
  },
  itemCategoryChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
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
