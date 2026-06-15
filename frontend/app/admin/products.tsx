import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { adminApi } from "@/src/roleApi";
import { api } from "@/src/api";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

export default function AdminProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([api.products({}), api.categories()]);
      setProducts(p); setCats(c);
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
      <ProductModal visible={modal} onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} edit={edit} categories={cats} />
    </SafeAreaView>
  );
}

function ProductModal({ visible, onClose, onSaved, edit, categories }: any) {
  const [f, setF] = useState({ name: "", price: "", mrp: "", stock: "", unit: "", image: "", description: "", category_id: "", trending: false });
  React.useEffect(() => {
    if (edit) setF({
      name: edit.name || "", price: String(edit.price || ""), mrp: String(edit.mrp || ""),
      stock: String(edit.stock || ""), unit: edit.unit || "", image: edit.image || "",
      description: edit.description || "", category_id: edit.category_id || "", trending: !!edit.trending,
    });
    else setF({ name: "", price: "", mrp: "", stock: "", unit: "", image: "", description: "", category_id: categories[0]?.id || "", trending: false });
  }, [edit, visible]);

  const save = async () => {
    const payload = {
      name: f.name, price: parseFloat(f.price) || 0, mrp: parseFloat(f.mrp) || parseFloat(f.price) || 0,
      stock: parseInt(f.stock) || 0, unit: f.unit, image: f.image, description: f.description,
      category_id: f.category_id, trending: f.trending,
    };
    if (edit) await adminApi.updateProduct(edit.id, payload);
    else await adminApi.createProduct(payload);
    onSaved();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ms.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={ms.sheet}>
          <View style={ms.handle} />
          <Text style={ms.title}>{edit ? "Edit Product" : "Add Product"}</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Field ph="Name" v={f.name} oc={(v: string) => setF({ ...f, name: v })} testID="pf-name" />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}><Field ph="Price" v={f.price} oc={(v: string) => setF({ ...f, price: v })} kt="numeric" testID="pf-price" /></View>
              <View style={{ flex: 1 }}><Field ph="MRP" v={f.mrp} oc={(v: string) => setF({ ...f, mrp: v })} kt="numeric" testID="pf-mrp" /></View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}><Field ph="Stock" v={f.stock} oc={(v: string) => setF({ ...f, stock: v })} kt="numeric" testID="pf-stock" /></View>
              <View style={{ flex: 1 }}><Field ph="Unit (e.g. 1 kg)" v={f.unit} oc={(v: string) => setF({ ...f, unit: v })} testID="pf-unit" /></View>
            </View>
            <Field ph="Image URL" v={f.image} oc={(v: string) => setF({ ...f, image: v })} testID="pf-image" />
            <Field ph="Description" v={f.description} oc={(v: string) => setF({ ...f, description: v })} multiline testID="pf-desc" />
            <Text style={ms.label}>Category</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {categories.map((c: any) => (
                <Pressable
                  key={c.id}
                  testID={`pf-cat-${c.id}`}
                  onPress={() => setF({ ...f, category_id: c.id })}
                  style={[ms.catChip, f.category_id === c.id && { backgroundColor: COLORS.brand, borderColor: COLORS.brand }]}
                >
                  <Text style={[ms.catText, f.category_id === c.id && { color: "#fff" }]}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
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
  input: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, fontSize: 14 },
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
  card: { flexDirection: "row", gap: 10, padding: 10, backgroundColor: "#fff", borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  img: { width: 60, height: 60, borderRadius: 8, backgroundColor: COLORS.surfaceTertiary },
  name: { fontWeight: "700", color: COLORS.text, fontSize: 13 },
  meta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  price: { color: COLORS.text, fontWeight: "800", marginTop: 4 },
  mrp: { color: COLORS.textMuted, textDecorationLine: "line-through", fontWeight: "500", fontSize: 11 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceSecondary },
});
