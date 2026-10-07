import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Modal, TextInput, Alert, ScrollView } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { adminApi } from "@/src/roleApi";
import { api } from "@/src/api";
import { COLORS, RADIUS, SPACING } from "@/src/theme";

const EMPTY = {
  name: "",
  category_id: "",
  icon: "tag-outline",
  color: "#F97316",
  order: "99",
  active: true,
};

export default function AdminItemCategories() {
  const router = useRouter();
  const [cats, setCats] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [f, setF] = useState({ ...EMPTY });

  const load = useCallback(async () => {
    try {
      const [categoryList, itemList] = await Promise.all([
        api.categories(),
        adminApi.itemCategories(),
      ]);
      setCats(categoryList || []);
      setItems(itemList || []);
    } catch (e) {
      console.log(e);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const closeModal = () => {
    setModal(false);
    setEditingId(null);
    setF({ ...EMPTY });
  };

  const openCreate = () => {
    setEditingId(null);
    setF({ ...EMPTY, category_id: cats[0]?.id || "" });
    setModal(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setF({
      name: item.name || "",
      category_id: item.category_id || "",
      icon: item.icon || "tag-outline",
      color: item.color || "#F97316",
      order: String(item.order ?? 99),
      active: item.active !== false,
    });
    setModal(true);
  };

  const save = async () => {
    if (!f.name.trim()) return Alert.alert("Required", "Item category name is required.");
    if (!editingId && !f.category_id) return Alert.alert("Required", "Select a shop category first.");

    try {
      if (editingId) {
        await adminApi.updateItemCategory(editingId, {
          name: f.name.trim(),
          icon: f.icon.trim() || "tag-outline",
          color: f.color.trim() || "#F97316",
          order: Number(f.order) || 99,
          active: f.active,
        });
      } else {
        await adminApi.createItemCategory({
          name: f.name.trim(),
          category_id: f.category_id,
          icon: f.icon.trim() || "tag-outline",
          color: f.color.trim() || "#F97316",
          order: Number(f.order) || 99,
          active: f.active,
        });
      }
      closeModal();
      await load();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Could not save item category.");
    }
  };

  const remove = async (id: string) => {
    const confirmed = typeof window !== "undefined"
      ? window.confirm("Disable this item category?")
      : true;
    if (!confirmed) return;
    try {
      await adminApi.deleteItemCategory(id);
      await load();
    } catch (e: any) {
      Alert.alert("Delete failed", e?.message || "Could not disable item category.");
    }
  };

  const parentName = (id: string) =>
    cats.find((c: any) => c.id === id)?.name || id;

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} />
        </Pressable>
        <Text style={s.title}>Item Categories ({items.length})</Text>
        <Pressable onPress={openCreate} hitSlop={10}>
          <MaterialCommunityIcons name="plus-circle" size={26} color={COLORS.brand} />
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 30 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <MaterialCommunityIcons name="tag-outline" size={42} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>No item categories yet</Text>
            <Text style={s.emptyText}>Add categories such as T-Shirts, Jeans or Vegetables and attach each one to its shop category.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{item.name}</Text>
              <Text style={s.meta}>Shop category: {parentName(item.category_id)}</Text>
              <Text style={s.idText}>ID: {item.id}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 6 }}>
                <View style={[s.statusDot, { backgroundColor: item.active === false ? "#EF4444" : "#16A34A" }]} />
                <Text style={s.statusText}>{item.active === false ? "Inactive" : "Active"}</Text>
              </View>
            </View>
            <View style={s.actions}>
              <Pressable onPress={() => openEdit(item)} style={s.actionBtn}>
                <MaterialCommunityIcons name="pencil-outline" size={18} color={COLORS.brand} />
              </Pressable>
              {item.active !== false ? (
                <Pressable onPress={() => remove(item.id)} style={s.actionBtn}>
                  <MaterialCommunityIcons name="eye-off-outline" size={18} color={COLORS.error} />
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
      />

      <Modal visible={modal} transparent animationType="slide">
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.modalTitle}>{editingId ? "Edit Item Category" : "Add Item Category"}</Text>

            <Text style={s.label}>Shop Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 10 }}>
              {cats.map((cat: any) => {
                const active = f.category_id === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    disabled={!!editingId}
                    onPress={() => setF({ ...f, category_id: cat.id })}
                    style={[s.choice, active && s.choiceActive, editingId && { opacity: 0.6 }]}
                  >
                    <Text style={[s.choiceText, active && s.choiceTextActive]}>{cat.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <TextInput
              placeholder="Item Category Name (e.g. T-Shirts)"
              value={f.name}
              onChangeText={(v) => setF({ ...f, name: v })}
              style={s.input}
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={s.help}>The Item Category ID is generated automatically from the shop category + name.</Text>

            <TextInput
              placeholder="Icon (optional)"
              value={f.icon}
              onChangeText={(v) => setF({ ...f, icon: v })}
              style={s.input}
              placeholderTextColor={COLORS.textMuted}
            />
            <TextInput
              placeholder="Color (#RRGGBB)"
              value={f.color}
              onChangeText={(v) => setF({ ...f, color: v })}
              style={s.input}
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={s.label}>Display Order</Text>
            <TextInput
              placeholder="99"
              value={f.order}
              onChangeText={(v) => setF({ ...f, order: v })}
              style={s.input}
              keyboardType="numeric"
              placeholderTextColor={COLORS.textMuted}
            />

            <Pressable
              onPress={() => setF({ ...f, active: !f.active })}
              style={s.activeRow}
            >
              <MaterialCommunityIcons
                name={f.active ? "checkbox-marked" : "checkbox-blank-outline"}
                size={21}
                color={f.active ? COLORS.brand : COLORS.textMuted}
              />
              <Text style={s.activeText}>Active for vendors and customers</Text>
            </Pressable>

            <View style={s.modalActions}>
              <Pressable onPress={closeModal} style={[s.modalBtn, s.cancelBtn]}>
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={save} style={[s.modalBtn, s.saveBtn]}>
                <Text style={s.saveText}>{editingId ? "Save Changes" : "Create"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceSecondary },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  meta: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  idText: { color: "#64748B", fontSize: 10, marginTop: 3 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 4 },
  actionBtn: { padding: 8 },
  empty: { backgroundColor: "#fff", borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 24, alignItems: "center" },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: "800", marginTop: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 12, textAlign: "center", marginTop: 5, lineHeight: 18 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", padding: SPACING.lg, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, alignSelf: "center", borderRadius: 2, marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "800", color: COLORS.text, marginBottom: 6 },
  input: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  choice: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#fff" },
  choiceActive: { backgroundColor: "#FFF7ED", borderColor: COLORS.brand },
  choiceText: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700" },
  choiceTextActive: { color: COLORS.brand },
  help: { color: COLORS.textMuted, fontSize: 10, marginTop: -2, marginBottom: 7, lineHeight: 15 },
  activeRow: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 8 },
  activeText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "700" },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  modalBtn: { flex: 1, padding: 13, borderRadius: RADIUS.pill, alignItems: "center" },
  cancelBtn: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#fff" },
  cancelText: { color: COLORS.textSecondary, fontWeight: "700" },
  saveBtn: { backgroundColor: COLORS.brand },
  saveText: { color: "#fff", fontWeight: "800" },
});
