import { safeGoBack } from "@/src/navigation";
import { LocalizedText as Text, LocalizedTextInput as TextInput } from "@/src/LocalizedText";
import React, { useCallback, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Modal, KeyboardAvoidingView, Platform, Switch, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { adminApi } from "@/src/roleApi";
import { api } from "@/src/api";
import { COLORS, RADIUS, SPACING } from "@/src/theme";
import ImageUploader from "@/src/components/ImageUploader";
import { getDefaultProductFieldSchema } from "@/src/productCategoryConfig";

export default function AdminCategories() {
  const router = useRouter();
  const [cats, setCats] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [f, setF] = useState<any>({ name: "", icon: "tag", color: "#2563EB", image: "", product_fields: getDefaultProductFieldSchema("") });

  const load = useCallback(async () => { try { setCats(await api.categories()); } catch {} }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onDelete = async (id: string) => { await adminApi.deleteCategory(id); load(); };
  const save = async () => {
    const payload = { ...f, product_fields: f.product_fields || getDefaultProductFieldSchema(f.name) };
    if (editingId) {
      await adminApi.updateCategory(editingId, payload);
    } else {
      await adminApi.createCategory(payload);
    }
    setModal(false);
    setEditingId(null);
    setF({ name: "", icon: "tag", color: "#2563EB", image: "", product_fields: getDefaultProductFieldSchema("") });
    load();
  };

  const editCategory = (item: any) => {
    setEditingId(item.id);
    setF({ name: item.name || "", icon: item.icon || "tag", color: item.color || "#2563EB", image: item.image || "", product_fields: { ...getDefaultProductFieldSchema(item.name || ""), ...(item.product_fields || {}) } });
    setModal(true);
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]} testID="admin-categories-screen">
      <View style={s.header}>
        <Pressable onPress={() => safeGoBack(router, "/admin")} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} /></Pressable>
        <Text style={s.title}>Categories ({cats.length})</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable testID="add-cat-btn" onPress={() => { setEditingId(null); setF({ name: "", icon: "tag", color: "#2563EB", image: "", product_fields: getDefaultProductFieldSchema("") }); setModal(true); }} hitSlop={10}>
            <MaterialCommunityIcons name="plus-circle" size={26} color={COLORS.brand} />
          </Pressable>
        </View>
      </View>
      <FlatList
        data={cats}
        keyExtractor={(c) => c.id}
        numColumns={2}
        contentContainerStyle={{ padding: SPACING.lg }}
        columnWrapperStyle={{ gap: 10 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Image source={{ uri: item.image }} style={s.img} contentFit="cover" />
            <Text style={s.name}>{item.name}</Text>
            <View style={[s.colorDot, { backgroundColor: item.color }]} />
            <View style={s.cardActions}>
              <Pressable testID={`edit-cat-${item.id}`} onPress={() => editCategory(item)} style={s.editBtn}>
                <MaterialCommunityIcons name="pencil-outline" size={16} color={COLORS.brand} />
              </Pressable>
              <Pressable testID={`del-cat-${item.id}`} onPress={() => onDelete(item.id)} style={s.delBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={16} color={COLORS.error} />
              </Pressable>
            </View>
          </View>
        )}
      />
      <Modal visible={modal} transparent animationType="slide">
        <View style={ms.backdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={ms.sheet}>
            <View style={ms.handle} />
            <Text style={ms.title}>{editingId ? "Edit Category" : "Add Category"}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Input ph="Name" v={f.name} oc={(v: string) => setF((prev: any) => ({
                ...prev,
                name: v,
                product_fields: editingId ? prev.product_fields : getDefaultProductFieldSchema(v),
              }))} testID="cf-name" />
              <Input ph="Icon (MaterialCommunityIcons name)" v={f.icon} oc={(v: string) => setF((prev: any) => ({ ...prev, icon: v }))} testID="cf-icon" />
              <Input ph="Color (#RRGGBB)" v={f.color} oc={(v: string) => setF((prev: any) => ({ ...prev, color: v }))} testID="cf-color" />

              <View style={ms.fieldConfigPanel} testID="category-product-field-settings">
                <Text style={ms.fieldConfigTitle}>Category-specific product system</Text>
                <Text style={ms.fieldConfigHint}>These settings control what the vendor enters and what customers can select. Each category has its own fields and options.</Text>
                <View style={ms.fieldToggleRow}>
                  <View style={ms.fieldToggleCopy}>
                    <Text style={ms.fieldToggleLabel}>Product variants</Text>
                    <Text style={ms.fieldToggleHint}>Sizes, RAM/storage, pack size, serving or model options</Text>
                  </View>
                  <Switch value={!!f.product_fields?.show_variants}
                    onValueChange={(value) => setF((prev: any) => ({ ...prev, product_fields: { ...(prev.product_fields || {}), show_variants: value } }))}
                    accessibilityLabel="Show product variants" />
                </View>
                <View style={ms.fieldToggleRow}>
                  <View style={ms.fieldToggleCopy}>
                    <Text style={ms.fieldToggleLabel}>Colour / shade selection</Text>
                    <Text style={ms.fieldToggleHint}>Show colour choices under the main customer photo</Text>
                  </View>
                  <Switch value={!!f.product_fields?.show_colors}
                    onValueChange={(value) => setF((prev: any) => ({ ...prev, product_fields: { ...(prev.product_fields || {}), show_colors: value, requires_color: value ? !!prev.product_fields?.requires_color : false, requires_color_images: value ? !!prev.product_fields?.requires_color_images : false } }))}
                    accessibilityLabel="Show colour options" />
                </View>
                <View style={ms.fieldToggleRow}>
                  <View style={ms.fieldToggleCopy}>
                    <Text style={ms.fieldToggleLabel}>Colour is compulsory</Text>
                    <Text style={ms.fieldToggleHint}>For products such as mobile phones, require the seller to select a colour</Text>
                  </View>
                  <Switch value={!!f.product_fields?.requires_color}
                    onValueChange={(value) => setF((prev: any) => ({ ...prev, product_fields: { ...(prev.product_fields || {}), show_colors: value || !!prev.product_fields?.show_colors, requires_color: value } }))}
                    accessibilityLabel="Require a product colour" />
                </View>
                <View style={ms.fieldToggleRow}>
                  <View style={ms.fieldToggleCopy}>
                    <Text style={ms.fieldToggleLabel}>Require photos for every colour</Text>
                    <Text style={ms.fieldToggleHint}>Each selected colour must have its own matching gallery</Text>
                  </View>
                  <Switch value={!!f.product_fields?.requires_color_images}
                    onValueChange={(value) => setF((prev: any) => ({ ...prev, product_fields: { ...(prev.product_fields || {}), show_colors: value || !!prev.product_fields?.show_colors, requires_color: value ? true : !!prev.product_fields?.requires_color, requires_color_images: value } }))}
                    accessibilityLabel="Require photos for every colour" />
                </View>
                <View style={ms.fieldToggleRow}>
                  <View style={ms.fieldToggleCopy}>
                    <Text style={ms.fieldToggleLabel}>Product description</Text>
                    <Text style={ms.fieldToggleHint}>Show common information for this product</Text>
                  </View>
                  <Switch value={!!f.product_fields?.show_description}
                    onValueChange={(value) => setF((prev: any) => ({ ...prev, product_fields: { ...(prev.product_fields || {}), show_description: value } }))}
                    accessibilityLabel="Show product description" />
                </View>

                <Text style={ms.fieldInputLabel}>Variant field label</Text>
                <TextInput testID="cf-variant-label" value={String(f.product_fields?.variant_label || "")}
                  onChangeText={(value) => setF((prev: any) => ({ ...prev, product_fields: { ...(prev.product_fields || {}), variant_label: value } }))}
                  placeholder="Example: RAM / Storage, Clothing size, Pack size"
                  placeholderTextColor={COLORS.textMuted} style={ms.input} />

                <Text style={ms.fieldInputLabel}>Allowed variant options (one per line)</Text>
                <TextInput testID="cf-variant-options" value={Array.isArray(f.product_fields?.variant_options) ? f.product_fields.variant_options.join("\n") : ""}
                  onChangeText={(value) => setF((prev: any) => ({ ...prev, product_fields: { ...(prev.product_fields || {}), variant_options: value.split("\n").map((line: string) => line.trim()).filter(Boolean).slice(0, 60) } }))}
                  placeholder={"4 GB / 64 GB\n8 GB / 128 GB\n8 GB / 256 GB"}
                  placeholderTextColor={COLORS.textMuted} style={[ms.input, ms.multilineInput]} multiline numberOfLines={5} />

                <Text style={ms.fieldInputLabel}>Product specifications (one field per line)</Text>
                <TextInput testID="cf-product-attributes" value={Array.isArray(f.product_fields?.product_attributes) ? f.product_fields.product_attributes.map((item: any) => typeof item === "string" ? item : item?.label || "").join("\n") : ""}
                  onChangeText={(value) => setF((prev: any) => ({ ...prev, product_fields: { ...(prev.product_fields || {}), product_attributes: value.split("\n").map((line: string) => line.trim()).filter(Boolean).slice(0, 24) } }))}
                  placeholder={"Brand\nModel\nProcessor\nDisplay\nBattery\nWarranty"}
                  placeholderTextColor={COLORS.textMuted} style={[ms.input, ms.multilineInput]} multiline numberOfLines={6} />
                <Text style={ms.fieldConfigHint}>For example: Mobile gets model/processor/battery; Grocery gets brand/ingredients/shelf life; Fashion gets fabric/fit/pattern. These values are stored with the product.</Text>
              </View>

              <ImageUploader value={f.image} onChange={(uri) => setF((prev: any) => ({ ...prev, image: uri }))} label="Category Image" aspect={[1, 1]} testID="cf-image" />
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 12 }}>
                <Pressable onPress={() => setModal(false)} style={[ms.btn, ms.btnGhost]}><Text style={ms.btnGhostText}>Cancel</Text></Pressable>
                <Pressable testID="cf-save" onPress={save} style={[ms.btn, ms.btnPrimary]}><Text style={ms.btnText}>{editingId ? "Save Changes" : "Create"}</Text></Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Input({ ph, v, oc, testID }: any) {
  return <TextInput testID={testID} placeholder={ph} value={v} onChangeText={oc} placeholderTextColor={COLORS.textMuted} style={ms.input} />;
}

const ms = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", padding: SPACING.lg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%" },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, alignSelf: "center", borderRadius: 2, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text, marginBottom: 12 },
  input: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  fieldConfigPanel: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 14, padding: 12, marginVertical: 10, gap: 10 },
  fieldConfigTitle: { fontSize: 14, fontWeight: "800", color: COLORS.text },
  fieldConfigHint: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
  fieldInputLabel: { fontSize: 12, fontWeight: "800", color: COLORS.text, marginTop: 4 },
  multilineInput: { minHeight: 90, textAlignVertical: "top" },
  fieldToggleRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  fieldToggleCopy: { flex: 1, gap: 2 },
  fieldToggleLabel: { fontSize: 13, fontWeight: "700", color: COLORS.text },
  fieldToggleHint: { fontSize: 10, color: COLORS.textSecondary, lineHeight: 14 },
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
  card: { flex: 1, backgroundColor: "#fff", padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", position: "relative" },
  img: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.surfaceTertiary },
  name: { fontWeight: "700", color: COLORS.text, marginTop: 8 },
  colorDot: { width: 24, height: 6, borderRadius: 3, marginTop: 6 },
  cardActions: { position: "absolute", top: 8, right: 8, flexDirection: "row", gap: 4 },
  editBtn: { padding: 4 },
  delBtn: { padding: 4 },
});
